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
    // This happens for OAuth sign-ins (Google, GitHub) that bypass the
    // signup route. Auto-provision the row so the app works immediately.
    const email = user.email ?? '';
    const displayName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      email;
    try {
      await query(
        `INSERT INTO users (id, email, display_name, role, created_at)
         VALUES ($1, $2, $3, 'admin', NOW())
         ON CONFLICT (id) DO NOTHING`,
        [user.id, email, displayName]
      );
      const [provisioned] = await query<{
        id: string; email: string; display_name: string; role: string;
      }>(`SELECT id, email, display_name, role FROM users WHERE id = $1`, [user.id]);
      if (provisioned) {
        return {
          userId: provisioned.id,
          email: provisioned.email,
          role: provisioned.role,
          displayName: provisioned.display_name ?? email,
        };
      }
    } catch {
      // DB not yet set up — return a minimal session so the page renders
    }
    return null;
  }

  return {
    userId: appUser.id,
    email: appUser.email,
    role: appUser.role,
    displayName: appUser.display_name ?? appUser.email,
  };
}
