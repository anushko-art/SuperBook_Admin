/**
 * Storage abstraction
 * ─────────────────────────────────────────────────────────────────────────────
 * Local  (default)  → writes/reads from  public/uploads/
 * Vercel deployment → uses @vercel/blob (requires BLOB_READ_WRITE_TOKEN env var)
 *
 * The returned `filePath` is always a public URL:
 *   Local:  /uploads/chapters/<chapterId>/<filename>
 *   Vercel: https://<store>.public.blob.vercel-storage.com/chapters/<id>/<file>
 */

const IS_VERCEL = process.env.VERCEL === '1';

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

// ── storeFile ─────────────────────────────────────────────────────────────────
/**
 * Save a file buffer and return its public URL / path.
 */
export async function storeFile(
  buffer: Buffer,
  chapterId: string,
  filename: string,
): Promise<string> {
  if (IS_VERCEL) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`chapters/${chapterId}/${filename}`, buffer, {
      access: 'public',
      contentType: mimeFromName(filename),
      // Overwrite if same path already exists
      allowOverwrite: true,
    } as Parameters<typeof put>[2]);
    return blob.url;
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
/**
 * Delete a file given its public URL / path (as stored in learning_images.file_path).
 */
export async function removeFile(filePath: string): Promise<void> {
  if (filePath.startsWith('http')) {
    const { del } = await import('@vercel/blob');
    await del(filePath);
  } else {
    const { unlink } = await import('fs/promises');
    const path = await import('path');
    await unlink(path.join(process.cwd(), 'public', filePath)).catch(() => {});
  }
}

// ── readFileForAI ─────────────────────────────────────────────────────────────
/**
 * Read a stored image into a Buffer (for Gemini Vision).
 * Works for both local paths and remote URLs.
 */
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
/**
 * Returns the base URL prefix used by MarkdownRenderer to resolve bare
 * image filenames (e.g. "img_foo.jpeg") found in source_markdown.
 *
 * Local:  /uploads/chapters/<chapterId>/
 * Vercel: https://<store>.public.blob.vercel-storage.com/chapters/<chapterId>/
 *         (requires NEXT_PUBLIC_BLOB_BASE_URL env var)
 */
export function imageBaseUrl(chapterId: string): string {
  if (IS_VERCEL && process.env.NEXT_PUBLIC_BLOB_BASE_URL) {
    const base = process.env.NEXT_PUBLIC_BLOB_BASE_URL.replace(/\/$/, '');
    return `${base}/chapters/${chapterId}/`;
  }
  return `/uploads/chapters/${chapterId}/`;
}
