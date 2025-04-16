import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

// Get all chats (list view)
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Get all chats from the database, sorted by most recent
    const chats = await ChatHistory.find({})
      .select('sessionId title createdAt updatedAt isShared')
      .sort({ updatedAt: -1 })
      .lean();
    
    // Format the response
    const formattedChats = chats.map(chat => ({
      id: chat.sessionId,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isShared: chat.isShared
    }));
    
    return NextResponse.json({ chats: formattedChats });
  } catch (error: any) {
    console.error('Error retrieving chats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve chats' },
      { status: 500 }
    );
  }
}

// Create a new chat
export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    
    await connectToDatabase();
    
    // Generate a unique session ID
    const sessionId = require('uuid').v4();
    
    // Create a new chat
    const newChat = await ChatHistory.create({
      sessionId,
      title: title || 'New Chat',
      messages: []
    });
    
    return NextResponse.json({
      id: newChat.sessionId,
      title: newChat.title,
      createdAt: newChat.createdAt,
      updatedAt: newChat.updatedAt
    });
  } catch (error: any) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create chat' },
      { status: 500 }
    );
  }
} 