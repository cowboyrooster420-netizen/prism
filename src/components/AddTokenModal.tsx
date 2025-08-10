'use client'

import { useState, useEffect } from 'react'
import { X, Search, Plus, Star } from 'lucide-react'

interface Watchlist {
  id: string
  name: string
  description: string
  is_public: boolean
  created_at: string
  updated_at: string
  token_count: number
}

interface Token {
  address: string
  name: string
  symbol: string
  price?: number
  price_change_24h?: number
  volume_24h?: number
  market_cap?: number
}

interface AddTokenModalProps {
  isOpen: boolean
  onClose: () => void
  watchlist: Watchlist | null
  onTokenAdded: () => void
}

export default function AddTokenModal({ isOpen, onClose, watchlist, onTokenAdded }: AddTokenModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (searchQuery.trim()) {
      searchTokens()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchTokens = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/ai-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: searchQuery.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.tokens || [])
      }
    } catch (error) {
      console.error('Error searching tokens:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleTokenToggle = (tokenAddress: string) => {
    const newSelected = new Set(selectedTokens)
    if (newSelected.has(tokenAddress)) {
      newSelected.delete(tokenAddress)
    } else {
      newSelected.add(tokenAddress)
    }
    setSelectedTokens(newSelected)
  }

  const handleAddTokens = async () => {
    if (!watchlist || selectedTokens.size === 0) return

    setIsAdding(true)
    try {
      const tokensToAdd = Array.from(selectedTokens).map(address => ({
        watchlist_id: watchlist.id,
        token_address: address,
      }))

      const response = await fetch('/api/watchlists/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens: tokensToAdd }),
      })

      if (response.ok) {
        onTokenAdded()
        setSelectedTokens(new Set())
        setSearchQuery('')
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error adding tokens:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleClose = () => {
    if (!isAdding) {
      setSelectedTokens(new Set())
      setSearchQuery('')
      setSearchResults([])
      onClose()
    }
  }

  if (!isOpen || !watchlist) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2e]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-glowBlue to-glowPurple rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Add Tokens</h2>
              <p className="text-sm text-gray-400">to {watchlist.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isAdding}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-[#2a2a2e]/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for tokens by name, symbol, or criteria..."
              disabled={isAdding}
              className="w-full pl-10 pr-4 py-3 bg-[#0a0a0c] border border-[#2a2a2e]/50 rounded-lg text-white placeholder-gray-500 focus:border-glowBlue/50 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-4 h-4 bg-glowBlue rounded-full animate-pulse" />
                <span>Searching tokens...</span>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <span>Found {searchResults.length} tokens</span>
                {selectedTokens.size > 0 && (
                  <span className="text-glowBlue">
                    {selectedTokens.size} selected
                  </span>
                )}
              </div>
              
              {searchResults.map((token) => (
                <div
                  key={token.address}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedTokens.has(token.address)
                      ? 'border-glowBlue/50 bg-glowBlue/10'
                      : 'border-[#2a2a2e]/30 hover:border-[#2a2a2e] hover:bg-white/5'
                  }`}
                  onClick={() => handleTokenToggle(token.address)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      selectedTokens.has(token.address)
                        ? 'border-glowBlue bg-glowBlue'
                        : 'border-gray-500'
                    }`}>
                      {selectedTokens.has(token.address) && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {token.price && (
                      <div className="text-white">${token.price.toFixed(6)}</div>
                    )}
                    {token.price_change_24h !== undefined && (
                      <div className={`text-sm ${
                        token.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-lg font-medium mb-2">No tokens found</div>
              <div className="text-sm">Try adjusting your search criteria</div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-4">💎</div>
              <div className="text-lg font-medium mb-2">Search for tokens</div>
              <div className="text-sm">Enter a search query to find tokens to add</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-[#2a2a2e]/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={isAdding}
            className="flex-1 px-4 py-3 bg-white/5 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddTokens}
            disabled={selectedTokens.size === 0 || isAdding}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-glowBlue to-glowPurple text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : `Add ${selectedTokens.size} Token${selectedTokens.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
