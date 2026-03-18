/**
 * Storage abstraction
 * ─────────────────────────────────────────────────────────────────────────────
 * Local  (default)  → writes/reads from  public/uploads/
 * Vercel deployment → uses Supabase Storage (requires SUPABASE_SERVICE_ROLE_KEY)
 *
 * The returned `filePath` is always a public URL:
 *   Local:  /uploads/chapters/<chapterId>/<filename>
 *   Vercel: https://<project>.supabase.co/storage/v1/object/public/chapter-images/...
 */

const IS_VERCEL = process.env.VERCEL === '1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BUCKET = 'chapter-images';

// ── MIME helpers ──────────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png',  gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml',
};

function mimeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

// ── Supabase storage client (server-side only) ─────────────────────────────
async function getStorageClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── storeFile ─────────────────────────────────────────────────────────────────
export async function storeFile(
  buffer: Buffer,
  chapterId: string,
  filename: string,
): Promise<string> {
  if (IS_VERCEL) {
    const supabase = await getStorageClient();
    const storagePath = `chapters/${chapterId}/${filename}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeFromName(filename),
        upsert: true,
      });

    if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  // Local filesystem
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'public', 'uploads', 'chapters', chapterId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/chapters/${chapterId}/${filename}`;
}

// ── removeFile ────────────────────────────────────────────────────────────────
export async function removeFile(filePath: string): Promise<void> {
  if (filePath.startsWith('http') && filePath.includes('supabase')) {
    // Extract path after /object/public/<bucket>/
    const match = filePath.match(/\/object\/public\/[^/]+\/(.+)$/);
    if (match) {
      const supabase = await getStorageClient();
      await supabase.storage.from(BUCKET).remove([match[1]]);
    }
  } else if (filePath.startsWith('http')) {
    // Legacy Vercel Blob or other remote — skip silently
  } else {
    const { unlink } = await import('fs/promises');
    const path = await import('path');
    await unlink(path.join(process.cwd(), 'public', filePath)).catch(() => {});
  }
}

// ── readFileForAI ─────────────────────────────────────────────────────────────
export async function readFileForAI(filePath: string): Promise<Buffer> {
  if (filePath.startsWith('http')) {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const { readFile } = await import('fs/promises');
  const path = await import('path');
  return readFile(path.join(process.cwd(), 'public', filePath));
}

// ── imageBaseUrl ──────────────────────────────────────────────────────────────
export function imageBaseUrl(chapterId: string): string {
  if (IS_VERCEL && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/chapters/${chapterId}/`;
  }
  return `/uploads/chapters/${chapterId}/`;
}
