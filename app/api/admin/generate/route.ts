import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '@/lib/db';

const MODEL = 'gemini-2.0-flash';

/**
 * POST /api/admin/generate
 * Body: { topic_id: string }
 *
 * Calls Gemini to generate insight, key_points, formulas, flashcards, and
 * quiz questions for a topic, then stores them in the global cache tables.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { topic_id } = body as { topic_id?: string };

  if (!topic_id) {
    return NextResponse.json({ error: 'topic_id is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set in environment' }, { status: 500 });
  }

  try {
    // 1. Fetch topic info
    const [topic] = await query<{ id: string; title: string; source_markdown: string; chapter_title: string; subject: string }>(
      `SELECT t.id, t.title, t.source_markdown,
              c.title AS chapter_title, tb.subject
       FROM topics t
       JOIN chapters c ON t.chapter_id = c.id
       JOIN textbooks tb ON c.textbook_id = tb.id
       WHERE t.id = $1`,
      [topic_id]
    );

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // 2. Call Gemini
    const generated = await callGemini(apiKey, topic);

    // 3. Upsert global_generated_content
    const [existing] = await query<{ id: string }>(
      `SELECT id FROM global_generated_content WHERE topic_id = $1`,
      [topic_id]
    );

    let contentId: string;

    if (existing) {
      await query(
        `UPDATE global_generated_content SET
           generation_model = $1, version = version + 1,
           insight = $2, key_points = $3, formulas = $4,
           metadata = $5, updated_at = NOW()
         WHERE id = $6`,
        [
          MODEL,
          JSON.stringify(generated.insight),
          JSON.stringify(generated.key_points),
          JSON.stringify(generated.formulas),
          JSON.stringify({ generated_at: new Date().toISOString() }),
          existing.id,
        ]
      );
      contentId = existing.id;
    } else {
      const [inserted] = await query<{ id: string }>(
        `INSERT INTO global_generated_content
           (topic_id, generation_model, insight, key_points, formulas, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          topic_id,
          MODEL,
          JSON.stringify(generated.insight),
          JSON.stringify(generated.key_points),
          JSON.stringify(generated.formulas),
          JSON.stringify({ generated_at: new Date().toISOString() }),
        ]
      );
      contentId = inserted.id;
    }

    // 4. Replace flashcards
    await query(`DELETE FROM global_generated_flashcards WHERE global_content_id = $1`, [contentId]);
    for (let i = 0; i < generated.flashcards.length; i++) {
      const f = generated.flashcards[i];
      await query(
        `INSERT INTO global_generated_flashcards (global_content_id, question, answer, category, difficulty_level, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [contentId, f.question, f.answer, f.category ?? 'concept', f.difficulty_level ?? 'medium', i]
      );
    }

    // 5. Replace quiz questions
    await query(`DELETE FROM global_generated_quiz_questions WHERE global_content_id = $1`, [contentId]);
    for (let i = 0; i < generated.quiz_questions.length; i++) {
      const q = generated.quiz_questions[i];
      await query(
        `INSERT INTO global_generated_quiz_questions
           (global_content_id, question_text, question_type, options, correct_answer_id, explanation, difficulty_level, order_index)
         VALUES ($1, $2, 'mcq', $3, $4, $5, $6, $7)`,
        [
          contentId,
          q.question_text,
          JSON.stringify(q.options),
          q.correct_answer_id,
          q.explanation ?? '',
          q.difficulty_level ?? 'medium',
          i,
        ]
      );
    }

    return NextResponse.json({
      ok: true,
      topic_id,
      content_id: contentId,
      counts: {
        flashcards: generated.flashcards.length,
        quiz_questions: generated.quiz_questions.length,
      },
    });
  } catch (err) {
    console.error('Generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

// ── Gemini call ──────────────────────────────────────────────────────────────

interface GeneratedContent {
  insight: { title: string; content: string; summary: string; keywords: string[] };
  key_points: { point: string; importance: number; explanation: string }[];
  formulas: { latex: string; explanation: string; applications: string[] }[];
  flashcards: { question: string; answer: string; category: string; difficulty_level: string }[];
  quiz_questions: {
    question_text: string;
    options: { id: number; text: string; is_correct: boolean }[];
    correct_answer_id: number;
    explanation: string;
    difficulty_level: string;
  }[];
}

async function callGemini(
  apiKey: string,
  topic: { title: string; source_markdown: string; chapter_title: string; subject: string }
): Promise<GeneratedContent> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `You are an expert educational content creator for ${topic.subject} students.

Topic: "${topic.title}" (from chapter: "${topic.chapter_title}")

Source content:
${(topic.source_markdown ?? '').slice(0, 4000)}

Generate structured learning content as a single valid JSON object with these exact keys:

{
  "insight": {
    "title": "string — concise insight title",
    "content": "string — 2-3 sentences explaining the core concept",
    "summary": "string — one-line summary",
    "keywords": ["array", "of", "key", "terms"]
  },
  "key_points": [
    { "point": "string", "importance": 0.9, "explanation": "string" }
  ],
  "formulas": [
    { "latex": "E = mc^2", "explanation": "string", "applications": ["string"] }
  ],
  "flashcards": [
    { "question": "string", "answer": "string", "category": "definition|concept|formula|application", "difficulty_level": "easy|medium|hard" }
  ],
  "quiz_questions": [
    {
      "question_text": "string",
      "options": [
        { "id": 1, "text": "string", "is_correct": true },
        { "id": 2, "text": "string", "is_correct": false },
        { "id": 3, "text": "string", "is_correct": false },
        { "id": 4, "text": "string", "is_correct": false }
      ],
      "correct_answer_id": 1,
      "explanation": "string",
      "difficulty_level": "easy|medium|hard"
    }
  ]
}

Rules:
- key_points: 5-8 items
- formulas: 0-5 items (only if the topic has mathematical/scientific formulas; empty array otherwise)
- flashcards: 6-8 items
- quiz_questions: 5-8 MCQ items with exactly 4 options each
- Return ONLY the JSON object, no markdown fences or extra text`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  const parsed = JSON.parse(clean) as GeneratedContent;
  return parsed;
}
