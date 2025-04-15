import { NextResponse } from 'next/server';
import { parseConfluencePage } from '@/lib/confluenceParser';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parsedData = await parseConfluencePage(url);
    
    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error('Error parsing Confluence page:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to parse Confluence page' },
      { status: 500 }
    );
  }
} 