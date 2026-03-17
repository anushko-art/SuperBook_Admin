export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/topics?chapter_id=<uuid>
 * Returns all topics for a chapter with generation status.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chapter_id = searchParams.get('chapter_id');

  if (!chapter_id) {
    return NextResponse.json({ error: 'chapter_id is required' }, { status: 400 });
  }

  try {
    const topics = await query(
      `SELECT
         t.id, t.title, t.slug, t.order_index,
         t.source_markdown,
         t.difficulty_level, t.is_key_concept, t.is_formula,
         t.created_at, t.updated_at,
         gc.id            AS content_id,
         gc.generation_model,
         gc.updated_at    AS generated_at,
         gc.is_latest     AS content_is_latest,
         (SELECT COUNT(*)::int FROM global_generated_flashcards WHERE global_content_id = gc.id) AS flashcard_count,
         (SELECT COUNT(*)::int FROM global_generated_quiz_questions WHERE global_content_id = gc.id) AS quiz_count
       FROM topics t
       LEFT JOIN global_generated_content gc ON t.id = gc.topic_id AND gc.is_latest = true
       WHERE t.chapter_id = $1
       ORDER BY t.order_index`,
      [chapter_id]
    );

    return NextResponse.json({ topics });
  } catch (err) {
    console.error('GET /api/topics error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * POST /api/topics
 * Body: { chapter_id, title, source_markdown?, order_index? }
 * Creates a new topic. order_index defaults to (current max + 1).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { chapter_id, title, source_markdown, order_index } = body as {
    chapter_id?: string;
    title?: string;
    source_markdown?: string;
    order_index?: number;
  };

  if (!chapter_id || !title?.trim()) {
    return NextResponse.json({ error: 'chapter_id and title are required' }, { status: 400 });
  }

  try {
    // Auto order_index if not supplied
    let idx = order_index;
    if (idx === undefined) {
      const [row] = await query<{ max_idx: number | null }>(
        `SELECT MAX(order_index) AS max_idx FROM topics WHERE chapter_id = $1`,
        [chapter_id]
      );
      idx = (row?.max_idx ?? -1) + 1;
    }

    const slug = title.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const [topic] = await query<{ id: string }>(
      `INSERT INTO topics (chapter_id, title, slug, source_markdown, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [chapter_id, title.trim(), slug, source_markdown ?? null, idx]
    );

    return NextResponse.json({ ok: true, topic_id: topic.id, order_index: idx });
  } catch (err) {
    console.error('POST /api/topics error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Database error' }, { status: 500 });
  }
}
