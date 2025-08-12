'use client'

import { useEffect, useState } from 'react'
import TokenCard from './TokenCard'

interface Token {
  id: string | number
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

// Validate token data
const validateToken = (token: any): token is Token => {
  return (
    token &&
    (typeof token.id === 'string' || typeof token.id === 'number') &&
    typeof token.name === 'string' &&
    typeof token.symbol === 'string' &&
    typeof token.mint_address === 'string' &&
    (token.price === undefined || typeof token.price === 'number') &&
    (token.price_change_24h === undefined || typeof token.price_change_24h === 'number') &&
    (token.volume_24h === undefined || typeof token.volume_24h === 'number') &&
    (token.market_cap === undefined || typeof token.market_cap === 'number') &&
    (token.liquidity === undefined || typeof token.liquidity === 'number') &&
    (token.updated_at === undefined || typeof token.updated_at === 'string')
  );
};

export default function TokenList() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/tokens');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate response structure
        if (!data || !Array.isArray(data.tokens)) {
          throw new Error('Invalid response format from API');
        }
        
        // Validate each token
        const validTokens = data.tokens.filter(validateToken);
        
        console.log('API Response:', data);
        console.log('Total tokens from API:', data.tokens.length);
        console.log('Valid tokens after filtering:', validTokens.length);
        console.log('Sample valid token:', validTokens[0]);
        
        if (validTokens.length !== data.tokens.length) {
          console.warn(`Filtered out ${data.tokens.length - validTokens.length} invalid tokens`);
        }
        
        setTokens(validTokens);
      } catch (err) {
        console.error('Error fetching tokens:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, []);

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
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (tokens.length === 0) {
    console.log('Rendering: No tokens found');
    return (
      <div className="bg-[#1a1a1f]/60 border border-[#2a2a2e]/30 rounded-xl p-8 text-center">
        <div className="text-gray-400 text-sm">No tokens found</div>
        <div className="text-gray-500 text-xs mt-2">Debug: tokens.length = {tokens.length}</div>
      </div>
    )
  }

  console.log('Rendering: Tokens found', tokens.length);
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