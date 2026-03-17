export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/admin/videos?topic_id=<uuid>
 * Returns videos for a topic.
 *
 * POST /api/admin/videos
 * Body: { topic_id, title, youtube_url, description?, channel_name? }
 * Adds a YouTube video for a topic.
 *
 * DELETE /api/admin/videos?id=<uuid>
 * Removes a video.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic_id = searchParams.get('topic_id');

  try {
    const videos = await query(
      topic_id
        ? `SELECT lv.*, t.title AS topic_title FROM learning_videos lv LEFT JOIN topics t ON lv.topic_id = t.id WHERE lv.topic_id = $1 ORDER BY lv.created_at DESC`
        : `SELECT lv.*, t.title AS topic_title FROM learning_videos lv LEFT JOIN topics t ON lv.topic_id = t.id ORDER BY lv.created_at DESC LIMIT 100`,
      topic_id ? [topic_id] : []
    );
    return NextResponse.json({ videos });
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { topic_id, title, youtube_url, description, channel_name, duration_seconds } = body as {
    topic_id?: string; title?: string; youtube_url?: string;
    description?: string; channel_name?: string; duration_seconds?: number;
  };

  if (!title || !youtube_url) {
    return NextResponse.json({ error: 'title and youtube_url are required' }, { status: 400 });
  }

  // Extract YouTube ID from URL
  const youtube_id = extractYoutubeId(youtube_url);

  try {
    const [video] = await query<{ id: string }>(
      `INSERT INTO learning_videos (topic_id, title, youtube_id, youtube_url, description, channel_name, duration_seconds, added_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [topic_id ?? null, title, youtube_id, youtube_url, description ?? null, channel_name ?? null, duration_seconds ?? null, session.userId]
    );
    return NextResponse.json({ ok: true, id: video.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await query(`DELETE FROM learning_videos WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
