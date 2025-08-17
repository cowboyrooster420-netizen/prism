'use client'

import { useState, useEffect } from 'react'
import TokenCard from './TokenCard'
import TokenDetailModal from './TokenDetailModal'

interface EdgeToken {
  id: string
  symbol: string
  name: string
  mint_address: string
  price: number
  price_change_24h: number
  volume_24h: number
  market_cap: number
  liquidity: number
  updated_at: string
  
  // Behavioral metrics
  whale_buys_24h: number
  new_holders_24h: number
  volume_spike_ratio: number
  token_age_hours: number
  transaction_pattern_score: number
  smart_money_score: number
  
  // Basic TA
  rsi14: number
  breakout_high_20: boolean
  near_breakout_high_20: boolean
  cross_ema7_over_ema20: boolean
  cross_ema50_over_ema200: boolean
  
  // Elite TA
  vwap: number
  vwap_distance: number
  vwap_band_position: number
  support_level: number
  resistance_level: number
  support_distance: number
  resistance_distance: number
  smart_money_index: number
  trend_alignment_score: number
  volume_profile_score: number
  vwap_breakout_bullish: boolean
  vwap_breakout_bearish: boolean
  near_support: boolean
  near_resistance: boolean
  smart_money_bullish: boolean
  trend_alignment_strong: boolean
  
  // NEW: Edge scoring
  edge_score?: number
}

type TabType = 'edge-score' | 'new-launches'

export default function EdgePipeline() {
  const [activeTab, setActiveTab] = useState<TabType>('edge-score')
  const [edgeTokens, setEdgeTokens] = useState<EdgeToken[]>([])
  const [newLaunchTokens, setNewLaunchTokens] = useState<EdgeToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedToken, setSelectedToken] = useState<EdgeToken | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        setIsLoading(true)
        
        // Use the working Elite TA endpoint for both tabs
        const edgeResponse = await fetch('/api/trending-tokens-elite')
        const edgeData = await edgeResponse.json()
        
        // Same data for new launches, but we'll filter by age
        const launchResponse = await fetch('/api/trending-tokens-elite')
        const launchData = await launchResponse.json()
        
        if (edgeData.success) {
          // For edge tokens, just use all tokens (they already have Elite TA data)
          setEdgeTokens(edgeData.tokens || [])
        }
        
        if (launchData.success) {
          // For new launches, filter tokens that are less than 7 days old
          const newLaunches = (launchData.tokens || []).filter((token: any) => 
            token.token_age_hours < 168 // Less than 7 days
          )
          setNewLaunchTokens(newLaunches)
        }
        
      } catch (error) {
        console.error('Error fetching pipeline data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPipelineData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPipelineData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleTokenClick = (token: EdgeToken) => {
    setSelectedToken(token)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedToken(null)
  }

  const currentTokens = activeTab === 'edge-score' ? edgeTokens : newLaunchTokens
  const currentCount = currentTokens.length

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="h-full flex items-center justify-center">
      <div className="text-gray-400">Loading Pipeline...</div>
    </div>
  }

  return (
    <>
      <div className="h-full flex flex-col">
          
          {/* Header with Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">🚀 Prism Edge Pipeline</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#2a2a2a] text-green-400 text-sm border border-[#444444]">
                <div className="w-2 h-2 bg-green-400 animate-pulse"></div>
                Live Detection Active
              </div>
            </div>
            
            {/* Tab Selector */}
            <div className="flex bg-[#2a2a2a] border border-[#444444]">
              <button
                onClick={() => setActiveTab('edge-score')}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'edge-score'
                    ? 'bg-[#333333] text-white border-r border-[#444444]'
                    : 'text-gray-400 hover:text-gray-300 border-r border-[#444444]'
                }`}
              >
                Edge Score ({edgeTokens.length})
              </button>
              <button
                onClick={() => setActiveTab('new-launches')}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'new-launches'
                    ? 'bg-[#333333] text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                New Launches ({newLaunchTokens.length})
              </button>
            </div>
          </div>

          {/* Pipeline Content */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Scanning for edge opportunities...</p>
                </div>
              </div>
            ) : currentCount === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">
                    {activeTab === 'edge-score' 
                      ? 'No edge opportunities detected' 
                      : 'No new launches found'
                    }
                  </p>
                  <p className="text-gray-500 text-sm">
                    {activeTab === 'edge-score'
                      ? 'System continuously scans for high-probability setups'
                      : 'Monitoring launchpads for fresh tokens'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {currentTokens.map((token) => (
                    <div key={token.id} className="relative">
                      {/* Edge Score Badge */}
                      {activeTab === 'edge-score' && token.edge_score && (
                        <div className="absolute -top-1 -right-1 z-10 bg-[#333333] text-white text-xs font-bold px-2 py-1 border border-[#555555]">
                          {Math.round(token.edge_score)}
                        </div>
                      )}
                      
                      {/* Age Badge for New Launches */}
                      {activeTab === 'new-launches' && (
                        <div className="absolute -top-1 -right-1 z-10 bg-[#2a2a2a] text-green-400 text-xs font-bold px-2 py-1 border border-[#555555]">
                          {token.token_age_hours < 24 ? `${Math.round(token.token_age_hours)}h` : `${Math.round(token.token_age_hours / 24)}d`}
                        </div>
                      )}
                      
                      <TokenCard 
                        token={token} 
                        onClick={handleTokenClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Stats Footer */}
          <div className="mt-4 pt-4 border-t border-[#2a2a2e]/30">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>Opportunities Found: {currentCount}</span>
                <span>Pipeline Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 animate-pulse"></div>
                <span>Real-time Pipeline Active</span>
              </div>
            </div>
          </div>
        </div>

      {/* Token Detail Modal */}
      <TokenDetailModal
        token={selectedToken}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}