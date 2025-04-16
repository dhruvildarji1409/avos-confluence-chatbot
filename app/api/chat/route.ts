import { NextResponse } from 'next/server';
import { searchConfluenceContent } from '@/lib/confluenceParser';
import ChatHistory from '@/models/ChatHistory';
import connectToDatabase from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Simple wrapper function to ensure consistent JSON responses
function safeJsonResponse(data: any, status: number = 200) {
  try {
    // Attempt to create a safe JSON response
    return NextResponse.json(data, { 
      status,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error creating JSON response:', error);
    // Simple fallback response if JSON stringify fails
    return NextResponse.json({ 
      error: 'Failed to format response',
      answer: 'An error occurred while formatting the response. Please try again.',
      isError: true
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  console.log(`[${new Date().toISOString()}] Received chat API request`);
  
  try {
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return safeJsonResponse({ 
        error: 'Invalid request format', 
        answer: "I couldn't understand your request format. Please ensure you're sending valid JSON."
      }, 400);
    }
    
    const { query, sessionId } = requestData;
    
    if (!query) {
      return safeJsonResponse({ 
        error: 'Query is required', 
        answer: "Please provide a question to get a response."
      }, 400);
    }

    console.log(`[${new Date().toISOString()}] Processing query: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
    
    // Connect to database
    try {
      await connectToDatabase();
      console.log(`[${new Date().toISOString()}] Database connection successful`);
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return safeJsonResponse({ 
        error: 'Database connection failed',
        answer: "I'm having trouble connecting to the database. Please try again later."
      }, 500);
    }
    
    // Check if this is a "Go Search" command
    const isGoSearch = query.toLowerCase().includes('go search');
    
    try {
      // Search for relevant content in Confluence data
      console.log(`[${new Date().toISOString()}] Searching Confluence content...`);
      const searchResults = await searchConfluenceContent(query, isGoSearch ? 10 : 5);
      console.log(`[${new Date().toISOString()}] Found ${searchResults.length} results`);
      
      if (!searchResults || searchResults.length === 0) {
        const noResultsResponse = {
          answer: "I couldn't find any relevant information in the AVOS documentation. Could you try rephrasing your question or provide more details?",
          sources: []
        };
        
        // Save to chat history if session exists
        if (sessionId) {
          await saveChatHistory(sessionId, query, noResultsResponse.answer);
        }
        
        return safeJsonResponse({
          ...noResultsResponse,
          sessionId: sessionId || uuidv4()
        });
      }
      
      // Format the search results for the response
      const sources = searchResults.map(result => ({
        title: result.pageTitle,
        url: result.pageUrl
      }));
      
      // Create a simple response from the search results
      const response = createSimpleResponse(query, searchResults, isGoSearch);
      
      // Save to chat history if session exists
      const userSessionId = sessionId || uuidv4();
      if (sessionId) {
        await saveChatHistory(sessionId, query, response);
      }
      
      console.log(`[${new Date().toISOString()}] Sending successful response`);
      
      // Return the response
      return safeJsonResponse({
        answer: response,
        sources,
        sessionId: userSessionId,
        isDeepSearch: isGoSearch
      });
      
    } catch (error: any) {
      console.error('Error processing query:', error);
      
      // Ensure we return a valid JSON response
      return safeJsonResponse({ 
        error: error.message || 'Failed to process query',
        answer: "I encountered an error while processing your request. Please try again with a different question.",
        isError: true,
        sessionId: sessionId || uuidv4()
      }, 500);
    }
  } catch (error: any) {
    console.error('Unhandled error in chat API:', error);
    
    // Final fallback for any unhandled errors
    return safeJsonResponse({ 
      error: 'Unhandled server error',
      answer: "An unexpected error occurred. Please try again later.",
      isError: true
    }, 500);
  }
}

async function saveChatHistory(sessionId: string, query: string, answer: string, existingTitle?: string) {
  try {
    // Attempt to find existing chat history first
    const existingChat = await ChatHistory.findOne({ sessionId });
    
    let title = existingTitle;
    
    // If this is a new chat, generate a title based on the first user query
    if (!existingChat && !title) {
      // Use the first ~30 chars of the query as the title
      title = query.length > 30 ? `${query.substring(0, 30)}...` : query;
    }
    
    await ChatHistory.findOneAndUpdate(
      { sessionId },
      {
        $set: { 
          title: title || 'New Chat'
        },
        $push: {
          messages: [
            { role: 'user', content: query, timestamp: new Date() },
            { role: 'assistant', content: answer, timestamp: new Date() }
          ]
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error saving chat history:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Simple response generator that doesn't rely on external LLM
 */
function createSimpleResponse(query: string, searchResults: any[], isDeepSearch: boolean = false): string {
  try {
    // Basic intro
    let intro = `Based on the AVOS documentation, here's what I found${isDeepSearch ? ' from your deep search' : ''}:`;
    
    // Add result info
    let content = "";
    if (searchResults && searchResults.length > 0) {
      // Use more results for deep search
      const resultsToShow = isDeepSearch ? Math.min(5, searchResults.length) : Math.min(2, searchResults.length);
      
      for (let i = 0; i < resultsToShow; i++) {
        const result = searchResults[i];
        if (result && result.pageTitle) {
          content += "\n\n**" + result.pageTitle + "**";
          
          if (result.content) {
            // For deep search, include more content
            if (isDeepSearch) {
              // Get first few paragraphs
              const paragraphs = result.content.split('\n\n').slice(0, 2);
              content += "\n" + paragraphs.join('\n\n');
            } else {
              // Just get the first sentence/paragraph for regular search
              const firstSentence = result.content.split('.')[0];
              if (firstSentence) {
                content += "\n" + firstSentence + ".";
              }
            }
          }
        }
      }
    } else {
      content = "\n\nI couldn't find specific information related to your query.";
    }
    
    // Add ending
    const ending = "\n\nPlease let me know if you need more specific information.";
    
    return intro + content + ending;
  } catch (error) {
    console.error("Error creating response:", error);
    return "I apologize, but I encountered an error while processing your request. Please try again with a different question.";
  }
} 