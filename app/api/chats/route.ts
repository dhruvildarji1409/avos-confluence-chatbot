import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

// Helper to retry database operations
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Connect to the database (with internal retry logic)
      const db = await connectToDatabase();
      if (!db) {
        console.warn(`Database connection failed on attempt ${attempt}/${maxRetries}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
        continue;
      }
      
      // Execute the operation
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`Database operation failed on attempt ${attempt}/${maxRetries}:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
      }
    }
  }
  
  throw lastError || new Error('Database operation failed after multiple attempts');
}

// Get all chats (list view)
export async function GET(request: Request) {
  try {
    return await withRetry(async () => {
      // Get all chats from the database, sorted by most recent
      const chats = await ChatHistory.find({})
        .select('sessionId title createdAt updatedAt isShared')
        .sort({ updatedAt: -1 })
        .lean();
      
      // Format the response
      const formattedChats = chats.map(chat => ({
        id: chat.sessionId,
        title: chat.title || 'Untitled Chat',
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        isShared: chat.isShared || false
      }));
      
      console.log(`Successfully retrieved ${formattedChats.length} chats`);
      return NextResponse.json({ chats: formattedChats });
    });
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
    
    return await withRetry(async () => {
      // Generate a unique session ID
      const sessionId = require('uuid').v4();
      
      // Create a new chat
      const newChat = await ChatHistory.create({
        sessionId,
        title: title || 'New Chat',
        messages: []
      });
      
      console.log(`Successfully created new chat: ${newChat.sessionId}`);
      return NextResponse.json({
        id: newChat.sessionId,
        title: newChat.title,
        createdAt: newChat.createdAt,
        updatedAt: newChat.updatedAt
      });
    });
  } catch (error: any) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create chat' },
      { status: 500 }
    );
  }
} 