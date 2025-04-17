import { useState } from 'react';
import { FaShare, FaTimes, FaPlus, FaUserPlus, FaCopy } from 'react-icons/fa';

interface ShareButtonProps {
  chatId: string;
  isShared: boolean;
  sharedWith?: string[];
  onShared: (shareCode: string, shareUrl: string, sharedWith: string[]) => void;
}

export default function ShareButton({ chatId, isShared, sharedWith = [], onShared }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [localSharedWith, setLocalSharedWith] = useState<string[]>(sharedWith);

  // Share chat with the current set of emails
  const shareChat = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/chats/${chatId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share',
          sharedWithEmails: localSharedWith 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to share chat');
      }
      
      const data = await response.json();
      
      // Call the parent component's callback
      onShared(data.shareCode, data.shareUrl, data.sharedWith);
      
      // Open the share modal with the results
      setIsShareModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to share chat');
    } finally {
      setLoading(false);
    }
  };

  // Add email to share list
  const addEmail = () => {
    // Simple email validation
    if (!emailInput.trim()) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError(null);
    if (!localSharedWith.includes(emailInput)) {
      setLocalSharedWith([...localSharedWith, emailInput]);
    }
    setEmailInput('');
  };

  // Remove email from share list
  const removeEmail = (email: string) => {
    setLocalSharedWith(localSharedWith.filter(e => e !== email));
  };

  return (
    <>
      <button
        onClick={shareChat}
        className="text-green-600 hover:text-green-800 p-2 flex items-center"
        title={isShared ? 'Update Share Link' : 'Share Chat'}
        disabled={loading}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-600"></div>
        ) : (
          <>
            <FaShare className="mr-1" />
            <span className="text-sm">Share</span>
          </>
        )}
      </button>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Share Your Chat</h2>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share with specific users
              </label>
              <div className="border border-gray-300 rounded-md p-2 bg-gray-50 mb-2">
                {localSharedWith.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {localSharedWith.map((email, index) => (
                      <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md flex items-center text-sm">
                        {email}
                        <button 
                          onClick={() => removeEmail(email)} 
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-1">No users added yet</div>
                )}
              </div>
              
              <div className="flex items-center">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="Enter email address"
                  className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addEmail}
                  className="p-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                >
                  <FaPlus />
                </button>
              </div>
              {emailError && (
                <p className="text-red-600 text-xs mt-1">{emailError}</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={shareChat}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <FaUserPlus className="mr-2" /> Share Chat
              </button>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 