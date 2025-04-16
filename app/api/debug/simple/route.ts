import { NextResponse } from 'next/server';

/**
 * Simple debug endpoint that returns a guaranteed valid JSON response.
 * This is useful for checking if the issue is with the response parsing or something else.
 */
export async function GET() {
  try {
    // Create a simple response with no complex logic
    return NextResponse.json({
      success: true,
      message: "This is a test message",
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Try to parse the request body
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Use empty body if parsing fails
      console.error('Failed to parse request body:', e);
    }
    
    // Return the body as part of the response along with a timestamp
    return NextResponse.json({
      success: true,
      message: "This is a test message",
      receivedBody: body,
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
} 