import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/topics/:id
 * Returns a topic with its AI-generated content, flashcards, and quiz questions.
 *
 * PATCH /api/topics/:id
 * Body: { difficulty_level?, is_key_concept?, is_formula?, title? }
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [topic] = await query<Record<string, unknown>>(
      `SELECT t.*,
              c.title AS chapter_title, c.chapter_number,
              tb.title AS textbook_title, tb.subject, tb.grade
       FROM topics t
       JOIN chapters c ON t.chapter_id = c.id
       JOIN textbooks tb ON c.textbook_id = tb.id
       WHERE t.id = $1`,
      [id]
    );

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Global generated content
    const [content] = await query(
      `SELECT * FROM global_generated_content WHERE topic_id = $1 AND is_latest = true`,
      [id]
    );

    let flashcards: unknown[] = [];
    let quizQuestions: unknown[] = [];

    if (content) {
      flashcards = await query(
        `SELECT * FROM global_generated_flashcards WHERE global_content_id = $1 ORDER BY order_index`,
        [(content as Record<string, unknown>).id as string]
      );
      quizQuestions = await query(
        `SELECT * FROM global_generated_quiz_questions WHERE global_content_id = $1 ORDER BY order_index`,
        [(content as Record<string, unknown>).id as string]
      );
    }

    return NextResponse.json({ topic, content: content ?? null, flashcards, quiz_questions: quizQuestions });
  } catch (err) {
    console.error('GET /api/topics/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { difficulty_level, is_key_concept, is_formula, title, source_markdown } = body as {
    difficulty_level?: string;
    is_key_concept?: boolean;
    is_formula?: boolean;
    title?: string;
    source_markdown?: string;
  };

  try {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (difficulty_level !== undefined) { sets.push(`difficulty_level = $${idx++}`); vals.push(difficulty_level); }
    if (is_key_concept !== undefined)  { sets.push(`is_key_concept = $${idx++}`);  vals.push(is_key_concept); }
    if (is_formula !== undefined)      { sets.push(`is_formula = $${idx++}`);      vals.push(is_formula); }
    if (title !== undefined)           { sets.push(`title = $${idx++}`);           vals.push(title); }
    if (source_markdown !== undefined) { sets.push(`source_markdown = $${idx++}`); vals.push(source_markdown); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    await query(`UPDATE topics SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/topics/[id] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
