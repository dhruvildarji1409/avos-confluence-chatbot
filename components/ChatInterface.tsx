'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaSpinner } from 'react-icons/fa';
import Message from './Message';

interface MessageType {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Source {
  title: string;
  url: string;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load session ID from localStorage on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chatSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      // TODO: Load chat history for this session
    }
  }, []);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          sessionId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      // Save session ID if it's the first message
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('chatSessionId', data.sessionId);
      }
      
      const botMessage: MessageType = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setSources(data.sources || []);
    } catch (error) {
      const errorMessage: MessageType = {
        role: 'assistant',
        content: `Error: ${(error as Error).message || 'Something went wrong. Please try again later.'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow-md p-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="text-center p-6 max-w-md">
              <h2 className="text-xl font-bold mb-2">Welcome to AVOS Chatbot!</h2>
              <p className="mb-4">
                Ask me anything about AVOS based on the Confluence documentation.
              </p>
              <p className="text-sm">
                You can import new Confluence pages using the panel on the left.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center text-gray-500 animate-pulse">
                <FaSpinner className="animate-spin mr-2" />
                <span>AVOS is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {sources.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <h3 className="text-sm font-medium mb-2">Sources:</h3>
          <ul className="text-sm text-blue-600">
            {sources.map((source, index) => (
              <li key={index} className="mb-1 truncate">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center mt-auto">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about AVOS..."
            className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="ml-2 inline-flex items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface; 