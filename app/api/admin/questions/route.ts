export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listQuestions, getQuestionStats } from '@/lib/questions/api';
import type { QuestionListFilter, QuestionType, DifficultyLevel } from '@/lib/questions/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Stats-only mode
    if (searchParams.get('stats') === '1') {
      const stats = await getQuestionStats();
      return NextResponse.json({ stats });
    }

    const filter: QuestionListFilter = {
      search: searchParams.get('search') ?? undefined,
      type: (searchParams.get('type') as QuestionType | 'all') ?? undefined,
      difficulty: (searchParams.get('difficulty') as DifficultyLevel | 'all') ?? undefined,
      topic_id: searchParams.get('topic_id') ?? undefined,
      chapter_id: searchParams.get('chapter_id') ?? undefined,
      textbook_id: searchParams.get('textbook_id') ?? undefined,
      is_active: searchParams.get('is_active') !== 'false',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const { questions, total } = await listQuestions(filter);

    return NextResponse.json({
      questions,
      total,
      limit: filter.limit,
      offset: filter.offset,
    });
  } catch (err) {
    console.error('GET /api/admin/questions error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
