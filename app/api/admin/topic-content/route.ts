export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/admin/topic-content?topic_id=<uuid>
 * Returns the global_generated_content, all flashcards, and all quiz questions for a topic.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic_id = searchParams.get('topic_id');
  if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

  const [content] = await query<{ id: string; generation_model: string; updated_at: string; version: number }>(
    `SELECT id, generation_model, updated_at, version FROM global_generated_content
     WHERE topic_id = $1 AND is_latest = true`,
    [topic_id]
  );

  if (!content) {
    return NextResponse.json({ content: null, flashcards: [], quiz_questions: [] });
  }

  const flashcards = await query(
    `SELECT id, question, answer, category, difficulty_level, order_index
     FROM global_generated_flashcards WHERE global_content_id = $1
     ORDER BY order_index`,
    [content.id]
  );

  const quiz_questions = await query(
    `SELECT id, question_text, question_type, options, correct_answer_id, explanation, difficulty_level, order_index
     FROM global_generated_quiz_questions WHERE global_content_id = $1
     ORDER BY order_index`,
    [content.id]
  );

  return NextResponse.json({ content, flashcards, quiz_questions });
}
