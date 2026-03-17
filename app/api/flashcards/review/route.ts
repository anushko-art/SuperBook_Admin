export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * POST /api/flashcards/review
 * Body: { flashcard_id, quality }
 * quality: 0-5 (SM-2: 0-1 = failed, 2 = hard, 3 = medium, 4 = easy, 5 = perfect)
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { flashcard_id, quality } = body as { flashcard_id?: string; quality?: number };

  if (!flashcard_id || quality === undefined) {
    return NextResponse.json({ error: 'flashcard_id and quality (0-5) are required' }, { status: 400 });
  }
  if (quality < 0 || quality > 5) {
    return NextResponse.json({ error: 'quality must be 0-5' }, { status: 400 });
  }

  try {
    // Fetch existing progress or use defaults
    const [existing] = await query<{
      review_count: number; correct_count: number; incorrect_count: number;
      easiness_factor: number; interval_days: number;
    }>(
      `SELECT review_count, correct_count, incorrect_count, easiness_factor, interval_days
       FROM user_flashcard_progress
       WHERE user_id = $1 AND flashcard_id = $2`,
      [session.userId, flashcard_id]
    );

    const prev = existing ?? { review_count: 0, correct_count: 0, incorrect_count: 0, easiness_factor: 2.5, interval_days: 1 };

    // SM-2 algorithm
    const is_correct = quality >= 3;
    const { interval_days, easiness_factor } = sm2(
      prev.easiness_factor,
      prev.interval_days,
      prev.review_count,
      quality
    );

    const next_review_at = new Date();
    next_review_at.setDate(next_review_at.getDate() + interval_days);

    await query(
      `INSERT INTO user_flashcard_progress
         (user_id, flashcard_id, review_count, correct_count, incorrect_count, easiness_factor, interval_days, last_reviewed_at, next_review_at)
       VALUES ($1, $2, 1, $3, $4, $5, $6, NOW(), $7)
       ON CONFLICT (user_id, flashcard_id) DO UPDATE SET
         review_count   = user_flashcard_progress.review_count + 1,
         correct_count  = user_flashcard_progress.correct_count + $3,
         incorrect_count= user_flashcard_progress.incorrect_count + $4,
         easiness_factor= $5,
         interval_days  = $6,
         last_reviewed_at = NOW(),
         next_review_at   = $7,
         updated_at       = NOW()`,
      [
        session.userId, flashcard_id,
        is_correct ? 1 : 0,
        is_correct ? 0 : 1,
        easiness_factor,
        interval_days,
        next_review_at.toISOString(),
      ]
    );

    return NextResponse.json({ ok: true, is_correct, interval_days, next_review_at });
  } catch (err) {
    console.error('Flashcard review error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// SM-2 algorithm implementation
function sm2(ef: number, prevInterval: number, reviewCount: number, quality: number) {
  // New easiness factor
  let newEF = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  // Interval calculation
  let interval: number;
  if (quality < 3) {
    // Failed: reset
    interval = 1;
  } else if (reviewCount === 0) {
    interval = 1;
  } else if (reviewCount === 1) {
    interval = 6;
  } else {
    interval = Math.round(prevInterval * newEF);
  }

  return { interval_days: interval, easiness_factor: Math.round(newEF * 100) / 100 };
}
