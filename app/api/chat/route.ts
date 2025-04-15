import { NextResponse } from 'next/server';
import { searchConfluenceContent } from '@/lib/confluenceParser';
import ChatHistory from '@/models/ChatHistory';
import connectToDatabase from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { query, sessionId } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();
    
    // Search for relevant content in the Confluence data
    const searchResults = await searchConfluenceContent(query);
    
    if (!searchResults || searchResults.length === 0) {
      const noResultsResponse = {
        answer: "I couldn't find any relevant information in the AVOS documentation. Could you try rephrasing your question or provide more details?",
        sources: []
      };
      
      // Save to chat history if session exists
      if (sessionId) {
        await saveChatHistory(sessionId, query, noResultsResponse.answer);
      }
      
      return NextResponse.json({
        ...noResultsResponse,
        sessionId: sessionId || uuidv4()
      });
    }
    
    // Generate a response based on the search results
    let contextText = '';
    const sources = [];
    const codeSnippets = [];
    
    for (const result of searchResults) {
      contextText += `From "${result.pageTitle}":\n${result.content.substring(0, 500)}...\n\n`;
      sources.push({
        title: result.pageTitle,
        url: result.pageUrl
      });
      
      // Add any code snippets to the context
      const resultCodeSnippets = result.extractedElements.filter(
        (element: any) => element.type === 'code'
      );
      
      if (resultCodeSnippets.length > 0) {
        resultCodeSnippets.forEach((snippet: any) => {
          codeSnippets.push(snippet.content);
        });
      }
    }
    
    // Construct answer with relevant content and optional code snippets
    let answer = `Based on the AVOS documentation, here's what I found regarding "${query}":\n\n`;
    
    // Add the main content
    answer += `${contextText}\n`;
    
    // Add code snippets if any
    if (codeSnippets.length > 0) {
      answer += "\nHere are some relevant code snippets from the documentation:\n\n";
      codeSnippets.slice(0, 3).forEach((snippet, index) => {
        answer += `\`\`\`\n${snippet}\n\`\`\`\n\n`;
      });
    }
    
    // Add summary
    answer += "\nPlease let me know if you need more specific information.";
    
    // Generate session ID if not provided
    const userSessionId = sessionId || uuidv4();
    
    // Save to chat history
    await saveChatHistory(userSessionId, query, answer);
    
    return NextResponse.json({
      answer,
      sources,
      sessionId: userSessionId
    });
  } catch (error) {
    console.error('Error processing chat query:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process query' },
      { status: 500 }
    );
  }
}

async function saveChatHistory(sessionId: string, query: string, answer: string) {
  try {
    await ChatHistory.findOneAndUpdate(
      { sessionId },
      {
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
  }
} 