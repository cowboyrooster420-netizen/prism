'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1b1b1f] border border-[#2a2a2e] rounded-2xl p-8 text-center">
        <div className="text-glowBlue text-6xl mb-4">🔍</div>
        <h2 className="text-3xl font-bold text-white mb-4">404</h2>
        <p className="text-xl text-gray-300 mb-2">Page Not Found</p>
        <p className="text-gray-400 mb-6">
          The page you are looking for does not exist.
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-gradient-to-r from-glowBlue to-glowPurple text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Go home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-[#2a2a2e]/50 text-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-[#3a3a3f]/50 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}