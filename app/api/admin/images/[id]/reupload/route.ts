import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/images/[id]/reupload
 * FormData: { file: File }
 *
 * Overwrites the physical file on disk with the same filename,
 * so all markdown references remain valid.
 * Updates updated_at in DB but keeps file_path and file_name unchanged.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const [img] = await query<{ chapter_id: string; file_name: string; file_path: string }>(
    `SELECT chapter_id, file_name, file_path FROM learning_images WHERE id = $1`,
    [id]
  );
  if (!img) return NextResponse.json({ error: 'Image record not found' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // Write file to disk — same path, same name (overwrites existing)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chapters', img.chapter_id);
  await mkdir(uploadDir, { recursive: true });
  const destPath = path.join(uploadDir, img.file_name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destPath, buffer);

  // Touch updated_at so the admin can see it changed
  await query(`UPDATE learning_images SET updated_at = NOW() WHERE id = $1`, [id]);

  return NextResponse.json({ ok: true, file_path: img.file_path, file_name: img.file_name });
}
