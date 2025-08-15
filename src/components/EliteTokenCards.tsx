'use client'

import { useState, useEffect } from 'react'
import TokenCard from './TokenCard'

interface EliteToken {
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
  
  // 🚀 ELITE TA FEATURES 🚀
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
}

export default function EliteTokenCards() {
  const [tokens, setTokens] = useState<EliteToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEliteTokens = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/trending-tokens-elite')
        const data = await response.json()
        
        if (data.success && data.tokens) {
          setTokens(data.tokens)
        } else {
          setError('Failed to load Elite TA data')
        }
      } catch (err) {
        console.error('Error fetching Elite tokens:', err)
        setError('Network error loading Elite TA data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEliteTokens()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchEliteTokens, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Elite TA Data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-red-400 mb-2">⚠️ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">🚀 Elite TA Tokens</h2>
        <p className="text-gray-400 mb-4">
          Powered by institutional-grade technical analysis
        </p>
        {tokens.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Elite TA Active • {tokens.length} tokens analyzed
          </div>
        )}
      </div>

      {tokens.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <TokenCard 
              key={token.id} 
              token={token} 
              onClick={(token) => {
                console.log('Elite Token clicked:', token)
                // You can add modal or navigation logic here
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No Elite TA data available</p>
        </div>
      )}
      
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()} • 
          Features: VWAP, Smart Money Flow, Support/Resistance, Trend Alignment
        </p>
      </div>
    </div>
  )
}