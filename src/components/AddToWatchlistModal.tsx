'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Watchlist {
  id: string
  name: string
  description: string
  is_public: boolean
  token_count: number
}

interface AddToWatchlistModalProps {
  isOpen: boolean
  onClose: () => void
  token: {
    symbol: string
    name: string
    mint_address: string
  } | null
}

export default function AddToWatchlistModal({ isOpen, onClose, token }: AddToWatchlistModalProps) {
  const { user, token: authToken } = useAuth()
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && user && authToken) {
      fetchWatchlists()
    }
  }, [isOpen, user, authToken])

  const fetchWatchlists = async () => {
    try {
      const response = await fetch('/api/watchlists', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch watchlists')
      }

      const data = await response.json()
      setWatchlists(data.watchlists || [])
      
      // Auto-select first watchlist if available
      if (data.watchlists && data.watchlists.length > 0) {
        setSelectedWatchlistId(data.watchlists[0].id)
      }
    } catch (err) {
      setError('Failed to load watchlists')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWatchlistId || !token) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/watchlists/tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokens: [{
            watchlist_id: selectedWatchlistId,
            token_address: token.mint_address,
            added_at: new Date().toISOString()
          }]
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add token to watchlist')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add token to watchlist')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[#1b1b1f] border border-[#2a2a2e] rounded-2xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-white mb-4">Sign In Required</h3>
          <p className="text-gray-400 mb-6">
            You need to sign in to add tokens to your watchlists.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose()
                // You could redirect to login here if needed
              }}
              className="flex-1 px-4 py-2 bg-glowBlue text-white rounded-lg hover:bg-glowBlue/80 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1b1b1f] border border-[#2a2a2e] rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-white mb-2">Add to Watchlist</h3>
        <p className="text-gray-400 mb-6">
          Add <span className="text-glowBlue font-medium">{token?.symbol}</span> to your watchlist
        </p>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 font-medium">Token added successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Select Watchlist
              </label>
              {watchlists.length === 0 ? (
                <div className="text-gray-500 text-sm py-3 text-center">
                  No watchlists found. Create one first.
                </div>
              ) : (
                <select
                  value={selectedWatchlistId}
                  onChange={(e) => setSelectedWatchlistId(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-[#2a2a2e] rounded-lg px-3 py-2 text-white focus:border-glowBlue focus:outline-none"
                  required
                >
                  {watchlists.map((watchlist) => (
                    <option key={watchlist.id} value={watchlist.id}>
                      {watchlist.name} ({watchlist.token_count} tokens)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedWatchlistId || isLoading || watchlists.length === 0}
                className="flex-1 px-4 py-2 bg-glowBlue text-white rounded-lg hover:bg-glowBlue/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Adding...' : 'Add Token'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

