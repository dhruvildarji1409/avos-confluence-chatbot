import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ConfluenceContent from '@/models/ConfluenceContent';

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const pageId = url.searchParams.get('pageId');
    const pageIds = url.searchParams.get('pageIds');
    
    // Connect to the database
    await connectToDatabase();
    
    // Case 1: Delete multiple pages
    if (pageIds) {
      try {
        const idsArray = JSON.parse(pageIds);
        
        if (!Array.isArray(idsArray) || idsArray.length === 0) {
          return NextResponse.json({ error: 'Invalid pageIds format' }, { status: 400 });
        }
        
        const result = await ConfluenceContent.deleteMany({ pageId: { $in: idsArray } });
        
        return NextResponse.json({
          success: true,
          deletedCount: result.deletedCount,
          message: `Successfully deleted ${result.deletedCount} pages`
        });
      } catch (e) {
        return NextResponse.json({ error: 'Invalid pageIds format' }, { status: 400 });
      }
    }
    
    // Case 2: Delete single page
    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }
    
    // Delete the document
    const result = await ConfluenceContent.deleteOne({ pageId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No document found with that Page ID' 
      }, { status: 404 });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully deleted page with ID ${pageId}`
    });
  } catch (error) {
    console.error('Error deleting Confluence content:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete Confluence content' },
      { status: 500 }
    );
  }
} 