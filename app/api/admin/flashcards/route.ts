export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/** POST /api/admin/flashcards — Add a flashcard to a topic */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { topic_id, question, answer, category, difficulty_level } = body as {
    topic_id?: string; question?: string; answer?: string;
    category?: string; difficulty_level?: string;
  };
  if (!topic_id || !question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'topic_id, question, and answer are required' }, { status: 400 });
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
    `SELECT MAX(order_index) AS max_idx FROM global_generated_flashcards WHERE global_content_id = $1`,
    [content.id]
  );
  const orderIndex = (maxRow?.max_idx ?? -1) + 1;

  const [fc] = await query<{ id: string }>(
    `INSERT INTO global_generated_flashcards (global_content_id, question, answer, category, difficulty_level, order_index)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [content.id, question.trim(), answer.trim(), category ?? null, difficulty_level ?? 'medium', orderIndex]
  );

  return NextResponse.json({ ok: true, id: fc.id });
}
