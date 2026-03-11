import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession, getSessionCookieOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password, display_name } = body as { email?: string; password?: string; display_name?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const [existing] = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const [user] = await query<{ id: string; email: string; display_name: string; role: string }>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'student')
       RETURNING id, email, display_name, role`,
      [email.toLowerCase().trim(), hash, display_name?.trim() || null]
    );

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name ?? user.email,
    });

    const res = NextResponse.json({ ok: true, user }, { status: 201 });
    res.cookies.set(getSessionCookieOptions(token));
    return res;
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
