import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { content } = await req.json();

    // Update the linked chapter's content_markdown
    await query(
      `UPDATE chapters c
         SET content_markdown = $1,
             content_length   = $2,
             updated_at       = NOW()
       FROM uploaded_files uf
       WHERE uf.id = $3
         AND uf.linked_chapter_id = c.id`,
      [content, content.length, id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    );
  }
}
