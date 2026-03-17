import { NextResponse } from 'next/server';
import { storeFile } from '@/lib/storage';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/images/[id]/reupload
 * FormData: { file: File }
 *
 * Overwrites the stored file with the same filename so all markdown
 * references remain valid. Updates the file_path in DB (important for
 * Vercel Blob where each upload gets its own URL).
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const [img] = await query<{ chapter_id: string; file_name: string }>(
    `SELECT chapter_id, file_name FROM learning_images WHERE id = $1`,
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

  const buffer    = Buffer.from(await file.arrayBuffer());
  const publicPath = await storeFile(buffer, img.chapter_id, img.file_name);

  // Update file_path in case it changed (Vercel Blob URL) and touch updated_at
  await query(
    `UPDATE learning_images SET file_path = $1, updated_at = NOW() WHERE id = $2`,
    [publicPath, id]
  );

  return NextResponse.json({ ok: true, file_path: publicPath, file_name: img.file_name });
}
