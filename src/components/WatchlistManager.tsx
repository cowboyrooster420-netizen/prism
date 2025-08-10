'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Star, MoreVertical, Edit3, Trash2, Eye, EyeOff, LogIn } from 'lucide-react'
import CreateWatchlistModal from './CreateWatchlistModal'
import AddTokenModal from './AddTokenModal'
import WatchlistCard from './WatchlistCard'
import { useAuth } from '@/contexts/AuthContext'

interface Watchlist {
  id: string
  name: string
  description: string
  is_public: boolean
  created_at: string
  updated_at: string
  token_count: number
}

export default function WatchlistManager() {
  const { user, token } = useAuth()
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false)
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null)

  const fetchWatchlists = useCallback(async () => {
    if (!token) return
    
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/watchlists', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view your watchlists')
        }
        throw new Error('Failed to fetch watchlists')
      }

      const data = await response.json()
      setWatchlists(data.watchlists || [])
    } catch (err) {
      console.error('Error fetching watchlists:', err)
      setError(err instanceof Error ? err.message : 'Failed to load watchlists')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  const handleCreateWatchlist = async (name: string, description: string, isPublic: boolean) => {
    try {
      const response = await fetch('/api/watchlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, is_public: isPublic }),
      })

      if (!response.ok) {
        throw new Error('Failed to create watchlist')
      }

      await fetchWatchlists()
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error('Error creating watchlist:', err)
      setError(err instanceof Error ? err.message : 'Failed to create watchlist')
    }
  }

  const handleDeleteWatchlist = async (watchlistId: string) => {
    if (!confirm('Are you sure you want to delete this watchlist?')) return

    try {
      const response = await fetch(`/api/watchlists/${watchlistId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete watchlist')
      }

      await fetchWatchlists()
    } catch (err) {
      console.error('Error deleting watchlist:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete watchlist')
    }
  }

  const handleAddToken = (watchlist: Watchlist) => {
    setSelectedWatchlist(watchlist)
    setIsAddTokenModalOpen(true)
  }

  const handleTokenAdded = () => {
    fetchWatchlists()
    setIsAddTokenModalOpen(false)
    setSelectedWatchlist(null)
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-4 h-4 bg-glowBlue rounded-full animate-pulse" />
              <span>Loading watchlists...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-glowBlue rounded-full" />
            <h1 className="text-2xl font-bold text-white">My Watchlists</h1>
            <div className="px-3 py-1 bg-glowBlue/20 text-glowBlue text-xs font-medium rounded-full">
              Personal
            </div>
          </div>
          <p className="text-gray-400">
            Create and manage your personal token watchlists
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center mb-6">
            <div className="text-red-400 font-medium mb-2">Error</div>
            <div className="text-red-300 text-sm mb-4">{error}</div>
            <button 
              onClick={() => setError(null)}
              className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create Watchlist Button */}
        <div className="mb-6">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-glowBlue to-glowPurple text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus size={18} />
            Create New Watchlist
          </button>
        </div>

        {/* Watchlists Grid */}
        {watchlists.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-glowBlue to-glowPurple rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="text-2xl text-white" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No watchlists yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first watchlist to start tracking your favorite tokens
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-glowBlue to-glowPurple text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Create Your First Watchlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlists.map((watchlist) => (
              <WatchlistCard
                key={watchlist.id}
                watchlist={watchlist}
                onAddToken={() => handleAddToken(watchlist)}
                onDelete={() => handleDeleteWatchlist(watchlist.id)}
                onRefresh={fetchWatchlists}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Watchlist Modal */}
      <CreateWatchlistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateWatchlist}
      />

      {/* Add Token Modal */}
      <AddTokenModal
        isOpen={isAddTokenModalOpen}
        onClose={() => {
          setIsAddTokenModalOpen(false)
          setSelectedWatchlist(null)
        }}
        watchlist={selectedWatchlist}
        onTokenAdded={handleTokenAdded}
      />
    </div>
  )
}
