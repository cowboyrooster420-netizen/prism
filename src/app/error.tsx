'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1b1b1f] border border-[#2a2a2e] rounded-2xl p-8 text-center">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-4">Something went wrong!</h2>
        <p className="text-gray-400 mb-6">
          An error occurred while loading this page. Please try again.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-gradient-to-r from-glowBlue to-glowPurple text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-[#2a2a2e]/50 text-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-[#3a3a3f]/50 transition-colors"
          >
            Go home
          </button>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-500 mt-4">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}