import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'avos-bot-secret-key';

export async function GET(req: NextRequest) {
  try {
    // Get token from cookie
    const token = req.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    // Connect to database
    await connectToDatabase();
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Auth error:', error.message);
    return NextResponse.json({ error: 'Authentication failed' }, { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 