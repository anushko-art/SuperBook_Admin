export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check ownership — allow admin or original uploader
    const [row] = await query<{ uploader_id: string | null }>(
      `SELECT uploader_id FROM chapters WHERE id = $1`,
      [id]
    );
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.role !== 'admin' && row.uploader_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
