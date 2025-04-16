'use client';

import React from 'react';
import Link from 'next/link';
import { FaRobot, FaLock, FaComments, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from './AuthCheck';

const Header: React.FC = () => {
  const { user, loading, logout } = useAuth();

  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-90">
            <FaRobot className="text-green-400 text-2xl" />
            <h1 className="text-xl font-bold">AVOS Chatbot</h1>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {!loading && user ? (
            <>
              <Link href="/chats" className="flex items-center space-x-2 text-blue-300 hover:text-blue-200">
                <FaComments />
                <span>My Chats</span>
              </Link>
              
              <div className="flex items-center space-x-3 ml-6">
                <div className="flex items-center space-x-2 text-green-300">
                  <FaUser />
                  <span>{user.username}</span>
                </div>
                
                <button 
                  onClick={logout}
                  className="flex items-center space-x-1 bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-md transition-colors"
                >
                  <FaSignOutAlt />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <Link href="/login" className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded-md transition-colors">
                Login
              </Link>
              <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md transition-colors">
                Register
              </Link>
            </div>
          )}
          
          <div className="flex items-center space-x-2 ml-4">
            <FaLock className="text-yellow-400" />
            <span className="text-sm">Restricted Access</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 