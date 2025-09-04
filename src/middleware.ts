import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip auth for login page and API routes
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const isAuthenticated = request.cookies.get('auth-token')?.value === process.env.AUTH_SECRET;
  
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
