import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/** POST /api/admin/quiz-questions — Add a single quiz question to a topic */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { topic_id, question_text, question_type, options, correct_answer_id, explanation, difficulty_level } = body as {
    topic_id?: string; question_text?: string; question_type?: string;
    options?: unknown; correct_answer_id?: number;
    explanation?: string; difficulty_level?: string;
  };
  if (!topic_id || !question_text?.trim()) {
    return NextResponse.json({ error: 'topic_id and question_text are required' }, { status: 400 });
  }

  // Get or create global_generated_content
  let [content] = await query<{ id: string }>(
    `SELECT id FROM global_generated_content WHERE topic_id = $1 AND is_latest = true`, [topic_id]
  );
  if (!content) {
    const [inserted] = await query<{ id: string }>(
      `INSERT INTO global_generated_content (topic_id, is_latest, generation_model) VALUES ($1, true, 'manual') RETURNING id`,
      [topic_id]
    );
    content = inserted;
  }

  const [maxRow] = await query<{ max_idx: number | null }>(
    `SELECT MAX(order_index) AS max_idx FROM global_generated_quiz_questions WHERE global_content_id = $1`,
    [content.id]
  );
  const orderIndex = (maxRow?.max_idx ?? -1) + 1;

  const [qq] = await query<{ id: string }>(
    `INSERT INTO global_generated_quiz_questions
       (global_content_id, question_text, question_type, options, correct_answer_id, explanation, difficulty_level, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [content.id, question_text.trim(), question_type ?? 'mcq',
     JSON.stringify(options ?? []), correct_answer_id ?? null,
     explanation ?? null, difficulty_level ?? 'medium', orderIndex]
  );

  return NextResponse.json({ ok: true, id: qq.id });
}
