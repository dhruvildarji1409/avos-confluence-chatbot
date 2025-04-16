import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'avos-bot-secret-key';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Create a secure cookie with the token
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Set the token as an HTTP-only cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 // 1 day in seconds
    });
    
    return response;
    
  } catch (error: any) {
    console.error('Login error:', error.message);
    return NextResponse.json({ error: 'Login failed' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 