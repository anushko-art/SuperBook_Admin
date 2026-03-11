import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query(`
      SELECT
        uf.id,
        uf.original_filename,
        uf.file_path,
        uf.file_size_bytes,
        uf.file_type,
        uf.status,
        uf.created_at,
        uf.processed_at,
        uf.meta_json,
        uf.linked_chapter_id,
        uf.linked_textbook_id,
        c.title        AS chapter_title,
        c.chapter_number,
        t.title        AS textbook_title,
        t.subject,
        t.grade,
        t.part
      FROM uploaded_files uf
      LEFT JOIN chapters  c ON uf.linked_chapter_id  = c.id
      LEFT JOIN textbooks t ON uf.linked_textbook_id = t.id
      ORDER BY uf.created_at DESC
    `);
    return NextResponse.json({ uploads: rows });
  } catch (err) {
    console.error('GET /api/admin/uploads error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
