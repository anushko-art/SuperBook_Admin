export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';

// Directory to store uploaded files
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const textbookId = formData.get('textbook_id') as string | null;
    const chapterId = formData.get('chapter_id') as string | null;
    const fileType = formData.get('file_type') as string || 'markdown';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${timestamp}_${originalName}`;
    const filePath = path.join(UPLOAD_DIR, storedFilename);

    await writeFile(filePath, buffer);

    // Record in DB
    const [uploaded] = await query<{ id: string }>(
      `INSERT INTO uploaded_files
         (original_filename, stored_filename, file_path, file_size_bytes, mime_type,
          file_type, linked_textbook_id, linked_chapter_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'uploaded')
       RETURNING id`,
      [
        file.name,
        storedFilename,
        `/uploads/${storedFilename}`,
        file.size,
        file.type || 'application/octet-stream',
        fileType,
        textbookId || null,
        chapterId || null,
      ]
    );

    // If it's a markdown file and a chapter is linked, update chapter content
    if (fileType === 'markdown' && chapterId) {
      const content = buffer.toString('utf-8');
      await query(
        `UPDATE chapters
         SET content_markdown = $1,
             content_length = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [content, content.length, chapterId]
      );

      // Mark file as ingested
      await query(
        `UPDATE uploaded_files SET status = 'ingested', processed_at = NOW() WHERE id = $1`,
        [uploaded.id]
      );
    }

    return NextResponse.json({
      id: uploaded.id,
      filename: storedFilename,
      path: `/uploads/${storedFilename}`,
      size: file.size,
      status: fileType === 'markdown' && chapterId ? 'ingested' : 'uploaded',
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const files = await query(
      `SELECT uf.*, t.title AS textbook_title, c.title AS chapter_title
       FROM uploaded_files uf
       LEFT JOIN textbooks t ON uf.linked_textbook_id = t.id
       LEFT JOIN chapters c ON uf.linked_chapter_id = c.id
       ORDER BY uf.created_at DESC
       LIMIT 100`
    );
    return NextResponse.json({ files });
  } catch (err) {
    console.error('GET /api/upload error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
