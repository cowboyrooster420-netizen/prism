'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function TopNavigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false) // You can connect this to your auth context

  return (
    <nav className="bg-[#1a1a1a] border-b border-[#333333] px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-white">PRISM</div>
          <div className="text-xs text-gray-400 font-medium">EDGE PIPELINE</div>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          
          {/* Watchlists */}
          <Link 
            href="/watchlists" 
            className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            Watchlists
          </Link>

          {/* Login/User */}
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">User</div>
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              href="/login"
              className="px-3 py-1 bg-[#2a2a2a] text-white border border-[#444444] text-sm font-medium hover:bg-[#333333] transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}