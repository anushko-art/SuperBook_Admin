export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/admin/chapters-overview
 * Returns all chapters with topic counts and content status.
 */
export async function GET() {
  try {
    const chapters = await query(
      `SELECT
         c.id, c.title, c.chapter_number, c.is_published,
         c.content_length, c.estimated_read_time_minutes,
         c.updated_at,
         tb.title AS textbook_title, tb.subject, tb.grade, tb.part,
         COUNT(t.id)::int AS topic_count,
         COUNT(t.id) FILTER (WHERE t.source_markdown IS NOT NULL)::int AS topics_with_content
       FROM chapters c
       JOIN textbooks tb ON c.textbook_id = tb.id
       LEFT JOIN topics t ON t.chapter_id = c.id
       GROUP BY c.id, tb.title, tb.subject, tb.grade, tb.part
       ORDER BY tb.subject, tb.grade, c.chapter_number`
    );
    return NextResponse.json({ chapters });
  } catch (err) {
    console.error('GET /api/admin/chapters-overview error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
