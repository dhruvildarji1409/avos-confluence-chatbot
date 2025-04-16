import ChatInterface from '@/components/ChatInterface'
import Header from '@/components/Header'
import UrlImporter from '@/components/UrlImporter'
import Link from 'next/link'
import { FaComments, FaPlus } from 'react-icons/fa'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-col md:flex-row flex-1">
        <div className="w-full md:w-1/3 p-4 bg-gray-50">
          {/* Database Tools Section - Moved to top */}
          <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-bold mb-4">Database Tools</h2>
            
            <div className="space-y-3">
              <Link
                href="/check-db"
                className="block p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                <div className="font-medium">Database Check</div>
                <div className="text-sm text-gray-600">View all saved Confluence content</div>
              </Link>
              
              <Link
                href="/search-db"
                className="block p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                <div className="font-medium">Content Search</div>
                <div className="text-sm text-gray-600">Search through indexed content</div>
              </Link>
            </div>
          </div>
          
          <div className="mt-6">
            <UrlImporter />
          </div>
          
          {/* Chats Section */}
          <div className="mt-6 p-4 bg-white rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-bold mb-4">Your Chats</h2>
            
            <div className="space-y-3">
              <Link
                href="/chats"
                className="block p-3 bg-green-50 rounded hover:bg-green-100 transition-colors"
              >
                <div className="font-medium flex items-center">
                  <FaComments className="mr-2" /> Manage Chats
                </div>
                <div className="text-sm text-gray-600">View, edit and share your chat history</div>
              </Link>
              
              <Link
                href="/chat/new"
                className="block p-3 bg-green-50 rounded hover:bg-green-100 transition-colors"
              >
                <div className="font-medium flex items-center">
                  <FaPlus className="mr-2" /> New Chat
                </div>
                <div className="text-sm text-gray-600">Start a fresh conversation</div>
              </Link>
            </div>
          </div>
        </div>
        <div className="w-full md:w-2/3 p-4">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
} 