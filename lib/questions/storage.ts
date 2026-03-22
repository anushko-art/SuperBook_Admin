/**
 * Question Media Storage
 * ─────────────────────────────────────────────────────────────────────────────
 * Local  (default)  → writes/reads from  public/uploads/questions/
 * Vercel deployment → uses Supabase Storage bucket: question-media
 *
 * Storage path format: {batchId}/{questionIndex}/{role}.{ext}
 * Public URL:
 *   Local:  /uploads/questions/{batchId}/{questionIndex}/{role}.{ext}
 *   Vercel: https://<project>.supabase.co/storage/v1/object/public/question-media/...
 */

const IS_VERCEL = process.env.VERCEL === '1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BUCKET = 'question-media';

// ── MIME helpers ──────────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

function mimeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

// ── Supabase storage client (server-side only) ────────────────────────────────
async function getStorageClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Path helpers ──────────────────────────────────────────────────────────────

export function questionMediaPath(
  batchId: string,
  questionIndex: number,
  role: string,
  ext: string
): string {
  return `${batchId}/${questionIndex}/${role}.${ext}`;
}

export function questionMediaPublicUrl(storagePath: string): string {
  if (IS_VERCEL && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  }
  return `/uploads/questions/${storagePath}`;
}

// ── storeQuestionMedia ────────────────────────────────────────────────────────

export async function storeQuestionMedia(
  buffer: Buffer,
  batchId: string,
  questionIndex: number,
  role: string,
  filename: string
): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'png';
  const storagePath = questionMediaPath(batchId, questionIndex, role, ext);

  if (IS_VERCEL) {
    const supabase = await getStorageClient();

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
  const dir = path.join(
    process.cwd(),
    'public',
    'uploads',
    'questions',
    batchId,
    String(questionIndex)
  );
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${role}.${ext}`), buffer);
  return `/uploads/questions/${storagePath}`;
}

// ── removeQuestionMedia ───────────────────────────────────────────────────────

export async function removeQuestionMedia(publicUrl: string): Promise<void> {
  if (publicUrl.startsWith('http') && publicUrl.includes('supabase')) {
    const match = publicUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
    if (match) {
      const supabase = await getStorageClient();
      await supabase.storage.from(BUCKET).remove([match[1]]);
    }
  } else if (!publicUrl.startsWith('http')) {
    const { unlink } = await import('fs/promises');
    const path = await import('path');
    await unlink(path.join(process.cwd(), 'public', publicUrl)).catch(() => {});
  }
}
