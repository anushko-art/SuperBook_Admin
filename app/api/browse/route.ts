export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/browse
 *
 * Unified retrieval endpoint for the student browse flow:
 *
 *  Step 1 — no params          → returns distinct { grades[], subjects[] }
 *  Step 2 — ?grade=11&subject=Physics
 *                               → returns textbooks + their chapters
 *  Step 3 — ?chapter_id=<uuid> → returns topics list for that chapter
 *  Step 4 — ?topic_id=<uuid>   → returns full topic with source_markdown
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const grade = searchParams.get('grade');
  const subject = searchParams.get('subject');
  const chapter_id = searchParams.get('chapter_id');
  const topic_id = searchParams.get('topic_id');

  try {
    // ── Step 4: Single topic detail ─────────────────────────────
    if (topic_id) {
      const [topic] = await query<Record<string, unknown>>(
        `SELECT t.id, t.title, t.slug, t.order_index,
                t.source_markdown, t.difficulty_level,
                t.is_key_concept, t.is_formula,
                c.title   AS chapter_title, c.chapter_number,
                tb.title  AS textbook_title, tb.subject, tb.grade
         FROM topics t
         JOIN chapters c  ON t.chapter_id  = c.id
         JOIN textbooks tb ON c.textbook_id = tb.id
         WHERE t.id = $1`,
        [topic_id]
      );

      if (!topic) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }

      return NextResponse.json({ step: 4, topic });
    }

    // ── Step 3: Topics list for a chapter ────────────────────────
    if (chapter_id) {
      const topics = await query(
        `SELECT t.id, t.title, t.slug, t.order_index,
                t.difficulty_level, t.is_key_concept, t.is_formula,
                LENGTH(t.source_markdown) AS content_length
         FROM topics t
         WHERE t.chapter_id = $1
         ORDER BY t.order_index`,
        [chapter_id]
      );

      // Also return the chapter meta for breadcrumb context
      const [chapter] = await query(
        `SELECT c.id, c.title, c.chapter_number,
                tb.title AS textbook_title, tb.subject, tb.grade
         FROM chapters c
         JOIN textbooks tb ON c.textbook_id = tb.id
         WHERE c.id = $1`,
        [chapter_id]
      );

      return NextResponse.json({ step: 3, chapter: chapter ?? null, topics });
    }

    // ── Step 2: Chapters for a class + subject ──────────────────
    if (grade && subject) {
      const textbooks = await query(
        `SELECT tb.id, tb.title, tb.part, tb.slug, tb.publisher,
                tb.total_chapters, tb.is_published
         FROM textbooks tb
         WHERE tb.grade = $1 AND tb.subject = $2
         ORDER BY tb.part`,
        [grade, subject]
      );

      // Gather all textbook IDs for the chapter query
      const textbookIds = (textbooks as { id: string }[]).map(t => t.id);

      let chapters: unknown[] = [];
      if (textbookIds.length > 0) {
        // Build parameterised IN list: $1, $2, …
        const placeholders = textbookIds.map((_, i) => `$${i + 1}`).join(', ');
        chapters = await query(
          `SELECT c.id, c.title, c.chapter_number, c.display_order,
                  c.estimated_read_time_minutes, c.content_length,
                  c.source_folder, c.is_published, c.textbook_id,
                  (SELECT COUNT(*)::int FROM topics WHERE chapter_id = c.id) AS topic_count
           FROM chapters c
           WHERE c.textbook_id IN (${placeholders})
           ORDER BY c.display_order, c.chapter_number`,
          textbookIds
        );
      }

      return NextResponse.json({ step: 2, grade, subject, textbooks, chapters });
    }

    // ── Step 1: Available classes & subjects ─────────────────────
    const classes = await query<{ grade: string; subject: string; count: number }>(
      `SELECT grade, subject, COUNT(*)::int AS count
       FROM textbooks
       WHERE grade IS NOT NULL AND subject IS NOT NULL
       GROUP BY grade, subject
       ORDER BY grade, subject`
    );

    const grades = [...new Set(classes.map(c => c.grade))];
    const subjects = [...new Set(classes.map(c => c.subject))];

    return NextResponse.json({ step: 1, grades, subjects, combinations: classes });

  } catch (err) {
    console.error('GET /api/browse error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
