'use client';

import React, { useState } from 'react';
import { LogIn, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';

export default function AuthButton() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-2 w-full p-3 text-gray-300 hover:text-white hover:bg-[#2a2a2e] rounded-lg transition-colors"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <span className="flex-1 text-left truncate">
            {user.username || user.email}
          </span>
          <ChevronDown size={16} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1c] border border-[#2a2a2e] rounded-lg shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-[#2a2a2e]">
              <p className="text-sm text-gray-400">Signed in as</p>
              <p className="text-white font-medium truncate">
                {user.username || user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 p-3 text-red-400 hover:text-red-300 hover:bg-[#2a2a2e] transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="p-3 space-y-2">
        <button
          onClick={() => setShowLoginModal(true)}
          className="w-full flex items-center justify-center space-x-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <LogIn size={16} />
          <span>Sign In</span>
        </button>
        
        <button
          onClick={() => setShowRegisterModal(true)}
          className="w-full flex items-center justify-center space-x-2 p-2 bg-[#2a2a2e] hover:bg-[#3a3a3e] text-gray-300 hover:text-white rounded-lg transition-colors"
        >
          <User size={16} />
          <span>Sign Up</span>
        </button>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
}
