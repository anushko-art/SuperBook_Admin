import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/flashcards/due?topic_id=<uuid>
 * Returns flashcards due for review (SM-2 scheduling) for a topic.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const topic_id = searchParams.get('topic_id');

  if (!topic_id) {
    return NextResponse.json({ error: 'topic_id is required' }, { status: 400 });
  }

  try {
    const flashcards = await query(
      `SELECT
         ggf.id, ggf.question, ggf.answer, ggf.category, ggf.difficulty_level, ggf.order_index,
         COALESCE(ufp.review_count, 0)     AS review_count,
         COALESCE(ufp.correct_count, 0)    AS correct_count,
         COALESCE(ufp.interval_days, 1)    AS interval_days,
         ufp.next_review_at,
         ufp.easiness_factor
       FROM global_generated_flashcards ggf
       JOIN global_generated_content gc ON ggf.global_content_id = gc.id
       LEFT JOIN user_flashcard_progress ufp
         ON ggf.id = ufp.flashcard_id AND ufp.user_id = $1
       WHERE gc.topic_id = $2 AND gc.is_latest = true
       ORDER BY
         CASE WHEN ufp.user_id IS NULL THEN 0 ELSE 1 END,
         ufp.next_review_at ASC NULLS FIRST,
         ggf.order_index`,
      [session.userId, topic_id]
    );

    return NextResponse.json({ flashcards });
  } catch (err) {
    console.error('Flashcards due error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
