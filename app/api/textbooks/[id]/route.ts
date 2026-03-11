import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [textbook] = await query(
      `SELECT t.*,
              json_agg(
                json_build_object(
                  'id', c.id,
                  'title', c.title,
                  'chapter_number', c.chapter_number,
                  'display_order', c.display_order,
                  'estimated_read_time_minutes', c.estimated_read_time_minutes,
                  'content_length', c.content_length,
                  'source_folder', c.source_folder,
                  'is_published', c.is_published,
                  'created_at', c.created_at
                ) ORDER BY c.display_order
              ) FILTER (WHERE c.id IS NOT NULL) AS chapters
       FROM textbooks t
       LEFT JOIN chapters c ON c.textbook_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [id]
    );

    if (!textbook) {
      return NextResponse.json({ error: 'Textbook not found' }, { status: 404 });
    }
    return NextResponse.json({ textbook });
  } catch (err) {
    console.error('GET /api/textbooks/[id] error:', err);
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
    const { is_published } = body;

    await query(
      'UPDATE textbooks SET is_published = $1, updated_at = NOW() WHERE id = $2',
      [is_published, id]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/textbooks/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
