export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/subtopics?topic_id=<uuid>
 * GET /api/subtopics?chapter_id=<uuid>  ← returns all subtopics for every topic in chapter
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic_id = searchParams.get('topic_id');
  const chapter_id = searchParams.get('chapter_id');

  if (!topic_id && !chapter_id) {
    return NextResponse.json({ error: 'topic_id or chapter_id is required' }, { status: 400 });
  }

  try {
    let subtopics;
    if (topic_id) {
      subtopics = await query(
        `SELECT id, topic_id, title, slug, source_markdown, order_index, created_at, updated_at
         FROM subtopics WHERE topic_id = $1 ORDER BY order_index`,
        [topic_id]
      );
    } else {
      subtopics = await query(
        `SELECT s.id, s.topic_id, s.title, s.slug, s.source_markdown, s.order_index,
                s.created_at, s.updated_at
         FROM subtopics s
         JOIN topics t ON s.topic_id = t.id
         WHERE t.chapter_id = $1
         ORDER BY t.order_index, s.order_index`,
        [chapter_id]
      );
    }
    return NextResponse.json({ subtopics });
  } catch (err) {
    console.error('GET /api/subtopics error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * POST /api/subtopics
 * Body: { topic_id, title, source_markdown?, order_index? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { topic_id, title, source_markdown, order_index } = body as {
    topic_id?: string;
    title?: string;
    source_markdown?: string;
    order_index?: number;
  };

  if (!topic_id || !title?.trim()) {
    return NextResponse.json({ error: 'topic_id and title are required' }, { status: 400 });
  }

  try {
    let idx = order_index;
    if (idx === undefined) {
      const [row] = await query<{ max_idx: number | null }>(
        `SELECT MAX(order_index) AS max_idx FROM subtopics WHERE topic_id = $1`,
        [topic_id]
      );
      idx = (row?.max_idx ?? -1) + 1;
    }

    const slug = title.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const [subtopic] = await query<{ id: string }>(
      `INSERT INTO subtopics (topic_id, title, slug, source_markdown, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [topic_id, title.trim(), slug, source_markdown ?? null, idx]
    );

    return NextResponse.json({ ok: true, subtopic_id: subtopic.id, order_index: idx }, { status: 201 });
  } catch (err) {
    console.error('POST /api/subtopics error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Database error' }, { status: 500 });
  }
}
