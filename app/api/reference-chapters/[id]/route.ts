export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, markdown_text } = body as { name?: string; markdown_text?: string };

  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  if (name !== undefined)          { sets.push(`name = $${n++}`);          vals.push(name); }
  if (markdown_text !== undefined) { sets.push(`markdown_text = $${n++}`); vals.push(markdown_text); }
  if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  sets.push(`updated_at = now()`);
  vals.push(id);
  try {
    await query(`UPDATE reference_chapters SET ${sets.join(', ')} WHERE id = $${n}`, vals);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/reference-chapters/[id]:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query(`DELETE FROM reference_chapters WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
