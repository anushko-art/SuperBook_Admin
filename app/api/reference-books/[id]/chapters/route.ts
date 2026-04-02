export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const chapters = await query(
      `SELECT id, reference_book_id, name, markdown_text, created_at
       FROM reference_chapters WHERE reference_book_id = $1 ORDER BY created_at`,
      [id]
    );
    return NextResponse.json({ chapters });
  } catch (err) {
    console.error('GET /api/reference-books/[id]/chapters:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name } = body as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  try {
    const [chapter] = await query<{ id: string }>(
      `INSERT INTO reference_chapters (reference_book_id, name) VALUES ($1,$2) RETURNING id`,
      [id, name.trim()]
    );
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reference-books/[id]/chapters:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
