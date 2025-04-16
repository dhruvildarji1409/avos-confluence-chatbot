import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ConfluenceContent from '@/models/ConfluenceContent';

export async function GET() {
  try {
    console.log('API: Connecting to database...');
    // Connect to the database
    await connectToDatabase();
    
    console.log('API: Fetching Confluence content...');
    // Fetch all Confluence content with full details
    const content = await ConfluenceContent.find({}).sort({ updatedAt: -1 });
    
    console.log(`API: Retrieved ${content.length} documents`);
    // Return the data
    return NextResponse.json({
      success: true,
      count: content.length,
      data: content
    });
  } catch (error) {
    console.error('Error retrieving Confluence content:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to retrieve Confluence content' },
      { status: 500 }
    );
  }
} 