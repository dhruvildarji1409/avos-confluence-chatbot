import { useState } from 'react';
import { FaTimes, FaPlus, FaCopy, FaUserPlus } from 'react-icons/fa';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareCode: string;
  shareUrl: string;
  sharedWith: string[];
  onUpdateShare: (sharedWith: string[]) => void;
  onUnshare: () => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  shareCode,
  shareUrl,
  sharedWith,
  onUpdateShare,
  onUnshare
}: ShareModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [localSharedWith, setLocalSharedWith] = useState<string[]>(sharedWith);
  const [copySuccess, setCopySuccess] = useState('');

  if (!isOpen) return null;
  
  // Copy share URL to clipboard
  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
      });
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

  // Handle update sharing
  const handleUpdateShare = () => {
    onUpdateShare(localSharedWith);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Share Your Chat</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>
        
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
        
        <div className="mb-4">
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
              className="ml-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 relative"
            >
              <FaCopy />
              {copySuccess && (
                <span className="absolute -top-8 -right-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  {copySuccess}
                </span>
              )}
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
            <span>Share with specific users</span>
            <button 
              onClick={onUnshare}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              Stop sharing
            </button>
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
        
        <div className="text-sm text-gray-600 mb-4">
          Anyone with the link can view this chat. Specific users will also see it in their list of shared chats.
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleUpdateShare}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <FaUserPlus className="mr-2" /> Update Sharing
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 