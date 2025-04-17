'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import GraphicalRAG from '@/components/GraphicalRAG';
import { FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

interface Document {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  content: string;
  score?: number;
  updatedAt: string;
}

export default function GraphicalRAGPage() {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initial data load
  useEffect(() => {
    fetchData();
  }, []);
  
  // Fetch data for the visualization
  const fetchData = async (searchQuery: string = '') => {
    try {
      setLoading(true);
      setError(null);
      setQuery(searchQuery);
      
      const response = await fetch(`/api/graphical-rag?query=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Handle case where results might be undefined
      setDocuments(data.results || []);
    } catch (err: any) {
      console.error('Error fetching RAG data:', err);
      setError(err.message || 'Failed to load visualization data');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search
  const handleSearch = (searchQuery: string) => {
    fetchData(searchQuery);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="container mx-auto p-4 flex-1">
        <h1 className="text-2xl font-bold mb-2">Graphical RAG for Confluence</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6 text-sm text-blue-800 flex items-start">
          <FaInfoCircle className="mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">What is Graphical RAG?</p>
            <p>
              Graphical Retrieval-Augmented Generation (RAG) visualizes the relationships between your query,
              retrieved documents, and the key entities within them. This helps you understand how information
              is connected across your Confluence documents.
            </p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4 flex items-start">
            <FaExclamationTriangle className="mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
              <button 
                onClick={() => fetchData(query)} 
                className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Main visualization */}
        <GraphicalRAG
          query={query}
          documents={documents}
          isLoading={loading}
          onSearch={handleSearch}
        />
        
        {/* Document previews */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Retrieved Documents</h2>
          
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">
                {query ? 'No documents found for this query.' : 'Search for Confluence content to see document previews.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.pageId} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <a 
                    href={doc.pageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-blue-600 hover:underline mb-1 block"
                  >
                    {doc.pageTitle}
                  </a>
                  
                  {doc.score !== null && doc.score !== undefined && (
                    <div className="flex items-center mb-2">
                      <div className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-md">
                        Relevance: {(doc.score * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  
                  <p className="text-gray-600 text-sm mb-2 line-clamp-3">
                    {doc.content ? doc.content.replace(/(<([^>]+)>)/gi, '') : 'No content available'}
                  </p>
                  
                  <div className="text-gray-400 text-xs">
                    Last updated: {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 