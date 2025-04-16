import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';

interface Params {
  params: {
    id: string
  }
}

// Get a specific chat by ID
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    // Find the chat by sessionId
    const chat = await ChatHistory.findOne({ sessionId: id }).lean();
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: chat.sessionId,
      title: chat.title,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isShared: chat.isShared
    });
  } catch (error: any) {
    console.error(`Error retrieving chat ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve chat' },
      { status: 500 }
    );
  }
}

// Update a chat's title
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = params;
    const { title } = await request.json();
    
    await connectToDatabase();
    
    // Update the chat's title
    const updatedChat = await ChatHistory.findOneAndUpdate(
      { sessionId: id },
      { $set: { title } },
      { new: true }
    );
    
    if (!updatedChat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: updatedChat.sessionId,
      title: updatedChat.title,
      updatedAt: updatedChat.updatedAt
    });
  } catch (error: any) {
    console.error(`Error updating chat ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to update chat' },
      { status: 500 }
    );
  }
}

// Delete a chat
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    // Delete the chat
    const result = await ChatHistory.deleteOne({ sessionId: id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting chat ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete chat' },
      { status: 500 }
    );
  }
} 