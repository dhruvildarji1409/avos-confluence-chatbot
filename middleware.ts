import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'avos-bot-secret-key';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the path
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = 
    path === '/login' || 
    path === '/register' || 
    path.startsWith('/api/auth/') || 
    path === '/' || 
    path.startsWith('/_next/') || 
    path.includes('/shared/') ||
    path.includes('/assets/') ||
    path === '/api/chat'; // Add chat API to public paths

  // Get the auth token from the cookies
  const token = request.cookies.get('auth_token')?.value || '';

  // If it's a public path, proceed
  if (isPublicPath) {
    // If user is logged in and tries to access login or register, redirect to home
    if (token && (path === '/login' || path === '/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If no token exists and trying to access protected route, redirect to login
  if (!token) {
    // Store the original URL they were trying to access
    const url = new URL('/login', request.url);
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Verify the token
    jwt.verify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    // If token is invalid, redirect to login
    const url = new URL('/login', request.url);
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/((?!api/auth|api/chat|_next/static|_next/image|favicon.ico|assets).*)',
  ],
}; 