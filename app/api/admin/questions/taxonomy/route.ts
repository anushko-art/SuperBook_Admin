export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getTaxonomyTree } from '@/lib/questions/api';

export async function GET() {
  try {
    const textbooks = await getTaxonomyTree();
    return NextResponse.json({ textbooks });
  } catch (err) {
    console.error('GET /api/admin/questions/taxonomy error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
