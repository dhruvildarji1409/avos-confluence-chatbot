'use client';

import React from 'react';
import { FaRobot } from 'react-icons/fa';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FaRobot className="text-green-400 text-2xl" />
          <h1 className="text-xl font-bold">AVOS Confluence Chatbot</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline text-sm">Powered by NVIDIA Confluence</span>
        </div>
      </div>
    </header>
  );
};

export default Header; 