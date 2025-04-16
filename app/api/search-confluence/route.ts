import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ConfluenceContent from '@/models/ConfluenceContent';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    console.log(`API: Search query received: "${query}"`);
    // Connect to the database
    await connectToDatabase();
    
    // Search for content using text index
    let content;
    
    if (query) {
      console.log('API: Performing text search...');
      content = await ConfluenceContent.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);
    } else {
      console.log('API: Fetching recent content...');
      content = await ConfluenceContent.find({})
        .sort({ updatedAt: -1 })
        .limit(10);
    }
    
    console.log(`API: Found ${content.length} results`);
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
      { success: false, error: (error as Error).message || 'Failed to search Confluence content' },
      { status: 500 }
    );
  }
} 