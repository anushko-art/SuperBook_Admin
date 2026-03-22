export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getBatch } from '@/lib/questions/api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const batch = await getBatch(batchId);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }
    return NextResponse.json({ batch });
  } catch (err) {
    console.error('GET /api/admin/questions/batches/[batchId] error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
