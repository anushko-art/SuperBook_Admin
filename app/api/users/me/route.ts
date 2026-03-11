import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/users/me
 * Returns the current user's profile + learning insights.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [user] = await query<{ id: string; email: string; display_name: string; role: string; created_at: string }>(
      `SELECT id, email, display_name, role, created_at FROM users WHERE id = $1`,
      [session.userId]
    );

    // Compute insights
    const [stats] = await query<{
      topics_completed: number; avg_score: number; total_hours: number; topics_this_week: number;
    }>(
      `SELECT
         COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS topics_completed,
         ROUND(AVG(quiz_score)::numeric, 1)::float              AS avg_score,
         ROUND((SUM(time_spent_seconds) / 3600.0)::numeric, 2)::float AS total_hours,
         COUNT(CASE WHEN status = 'completed' AND updated_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS topics_this_week
       FROM user_topic_progress
       WHERE user_id = $1`,
      [session.userId]
    );

    // Weak topics (avg quiz score < 60)
    const weakTopics = await query(
      `SELECT t.id, t.title, ROUND(AVG(uqa.score * 100)::numeric, 1) AS avg_score
       FROM user_quiz_attempts uqa
       JOIN topics t ON uqa.topic_id = t.id
       WHERE uqa.user_id = $1
       GROUP BY t.id, t.title
       HAVING AVG(uqa.score) < 0.6
       ORDER BY AVG(uqa.score) ASC
       LIMIT 5`,
      [session.userId]
    );

    // Strong topics (avg quiz score > 80)
    const strongTopics = await query(
      `SELECT t.id, t.title, ROUND(AVG(uqa.score * 100)::numeric, 1) AS avg_score
       FROM user_quiz_attempts uqa
       JOIN topics t ON uqa.topic_id = t.id
       WHERE uqa.user_id = $1
       GROUP BY t.id, t.title
       HAVING AVG(uqa.score) > 0.8
       ORDER BY AVG(uqa.score) DESC
       LIMIT 5`,
      [session.userId]
    );

    // Recent activity (last 10 topics accessed)
    const recentTopics = await query(
      `SELECT t.id, t.title, utp.status, utp.completion_percentage, utp.last_accessed_at
       FROM user_topic_progress utp
       JOIN topics t ON utp.topic_id = t.id
       WHERE utp.user_id = $1 AND utp.last_accessed_at IS NOT NULL
       ORDER BY utp.last_accessed_at DESC
       LIMIT 10`,
      [session.userId]
    );

    return NextResponse.json({
      user,
      stats: stats ?? { topics_completed: 0, avg_score: 0, total_hours: 0, topics_this_week: 0 },
      weak_topics: weakTopics,
      strong_topics: strongTopics,
      recent_topics: recentTopics,
    });
  } catch (err) {
    console.error('GET /api/users/me error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
