export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * POST /api/admin/images/index
 * Body: { chapter_id?: string }  or empty for all chapters
 *
 * Copies chapter_images rows → learning_images, linking to the chapter.
 * Idempotent: skips images whose file_path already exists.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { chapter_id } = body as { chapter_id?: string };

  try {
    const images = await query<{
      id: string; chapter_id: string; filename: string; stored_path: string;
      original_path: string; alt_text: string; caption: string;
    }>(
      chapter_id
        ? `SELECT id, chapter_id, filename, stored_path, original_path, alt_text, caption FROM chapter_images WHERE chapter_id = $1`
        : `SELECT id, chapter_id, filename, stored_path, original_path, alt_text, caption FROM chapter_images`,
      chapter_id ? [chapter_id] : []
    );

    let indexed = 0;
    let skipped = 0;

    for (const img of images) {
      const filePath = img.stored_path || img.original_path;
      // Skip if already indexed (by file_path + chapter_id)
      const [existing] = await query(
        `SELECT id FROM learning_images WHERE file_path = $1 AND chapter_id = $2`,
        [filePath, img.chapter_id]
      );
      if (existing) { skipped++; continue; }

      await query(
        `INSERT INTO learning_images (chapter_id, file_name, file_path, alt_text, caption, image_type, is_from_textbook)
         VALUES ($1, $2, $3, $4, $5, 'diagram', true)`,
        [img.chapter_id, img.filename, filePath, img.alt_text ?? img.filename, img.caption ?? null]
      );
      indexed++;
    }

    return NextResponse.json({ ok: true, indexed, skipped, total: images.length });
  } catch (err) {
    console.error('Image index error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

/**
 * GET /api/admin/images/index?chapter_id=<uuid>
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chapter_id = searchParams.get('chapter_id');

  const images = await query(
    chapter_id
      ? `SELECT li.*, t.title AS topic_title FROM learning_images li LEFT JOIN topics t ON li.topic_id = t.id WHERE li.chapter_id = $1 ORDER BY li.created_at`
      : `SELECT li.*, t.title AS topic_title FROM learning_images li LEFT JOIN topics t ON li.topic_id = t.id ORDER BY li.created_at DESC LIMIT 100`,
    chapter_id ? [chapter_id] : []
  );
  return NextResponse.json({ images });
}
