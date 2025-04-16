'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import { FaArrowLeft, FaShare, FaEdit, FaTrash } from 'react-icons/fa';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isDeepSearch?: boolean;
  isError?: boolean;
}

interface ChatData {
  id: string;
  title: string;
  messages: Message[];
  isShared: boolean;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  
  const [chat, setChat] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Fetch chat data
  useEffect(() => {
    const fetchChat = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chats/${chatId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Chat not found');
          }
          throw new Error('Failed to load chat');
        }
        
        const data = await response.json();
        setChat(data);
        setEditTitle(data.title);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (chatId) {
      fetchChat();
    }
  }, [chatId]);

  // Update chat title
  const updateTitle = async () => {
    if (!editTitle.trim() || !chat) return;
    
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update chat title');
      }
      
      setChat({
        ...chat,
        title: editTitle,
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update title');
    }
  };

  // Delete chat
  const deleteChat = async () => {
    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
      
      // Redirect to chats list
      router.push('/chats');
    } catch (err: any) {
      setError(err.message || 'Failed to delete chat');
    }
  };

  // Share chat
  const shareChat = async () => {
    try {
      const response = await fetch(`/api/chats/${chatId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to share chat');
      }
      
      const data = await response.json();
      
      // Update the chat
      setChat(chat => chat ? { ...chat, isShared: true } : null);
      
      // Display the share code and URL
      setShareCode(data.shareCode);
      setShareUrl(data.shareUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to share chat');
    }
  };

  // Copy share URL to clipboard
  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          // Show temporary notification
          const notification = document.createElement('div');
          notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white py-2 px-4 rounded-md shadow-lg';
          notification.textContent = 'Share URL copied to clipboard!';
          document.body.appendChild(notification);
          
          // Remove notification after 3 seconds
          setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 500);
          }, 2500);
        })
        .catch(err => {
          console.error('Failed to copy URL:', err);
          alert('Failed to copy URL to clipboard');
        });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="container mx-auto p-4 flex-1">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : !chat ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-xl font-medium mb-2">Chat not found</h2>
            <p className="text-gray-600 mb-4">The chat you're looking for doesn't exist or was deleted</p>
            <Link href="/chats" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block">
              Back to Chats
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Link href="/chats" className="mr-4 text-gray-600 hover:text-gray-800">
                  <FaArrowLeft />
                </Link>
                
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 mr-2"
                      autoFocus
                    />
                    <button
                      onClick={updateTitle}
                      className="bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditTitle(chat.title);
                      }}
                      className="ml-2 bg-gray-200 text-gray-800 px-2 py-1 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold">{chat.title}</h1>
                )}
              </div>
              
              <div className="flex space-x-2">
                {!isEditing && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="Edit Title"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={shareChat}
                      className="text-green-600 hover:text-green-800 p-2"
                      title={chat.isShared ? 'Update Share Link' : 'Share Chat'}
                    >
                      <FaShare />
                    </button>
                    <button
                      onClick={deleteChat}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Delete Chat"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {chat.isShared && (
              <div className="bg-green-50 text-green-700 p-2 rounded-md mb-4 inline-block text-sm">
                This chat is shared
              </div>
            )}
            
            <ChatInterface initialMessages={chat.messages} sessionId={chat.id} />
          </>
        )}
      </div>
      
      {/* Share URL Modal */}
      {shareCode && shareUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Share Your Chat</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share Code
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={shareCode}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share URL
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <button
                  onClick={copyShareUrl}
                  className="ml-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Anyone with this link can view this chat's conversation history.
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShareCode(null);
                  setShareUrl(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 