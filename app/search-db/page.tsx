'use client';

import { useState, useEffect } from 'react';

interface ExtractedElement {
  type: string;
  name?: string;
  content?: string;
  src?: string;
  alt?: string;
}

interface ConfluenceItem {
  _id: string;
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  content: string;
  fullHtmlContent: string;
  extractedElements: ExtractedElement[];
  createdAt: string;
  updatedAt: string;
  score?: number;
}

export default function SearchDatabase() {
  const [data, setData] = useState<ConfluenceItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<ConfluenceItem | null>(null);

  const performSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Searching Confluence data for: "${query}"`);
      const response = await fetch(`/api/search-confluence?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`API response received with ${result.count} items`);
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('API returned error:', result.error);
        setError(result.error || 'Failed to search data');
      }
    } catch (err) {
      console.error('Error searching data:', err);
      setError(`Error searching data: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Component mounted, loading initial data...');
    // Load initial data (most recent entries)
    performSearch();
    // No dependencies needed as we want to run this only on component mount
  }, []);

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  };

  // Close modal when clicking outside
  const closeModal = () => {
    setModalContent(null);
  };

  // Function to truncate text
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text?.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text || 'N/A';
  };

  // Function to highlight search terms
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    const terms = searchTerm.split(' ').filter(term => term.length > 2);
    if (terms.length === 0) return text;
    
    let result = text;
    terms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      result = result.replace(regex, match => `<mark class="bg-yellow-200">${match}</mark>`);
    });
    
    return result;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Search Confluence Content</h1>
      
      <div className="mb-4 flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Search for content..."
          className="border border-gray-300 p-2 rounded-l w-full"
        />
        <button 
          onClick={performSearch}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        {data.length === 0 ? (
          <p>No matching Confluence content found.</p>
        ) : (
          <p>Found <span className="font-bold">{data.length}</span> matching results</p>
        )}
      </div>
        
      {data.length > 0 && (
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.pageId} className="border border-gray-300 rounded p-4 bg-white">
              <h2 className="text-xl font-bold mb-2">{item.pageTitle}</h2>
              
              <div className="mb-2">
                <a 
                  href={item.pageUrl} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  {item.pageUrl}
                </a>
              </div>
              
              <div className="mb-4">
                <div 
                  className="text-sm text-gray-700" 
                  dangerouslySetInnerHTML={{ 
                    __html: highlightText(truncateText(item.content, 300), query) 
                  }} 
                />
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div>Updated: {new Date(item.updatedAt).toLocaleString()}</div>
                <button 
                  onClick={() => setModalContent(item)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                >
                  View Full Content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for viewing detailed content */}
      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{modalContent.pageTitle}</h2>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <h3 className="font-bold mb-1">Page ID:</h3>
                <p>{modalContent.pageId}</p>
              </div>
              
              <div>
                <h3 className="font-bold mb-1">URL:</h3>
                <a 
                  href={modalContent.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {modalContent.pageUrl}
                </a>
              </div>
              
              <div>
                <h3 className="font-bold mb-1">Content:</h3>
                <div className="border p-3 rounded bg-gray-50 max-h-60 overflow-y-auto">
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(modalContent.content, query) 
                    }} 
                  />
                </div>
              </div>
              
              {modalContent.fullHtmlContent && (
                <div>
                  <h3 className="font-bold mb-1">HTML Content:</h3>
                  <div className="border p-3 rounded bg-gray-50 max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{modalContent.fullHtmlContent}</pre>
                  </div>
                </div>
              )}
              
              {modalContent.extractedElements && modalContent.extractedElements.length > 0 && (
                <div>
                  <h3 className="font-bold mb-1">Extracted Elements ({modalContent.extractedElements.length}):</h3>
                  <div className="border p-3 rounded bg-gray-50 max-h-60 overflow-y-auto">
                    {modalContent.extractedElements.map((element, index) => (
                      <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                        <p><strong>Type:</strong> {element.type}</p>
                        {element.name && <p><strong>Name:</strong> {element.name}</p>}
                        {element.content && <p><strong>Content:</strong> {element.content}</p>}
                        {element.src && <p><strong>Source:</strong> {element.src}</p>}
                        {element.alt && <p><strong>Alt:</strong> {element.alt}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold mb-1">Created:</h3>
                  <p>{new Date(modalContent.createdAt).toLocaleString()}</p>
                </div>
                
                <div>
                  <h3 className="font-bold mb-1">Updated:</h3>
                  <p>{new Date(modalContent.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 