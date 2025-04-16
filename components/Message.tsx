'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { FaUser, FaRobot, FaExclamationTriangle, FaDatabase, FaBrain } from 'react-icons/fa';
import rehypeRaw from 'rehype-raw';
import CodeBlockSource from './CodeBlockSource';

interface MessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date | string;
    isDeepSearch?: boolean;
    isError?: boolean;
    usedDatabase?: boolean;
    databaseFallback?: boolean;
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
  // Check if database was used for this response
  const usedDatabase = message.usedDatabase;
  // Check if this was a database fallback (tried db but failed)
  const databaseFallback = message.databaseFallback;
  
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
            <div className="flex flex-col items-center">
              <FaRobot className={`${isDeep ? 'text-blue-700' : 'text-blue-600'} mt-1`} />
              {!isUser && usedDatabase !== undefined && (
                <div className="mt-1 text-xs flex items-center" title={usedDatabase ? "Used database knowledge" : "Used general knowledge only"}>
                  {usedDatabase ? (
                    <FaDatabase className="text-blue-600" title="Database knowledge used" />
                  ) : (
                    <FaBrain className="text-purple-600" title="LLM knowledge only" />
                  )}
                </div>
              )}
              {!isUser && databaseFallback && (
                <div className="mt-1 text-xs flex items-center">
                  <span className="text-yellow-600 text-[10px]" title="Database access failed, using general knowledge">DB ⚠️</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="prose max-w-none break-words">
          {formatTimestamp() && (
            <div className="text-xs text-gray-500 mb-1">
              {formatTimestamp()}
              {!isUser && usedDatabase !== undefined && (
                <span className="ml-2 text-xs" title={usedDatabase ? "Used database knowledge" : "Used general knowledge only"}>
                  {usedDatabase ? (
                    <span className="text-blue-600">
                      <FaDatabase className="inline mr-1" size={10} />
                      DB
                    </span>
                  ) : (
                    <span className="text-purple-600">
                      <FaBrain className="inline mr-1" size={10} />
                      LLM
                    </span>
                  )}
                </span>
              )}
              {!isUser && databaseFallback && (
                <span className="ml-2 text-xs text-yellow-600" title="Database access failed, using general knowledge">
                  ⚠️ DB Fallback
                </span>
              )}
            </div>
          )}
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const codeContent = String(children).replace(/\n$/, '');
                
                // Check if this code block came from the database
                // We specifically mark code from the database with the <EXACT_CODE_BLOCK> tag
                const isFromDatabase = usedDatabase && (
                  codeContent.includes('<EXACT_CODE_BLOCK>') || 
                  message.content.includes('<EXACT_CODE_BLOCK>') ||
                  message.content.includes('CODE_BLOCK_START')
                );
                
                return !inline && match ? (
                  <div className="relative mb-4">
                    {language && (
                      <div className="absolute top-0 right-0 bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded-bl-md rounded-tr-md">
                        {language}
                      </div>
                    )}
                    <SyntaxHighlighter
                      style={atomDark as any}
                      language={language}
                      PreTag="div"
                      wrapLongLines={false}
                      showLineNumbers={true}
                      {...props}
                    >
                      {codeContent}
                    </SyntaxHighlighter>
                    {/* Show source indicator if from database */}
                    <CodeBlockSource isFromDatabase={isFromDatabase} language={language} />
                  </div>
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