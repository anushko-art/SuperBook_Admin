export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/topics/extract
 * Body: { chapter_id: string }  OR  { all: true }
 *
 * Splits a chapter's content_markdown into topics by ## headings and
 * inserts them into the `topics` table. Idempotent — skips existing rows.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { chapter_id, all } = body as { chapter_id?: string; all?: boolean };

  if (!chapter_id && !all) {
    return NextResponse.json({ error: 'Provide chapter_id or all:true' }, { status: 400 });
  }

  try {
    // Fetch chapters to process
    const chapters = await query<{ id: string; title: string; content_markdown: string | null }>(
      all
        ? `SELECT id, title, content_markdown FROM chapters WHERE content_markdown IS NOT NULL`
        : `SELECT id, title, content_markdown FROM chapters WHERE id = $1`,
      all ? [] : [chapter_id]
    );

    if (chapters.length === 0) {
      return NextResponse.json({ error: 'No chapters found' }, { status: 404 });
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    const chapterResults: { chapter_id: string; chapter_title: string; created: number; skipped: number }[] = [];

    for (const chapter of chapters) {
      const { created, skipped } = await extractTopicsFromChapter(chapter.id, chapter.content_markdown ?? '');
      totalCreated += created;
      totalSkipped += skipped;
      chapterResults.push({ chapter_id: chapter.id, chapter_title: chapter.title, created, skipped });
    }

    return NextResponse.json({
      ok: true,
      total_created: totalCreated,
      total_skipped: totalSkipped,
      chapters: chapterResults,
    });
  } catch (err) {
    console.error('Topic extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}

// ── GET: list topics for a chapter ─────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chapter_id = searchParams.get('chapter_id');

  if (!chapter_id) {
    return NextResponse.json({ error: 'chapter_id required' }, { status: 400 });
  }

  const topics = await query(
    `SELECT t.id, t.title, t.order_index, t.difficulty_level, t.is_key_concept, t.is_formula,
            t.created_at,
            gc.id AS content_id, gc.generation_model, gc.updated_at AS generated_at,
            (SELECT COUNT(*) FROM global_generated_flashcards WHERE global_content_id = gc.id)::int AS flashcard_count,
            (SELECT COUNT(*) FROM global_generated_quiz_questions WHERE global_content_id = gc.id)::int AS quiz_count
     FROM topics t
     LEFT JOIN global_generated_content gc ON t.id = gc.topic_id AND gc.is_latest = true
     WHERE t.chapter_id = $1
     ORDER BY t.order_index`,
    [chapter_id]
  );

  return NextResponse.json({ topics });
}

// ── Helper ──────────────────────────────────────────────────────────────────

async function extractTopicsFromChapter(chapterId: string, markdown: string) {
  // Split on lines starting with "## " (level-2 headings)
  const sections = splitByH2(markdown);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < sections.length; i++) {
    const { title, content } = sections[i];
    if (!title.trim()) continue;

    const slug = slugify(title);

    try {
      await query(
        `INSERT INTO topics (chapter_id, title, slug, source_markdown, order_index)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (chapter_id, order_index) DO NOTHING`,
        [chapterId, title.trim(), slug, content.trim(), i]
      );
      created++;
    } catch {
      skipped++;
    }
  }

  return { created, skipped };
}

function splitByH2(markdown: string): { title: string; content: string }[] {
  const lines = markdown.split('\n');
  const sections: { title: string; content: string }[] = [];

  let currentTitle = '';
  let currentLines: string[] = [];

  // Capture any content before the first ## heading as a "preamble" topic
  let hasPreamble = false;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentTitle || (currentLines.length > 0 && !hasPreamble)) {
        sections.push({ title: currentTitle || 'Introduction', content: currentLines.join('\n') });
        hasPreamble = true;
      }
      currentTitle = line.replace(/^##\s+/, '').trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // Push final section
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle || 'Overview', content: currentLines.join('\n') });
  }

  return sections.filter((s) => s.content.trim().length > 20);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}
