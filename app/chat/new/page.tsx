'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSpinner } from 'react-icons/fa';

export default function NewChatPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createNewChat = async () => {
      try {
        setIsCreating(true);
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'New Chat',
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create new chat');
        }
        
        const data = await response.json();
        
        // Navigate to the new chat
        router.push(`/chat/${data.id}`);
      } catch (err: any) {
        setError(err.message || 'Failed to create new chat');
        setIsCreating(false);
      }
    };
    
    createNewChat();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      {isCreating ? (
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800">Creating new chat...</h2>
          <p className="text-gray-600 mt-2">Just a moment while we set things up</p>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-800 mb-6">{error || 'Something went wrong while creating your chat.'}</p>
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/chats')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              View All Chats
            </button>
            <button
              onClick={() => window.location.reload()}
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