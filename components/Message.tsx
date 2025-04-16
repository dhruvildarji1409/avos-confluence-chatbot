'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { FaUser, FaRobot, FaExclamationTriangle } from 'react-icons/fa';
import rehypeRaw from 'rehype-raw';

interface MessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date | string;
    isDeepSearch?: boolean;
    isError?: boolean;
  };
  isDeepSearch?: boolean;
  isError?: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isDeepSearch, isError }) => {
  const isUser = message.role === 'user';
  // Check if this is an error message - either from props or message property
  const hasError = isError || message.isError;
  // Check if this is a deep search - either from props or message property
  const isDeep = isDeepSearch || message.isDeepSearch;
  
  // Handle timestamp formatting if needed
  const formatTimestamp = () => {
    if (!message.timestamp) return '';
    
    try {
      const date = typeof message.timestamp === 'string' 
        ? new Date(message.timestamp) 
        : message.timestamp;
        
      return date.toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };
  
  return (
    <div
      className={`flex ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex max-w-[90%] ${
          isUser
            ? 'bg-blue-600 text-white rounded-lg rounded-tr-none'
            : hasError 
              ? 'bg-red-50 text-gray-800 rounded-lg rounded-tl-none' 
              : `${isDeep ? 'bg-blue-50' : 'bg-gray-100'} text-gray-800 rounded-lg rounded-tl-none`
        } px-4 py-3 shadow-sm`}
      >
        <div className={`flex-shrink-0 ${isUser ? 'order-last ml-2' : 'mr-2'}`}>
          {isUser ? (
            <FaUser className="text-white mt-1" />
          ) : hasError ? (
            <FaExclamationTriangle className="text-red-500 mt-1" />
          ) : (
            <FaRobot className={`${isDeep ? 'text-blue-700' : 'text-blue-600'} mt-1`} />
          )}
        </div>
        
        <div className="prose max-w-none break-words">
          {formatTimestamp() && (
            <div className="text-xs text-gray-500 mb-1">
              {formatTimestamp()}
            </div>
          )}
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={atomDark as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={`${className} px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded`} {...props}>
                    {children}
                  </code>
                );
              },
              // Enhanced styles for emphasis and strong emphasis
              em({ node, children, ...props }: any) {
                return <em className="italic text-gray-700 dark:text-gray-300" {...props}>{children}</em>;
              },
              strong({ node, children, ...props }: any) {
                return <strong className="font-bold text-gray-900 dark:text-gray-100" {...props}>{children}</strong>;
              },
              // Improved blockquote styling for important notes
              blockquote({ node, children, ...props }: any) {
                return (
                  <blockquote 
                    className="pl-4 border-l-4 border-blue-500 italic bg-gray-50 dark:bg-gray-800 p-2 rounded-r" 
                    {...props}
                  >
                    {children}
                  </blockquote>
                );
              },
              // Improved heading styles
              h1({ node, children, ...props }: any) {
                return <h1 className="text-2xl font-bold mt-4 mb-2 pb-2 border-b" {...props}>{children}</h1>;
              },
              h2({ node, children, ...props }: any) {
                return <h2 className="text-xl font-bold mt-3 mb-2" {...props}>{children}</h2>;
              },
              h3({ node, children, ...props }: any) {
                return <h3 className="text-lg font-bold mt-2 mb-1" {...props}>{children}</h3>;
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default Message;