import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create a response
    const response = NextResponse.json({
      message: 'Logged out successfully'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Clear the authentication cookie
    response.cookies.set({
      name: 'auth_token',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Set expiration to the past to remove the cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    return response;
  } catch (error: any) {
    console.error('Logout error:', error.message);
    return NextResponse.json({ error: 'Logout failed' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 