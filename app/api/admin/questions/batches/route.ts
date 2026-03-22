export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listBatches } from '@/lib/questions/api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadedBy = searchParams.get('uploaded_by') ?? '';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    if (!uploadedBy) {
      return NextResponse.json({ error: 'uploaded_by is required' }, { status: 400 });
    }

    const batches = await listBatches(uploadedBy, limit);
    return NextResponse.json({ batches });
  } catch (err) {
    console.error('GET /api/admin/questions/batches error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
