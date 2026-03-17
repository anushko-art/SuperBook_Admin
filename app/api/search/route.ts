export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/search?q=<text>&type=topics|images|videos|all
 * Full-text search across topics, learning images, and learning videos.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type') ?? 'all';

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  const pattern = `%${q}%`;

  try {
    const results: {
      topics: unknown[]; images: unknown[]; videos: unknown[];
    } = { topics: [], images: [], videos: [] };

    if (type === 'topics' || type === 'all') {
      results.topics = await query(
        `SELECT t.id, t.title, t.difficulty_level,
                c.title AS chapter_title, c.id AS chapter_id,
                tb.subject, tb.grade
         FROM topics t
         JOIN chapters c ON t.chapter_id = c.id
         JOIN textbooks tb ON c.textbook_id = tb.id
         WHERE t.title ILIKE $1 OR t.source_markdown ILIKE $1
         ORDER BY t.title
         LIMIT 20`,
        [pattern]
      );
    }

    if (type === 'images' || type === 'all') {
      results.images = await query(
        `SELECT li.id, li.file_name, li.file_path, li.alt_text, li.caption,
                li.image_type, li.topic_id, t.title AS topic_title
         FROM learning_images li
         LEFT JOIN topics t ON li.topic_id = t.id
         WHERE li.alt_text ILIKE $1 OR li.caption ILIKE $1 OR li.description ILIKE $1 OR li.file_name ILIKE $1
         LIMIT 20`,
        [pattern]
      );
    }

    if (type === 'videos' || type === 'all') {
      results.videos = await query(
        `SELECT lv.id, lv.title, lv.description, lv.youtube_url, lv.youtube_id,
                lv.channel_name, lv.duration_seconds, lv.topic_id, t.title AS topic_title
         FROM learning_videos lv
         LEFT JOIN topics t ON lv.topic_id = t.id
         WHERE lv.title ILIKE $1 OR lv.description ILIKE $1 OR lv.channel_name ILIKE $1
         LIMIT 20`,
        [pattern]
      );
    }

    return NextResponse.json({ query: q, ...results });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
