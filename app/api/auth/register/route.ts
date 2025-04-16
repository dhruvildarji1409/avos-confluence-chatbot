import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();
    
    // Validate the input
    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate NVIDIA email
    if (!email.endsWith('@nvidia.com')) {
      return NextResponse.json({ error: 'Please use an NVIDIA email address' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create new user
    const user = new User({
      email,
      username,
      password
    });
    
    await user.save();
    
    // Return success without sending the password
    const newUser = user.toObject();
    delete newUser.password;
    
    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username
      }
    }, { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Registration error:', error.message);
    return NextResponse.json({ error: 'Registration failed' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 