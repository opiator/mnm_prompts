import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    console.log('Auth attempt with password:', password ? '***' : 'undefined');
    console.log('Expected password:', process.env.SITE_PASSWORD ? '***' : 'undefined');
    
    if (password === process.env.SITE_PASSWORD) {
      console.log('Password match! Generating JWT...');
      
      // Create JWT with short expiration (1 hour)
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
      const token = await new jose.SignJWT({ 
        userId: 'user', 
        timestamp: Date.now(),
        version: '1'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret);
      
      console.log('JWT generated, length:', token.length);
      
      const response = NextResponse.json({ success: true });
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 // 1 hour (matches JWT expiration)
      });
      
      console.log('Cookie set, response ready');
      return response;
    }
    
    console.log('Password mismatch');
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
