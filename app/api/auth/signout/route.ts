import { NextResponse } from 'next/server';
import { getSignoutCookieOptions } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSignoutCookieOptions());
  return res;
}
