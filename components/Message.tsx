'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { FaUser, FaRobot } from 'react-icons/fa';

interface MessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  };
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div
      className={`flex ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex max-w-[80%] ${
          isUser
            ? 'bg-blue-600 text-white rounded-lg rounded-tr-none'
            : 'bg-gray-100 text-gray-800 rounded-lg rounded-tl-none'
        } px-4 py-3 shadow-sm`}
      >
        <div className={`flex-shrink-0 ${isUser ? 'order-last ml-2' : 'mr-2'}`}>
          {isUser ? (
            <FaUser className="text-white mt-1" />
          ) : (
            <FaRobot className="text-blue-600 mt-1" />
          )}
        </div>
        
        <div className="prose max-w-none break-words">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={atomDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
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