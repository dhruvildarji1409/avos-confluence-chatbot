import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

interface Params {
  params: {
    code: string
  }
}

// Get a shared chat by code
export async function GET(request: Request, { params }: Params) {
  try {
    const { code } = params;
    console.log(`[Shared API] Attempting to fetch chat with share code: ${code}`);
    
    if (!code || code.length < 3) {
      console.error(`[Shared API] Invalid share code format: ${code}`);
      return NextResponse.json(
        { error: 'Invalid share code format' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find the chat by share code
    console.log(`[Shared API] Querying database for chat with shareCode: ${code}`);
    const chat = await ChatHistory.findOne({ 
      shareCode: code,
      isShared: true
    }).lean();
    
    if (!chat) {
      console.error(`[Shared API] No chat found with share code: ${code}`);
      return NextResponse.json(
        { error: 'Shared chat not found or no longer available' },
        { status: 404 }
      );
    }
    
    console.log(`[Shared API] Successfully found chat: ${chat.sessionId}, title: ${chat.title}`);
    
    return NextResponse.json({
      id: chat.sessionId,
      title: chat.title,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isShared: true
    });
  } catch (error: any) {
    console.error(`[Shared API] Error retrieving shared chat ${params.code}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve shared chat' },
      { status: 500 }
    );
  }
} 