'use client'

import { useState } from 'react'
import { Star, Plus, MoreVertical, Edit3, Trash2, Eye, EyeOff, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Watchlist {
  id: string
  name: string
  description: string
  is_public: boolean
  created_at: string
  updated_at: string
  token_count: number
}

interface WatchlistCardProps {
  watchlist: Watchlist
  onAddToken: () => void
  onDelete: () => void
  onRefresh: () => void
}

export default function WatchlistCard({ watchlist, onAddToken, onDelete, onRefresh }: WatchlistCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleMenuToggle = () => setIsMenuOpen(!isMenuOpen)

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="relative group">
      <div className="bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-xl p-6 hover:border-[#2a2a2e] transition-all duration-300 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-glowBlue" />
              <h3 className="text-lg font-semibold text-white truncate">{watchlist.name}</h3>
              {watchlist.is_public && (
                <div className="px-2 py-1 bg-glowGreen/20 text-glowGreen text-xs rounded-full">
                  Public
                </div>
              )}
            </div>
            {watchlist.description && (
              <p className="text-sm text-gray-400 line-clamp-2">{watchlist.description}</p>
            )}
          </div>
          
          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={handleMenuToggle}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#1f1f25] border border-[#2a2a2e]/50 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onAddToken()
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors rounded-t-lg"
                >
                  <Plus size={16} />
                  Add Token
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement edit functionality
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded-b-lg"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{watchlist.token_count}</div>
            <div className="text-xs text-gray-400">Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Updated</div>
            <div className="text-xs text-gray-500">{formatDate(watchlist.updated_at)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onAddToken}
            className="flex-1 bg-glowBlue/20 text-glowBlue px-4 py-2 rounded-lg text-sm font-medium hover:bg-glowBlue/30 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Token
          </button>
          <button
            onClick={() => {
              // TODO: Navigate to watchlist detail view
              console.log('View watchlist:', watchlist.id)
            }}
            className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-colors"
          >
            View
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-[#2a2a2e]/30">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Created {formatDate(watchlist.created_at)}</span>
            <div className="flex items-center gap-1">
              {watchlist.is_public ? (
                <>
                  <Eye size={12} />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <EyeOff size={12} />
                  <span>Private</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  )
}
