'use client';

import React from 'react';
import { FaDatabase, FaCode } from 'react-icons/fa';

interface CodeBlockSourceProps {
  isFromDatabase: boolean;
  language?: string;
}

/**
 * Component to indicate that a code block was retrieved directly from the database
 * Provides visual indication to users that the code is authentic and unmodified
 */
const CodeBlockSource: React.FC<CodeBlockSourceProps> = ({ isFromDatabase, language }) => {
  if (!isFromDatabase) return null;
  
  return (
    <div className="code-block-source flex items-center text-xs mt-1 text-gray-600">
      <FaDatabase className="mr-1" />
      <span>
        Retrieved directly from database
        {language && (
          <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-800 rounded">
            <FaCode className="inline mr-1" size={10} />
            {language}
          </span>
        )}
      </span>
    </div>
  );
};

export default CodeBlockSource; 