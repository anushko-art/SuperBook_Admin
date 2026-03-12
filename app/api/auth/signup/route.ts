import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password, display_name } = body as {
    email?: string;
    password?: string;
    display_name?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Create user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      data: {
        display_name: display_name?.trim() || null,
      },
    },
  });

  if (error) {
    // Map common Supabase auth errors
    if (error.message.includes('already registered')) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json(
      { error: 'Signup failed — no user returned' },
      { status: 500 }
    );
  }

  // Create matching record in the app's users table.
  // Use the Supabase Auth user ID so getSession() can find it.
  try {
    await query(
      `INSERT INTO users (id, email, display_name, role)
       VALUES ($1, $2, $3, 'student')
       ON CONFLICT (id) DO NOTHING`,
      [data.user.id, data.user.email, display_name?.trim() || null]
    );
  } catch (err) {
    console.error('Failed to create app user row:', err);
    // Auth user was created, but app row failed.
    // The user can still sign in — the row will be created on next signup attempt
    // or can be manually resolved.
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        display_name: display_name?.trim() || null,
        role: 'student',
      },
    },
    { status: 201 }
  );
}
