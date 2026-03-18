import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Guard: if Supabase env vars are not configured, pass the request through.
  // This prevents MIDDLEWARE_INVOCATION_FAILED on Vercel when vars are missing.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token — wrapped in try/catch to prevent
  // MIDDLEWARE_INVOCATION_FAILED on Vercel if the Supabase API is unreachable.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protect dashboard and admin routes
    const isProtected =
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin');
    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('from', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (
      user &&
      (request.nextUrl.pathname.startsWith('/auth/signin') ||
        request.nextUrl.pathname.startsWith('/auth/signup'))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  } catch {
    // On auth error (network timeout, invalid token, etc.), pass through
    // without redirecting rather than crashing the middleware.
  }

  return supabaseResponse;
}
