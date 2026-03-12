import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';

/**
 * Session payload — same shape as before so all consumers
 * (server pages, API routes) keep working.
 */
export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  displayName: string;
}

/**
 * Get the current user session from Supabase Auth.
 *
 * Returns the same SessionPayload shape the app has always used,
 * bridging the Supabase Auth user to the existing `users` table.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Look up the app-level user record that corresponds to this auth user
  const [appUser] = await query<{
    id: string;
    email: string;
    display_name: string;
    role: string;
  }>(
    `SELECT id, email, display_name, role FROM users WHERE id = $1`,
    [user.id]
  );

  if (!appUser) {
    // Auth user exists but no matching row in the users table yet.
    // This can happen for brand-new signups — the signup handler
    // creates the row, but if it's somehow missing, return null.
    return null;
  }

  return {
    userId: appUser.id,
    email: appUser.email,
    role: appUser.role,
    displayName: appUser.display_name ?? appUser.email,
  };
}
