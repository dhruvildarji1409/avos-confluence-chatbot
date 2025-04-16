import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

// Metadata needs to be exported from a server component
export const metadata: Metadata = {
  title: 'AVOS Chatbot',
  description: 'Intelligent assistant for NVIDIA employees',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <main className="flex min-h-screen flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
} 