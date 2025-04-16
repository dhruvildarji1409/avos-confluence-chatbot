/**
 * Utility functions for processing LLM responses
 */
import llmClient from './llmClient';

interface ProcessedResponse {
  answer: string;
  sources?: { title: string; url: string }[];
  error?: string;
}

/**
 * Process a query using the LLM without database access
 * @param query The user query
 * @param sessionId Optional session ID for tracking conversations
 * @param conversationHistory Optional conversation history
 * @returns Processed response
 */
export async function getLlmResponseWithoutDb(
  query: string,
  sessionId?: string,
  conversationHistory: any[] = []
): Promise<ProcessedResponse> {
  try {
    console.log(`[${new Date().toISOString()}] Processing query with LLM only: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
    
    // Create a more informative system prompt for general queries
    const systemPrompt = `
You are AVOS Bot, a helpful AI assistant specialized in NVIDIA's Autonomous Vehicle Operating System (AVOS).
For this query, you do not have access to specific AVOS documentation, so only respond with information that is:
1. Generally known about AI, computing, vehicles, or programming concepts
2. Common knowledge about NVIDIA as a company and its general product lines
3. Basic information about autonomous driving technology

If the query is requesting specific AVOS information that you don't have, suggest that the user try again with "Go Search" before their query to access the AVOS documentation database.

Always format your answers in Markdown for better readability.
    `.trim();
    
    // Get response from LLM client
    const llmResponse = await llmClient.getResponse(
      query,
      '', // No context since we're specifically NOT using DB data
      systemPrompt,
      conversationHistory
    );
    
    return {
      answer: llmResponse.answer,
      error: llmResponse.error
    };
  } catch (error: any) {
    console.error('Error getting LLM response without DB:', error);
    return {
      answer: "I'm sorry, but I encountered an error processing your request. Please try again.",
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Process a query using both database content and LLM
 * @param query The user query
 * @param dbResults The database search results
 * @param sessionId Optional session ID
 * @param conversationHistory Optional conversation history
 * @param isDeepSearch Whether this is a deep search query
 * @param customSystemPrompt Optional additional system prompt instructions
 * @returns Processed response
 */
export async function getLlmResponseWithDb(
  query: string,
  dbResults: any[],
  sessionId?: string,
  conversationHistory: any[] = [],
  isDeepSearch: boolean = false,
  customSystemPrompt: string = ''
): Promise<ProcessedResponse> {
  try {
    console.log(`[${new Date().toISOString()}] Processing query with DB and LLM: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`);
    
    if (!dbResults || dbResults.length === 0) {
      return {
        answer: "I couldn't find any relevant information in the AVOS documentation. Could you try rephrasing your question or provide more details?",
        sources: []
      };
    }
    
    // Format the search results for the response
    const sources = dbResults.map(result => ({
      title: result.pageTitle,
      url: result.pageUrl
    }));
    
    // Format content for LLM context
    const context = llmClient.formatContentForLlm(dbResults);
    
    // Create system prompt for database-backed responses
    const baseSystemPrompt = `
You are AVOS Bot, a helpful AI assistant specialized in NVIDIA's Autonomous Vehicle Operating System (AVOS).
You have been given context information from the AVOS documentation database.
Base your answer primarily on this context information, but you can supplement with your general knowledge where appropriate.

IMPORTANT INSTRUCTIONS FOR CODE BLOCKS:
1. When you find code blocks in the database information, reproduce them EXACTLY as they appear
2. Do not modify, summarize, or rewrite any code from the database
3. Always place code in proper Markdown code blocks with the appropriate language specification
4. If the language isn't clear, use \`\`\`code for generic code blocks
5. Preserve all comments, whitespace, and formatting in code blocks exactly as they appear in the database

Always:
1. Be precise and technically accurate
2. Format your answers in Markdown for better readability
3. Cite your sources when directly referring to specific documentation
4. When explaining code, explain what the code does but DO NOT modify the original code
5. Present code blocks from the database exactly as they appear, with no modifications

DO NOT make up information about AVOS features or capabilities that aren't mentioned in the context.
If the context doesn't contain enough information, say so clearly rather than inventing details.
    `.trim();
    
    // Add custom system prompt if provided
    const systemPrompt = customSystemPrompt ? 
      `${baseSystemPrompt}\n\n${customSystemPrompt}` : 
      baseSystemPrompt;
    
    // If query is specifically about code, add a reminder to be exact with code
    if (/code|example|sample|implementation|snippet|syntax|usage|how to use|how to implement/i.test(query)) {
      console.log(`[${new Date().toISOString()}] Adding extra code preservation instructions for code-related query`);
    }
    
    // Get enhanced response from LLM
    const llmResponse = await llmClient.getResponse(
      query,
      context,
      systemPrompt,
      conversationHistory,
      dbResults // Pass DB data explicitly
    );
    
    return {
      answer: llmResponse.answer,
      sources,
      error: llmResponse.error
    };
  } catch (error: any) {
    console.error('Error getting LLM response with DB:', error);
    return {
      answer: "I'm sorry, but I encountered an error processing your request with the database information. Please try again.",
      error: error.message || 'Unknown error processing DB response'
    };
  }
} 