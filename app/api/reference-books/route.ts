export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const books = await query(
      `SELECT id, name, author, publisher, subject, created_at
       FROM reference_books ORDER BY created_at DESC`
    );
    return NextResponse.json({ books });
  } catch (err) {
    console.error('GET /api/reference-books:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, author, publisher, subject } = body as Record<string, string>;
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  try {
    const [book] = await query<{ id: string }>(
      `INSERT INTO reference_books (name, author, publisher, subject)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [name.trim(), author ?? null, publisher ?? null, subject ?? null]
    );
    return NextResponse.json({ book }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reference-books:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
