import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { question_text, options, correct_answer_id, explanation, difficulty_level } = body as {
    question_text?: string; options?: unknown; correct_answer_id?: number;
    explanation?: string; difficulty_level?: string;
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (question_text !== undefined) { sets.push(`question_text = $${i++}`); vals.push(question_text); }
  if (options !== undefined) { sets.push(`options = $${i++}`); vals.push(JSON.stringify(options)); }
  if (correct_answer_id !== undefined) { sets.push(`correct_answer_id = $${i++}`); vals.push(correct_answer_id); }
  if (explanation !== undefined) { sets.push(`explanation = $${i++}`); vals.push(explanation); }
  if (difficulty_level !== undefined) { sets.push(`difficulty_level = $${i++}`); vals.push(difficulty_level); }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  vals.push(id);
  await query(`UPDATE global_generated_quiz_questions SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query(`DELETE FROM global_generated_quiz_questions WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
