import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/quiz
 * Body: { topic_id, questions: QuizQuestion[] }
 *
 * Creates or updates global_generated_content for the topic,
 * then replaces all quiz questions with the uploaded set.
 *
 * QuizQuestion shape:
 * {
 *   question_text: string,
 *   question_type?: 'mcq' | 'true_false',
 *   options: { id: number, text: string, is_correct: boolean }[],
 *   correct_answer_id: number,
 *   explanation?: string,
 *   difficulty_level?: 'easy' | 'medium' | 'hard'
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { topic_id, questions } = body as {
    topic_id?: string;
    questions?: unknown[];
  };

  if (!topic_id) {
    return NextResponse.json({ error: 'topic_id is required' }, { status: 400 });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'questions array is required and must not be empty' }, { status: 400 });
  }

  try {
    const [topic] = await query<{ id: string }>(`SELECT id FROM topics WHERE id = $1`, [topic_id]);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Get or create global_generated_content for this topic
    let [content] = await query<{ id: string }>(
      `SELECT id FROM global_generated_content WHERE topic_id = $1 AND is_latest = true`,
      [topic_id]
    );
    if (!content) {
      const [inserted] = await query<{ id: string }>(
        `INSERT INTO global_generated_content (topic_id, is_latest, generation_model)
         VALUES ($1, true, 'manual') RETURNING id`,
        [topic_id]
      );
      content = inserted;
    }

    const contentId = content.id;
    await query(`DELETE FROM global_generated_quiz_questions WHERE global_content_id = $1`, [contentId]);

    let inserted = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i] as {
        question_text?: string;
        question_type?: string;
        options?: unknown;
        correct_answer_id?: number;
        explanation?: string;
        difficulty_level?: string;
      };
      if (!q.question_text) continue;

      await query(
        `INSERT INTO global_generated_quiz_questions
           (global_content_id, question_text, question_type, options, correct_answer_id, explanation, difficulty_level, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          contentId,
          q.question_text,
          q.question_type ?? 'mcq',
          JSON.stringify(q.options ?? []),
          q.correct_answer_id ?? null,
          q.explanation ?? null,
          q.difficulty_level ?? 'medium',
          i,
        ]
      );
      inserted++;
    }

    await query(`UPDATE global_generated_content SET updated_at = NOW() WHERE id = $1`, [contentId]);
    return NextResponse.json({ ok: true, topic_id, content_id: contentId, inserted });
  } catch (err) {
    console.error('POST /api/admin/quiz error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Database error' }, { status: 500 });
  }
}
