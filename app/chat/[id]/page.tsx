'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import ShareButton from '@/components/ShareButton';
import ShareModal from '@/components/ShareModal';
import { FaArrowLeft, FaEdit, FaTrash } from 'react-icons/fa';

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
  sharedWith?: string[];
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
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
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
        if (data.sharedWith) {
          setSharedWith(data.sharedWith);
        }
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

  // Handle shared chat URL and code
  const handleShared = (code: string, url: string, emails: string[]) => {
    setShareCode(code);
    setShareUrl(url);
    setSharedWith(emails);
    setChat(chat => chat ? { ...chat, isShared: true, sharedWith: emails } : null);
    setIsShareModalOpen(true);
  };

  // Unshare chat
  const unshareChat = async () => {
    if (!confirm('Are you sure you want to stop sharing this chat?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chats/${chatId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unshare'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop sharing chat');
      }
      
      // Update the chat
      setChat(chat => chat ? { ...chat, isShared: false, sharedWith: [] } : null);
      setSharedWith([]);
      setShareCode(null);
      setShareUrl(null);
      setIsShareModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to stop sharing chat');
    }
  };

  // Update shared users
  const updateSharedUsers = async (updatedEmails: string[]) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-sharing',
          sharedWithEmails: updatedEmails
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update sharing settings');
      }
      
      const data = await response.json();
      
      // Update the chat
      setChat(chat => chat ? { ...chat, sharedWith: data.sharedWith } : null);
      setSharedWith(data.sharedWith);
    } catch (err: any) {
      setError(err.message || 'Failed to update sharing settings');
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
                    <ShareButton 
                      chatId={chatId}
                      isShared={chat.isShared}
                      sharedWith={chat.sharedWith}
                      onShared={handleShared}
                    />
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
                {chat.sharedWith && chat.sharedWith.length > 0 && (
                  <span> with {chat.sharedWith.length} {chat.sharedWith.length === 1 ? 'user' : 'users'}</span>
                )}
              </div>
            )}
            
            <ChatInterface initialMessages={chat.messages} sessionId={chat.id} />
          </>
        )}
      </div>
      
      {/* Share Modal */}
      {isShareModalOpen && shareCode && shareUrl && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareCode={shareCode}
          shareUrl={shareUrl}
          sharedWith={sharedWith}
          onUpdateShare={updateSharedUsers}
          onUnshare={unshareChat}
        />
      )}
    </div>
  );
} 