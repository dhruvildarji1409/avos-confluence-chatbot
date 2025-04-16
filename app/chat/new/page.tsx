'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

export default function NewChatPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const createNewChat = async () => {
      try {
        setIsCreating(true);
        console.log(`Creating new chat (attempt ${retryCount + 1})...`);
        
        // First, check if the API server is reachable
        try {
          const healthCheck = await fetch('/api/auth/user', { 
            method: 'GET',
            cache: 'no-store'
          });
          
          if (!healthCheck.ok) {
            console.error('API server health check failed:', healthCheck.status);
            throw new Error(`API server is not responding correctly: ${healthCheck.status}`);
          }
        } catch (healthError) {
          console.error('Server health check failed:', healthError);
          throw new Error('Unable to connect to the server. Please check your connection or try again later.');
        }
        
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'New Chat',
          }),
          cache: 'no-store'
        });
        
        if (!response.ok) {
          console.error('Failed to create chat, status:', response.status);
          let errorText = 'Unknown error';
          
          try {
            // Try to parse as JSON first
            const errorJson = await response.json();
            errorText = errorJson.error || JSON.stringify(errorJson);
          } catch (e) {
            // If not JSON, get as text
            errorText = await response.text();
          }
          
          console.error('Error response:', errorText);
          throw new Error(`Failed to create new chat: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Chat created successfully:', data);
        
        // Clear any local session ID to avoid conflicts
        localStorage.removeItem('chatSessionId');
        
        // Navigate to the new chat
        router.push(`/chat/${data.id}`);
      } catch (err: any) {
        console.error('Error creating chat:', err);
        
        // Check if we should retry
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          // Wait a second before retrying
          setTimeout(() => setIsCreating(true), 1000);
        } else {
          setError(err.message || 'Failed to create new chat');
          setIsCreating(false);
        }
      }
    };
    
    if (isCreating) {
      createNewChat();
    }
  }, [router, isCreating, retryCount]);

  const tryAgain = () => {
    setRetryCount(0);
    setError(null);
    setIsCreating(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      {isCreating ? (
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">
            Creating new chat{retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : ''}...
          </h2>
          <p className="text-gray-600 mt-2">Just a moment while we set things up</p>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center mb-4">
            <FaExclamationTriangle className="text-2xl text-red-600 mr-2" />
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
          </div>
          <p className="text-gray-800 mb-6">{error || 'Something went wrong while creating your chat.'}</p>
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Go Home
            </button>
            <button
              onClick={tryAgain}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 