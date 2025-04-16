'use client';

import React, { useState } from 'react';

export default function DebugPage() {
  const [apiResponse, setApiResponse] = useState<string>('No response yet');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const testSimpleApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing simple API endpoint...');
      const response = await fetch('/api/debug/simple');
      
      const contentType = response.headers.get('content-type');
      console.log('Content type:', contentType);
      
      const text = await response.text();
      console.log('Raw response:', text.substring(0, 100) + '...');
      
      try {
        const json = JSON.parse(text);
        setApiResponse(JSON.stringify(json, null, 2));
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        setApiResponse(text.substring(0, 500));
        setError('Failed to parse response as JSON');
      }
    } catch (e) {
      console.error('Error fetching API:', e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };
  
  const testChatApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing chat API endpoint...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'What is AVOS?'
        })
      });
      
      const contentType = response.headers.get('content-type');
      console.log('Content type:', contentType);
      
      const text = await response.text();
      console.log('Raw response:', text.substring(0, 100) + '...');
      
      try {
        const json = JSON.parse(text);
        setApiResponse(JSON.stringify(json, null, 2));
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        setApiResponse(text.substring(0, 500));
        setError('Failed to parse response as JSON');
      }
    } catch (e) {
      console.error('Error fetching API:', e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Debug Page</h1>
      
      <div className="mb-4 flex space-x-2">
        <button 
          onClick={testSimpleApi}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
        >
          Test Simple API
        </button>
        
        <button 
          onClick={testChatApi}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-green-300"
        >
          Test Chat API
        </button>
      </div>
      
      {loading && <p className="mb-4">Loading...</p>}
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      <div className="border rounded p-4 bg-gray-50">
        <h2 className="font-bold mb-2">API Response:</h2>
        <pre className="whitespace-pre-wrap bg-white p-2 border rounded overflow-auto max-h-96">
          {apiResponse}
        </pre>
      </div>
    </div>
  );
} 