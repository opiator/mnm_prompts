import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

export async function middleware(request: NextRequest) {
  console.log('Middleware running for:', request.nextUrl.pathname);
  
  // Skip auth for login page and API routes
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api/')) {
    console.log('Skipping auth for:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  // Check if user is authenticated
  const authToken = request.cookies.get('auth-token')?.value;
  console.log('Auth token present:', !!authToken);
  
  if (!authToken) {
    console.log('No auth token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    console.log('Verifying JWT token...');
    // Verify JWT token using jose (Edge Runtime compatible)
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const { payload } = await jose.jwtVerify(authToken, secret);
    console.log('JWT verified successfully:', payload);
    
    // If we get here, token is valid and not expired
    return NextResponse.next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    // Token is invalid or expired
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('auth-token', '', { maxAge: 0 }); // Clear invalid cookie
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
