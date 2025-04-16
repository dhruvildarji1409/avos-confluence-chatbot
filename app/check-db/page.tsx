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
}

export default function CheckDatabase() {
  const [data, setData] = useState<ConfluenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<ConfluenceItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<{
    success: boolean;
    message: string;
    id: string;
  } | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/check-confluence-data');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        // Reset selected items
        setSelectedItems([]);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Error fetching data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Function to download JSON data
  const downloadJsonData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confluence-data-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to delete a Confluence page
  const deletePage = async (pageId: string) => {
    if (!confirm(`Are you sure you want to delete the page with ID ${pageId}?`)) {
      return;
    }
    
    try {
      setDeletingId(pageId);
      const response = await fetch(`/api/delete-confluence?pageId=${pageId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      // Set status message
      setDeleteStatus({
        success: result.success,
        message: result.message || result.error || 'Unknown error',
        id: pageId
      });
      
      // If successful, remove the item from the local data
      if (result.success) {
        setData(prev => prev.filter(item => item.pageId !== pageId));
        setSelectedItems(prev => prev.filter(id => id !== pageId));
      }
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting page:', err);
      setDeleteStatus({
        success: false,
        message: 'Failed to delete page. Check console for details.',
        id: pageId
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Function to handle bulk delete
  const bulkDelete = async () => {
    if (selectedItems.length === 0) {
      setDeleteStatus({
        success: false,
        message: 'No items selected for deletion',
        id: 'bulk'
      });
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} selected pages?`)) {
      return;
    }
    
    try {
      setBulkDeleting(true);
      const response = await fetch(`/api/delete-confluence?pageIds=${encodeURIComponent(JSON.stringify(selectedItems))}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      // Set status message
      setDeleteStatus({
        success: result.success,
        message: result.message || result.error || 'Unknown error',
        id: 'bulk'
      });
      
      // If successful, remove the items from the local data
      if (result.success) {
        setData(prev => prev.filter(item => !selectedItems.includes(item.pageId)));
        setSelectedItems([]);
      }
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error bulk deleting pages:', err);
      setDeleteStatus({
        success: false,
        message: 'Failed to delete pages. Check console for details.',
        id: 'bulk'
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Handle checkbox toggle
  const toggleItemSelection = (pageId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(pageId)) {
        return prev.filter(id => id !== pageId);
      } else {
        return [...prev, pageId];
      }
    });
  };

  // Handle select all toggle
  const toggleSelectAll = () => {
    if (selectedItems.length === data.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.map(item => item.pageId));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Confluence Database Check</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Delete status notification */}
      {deleteStatus && (
        <div className={`p-4 mb-4 rounded-md ${deleteStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {deleteStatus.message}
        </div>
      )}
      
      {!loading && !error && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p>Total entries: <span className="font-bold">{data.length}</span></p>
              {selectedItems.length > 0 && (
                <p className="text-sm mt-1">Selected: <span className="font-bold">{selectedItems.length}</span></p>
              )}
            </div>
            <div className="flex gap-2">
              {selectedItems.length > 0 && (
                <button 
                  onClick={bulkDelete}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedItems.length})`}
                </button>
              )}
              <button 
                onClick={fetchData}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Refresh Data
              </button>
              <button 
                onClick={downloadJsonData}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Download JSON Data
              </button>
            </div>
          </div>
          
          {data.length === 0 ? (
            <p>No Confluence content found in the database.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.length === data.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-2 border">Page ID</th>
                    <th className="px-4 py-2 border">Title</th>
                    <th className="px-4 py-2 border">URL</th>
                    <th className="px-4 py-2 border">Content Preview</th>
                    <th className="px-4 py-2 border">Created At</th>
                    <th className="px-4 py-2 border">Updated At</th>
                    <th className="px-4 py-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.pageId} className={selectedItems.includes(item.pageId) ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-2 border text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(item.pageId)}
                          onChange={() => toggleItemSelection(item.pageId)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-2 border">{item.pageId}</td>
                      <td className="px-4 py-2 border">{item.pageTitle}</td>
                      <td className="px-4 py-2 border">
                        <a 
                          href={item.pageUrl} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          View Page
                        </a>
                      </td>
                      <td className="px-4 py-2 border">
                        {truncateText(item.content)}
                      </td>
                      <td className="px-4 py-2 border">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2 border">{new Date(item.updatedAt).toLocaleString()}</td>
                      <td className="px-4 py-2 border">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setModalContent(item)}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                          >
                            View Details
                          </button>
                          <button 
                            onClick={() => deletePage(item.pageId)}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                            disabled={deletingId === item.pageId}
                          >
                            {deletingId === item.pageId ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal for viewing detailed content */}
      {modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{modalContent.pageTitle}</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    closeModal();
                    deletePage(modalContent.pageId);
                  }}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                >
                  Delete
                </button>
                <button 
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
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
                  <pre className="whitespace-pre-wrap">{modalContent.content}</pre>
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