import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'superbook-dev-secret-change-in-production-32chars'
);

const PROTECTED = ['/dashboard'];
const AUTH_PAGES = ['/auth/signin', '/auth/signup'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  const token = req.cookies.get('sb_session')?.value;
  let valid = false;

  if (token) {
    try {
      await jwtVerify(token, SECRET);
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (isProtected && !valid) {
    const signinUrl = req.nextUrl.clone();
    signinUrl.pathname = '/auth/signin';
    signinUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(signinUrl);
  }

  if (isAuthPage && valid) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
