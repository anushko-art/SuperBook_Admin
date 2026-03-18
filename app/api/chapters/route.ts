export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { textbook_id, title, chapter_number, content_markdown, source_folder } = body as {
      textbook_id: string; title: string; chapter_number: number;
      content_markdown?: string; source_folder?: string;
    };
    if (!textbook_id || !title || !chapter_number) {
      return NextResponse.json({ error: 'textbook_id, title, chapter_number required' }, { status: 400 });
    }

    const session = await getSession();
    const uploaderId = session?.userId || null;
    const contentLength = content_markdown?.length ?? 0;
    const readTime = Math.max(1, Math.round(contentLength / 1500));
    const [chapter] = await query<{ id: string }>(
      `INSERT INTO chapters
         (textbook_id, title, chapter_number, display_order, content_markdown,
          content_length, estimated_read_time_minutes, source_folder, is_published)
       VALUES ($1,$2,$3,$3,$4,$5,$6,$7,false)
       ON CONFLICT (textbook_id, chapter_number) DO UPDATE
         SET title = EXCLUDED.title,
             content_markdown = COALESCE(EXCLUDED.content_markdown, chapters.content_markdown),
             updated_at = NOW()
       RETURNING id`,
      [textbook_id, title, chapter_number, content_markdown ?? null, contentLength, readTime, source_folder ?? null]
    );

    // Best-effort: record who created this chapter (column may not exist yet)
    if (uploaderId) {
      try {
        await query(`UPDATE chapters SET uploader_id = $1 WHERE id = $2`, [uploaderId, chapter.id]);
      } catch { /* column not yet migrated — safe to skip */ }
    }
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (err) {
    console.error('POST /api/chapters error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const textbookId = searchParams.get('textbook_id');

  try {
    const params: unknown[] = [];
    let where = '';
    if (textbookId) {
      params.push(textbookId);
      where = 'WHERE c.textbook_id = $1';
    }

    const chapters = await query(
      `SELECT c.id, c.textbook_id, c.title, c.chapter_number, c.display_order,
              c.estimated_read_time_minutes, c.content_length, c.source_folder,
              c.is_published, c.created_at, c.updated_at,
              t.title AS textbook_title, t.subject, t.grade, t.part
       FROM chapters c
       JOIN textbooks t ON c.textbook_id = t.id
       ${where}
       ORDER BY t.grade, t.part, c.display_order`,
      params
    );
    return NextResponse.json({ chapters });
  } catch (err) {
    console.error('GET /api/chapters error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
