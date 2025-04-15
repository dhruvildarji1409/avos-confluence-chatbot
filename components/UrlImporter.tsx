'use client';

import React, { useState, useEffect } from 'react';
import { FaLink, FaSpinner, FaExternalLinkAlt } from 'react-icons/fa';

interface ImportedPage {
  pageTitle: string;
  pageUrl: string;
  importedAt: Date;
}

const UrlImporter: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | null;
  }>({ message: '', type: null });
  const [recentImports, setRecentImports] = useState<ImportedPage[]>([]);

  // Load recent imports from localStorage on mount
  useEffect(() => {
    const storedImports = localStorage.getItem('recentImports');
    if (storedImports) {
      try {
        setRecentImports(JSON.parse(storedImports));
      } catch (e) {
        console.error('Failed to parse recent imports from localStorage');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setStatus({
        message: 'Please enter a valid Confluence URL',
        type: 'error',
      });
      return;
    }
    
    setIsLoading(true);
    setStatus({ message: 'Parsing Confluence page...', type: 'info' });
    
    try {
      const response = await fetch('/api/parse-confluence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse Confluence page');
      }
      
      // Update success message
      setStatus({
        message: `Successfully imported "${data.data.pageTitle}"`,
        type: 'success',
      });
      
      // Add to recent imports
      const newImport: ImportedPage = {
        pageTitle: data.data.pageTitle,
        pageUrl: url,
        importedAt: new Date(),
      };
      
      const updatedImports = [newImport, ...recentImports.slice(0, 4)]; // Keep only the 5 most recent
      setRecentImports(updatedImports);
      
      // Save to localStorage
      localStorage.setItem('recentImports', JSON.stringify(updatedImports));
      
      setUrl('');
    } catch (error) {
      setStatus({
        message: (error as Error).message || 'Failed to parse Confluence page',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-semibold mb-4">Import Confluence Page</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="flex items-center mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLink className="text-gray-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Paste Confluence URL here"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? <FaSpinner className="animate-spin mr-2" /> : 'Import'}
          </button>
        </div>
      </form>
      
      {status.type && (
        <div
          className={`mt-4 p-3 rounded-md ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800'
              : status.type === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-blue-50 text-blue-800'
          }`}
        >
          {status.message}
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="text-md font-medium mb-2">Recently Imported Pages</h3>
        {recentImports.length > 0 ? (
          <ul className="space-y-2">
            {recentImports.map((page, index) => (
              <li key={index} className="text-sm">
                <a 
                  href={page.pageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <span className="truncate">{page.pageTitle}</span>
                  <FaExternalLinkAlt className="ml-1 h-3 w-3 flex-shrink-0" />
                </a>
                <span className="text-xs text-gray-500">
                  {new Date(page.importedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">
            Import your first Confluence page to see it here.
          </div>
        )}
      </div>
    </div>
  );
};

export default UrlImporter; 