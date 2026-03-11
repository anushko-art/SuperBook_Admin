import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/images/[id] */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const [img] = await query<{
    id: string; chapter_id: string; topic_id: string | null; file_name: string;
    file_path: string; alt_text: string | null; caption: string | null;
    description: string | null; topic_title: string | null;
  }>(
    `SELECT li.id, li.chapter_id, li.topic_id, li.file_name, li.file_path,
            li.alt_text, li.caption, li.description,
            t.title AS topic_title
     FROM learning_images li
     LEFT JOIN topics t ON li.topic_id = t.id
     WHERE li.id = $1`,
    [id]
  );
  if (!img) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(img);
}

/** PATCH /api/admin/images/[id] — update alt_text, caption, description, topic_id */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    alt_text?: string | null;
    caption?: string | null;
    description?: string | null;
    topic_id?: string | null;
  };

  const setClauses: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if ('alt_text' in body)    { setClauses.push(`alt_text = $${idx++}`);    vals.push(body.alt_text ?? null); }
  if ('caption' in body)     { setClauses.push(`caption = $${idx++}`);     vals.push(body.caption ?? null); }
  if ('description' in body) { setClauses.push(`description = $${idx++}`); vals.push(body.description ?? null); }
  if ('topic_id' in body)    { setClauses.push(`topic_id = $${idx++}`);    vals.push(body.topic_id ?? null); }

  if (setClauses.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  setClauses.push(`updated_at = NOW()`);
  vals.push(id);

  await query(`UPDATE learning_images SET ${setClauses.join(', ')} WHERE id = $${idx}`, vals);
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/images/[id] — remove file from disk and DB */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const [img] = await query<{ file_path: string }>(`SELECT file_path FROM learning_images WHERE id = $1`, [id]);
  if (!img) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const absPath = path.join(process.cwd(), 'public', img.file_path);
    await unlink(absPath);
  } catch { /* file may already be gone */ }

  await query(`DELETE FROM learning_images WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
