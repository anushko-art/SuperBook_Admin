import { NextResponse } from 'next/server';
import { storeFile } from '@/lib/storage';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/admin/images/upload
 * FormData: { chapter_id, topic_id? (optional), files: File[] }
 *
 * Saves uploaded images via the storage abstraction (local FS or Vercel Blob)
 * and upserts records in learning_images.
 */
export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const chapterId = formData.get('chapter_id') as string | null;
  const topicId   = formData.get('topic_id')   as string | null;

  if (!chapterId) {
    return NextResponse.json({ error: 'chapter_id is required' }, { status: 400 });
  }

  const files = formData.getAll('files') as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const results: { name: string; path: string; skipped: boolean }[] = [];

  for (const file of files) {
    const filename  = file.name;
    const buffer    = Buffer.from(await file.arrayBuffer());
    const publicPath = await storeFile(buffer, chapterId, filename);

    const [existing] = await query<{ id: string }>(
      `SELECT id FROM learning_images WHERE chapter_id = $1 AND file_name = $2`,
      [chapterId, filename]
    );

    if (existing) {
      if (topicId) {
        await query(
          `UPDATE learning_images SET topic_id = $1, file_path = $2, updated_at = NOW() WHERE id = $3`,
          [topicId, publicPath, existing.id]
        );
      }
    } else {
      await query(
        `INSERT INTO learning_images
           (chapter_id, topic_id, file_name, file_path, image_type, is_from_textbook)
         VALUES ($1, $2, $3, $4, 'diagram', true)`,
        [chapterId, topicId ?? null, filename, publicPath]
      );
    }

    results.push({ name: filename, path: publicPath, skipped: !!existing });
  }

  return NextResponse.json({
    ok: true,
    uploaded: results.filter((r) => !r.skipped).length,
    skipped:  results.filter((r) => r.skipped).length,
    results,
  });
}
