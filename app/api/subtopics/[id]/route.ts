export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, source_markdown, order_index } = body as {
    title?: string;
    source_markdown?: string;
    order_index?: number;
  };

  const sets: string[] = [];
  const vals: unknown[] = [];
  let n = 1;
  if (title !== undefined)           { sets.push(`title = $${n++}`);           vals.push(title); }
  if (source_markdown !== undefined) { sets.push(`source_markdown = $${n++}`); vals.push(source_markdown); }
  if (order_index !== undefined)     { sets.push(`order_index = $${n++}`);     vals.push(order_index); }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  sets.push(`updated_at = now()`);
  vals.push(id);

  try {
    await query(
      `UPDATE subtopics SET ${sets.join(', ')} WHERE id = $${n}`,
      vals
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/subtopics/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query(`DELETE FROM subtopics WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/subtopics/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
