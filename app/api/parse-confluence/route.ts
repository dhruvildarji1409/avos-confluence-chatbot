import { NextResponse } from 'next/server';
import { parseConfluencePage } from '@/lib/confluenceParser';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    // Validate the request body is valid JSON
    let url;
    try {
      const body = await request.json();
      url = body.url;
    } catch (jsonError) {
      console.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json({ 
        error: 'Invalid request format: The request body is not valid JSON' 
      }, { status: 400 });
    }
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`Attempting to parse Confluence page at URL: ${url}`);

    // First, check if Confluence is reachable
    try {
      const confluenceUrl = process.env.CONFLUENCE_BASE_URL || 'https://confluence.nvidia.com/';
      
      console.log(`Testing Confluence connectivity at ${confluenceUrl}`);
      await axios.head(confluenceUrl, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      console.log('Confluence base URL is reachable');
    } catch (connectError: any) {
      console.error('Failed to connect to Confluence:', connectError.message);
      return NextResponse.json({ 
        error: 'Could not connect to Confluence server. Please check your network connection.' 
      }, { status: 503 });
    }

    try {
      const parsedData = await parseConfluencePage(url);
      
      return NextResponse.json({
        success: true,
        data: parsedData,
      });
    } catch (parseError: any) {
      console.error('Error parsing Confluence page:', parseError);
      console.error('Error details:', parseError.stack);
      
      // Check for common errors and provide more helpful messages
      const errorMessage = parseError.message || '';
      
      if (errorMessage.includes('content type') || errorMessage.includes('Expected JSON')) {
        return NextResponse.json({ 
          error: 'Authentication error: You may need to log in to Confluence first or your credentials have expired. The system received HTML instead of JSON data.' 
        }, { status: 401 });
      }
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Connection error: Could not connect to the Confluence server. Please check your network connection and Confluence server availability.' 
        }, { status: 503 });
      }
      
      return NextResponse.json(
        { error: errorMessage || 'Failed to parse Confluence page' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in parse-confluence API:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request. See server logs for details.' },
      { status: 500 }
    );
  }
} 