import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';

/**
 * POST /api/admin/images/upload
 * FormData: { chapter_id, topic_id? (optional), files: File[] }
 *
 * Saves uploaded image files to public/uploads/chapters/[chapter_id]/
 * and creates records in learning_images (tagged with topic_id if provided).
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

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chapters', chapterId);
  await mkdir(uploadDir, { recursive: true });

  const results: { name: string; path: string; skipped: boolean }[] = [];

  for (const file of files) {
    const filename = file.name;
    const destPath = path.join(uploadDir, filename);
    const publicPath = `/uploads/chapters/${chapterId}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(destPath, buffer);

    const [existing] = await query<{ id: string }>(
      `SELECT id FROM learning_images WHERE chapter_id = $1 AND file_name = $2`,
      [chapterId, filename]
    );

    if (existing) {
      // If topic_id provided, tag existing record with it
      if (topicId) {
        await query(
          `UPDATE learning_images SET topic_id = $1 WHERE id = $2`,
          [topicId, existing.id]
        );
      }
    } else {
      await query(
        `INSERT INTO learning_images (chapter_id, topic_id, file_name, file_path, image_type, is_from_textbook)
         VALUES ($1, $2, $3, $4, 'diagram', true)`,
        [chapterId, topicId ?? null, filename, publicPath]
      );
    }

    results.push({ name: filename, path: publicPath, skipped: !!existing });
  }

  const uploaded = results.filter((r) => !r.skipped).length;
  const skipped  = results.filter((r) => r.skipped).length;

  return NextResponse.json({ ok: true, uploaded, skipped, results });
}
