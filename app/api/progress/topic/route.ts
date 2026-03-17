export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * PATCH /api/progress/topic
 * Body: { topic_id, insight_read?, key_points_read?, formulas_read?, time_spent_seconds? }
 * Marks sections as read and updates user_topic_progress.
 */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { topic_id, insight_read, key_points_read, formulas_read, time_spent_seconds } = body as {
    topic_id?: string;
    insight_read?: boolean;
    key_points_read?: boolean;
    formulas_read?: boolean;
    time_spent_seconds?: number;
  };

  if (!topic_id) {
    return NextResponse.json({ error: 'topic_id is required' }, { status: 400 });
  }

  try {
    // Upsert progress
    await query(
      `INSERT INTO user_topic_progress
         (user_id, topic_id, insight_read, key_points_read, formulas_read, time_spent_seconds, last_accessed_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'in_progress')
       ON CONFLICT (user_id, topic_id) DO UPDATE SET
         insight_read    = CASE WHEN $3 THEN true ELSE user_topic_progress.insight_read END,
         key_points_read = CASE WHEN $4 THEN true ELSE user_topic_progress.key_points_read END,
         formulas_read   = CASE WHEN $5 THEN true ELSE user_topic_progress.formulas_read END,
         time_spent_seconds = user_topic_progress.time_spent_seconds + COALESCE($6, 0),
         last_accessed_at = NOW(),
         updated_at = NOW()`,
      [session.userId, topic_id, insight_read ?? false, key_points_read ?? false, formulas_read ?? false, time_spent_seconds ?? 0]
    );

    // Compute completion %: insight(30) + key_points(30) + formulas(20) + quiz(20)
    const [prog] = await query<{
      insight_read: boolean; key_points_read: boolean; formulas_read: boolean; quiz_attempted: boolean;
    }>(
      `SELECT insight_read, key_points_read, formulas_read, quiz_attempted
       FROM user_topic_progress WHERE user_id = $1 AND topic_id = $2`,
      [session.userId, topic_id]
    );

    const pct =
      (prog.insight_read ? 30 : 0) +
      (prog.key_points_read ? 30 : 0) +
      (prog.formulas_read ? 20 : 0) +
      (prog.quiz_attempted ? 20 : 0);

    const status = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started';

    await query(
      `UPDATE user_topic_progress SET completion_percentage = $1, status = $2, updated_at = NOW()
       WHERE user_id = $3 AND topic_id = $4`,
      [pct, status, session.userId, topic_id]
    );

    return NextResponse.json({ ok: true, completion_percentage: pct, status });
  } catch (err) {
    console.error('Progress update error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/progress/topic?topic_id=<uuid>
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const topic_id = searchParams.get('topic_id');
  if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

  try {
    const [progress] = await query(
      `SELECT * FROM user_topic_progress WHERE user_id = $1 AND topic_id = $2`,
      [session.userId, topic_id]
    );
    return NextResponse.json({ progress: progress ?? null });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
