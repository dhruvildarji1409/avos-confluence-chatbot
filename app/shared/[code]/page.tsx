'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Message from '@/components/Message';
import { FaArrowLeft, FaSync } from 'react-icons/fa';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isDeepSearch?: boolean;
  isError?: boolean;
}

interface SharedChatData {
  id: string;
  title: string;
  messages: Message[];
}

export default function SharedChatPage() {
  const params = useParams();
  const shareCode = params.code as string;
  
  const [chat, setChat] = useState<SharedChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch shared chat data
  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`[Shared Chat] Fetching shared chat with code: ${shareCode}, attempt: ${retryCount + 1}`);
        
        const response = await fetch(`/api/shared/${shareCode}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          console.error(`[Shared Chat] Failed to fetch shared chat: ${response.status} ${response.statusText}`);
          
          if (response.status === 404) {
            throw new Error('Shared chat not found or no longer available');
          }
          throw new Error(`Failed to load shared chat: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Shared Chat] Successfully fetched shared chat data:', data);
        
        if (!data || !data.id) {
          throw new Error('Invalid shared chat data returned from server');
        }
        
        setChat(data);
      } catch (err: any) {
        console.error('[Shared Chat] Error fetching shared chat:', err);
        setError(err.message || 'An error occurred while loading the shared chat');
      } finally {
        setLoading(false);
      }
    };
    
    if (shareCode) {
      fetchSharedChat();
    } else {
      setError('Invalid share code');
      setLoading(false);
    }
  }, [shareCode, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="container mx-auto p-4 flex-1">
        <div className="flex items-center mb-6">
          <Link href="/" className="mr-4 text-gray-600 hover:text-gray-800">
            <FaArrowLeft />
          </Link>
          <h1 className="text-2xl font-bold">Shared Chat</h1>
          {shareCode && (
            <span className="ml-3 text-sm text-gray-500">
              Code: {shareCode}
            </span>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
            <div className="mt-3 flex items-center">
              <p className="text-sm mr-2">If you received this link from someone, ask them to share it again.</p>
              <button 
                onClick={handleRetry}
                className="flex items-center bg-red-100 hover:bg-red-200 text-red-700 py-1 px-3 rounded-md text-sm"
              >
                <FaSync className="mr-1" size={12} /> Retry
              </button>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <span className="ml-3">Loading shared chat...</span>
          </div>
        ) : !chat ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-xl font-medium mb-2">Shared chat not found</h2>
            <p className="text-gray-600 mb-4">
              This shared chat may have been deleted or the share link is invalid
            </p>
            <div className="mt-4 space-y-3">
              <button
                onClick={handleRetry}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 inline-flex items-center"
              >
                <FaSync className="mr-2" size={14} /> Try again
              </button>
              <div className="block pt-2">
                <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block">
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-xl font-semibold mb-6 pb-2 border-b">{chat.title}</h2>
              
              <div className="space-y-6">
                {chat.messages && chat.messages.length > 0 ? (
                  chat.messages.map((message, index) => (
                    <Message key={index} message={message} />
                  ))
                ) : (
                  <p className="text-gray-500 italic">This chat has no messages.</p>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg mt-6">
              <p className="text-sm text-blue-800 mb-2">
                This is a read-only view of a shared chat. Create your own account to start chatting.
              </p>
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Go to AVOS Bot
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 