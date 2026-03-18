export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/profile
 * Returns the current user's profile data.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    phone: string | null;
  }>(
    `SELECT id, email, display_name, role, phone FROM users WHERE id = $1`,
    [session.userId]
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? '',
    role: user.role,
    phone: user.phone ?? '',
  });
}

/**
 * PATCH /api/profile
 * Update display_name and phone for the current user.
 */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    display_name?: string;
    phone?: string;
  };

  // Build update query dynamically (only update provided fields)
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (typeof body.display_name === 'string') {
    updates.push(`display_name = $${idx++}`);
    values.push(body.display_name.trim() || null);
  }

  if (typeof body.phone === 'string') {
    updates.push(`phone = $${idx++}`);
    values.push(body.phone.trim() || null);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(session.userId);
  await query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
    values
  );

  return NextResponse.json({ ok: true });
}
