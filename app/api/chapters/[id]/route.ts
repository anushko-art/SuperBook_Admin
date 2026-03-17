export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [chapter] = await query(
      `SELECT c.*, t.title AS textbook_title, t.subject, t.grade, t.part, t.slug AS textbook_slug
       FROM chapters c
       JOIN textbooks t ON c.textbook_id = t.id
       WHERE c.id = $1`,
      [id]
    );

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Fetch images
    const images = await query(
      `SELECT id, filename, alt_text, caption, page_number
       FROM chapter_images
       WHERE chapter_id = $1
       ORDER BY page_number NULLS LAST, filename`,
      [id]
    );

    return NextResponse.json({ chapter: { ...chapter, images } });
  } catch (err) {
    console.error('GET /api/chapters/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { title, is_published } = body;

    const updates: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); vals.push(title); }
    if (is_published !== undefined) { updates.push(`is_published = $${idx++}`); vals.push(is_published); }

    if (!updates.length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    vals.push(id);

    await query(
      `UPDATE chapters SET ${updates.join(', ')} WHERE id = $${idx}`,
      vals
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/chapters/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
