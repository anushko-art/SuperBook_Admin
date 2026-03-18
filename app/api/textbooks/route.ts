export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const textbooks = await query<{
      id: string;
      title: string;
      description: string;
      subject: string;
      grade: string;
      part: string;
      slug: string;
      publisher: string;
      is_published: boolean;
      total_chapters: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, title, description, subject, grade, part, slug, publisher,
              is_published, total_chapters, created_at, updated_at
       FROM textbooks
       ORDER BY grade, part`
    );
    return NextResponse.json({ textbooks });
  } catch (err) {
    console.error('GET /api/textbooks error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, subject, grade, part, publisher, slug } = body;

    if (!title || !subject) {
      return NextResponse.json({ error: 'title and subject are required' }, { status: 400 });
    }

    const session = await getSession();
    const uploaderId = session?.userId || null;

    const [textbook] = await query<{ id: string }>(
      `INSERT INTO textbooks (title, description, subject, grade, part, publisher, slug, uploader_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [title, description, subject, grade, part, publisher, slug || null, uploaderId]
    );
    return NextResponse.json({ textbook }, { status: 201 });
  } catch (err) {
    console.error('POST /api/textbooks error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
