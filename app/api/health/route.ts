export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/health
 * Returns DB connectivity status. Safe to call without auth.
 */
export async function GET() {
  const start = Date.now();
  try {
    await query(`SELECT 1`);
    return NextResponse.json({
      ok: true,
      db: 'connected',
      latency_ms: Date.now() - start,
      database_url_set: !!process.env.DATABASE_URL,
      is_local: process.env.DATABASE_URL?.includes('localhost') ?? false,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      db: 'error',
      error: err instanceof Error ? err.message : String(err),
      database_url_set: !!process.env.DATABASE_URL,
      is_local: process.env.DATABASE_URL?.includes('localhost') ?? false,
    }, { status: 503 });
  }
}
