'use client';

import { useState, useEffect } from 'react';

interface TrendingToken {
  symbol: string;
  priceChange: number;
  price: number;
  volume: number;
  marketCap: number;
  address: string;
  name: string;
  // New trending-specific fields
  rank: number;
  logoURI: string;
  liquidity: number;
  volumeChange: number;
  fdv: number;
}

export default function TrendingCrawl() {
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingTokens = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/trending-tokens');
        const data = await response.json();
        
        if (data.success) {
          setTokens(data.tokens);
        } else {
          // Use fallback data if API fails
          setTokens(data.tokens);
          console.warn('Using fallback trending data:', data.error);
        }
      } catch (err) {
        console.error('Error fetching trending tokens:', err);
        setError('Failed to load trending data');
        // Set some fallback tokens with new fields
        setTokens([
          { symbol: 'SOL', priceChange: 5.2, price: 98.45, volume: 1250000, marketCap: 45000000000, address: '', name: 'Solana', rank: 1, logoURI: '', liquidity: 1000000, volumeChange: 15.3, fdv: 45000000000 },
          { symbol: 'BONK', priceChange: 12.8, price: 0.000023, volume: 890000, marketCap: 150000000, address: '', name: 'Bonk', rank: 2, logoURI: '', liquidity: 500000, volumeChange: 8.7, fdv: 150000000 },
          { symbol: 'JUP', priceChange: -2.1, price: 0.85, volume: 450000, marketCap: 1200000000, address: '', name: 'Jupiter', rank: 3, logoURI: '', liquidity: 800000, volumeChange: -5.2, fdv: 1200000000 }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingTokens();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTrendingTokens, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && tokens.length === 0) {
    return (
      <div className="w-full bg-gradient-to-r from-[#151517]/80 via-[#1a1a1c]/60 to-[#151517]/80 border-b border-[#2a2a2e]/30 text-sm py-4 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-glowBlue/5 via-transparent to-glowPurple/5 opacity-30" />
        <div className="relative z-10 flex items-center justify-center">
          <div className="text-gray-400">Loading trending tokens...</div>
        </div>
      </div>
    );
  }

  if (error && tokens.length === 0) {
    return (
      <div className="w-full bg-gradient-to-r from-[#151517]/80 via-[#1a1a1c]/60 to-[#151517]/80 border-b border-[#2a2a2e]/30 text-sm py-4 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-glowBlue/5 via-transparent to-glowPurple/5 opacity-30" />
        <div className="relative z-10 flex items-center justify-center">
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-[#151517]/80 via-[#1a1a1c]/60 to-[#151517]/80 border-b border-[#2a2a2e]/30 text-sm py-4 backdrop-blur-xl relative overflow-hidden">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-glowBlue/5 via-transparent to-glowPurple/5 opacity-30" />
      
      <div className="relative z-10 flex items-center">
        <div className="flex items-center gap-2 mr-8 flex-shrink-0 z-20 relative">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-gray-400 font-semibold tracking-widest text-xs uppercase">Trending</span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="animate-scroll flex items-center whitespace-nowrap">
            {tokens.map((token, index) => (
              <span key={`${token.symbol}-${index}`} className="text-white mr-8 font-medium flex items-center gap-2">
                {/* Rank indicator */}
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                  #{token.rank}
                </span>
                
                {/* Logo if available */}
                {token.logoURI && (
                  <img 
                    src={token.logoURI} 
                    alt={token.symbol}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                
                {/* Token info */}
                <span>
                  ${token.symbol} 
                  <span className={token.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {token.priceChange >= 0 ? '+' : ''}{token.priceChange.toFixed(1)}%
                  </span>
                  
                  {/* Volume change indicator */}
                  {token.volumeChange !== null && (
                    <span className={`ml-1 text-xs ${token.volumeChange >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      Vol: {token.volumeChange >= 0 ? '+' : ''}{token.volumeChange.toFixed(1)}%
                    </span>
                  )}
                </span>
              </span>
            ))}
            
            {/* Duplicate for seamless loop */}
            {tokens.map((token, index) => (
              <span key={`${token.symbol}-duplicate-${index}`} className="text-white mr-8 font-medium flex items-center gap-2">
                {/* Rank indicator */}
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                  #{token.rank}
                </span>
                
                {/* Logo if available */}
                {token.logoURI && (
                  <img 
                    src={token.logoURI} 
                    alt={token.symbol}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                
                {/* Token info */}
                <span>
                  ${token.symbol} 
                  <span className={token.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {token.priceChange >= 0 ? '+' : ''}{token.priceChange.toFixed(1)}%
                  </span>
                  
                  {/* Volume change indicator */}
                  {token.volumeChange !== null && (
                    <span className={`ml-1 text-xs ${token.volumeChange >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                      Vol: {token.volumeChange >= 0 ? '+' : ''}{token.volumeChange.toFixed(1)}%
                    </span>
                  )}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 