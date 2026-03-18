export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { storeFile } from '@/lib/storage';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';


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

    const session = await getSession();
    const uploaderId = session?.userId || null;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${timestamp}_${originalName}`;
    
    // Use storage abstraction instead of local fs path
    const publicUrl = await storeFile(buffer, chapterId || 'unassigned', storedFilename);

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
        publicUrl,
        file.size,
        file.type || 'application/octet-stream',
        fileType,
        textbookId || null,
        chapterId || null,
      ]
    );

    // Best-effort: record uploader (column may not exist yet pre-migration)
    if (uploaderId) {
      try {
        await query(`UPDATE uploaded_files SET uploader_id = $1 WHERE id = $2`, [uploaderId, uploaded.id]);
      } catch { /* column not yet migrated — safe to skip */ }
    }

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
      path: publicUrl,
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
