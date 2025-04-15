import ChatInterface from '@/components/ChatInterface'
import Header from '@/components/Header'
import UrlImporter from '@/components/UrlImporter'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-col md:flex-row flex-1">
        <div className="w-full md:w-1/3 p-4 bg-gray-50">
          <UrlImporter />
        </div>
        <div className="w-full md:w-2/3 p-4">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
} 