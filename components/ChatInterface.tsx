'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaSpinner, FaDatabase, FaBrain } from 'react-icons/fa';
import Message from './Message';

interface MessageType {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isDeepSearch?: boolean;
  isError?: boolean;
  usedDatabase?: boolean;
  databaseFallback?: boolean;
}

interface Source {
  title: string;
  url: string;
}

interface ChatInterfaceProps {
  initialMessages?: MessageType[];
  sessionId?: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  initialMessages = [], 
  sessionId: initialSessionId = null 
}) => {
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [sources, setSources] = useState<Source[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to safely parse JSON
  const safeJsonParse = async (response: Response): Promise<any> => {
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(Array.from(response.headers.entries())));
    
    try {
      const contentType = response.headers.get('content-type');
      console.log('Content-Type header:', contentType);
      
      // Check if the content type is definitely JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          // Clone the response to safely use it again
          const jsonData = await response.clone().json();
          console.log('Successfully parsed JSON directly');
          return jsonData;
        } catch (directJsonError) {
          console.error('Failed to parse direct JSON:', directJsonError);
          // Fall through to text parsing as a backup
        }
      }
      
      // Get text content for more robust handling
      const text = await response.text();
      console.log('Response text length:', text.length);
      
      // If the response is empty, return an error object
      if (!text || text.trim() === '') {
        console.error('Empty response received');
        return {
          answer: "I received an empty response from the server. Please try again.",
          sources: [],
          isError: true
        };
      }
      
      // Try to parse text as JSON
      try {
        const parsedData = JSON.parse(text);
        console.log('Successfully parsed text as JSON');
        return parsedData;
      } catch (jsonParseError) {
        console.error('Failed to parse response text as JSON:', jsonParseError);
        
        // If it contains HTML, it's probably an error page
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          console.error('Response appears to be HTML instead of JSON');
          
          // Extract useful information from the HTML error page
          let errorTitle = 'Unknown server error';
          let errorDetails = '';
          
          try {
            // Try to extract error title from HTML
            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              errorTitle = titleMatch[1].trim();
            }
            
            // Try to extract error message from common patterns
            const errorMsgMatch = text.match(/<div class="error-message">(.*?)<\/div>/i) || 
                                text.match(/<p class="error">(.*?)<\/p>/i) ||
                                text.match(/<h1>(.*?)<\/h1>/i);
            
            if (errorMsgMatch && errorMsgMatch[1]) {
              errorDetails = errorMsgMatch[1].trim();
            }
            
            console.error('Extracted HTML error info - Title:', errorTitle, 'Details:', errorDetails);
          } catch (extractError) {
            console.error('Failed to extract HTML error details:', extractError);
          }
          
          // Log the first 500 chars of HTML for debugging
          console.error('HTML response preview:', text.substring(0, 500) + '...');
          
          return {
            answer: `The server returned an HTML page instead of data (${errorTitle}). This typically happens when there's a server error. Check server logs for details.${errorDetails ? ' Error details: ' + errorDetails : ''}`,
            error: "HTML response received",
            htmlError: errorTitle,
            htmlDetails: errorDetails,
            sources: [],
            isError: true
          };
        }
        
        // Try to extract JSON data if embedded in other content
        const jsonMatch = text.match(/({[\s\S]*})/) || text.match(/([\s\S]*])/);
        if (jsonMatch) {
          try {
            console.log('Found JSON pattern, attempting to parse extracted content');
            const extractedJson = JSON.parse(jsonMatch[0]);
            console.log('Successfully parsed extracted JSON');
            return extractedJson;
          } catch (extractError) {
            console.error('Failed to extract JSON from response:', extractError);
          }
        }
        
        // Return a formatted response with the text content for debugging
        return {
          answer: "I'm having trouble processing the server's response format. The server might be experiencing issues.",
          error: text.substring(0, 200),
          debugText: text.length > 500 ? text.substring(0, 500) + '...' : text,
          sources: [],
          isError: true
        };
      }
    } catch (error) {
      console.error('Critical error in safeJsonParse:', error);
      
      // Return a safe fallback that won't break the UI
      return {
        answer: "Sorry, I encountered a technical issue. Please try again later.",
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        sources: [],
        isError: true
      };
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load session ID from localStorage on mount if not provided
  useEffect(() => {
    if (!sessionId) {
      const storedSessionId = localStorage.getItem('chatSessionId');
      if (storedSessionId) {
        setSessionId(storedSessionId);
      }
    }
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage: MessageType = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      console.log(`Sending chat request for: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`);
      
      // Get previous conversation history to send to the API
      const previousMessages = messages.slice(-6); // Get last 6 messages for context
      const conversationHistory = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          sessionId,
          conversationHistory
        }),
      });
      
      // Check if the response is ok
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = '';
        
        try {
          if (contentType && contentType.includes('application/json')) {
            // Try to get error from JSON
            const errorData = await safeJsonParse(response.clone());
            errorMessage = errorData.error || `Server error: ${response.status}`;
          } else {
            // Get error from text
            const text = await response.text();
            // Log the first part of the response to help debug
            console.error('Non-JSON response:', text.substring(0, 100));
            errorMessage = `Server returned non-JSON response (${response.status})`;
          }
        } catch (parseError) {
          errorMessage = `Server error (${response.status}): Unable to parse error details`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Use the safe parsing helper to avoid JSON.parse errors
      let data;
      try {
        data = await safeJsonParse(response);
        console.log("Successfully parsed response:", data ? "Valid data" : "Empty data");
        
        // Extra validation to ensure we have a valid data object
        if (!data) {
          throw new Error("Empty response data");
        }
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        // Fallback to a simple error message that won't break the UI
        throw new Error("Failed to parse server response: " + 
          (parseError instanceof Error ? parseError.message : "Unknown parsing error"));
      } finally {
        // Always ensure loading state is reset
        setIsLoading(false);
      }
      
      // Safety check for required fields
      if (typeof data !== 'object' || !data.answer) {
        console.error("Invalid response structure:", data);
        throw new Error("The server returned an incomplete response");
      }
      
      // Save session ID if it's the first message
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('chatSessionId', data.sessionId);
      }
      
      // Log if database was used for transparency
      if (data.usedDatabase !== undefined) {
        console.log(`Response used database: ${data.usedDatabase}`);
      }
      
      if (data.databaseFallback) {
        console.log(`Database access failed, fell back to LLM-only`);
      }
      
      const botMessage: MessageType = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        isDeepSearch: data.isDeepSearch || false,
        isError: data.isError || false,
        usedDatabase: data.usedDatabase,
        databaseFallback: data.databaseFallback
      };
      
      setMessages(prev => [...prev, botMessage]);
      setSources(data.sources || []);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Create a user-friendly error message
      const errorContent = error instanceof Error 
        ? `Sorry, an error occurred: ${error.message}`
        : "Sorry, an unexpected error occurred. Please try again later.";
      
      const errorMessage: MessageType = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Make absolutely sure loading state is reset
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface flex flex-col h-[calc(100vh-6rem)] bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Chat messages */}
      <div className="messages flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="input-form flex border-t border-gray-200 p-4 bg-gray-50">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <FaSpinner className="spinner animate-spin" /> : <FaPaperPlane />}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;