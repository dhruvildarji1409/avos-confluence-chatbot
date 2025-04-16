import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ConfluenceContent from '@/models/ConfluenceContent';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    // Connect to the database
    await connectToDatabase();
    
    // Search for content using text index
    let content;
    
    if (query) {
      content = await ConfluenceContent.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);
    } else {
      content = await ConfluenceContent.find({})
        .sort({ updatedAt: -1 })
        .limit(10);
    }
    
    // Return the data
    return NextResponse.json({
      success: true,
      count: content.length,
      query: query,
      data: content
    });
  } catch (error) {
    console.error('Error searching Confluence content:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to search Confluence content' },
      { status: 500 }
    );
  }
} 