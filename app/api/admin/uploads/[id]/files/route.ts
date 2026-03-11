import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [upload] = await query<{ original_filename: string; file_path: string }>(
      `SELECT original_filename, file_path FROM uploaded_files WHERE id = $1`,
      [id]
    );

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const folderName = upload.original_filename;
    const folderPath = path.join(process.cwd(), 'public', 'uploads', folderName);

    let files: string[] = [];
    try {
      files = await readdir(folderPath);
    } catch {
      // folder doesn't exist in public/uploads yet
    }

    const images = files
      .filter((f) => /\.(jpe?g|png|gif|webp|svg)$/i.test(f))
      .map((f) => `/uploads/${folderName}/${f}`);

    // Get chapter markdown from DB if available
    const [chapter] = await query<{ content_markdown: string | null; exercises_markdown: string | null; title: string }>(
      `SELECT c.content_markdown, c.exercises_markdown, c.title
       FROM chapters c
       JOIN uploaded_files uf ON uf.linked_chapter_id = c.id
       WHERE uf.id = $1`,
      [id]
    );

    // Try to read raw .md from disk too
    let rawMarkdown: string | null = null;
    const mdFile = files.find((f) => f.endsWith('.md') && !f.endsWith('.EXE.md'));
    if (mdFile) {
      try {
        rawMarkdown = await readFile(path.join(folderPath, mdFile), 'utf-8');
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      folder: folderName,
      folder_path: `/uploads/${folderName}`,
      images,
      all_files: files,
      markdown: chapter?.content_markdown ?? rawMarkdown ?? null,
      exercises: chapter?.exercises_markdown ?? null,
      chapter_title: chapter?.title ?? folderName,
    });
  } catch (err) {
    console.error('GET /api/admin/uploads/[id]/files error:', err);
    return NextResponse.json({ error: 'Failed to read folder' }, { status: 500 });
  }
}
