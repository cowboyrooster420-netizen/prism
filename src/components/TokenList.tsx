'use client'

import { useEffect, useState } from 'react'
import TokenCard from './TokenCard'

interface Token {
  id: string
  name: string
  symbol: string
  mint_address: string
  price?: number
  price_change_24h?: number
  volume_24h?: number
  market_cap?: number
  liquidity?: number
  updated_at?: string
}

export default function TokenList() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTokens() {
      try {
        const response = await fetch('/api/tokens')
        if (!response.ok) {
          throw new Error('Failed to fetch tokens')
        }
        const data = await response.json()
        setTokens(data.tokens || [])
      } catch (err) {
        console.error('Error fetching tokens:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens')
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#1b1b1f]/90 border border-[#2a2a2e]/50 rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-[#2a2a2e]/50 rounded mb-4"></div>
            <div className="h-4 bg-[#2a2a2e]/50 rounded mb-2"></div>
            <div className="h-4 bg-[#2a2a2e]/50 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-[#1a1a1f]/60 border border-[#2a2a2e]/30 rounded-xl p-8 text-center">
        <div className="text-gray-400 text-sm">No tokens found</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tokens.slice(0, 6).map((token) => (
        <TokenCard
          key={token.id}
          token={token}
        />
      ))}
    </div>
  )
} 