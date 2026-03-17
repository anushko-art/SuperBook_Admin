export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { question, answer, category, difficulty_level } = body as {
    question?: string; answer?: string; category?: string; difficulty_level?: string;
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (question !== undefined) { sets.push(`question = $${i++}`); vals.push(question); }
  if (answer !== undefined) { sets.push(`answer = $${i++}`); vals.push(answer); }
  if (category !== undefined) { sets.push(`category = $${i++}`); vals.push(category); }
  if (difficulty_level !== undefined) { sets.push(`difficulty_level = $${i++}`); vals.push(difficulty_level); }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  vals.push(id);
  await query(`UPDATE global_generated_flashcards SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query(`DELETE FROM global_generated_flashcards WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
