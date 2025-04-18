import { NextResponse } from 'next/server';
import { searchConfluenceContent } from '@/lib/confluenceParser';
import ChatHistory from '@/models/ChatHistory';
import connectToDatabase from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { analyzeQueryForDatabaseNeed, isFollowUpQuestion } from '@/lib/queryAnalyzer';
import { getLlmResponseWithDb, getLlmResponseWithoutDb } from '@/lib/llmResponseProcessor';

// Code block preservation instruction to enhance system prompts
const CODE_BLOCK_INSTRUCTION = `
IMPORTANT INSTRUCTIONS FOR CODE BLOCKS:
1. When you find code blocks in the database information, reproduce them EXACTLY as they appear
2. Do not modify, summarize, or rewrite any code from the database
3. Always place code in proper Markdown code blocks with the appropriate language specification
4. If the language isn't clear, use \`\`\`code for generic code blocks
5. Preserve all comments, whitespace, and formatting in code blocks exactly as they appear in the database
6. When explaining code, explain what the code does but DO NOT modify the original code
7. Present code blocks from the database exactly as they appear, with no modifications
`.trim();

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
    
    const { query, sessionId, conversationHistory = [] } = requestData;
    
    if (!query) {
      return safeJsonResponse({ 
        error: 'Query is required', 
        answer: "Please provide a question to get a response."
      }, 400);
    }

    console.log(`[${new Date().toISOString()}] Processing query: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
    
    // Analyze the query to decide if we need database access
    const queryAnalysis = analyzeQueryForDatabaseNeed(query);
    console.log(`[${new Date().toISOString()}] Query analysis:`, queryAnalysis);
    
    // Check if this is a follow-up question, which might need context from previous conversation
    const isFollowUp = isFollowUpQuestion(query);
    console.log(`[${new Date().toISOString()}] Is follow-up question: ${isFollowUp}`);
    
    // If the query is a follow-up, lower the threshold for using the database
    const shouldUseDatabase = queryAnalysis.needsDatabase || (isFollowUp && queryAnalysis.confidence < 0.7);
    
    // Check if this is a "Go Search" command (always uses database)
    const isGoSearch = query.toLowerCase().includes('go search');
    
    // Check if this is specifically asking for code or a code sample
    const isCodeRequest = /code|example|sample|implementation|snippet|syntax|usage|how to use|how to implement/i.test(query);
    if (isCodeRequest) {
      console.log(`[${new Date().toISOString()}] Detected code-related query, ensuring DB access`);
    }
    
    // Force database usage for code-related queries to ensure accurate code examples
    const finalShouldUseDatabase = shouldUseDatabase || isCodeRequest;
    
    let response;
    
    if (finalShouldUseDatabase) {
      console.log(`[${new Date().toISOString()}] Database access required for query`);
      
      // Connect to database
      try {
        await connectToDatabase();
        console.log(`[${new Date().toISOString()}] Database connection successful`);
      } catch (dbError) {
        console.error('Database connection error:', dbError);
        
        // Fall back to LLM-only response if database connection fails
        const fallbackResponse = await getLlmResponseWithoutDb(query, sessionId, conversationHistory);
        
        // Save to chat history if session exists
        if (sessionId) {
          await saveChatHistory(sessionId, query, fallbackResponse.answer);
        }
        
        return safeJsonResponse({
          ...fallbackResponse,
          sessionId: sessionId || uuidv4(),
          databaseFallback: true
        });
      }
      
      try {
        // Search for relevant content in Confluence data
        console.log(`[${new Date().toISOString()}] Searching Confluence content...`);
        const searchResults = await searchConfluenceContent(query, isGoSearch ? 10 : 5);
        console.log(`[${new Date().toISOString()}] Found ${searchResults.length} results`);
        
        // Add special instructions for code handling if code-related query
        const customSystemPrompt = isCodeRequest ? CODE_BLOCK_INSTRUCTION : '';
        
        // Process with LLM using database results
        const llmDbResponse = await getLlmResponseWithDb(
          query, 
          searchResults, 
          sessionId, 
          conversationHistory,
          isGoSearch,
          customSystemPrompt // Additional system prompt for code handling
        );
        
        // Save to chat history if session exists
        const userSessionId = sessionId || uuidv4();
        if (sessionId) {
          await saveChatHistory(sessionId, query, llmDbResponse.answer);
        }
        
        console.log(`[${new Date().toISOString()}] Sending successful DB-enhanced response`);
        
        // Return the response
        return safeJsonResponse({
          ...llmDbResponse,
          sessionId: userSessionId,
          isDeepSearch: isGoSearch,
          usedDatabase: true
        });
      } catch (error: any) {
        console.error('Error processing query with database:', error);
        
        // Try to fall back to non-DB response
        try {
          const fallbackResponse = await getLlmResponseWithoutDb(query, sessionId, conversationHistory);
          
          // Save to chat history if session exists
          if (sessionId) {
            await saveChatHistory(sessionId, query, fallbackResponse.answer);
          }
          
          return safeJsonResponse({
            ...fallbackResponse,
            sessionId: sessionId || uuidv4(),
            databaseFallback: true
          });
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          return safeJsonResponse({ 
            error: 'Failed to process query',
            answer: "I encountered an error while processing your request. Please try again with a different question.",
            isError: true,
            sessionId: sessionId || uuidv4()
          }, 500);
        }
      }
    } else {
      // Process query using only LLM without database access
      console.log(`[${new Date().toISOString()}] Processing query without database access`);
      
      try {
        // Get response directly from LLM without database
        const llmOnlyResponse = await getLlmResponseWithoutDb(query, sessionId, conversationHistory);
        
        // Save to chat history if session exists
        const userSessionId = sessionId || uuidv4();
        if (sessionId) {
          await saveChatHistory(sessionId, query, llmOnlyResponse.answer);
        }
        
        console.log(`[${new Date().toISOString()}] Sending successful LLM-only response`);
        
        // Return the response
        return safeJsonResponse({
          ...llmOnlyResponse,
          sessionId: userSessionId,
          usedDatabase: false
        });
      } catch (error: any) {
        console.error('Error processing query with LLM only:', error);
        
        return safeJsonResponse({ 
          error: error.message || 'Failed to process query',
          answer: "I encountered an error while processing your request. Please try again with a different question.",
          isError: true,
          sessionId: sessionId || uuidv4()
        }, 500);
      }
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