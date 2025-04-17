import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ConfluenceContent from '@/models/ConfluenceContent';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    
    await connectToDatabase();
    
    // Fetch relevant Confluence content
    let documents;
    
    if (query) {
      try {
        // Text search with query
        documents = await ConfluenceContent.find(
          { $text: { $search: query } },
          { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(10)
        .lean();
      } catch (searchError) {
        console.error('Text search failed in graphical-rag, falling back to regular search:', searchError);
        
        // Fallback to regular search if text search fails
        documents = await ConfluenceContent.find({
          $or: [
            { pageTitle: { $regex: query, $options: 'i' } },
            { content: { $regex: query, $options: 'i' } }
          ]
        })
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();
      }
    } else {
      // Get recent documents if no query
      documents = await ConfluenceContent.find()
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();
    }
    
    // Process documents to include only necessary fields
    const processedDocuments = documents.map(doc => {
      // Type the document as any to handle the dynamically added score field during text search
      const typedDoc = doc as any;
      
      return {
        pageId: doc.pageId,
        pageTitle: doc.pageTitle,
        pageUrl: doc.pageUrl,
        content: doc.content.substring(0, 1000) + (doc.content.length > 1000 ? '...' : ''), // Trim content
        updatedAt: doc.updatedAt,
        score: typedDoc.score || null
      };
    });
    
    // Return the processed documents
    return NextResponse.json({
      query,
      results: processedDocuments,
      count: processedDocuments.length
    });
  } catch (error: any) {
    console.error('Error fetching graphical RAG data:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve Confluence content' },
      { status: 500 }
    );
  }
} 