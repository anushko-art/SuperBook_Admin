export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/generate/batch
 * Body: { chapter_id: string }  OR  { textbook_id: string }
 *
 * Generates AI content for all topics in a chapter (or all chapters of a textbook).
 * Calls /api/admin/generate sequentially for each topic.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { chapter_id, textbook_id } = body as { chapter_id?: string; textbook_id?: string };

  if (!chapter_id && !textbook_id) {
    return NextResponse.json({ error: 'Provide chapter_id or textbook_id' }, { status: 400 });
  }

  try {
    // Fetch topics to generate
    const topics = await query<{ id: string; title: string }>(
      chapter_id
        ? `SELECT t.id, t.title FROM topics t WHERE t.chapter_id = $1 ORDER BY t.order_index`
        : `SELECT t.id, t.title FROM topics t
           JOIN chapters c ON t.chapter_id = c.id
           WHERE c.textbook_id = $1 ORDER BY c.display_order, t.order_index`,
      [chapter_id ?? textbook_id]
    );

    if (topics.length === 0) {
      return NextResponse.json({ error: 'No topics found. Run topic extraction first.' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const results: { topic_id: string; title: string; status: 'generated' | 'failed'; error?: string }[] = [];

    for (const topic of topics) {
      try {
        const res = await fetch(`${baseUrl}/api/admin/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic_id: topic.id }),
        });

        if (res.ok) {
          results.push({ topic_id: topic.id, title: topic.title, status: 'generated' });
        } else {
          const err = await res.json().catch(() => ({}));
          results.push({ topic_id: topic.id, title: topic.title, status: 'failed', error: (err as { error?: string }).error ?? 'Unknown error' });
        }
      } catch (err) {
        results.push({ topic_id: topic.id, title: topic.title, status: 'failed', error: err instanceof Error ? err.message : 'Request failed' });
      }
    }

    const generated = results.filter((r) => r.status === 'generated').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({ ok: true, total: topics.length, generated, failed, results });
  } catch (err) {
    console.error('Batch generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Batch failed' },
      { status: 500 }
    );
  }
}
