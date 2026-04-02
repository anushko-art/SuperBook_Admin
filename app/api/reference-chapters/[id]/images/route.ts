export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const IS_VERCEL = process.env.VERCEL === '1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BUCKET = 'reference_images';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
};
function mimeFromName(filename: string) {
  return MIME[filename.split('.').pop()?.toLowerCase() ?? ''] ?? 'image/jpeg';
}

async function storeReferenceImage(buffer: Buffer, chapterId: string, filename: string): Promise<string> {
  if (IS_VERCEL) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const storagePath = `chapters/${chapterId}/${filename}`;
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: mimeFromName(filename), upsert: true,
    });
    if (error) throw new Error(error.message);
    return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  }
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'public', 'uploads', 'reference', chapterId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/reference/${chapterId}/${filename}`;
}

/* GET /api/reference-chapters/[id]/images */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const images = await query(
      `SELECT id, image_path, storage_url, caption, page
       FROM reference_images WHERE reference_chapter_id = $1 ORDER BY page NULLS LAST, created_at`,
      [id]
    );
    return NextResponse.json({ images });
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/* POST /api/reference-chapters/[id]/images
 * FormData: { files: File[], dict?: File (JSON) }
 * dict format: [{ filename, caption, page }] or { filename: caption }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  // Parse optional image_dict
  const dictFile = formData.get('dict') as File | null;
  const captionMap = new Map<string, { caption: string; page?: number }>();
  if (dictFile) {
    try {
      const raw = JSON.parse(await dictFile.text());
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (item.filename) captionMap.set(item.filename, { caption: item.caption ?? '', page: item.page });
        }
      } else if (typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          captionMap.set(k, { caption: String(v) });
        }
      }
    } catch { /* ignore malformed dict */ }
  }

  const files = formData.getAll('files') as File[];
  if (files.length === 0) return NextResponse.json({ error: 'No files provided' }, { status: 400 });

  const results: { name: string; url: string }[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storeReferenceImage(buffer, id, file.name);
    const meta = captionMap.get(file.name);

    const [existing] = await query<{ id: string }>(
      `SELECT id FROM reference_images WHERE reference_chapter_id = $1 AND image_path = $2`,
      [id, file.name]
    );
    if (existing) {
      await query(
        `UPDATE reference_images SET storage_url=$1, caption=$2, page=$3, updated_at=now() WHERE id=$4`,
        [url, meta?.caption ?? null, meta?.page ?? null, existing.id]
      );
    } else {
      await query(
        `INSERT INTO reference_images (reference_chapter_id, image_path, storage_url, caption, page)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, file.name, url, meta?.caption ?? null, meta?.page ?? null]
      );
    }
    results.push({ name: file.name, url });
  }

  return NextResponse.json({ ok: true, uploaded: results.length, results }, { status: 201 });
}
