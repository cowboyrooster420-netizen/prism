'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1b1b1f] border border-[#2a2a2e] rounded-2xl p-8 text-center">
            <div className="text-red-400 text-6xl mb-4">💥</div>
            <h2 className="text-2xl font-bold text-white mb-4">Application Error</h2>
            <p className="text-gray-400 mb-6">
              A critical error occurred. Please refresh the page or try again later.
            </p>
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#2a2a2e]/50 text-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-[#3a3a3f]/50 transition-colors"
              >
                Refresh page
              </button>
            </div>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-4">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}