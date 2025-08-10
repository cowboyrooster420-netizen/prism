'use client'

import { useState, useEffect } from 'react'
import TokenCard from './TokenCard'
import TokenDetailModal from './TokenDetailModal'

interface AIWatchlistToken {
  address: string
  name: string
  symbol: string
  price: number
  volume_24h: number
  price_change_24h: number
  market_cap: number
  ai_confidence_score: number
  ai_reasoning: string
  added_at: string
}

interface AIWatchlistStats {
  total_tokens: number
  avg_confidence: number
  avg_volume: number
  avg_market_cap: number
  tokens: AIWatchlistToken[]
}

export default function AIWatchlist() {
  const [stats, setStats] = useState<AIWatchlistStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    checkPremiumStatus()
    fetchAIWatchlist()
  }, [])

  const checkPremiumStatus = async () => {
    try {
      // This would check if user has premium subscription
      // For now, we'll simulate premium access
      setIsPremium(true)
    } catch (error) {
      console.error('Error checking premium status:', error)
      setIsPremium(false)
    }
  }

  const fetchAIWatchlist = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/ai-watchlist')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Premium access required')
        }
        throw new Error('Failed to fetch AI watchlist')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching AI watchlist:', err)
      setError(err instanceof Error ? err.message : 'Failed to load AI watchlist')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenClick = (token: AIWatchlistToken) => {
    // Transform AIWatchlistToken to match Token interface expected by modal
    const transformedToken = {
      id: token.address,
      name: token.name,
      symbol: token.symbol,
      address: token.address,
      price: token.price,
      price_change_24h: token.price_change_24h,
      volume_24h: token.volume_24h,
      market_cap: token.market_cap
    }
    setSelectedToken(transformedToken)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedToken(null)
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400'
    if (score >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'Very High'
    if (score >= 0.6) return 'High'
    if (score >= 0.4) return 'Medium'
    return 'Low'
  }

  if (!isPremium) {
    return (
      <div className="flex-1 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-glowBlue to-glowPurple rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">AI-Powered Watchlist</h2>
              <p className="text-gray-400 mb-6">
                Access our AI-curated list of promising Solana tokens
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-xl p-8 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Premium Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-glowBlue/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-glowBlue">🤖</span>
                  </div>
                  <div className="text-white font-medium">AI Analysis</div>
                  <div className="text-gray-400">Continuous token evaluation</div>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-glowGreen/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-glowGreen">📊</span>
                  </div>
                  <div className="text-white font-medium">Real-time Updates</div>
                  <div className="text-gray-400">Automatic additions/removals</div>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-glowPurple/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-glowPurple">💡</span>
                  </div>
                  <div className="text-white font-medium">AI Insights</div>
                  <div className="text-gray-400">Detailed reasoning & analysis</div>
                </div>
              </div>
            </div>

            <button className="bg-gradient-to-r from-glowBlue to-glowPurple text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Upgrade to Premium
            </button>
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
            <div className="w-2 h-2 bg-glowBlue rounded-full animate-pulse" />
            <h1 className="text-2xl font-bold text-white">Prism AI Watchlist</h1>
            <div className="px-3 py-1 bg-glowBlue/20 text-glowBlue text-xs font-medium rounded-full">
              AI-Powered
            </div>
          </div>
          <p className="text-gray-400">
            AI-curated list of promising Solana tokens, automatically updated based on market analysis
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{stats.total_tokens}</div>
              <div className="text-sm text-gray-400">Total Tokens</div>
            </div>
            <div className="bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">
                {(stats.avg_confidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Avg Confidence</div>
            </div>
            <div className="bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">
                ${(stats.avg_volume / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-gray-400">Avg Volume</div>
            </div>
            <div className="bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">
                ${(stats.avg_market_cap / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-gray-400">Avg Market Cap</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-4 h-4 bg-glowBlue rounded-full animate-pulse" />
              <span>Loading AI watchlist...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <div className="text-red-400 font-medium mb-2">Error</div>
            <div className="text-red-300 text-sm mb-4">{error}</div>
            <button 
              onClick={fetchAIWatchlist}
              className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Tokens Grid */}
        {!isLoading && !error && stats && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                AI-Selected Tokens ({stats.tokens.length})
              </h2>
              <button 
                onClick={fetchAIWatchlist}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.tokens.map((token) => (
                <div 
                  key={token.address}
                  className="bg-gradient-to-br from-[#1f1f25] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-xl p-4 hover:border-[#2a2a2e] transition-colors cursor-pointer group"
                  onClick={() => handleTokenClick(token)}
                >
                  {/* Token Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-white">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">${token.price.toFixed(6)}</div>
                      <div className={`text-sm ${token.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* AI Confidence */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">AI Confidence</span>
                      <span className={`font-medium ${getConfidenceColor(token.ai_confidence_score)}`}>
                        {getConfidenceLabel(token.ai_confidence_score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-glowBlue to-glowPurple h-2 rounded-full transition-all duration-300"
                        style={{ width: `${token.ai_confidence_score * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Market Data */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400">Volume 24h</div>
                      <div className="text-white">${(token.volume_24h / 1000).toFixed(0)}K</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Market Cap</div>
                      <div className="text-white">${(token.market_cap / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>

                  {/* AI Reasoning Preview */}
                  <div className="mt-3 pt-3 border-t border-[#2a2a2e]/50">
                    <div className="text-xs text-gray-400 mb-1">AI Analysis</div>
                    <div className="text-xs text-gray-300 line-clamp-2">
                      {token.ai_reasoning.substring(0, 100)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stats.tokens.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">🤖</div>
                <div className="text-lg font-medium mb-2">No tokens in AI watchlist</div>
                <div className="text-sm">The AI is currently analyzing the market...</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Token Detail Modal */}
      <TokenDetailModal
        token={selectedToken}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
