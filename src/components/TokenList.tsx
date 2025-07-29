'use client'

import { useEffect, useState } from 'react'

interface Token {
  id: string
  name: string
  symbol: string
  market_cap: number
  volume_1h: number
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
    return <div className="text-gray-400">Loading tokens...</div>
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>
  }

  if (tokens.length === 0) {
    return <div className="text-gray-400">No tokens found</div>
  }

  return (
    <div className="space-y-2">
      {tokens.map((token) => (
        <div key={token.id} className="bg-zinc-800 p-4 rounded">
          <div className="font-bold">{token.name} ({token.symbol})</div>
          <div>Market Cap: ${token.market_cap?.toLocaleString()}</div>
          <div>Volume (1h): ${token.volume_1h?.toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
} 