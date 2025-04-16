import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatHistory from '@/models/ChatHistory';
import { v4 as uuidv4 } from 'uuid';

interface Params {
  params: {
    id: string
  }
}

// Generate or revoke a share link for a chat
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = params;
    console.log(`[Share API] Processing share request for chat: ${id}`);
    
    const { action } = await request.json();
    console.log(`[Share API] Action: ${action}`);
    
    await connectToDatabase();
    
    if (action === 'share') {
      // First check if the chat exists
      const chatExists = await ChatHistory.findOne({ sessionId: id });
      if (!chatExists) {
        console.error(`[Share API] Chat not found: ${id}`);
        return NextResponse.json(
          { error: 'Chat not found' },
          { status: 404 }
        );
      }
      
      // Generate a simpler share code without hyphens
      const shareCode = uuidv4().replace(/-/g, '').substring(0, 10);
      console.log(`[Share API] Generated share code: ${shareCode} for chat: ${id}`);
      
      // Update the chat with the share code
      const updatedChat = await ChatHistory.findOneAndUpdate(
        { sessionId: id },
        { 
          $set: { 
            shareCode: shareCode, 
            isShared: true 
          } 
        },
        { new: true }
      );
      
      if (!updatedChat) {
        console.error(`[Share API] Failed to update chat with share code: ${id}`);
        return NextResponse.json(
          { error: 'Chat not found' },
          { status: 404 }
        );
      }
      
      console.log(`[Share API] Chat updated with share code: ${updatedChat.shareCode}`);
      
      // Verify the update worked
      const verifyChat = await ChatHistory.findOne({ 
        sessionId: id,
        shareCode: shareCode
      });
      
      if (!verifyChat) {
        console.error(`[Share API] Share code verification failed for chat: ${id}`);
        return NextResponse.json(
          { error: 'Failed to generate share link' },
          { status: 500 }
        );
      }
      
      // Get the base URL from environment variable or construct from request
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (request.headers.get('host') ? 
                      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                      'http://localhost:3000');
      
      const shareUrl = `${baseUrl}/shared/${shareCode}`;
      console.log(`[Share API] Generated share URL: ${shareUrl}`);
      
      return NextResponse.json({
        shareCode,
        shareUrl
      });
    } else if (action === 'unshare') {
      // Revoke the share by removing the share code
      console.log(`[Share API] Removing share code for chat: ${id}`);
      
      const updatedChat = await ChatHistory.findOneAndUpdate(
        { sessionId: id },
        { 
          $set: { 
            isShared: false 
          },
          $unset: { 
            shareCode: "" 
          } 
        },
        { new: true }
      );
      
      if (!updatedChat) {
        console.error(`[Share API] Failed to unshare chat: ${id}`);
        return NextResponse.json(
          { error: 'Chat not found' },
          { status: 404 }
        );
      }
      
      console.log(`[Share API] Successfully unshared chat: ${id}`);
      
      return NextResponse.json({
        success: true,
        message: 'Chat is no longer shared'
      });
    }
    
    console.error(`[Share API] Invalid action: ${action}`);
    return NextResponse.json(
      { error: 'Invalid action. Use "share" or "unshare".' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(`[Share API] Error sharing chat ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to share chat' },
      { status: 500 }
    );
  }
} 