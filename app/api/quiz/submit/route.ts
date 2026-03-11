import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * POST /api/quiz/submit
 * Body: { quiz_question_id, topic_id, user_answer_id, time_taken_seconds? }
 *
 * Grades the answer, stores the attempt, updates user_topic_progress.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { quiz_question_id, topic_id, user_answer_id, time_taken_seconds } = body as {
    quiz_question_id?: string;
    topic_id?: string;
    user_answer_id?: number;
    time_taken_seconds?: number;
  };

  if (!quiz_question_id || !topic_id || user_answer_id === undefined) {
    return NextResponse.json({ error: 'quiz_question_id, topic_id, and user_answer_id are required' }, { status: 400 });
  }

  try {
    // Fetch the question to grade
    const [question] = await query<{ correct_answer_id: number; explanation: string; options: unknown[] }>(
      `SELECT correct_answer_id, explanation, options FROM global_generated_quiz_questions WHERE id = $1`,
      [quiz_question_id]
    );

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const is_correct = question.correct_answer_id === user_answer_id;
    const score = is_correct ? 1.0 : 0.0;

    // Count attempt number
    const [{ attempt_count }] = await query<{ attempt_count: number }>(
      `SELECT COUNT(*)::int AS attempt_count FROM user_quiz_attempts
       WHERE user_id = $1 AND quiz_question_id = $2`,
      [session.userId, quiz_question_id]
    );

    // Insert attempt
    await query(
      `INSERT INTO user_quiz_attempts
         (user_id, quiz_question_id, topic_id, attempt_number, user_answer_id, is_correct, score, time_taken_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [session.userId, quiz_question_id, topic_id, (attempt_count ?? 0) + 1, user_answer_id, is_correct, score, time_taken_seconds ?? null]
    );

    // Update user_topic_progress quiz stats
    await query(
      `INSERT INTO user_topic_progress (user_id, topic_id, quiz_attempted, quiz_score, status)
       VALUES ($1, $2, true, $3, 'in_progress')
       ON CONFLICT (user_id, topic_id) DO UPDATE SET
         quiz_attempted = true,
         quiz_score = GREATEST(COALESCE(user_topic_progress.quiz_score, 0), $3),
         updated_at = NOW()`,
      [session.userId, topic_id, score * 100]
    );

    return NextResponse.json({
      ok: true,
      is_correct,
      correct_answer_id: question.correct_answer_id,
      explanation: question.explanation,
    });
  } catch (err) {
    console.error('Quiz submit error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
