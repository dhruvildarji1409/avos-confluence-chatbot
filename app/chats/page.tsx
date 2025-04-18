'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { FaPlus, FaTrash, FaPencilAlt, FaShare, FaExternalLinkAlt } from 'react-icons/fa';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [editChatId, setEditChatId] = useState<string | null>(null);
  const [editChatTitle, setEditChatTitle] = useState('');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const router = useRouter();

  // Fetch all chats
  const fetchChats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching chats...');
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/chats', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Failed to fetch chats, status:', response.status);
        let errorText;
        try {
          const errorJson = await response.json();
          errorText = errorJson.error || JSON.stringify(errorJson);
        } catch (e) {
          errorText = await response.text();
        }
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch chats: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`Retrieved ${data.chats?.length || 0} chats`);
      setChats(data.chats || []);
    } catch (err: any) {
      console.error('Error fetching chats:', err);
      
      if (err.name === 'AbortError') {
        setError('Request timed out. The server might be overloaded or unavailable.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'An error occurred while loading your chats');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Create a new chat
  const createNewChat = async () => {
    try {
      console.log('Creating new chat with title:', newChatTitle || 'New Chat');
      
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newChatTitle || 'New Chat',
        }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error('Failed to create chat, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to create chat: ${response.status}`);
      }
      
      const newChat = await response.json();
      console.log('Chat created successfully:', newChat);
      
      // Clear any existing session ID
      localStorage.removeItem('chatSessionId');
      
      // Close modal and reset form
      setShowNewChatModal(false);
      setNewChatTitle('');
      
      // Navigate to the new chat
      router.push(`/chat/${newChat.id}`);
    } catch (err: any) {
      console.error('Error in createNewChat:', err);
      setError(err.message || 'Failed to create chat');
    }
  };

  // Delete a chat
  const deleteChat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }
    
    try {
      console.log('Deleting chat:', id);
      
      const response = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error('Failed to delete chat, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to delete chat: ${response.status}`);
      }
      
      console.log('Chat deleted successfully:', id);
      
      // Update the chat list
      setChats(chats.filter(chat => chat.id !== id));
    } catch (err: any) {
      console.error('Error in deleteChat:', err);
      setError(err.message || 'Failed to delete chat');
    }
  };

  // Update a chat's title
  const updateChatTitle = async () => {
    if (!editChatId) return;
    
    try {
      console.log('Updating chat title:', editChatId, editChatTitle);
      
      const response = await fetch(`/api/chats/${editChatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editChatTitle,
        }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error('Failed to update chat, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to update chat: ${response.status}`);
      }
      
      const updatedChat = await response.json();
      console.log('Chat updated successfully:', updatedChat);
      
      // Update the chat list
      setChats(chats.map(chat => 
        chat.id === editChatId 
          ? { ...chat, title: updatedChat.title, updatedAt: updatedChat.updatedAt } 
          : chat
      ));
      
      // Reset the edit form
      setEditChatId(null);
      setEditChatTitle('');
    } catch (err: any) {
      console.error('Error in updateChatTitle:', err);
      setError(err.message || 'Failed to update chat');
    }
  };

  // Share a chat
  const shareChat = async (id: string) => {
    try {
      console.log('Sharing chat:', id);
      
      const response = await fetch(`/api/chats/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share',
        }),
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error('Failed to share chat, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to share chat: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Chat shared successfully:', data);
      
      // Update the chat in the list
      setChats(chats.map(chat => 
        chat.id === id ? { ...chat, isShared: true } : chat
      ));
      
      // Display the share code and URL
      setShareCode(data.shareCode);
      setShareUrl(data.shareUrl);
    } catch (err: any) {
      console.error('Error in shareChat:', err);
      setError(err.message || 'Failed to share chat');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Copy share URL to clipboard
  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          console.log('Share URL copied to clipboard');
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Chats</h1>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <FaPlus className="mr-2" /> New Chat
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">Error loading chats</div>
              <button 
                onClick={() => setError(null)} 
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
            <div className="mb-3">{error}</div>
            <button
              onClick={fetchChats}
              className="self-end px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-xl font-medium mb-2">No chats yet</h2>
            <p className="text-gray-600 mb-4">Create your first chat to get started</p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Create New Chat
            </button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {chats.map(chat => (
              <div key={chat.id} className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="font-medium text-lg truncate">
                    {editChatId === chat.id ? (
                      <input
                        type="text"
                        value={editChatTitle}
                        onChange={(e) => setEditChatTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded p-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateChatTitle();
                          } else if (e.key === 'Escape') {
                            setEditChatId(null);
                          }
                        }}
                      />
                    ) : (
                      <Link href={`/chat/${chat.id}`} className="hover:text-blue-600">
                        {chat.title}
                      </Link>
                    )}
                  </h2>
                  <div className="flex space-x-2">
                    {editChatId === chat.id ? (
                      <>
                        <button
                          onClick={updateChatTitle}
                          className="text-green-600 hover:text-green-800"
                          title="Save"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditChatId(null)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditChatId(chat.id);
                            setEditChatTitle(chat.title);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FaPencilAlt />
                        </button>
                        <button
                          onClick={() => shareChat(chat.id)}
                          className="text-green-600 hover:text-green-800"
                          title={chat.isShared ? 'Update Share Link' : 'Share'}
                        >
                          <FaShare />
                        </button>
                        <button
                          onClick={() => deleteChat(chat.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 mb-3">
                  Updated: {formatDate(chat.updatedAt)}
                </div>
                
                {chat.isShared && (
                  <div className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded mb-3 inline-block">
                    Shared
                  </div>
                )}
                
                <Link
                  href={`/chat/${chat.id}`}
                  className="block mt-2 text-blue-600 hover:text-blue-800 text-sm hover:underline"
                >
                  Open Chat <FaExternalLinkAlt className="inline ml-1" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create New Chat</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chat Title
              </label>
              <input
                type="text"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="Title for your new chat"
                className="w-full p-2 border border-gray-300 rounded-md"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createNewChat();
                  } else if (e.key === 'Escape') {
                    setShowNewChatModal(false);
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createNewChat}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
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