import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession, getSessionCookieOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    const [user] = await query<{
      id: string; email: string; password_hash: string;
      display_name: string; role: string; is_active: boolean;
    }>(
      `SELECT id, email, password_hash, display_name, role, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last_login
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name ?? user.email,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name },
    });

    const opts = getSessionCookieOptions(token);
    res.cookies.set(opts);
    return res;
  } catch (err) {
    console.error('Signin error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
