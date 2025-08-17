'use client'

import { useState } from 'react'
import TokenCard from './TokenCard'
import TokenDetailModal from './TokenDetailModal'
import { useBehavioralData } from '../contexts/BehavioralDataContext'

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
    typeof token.address === 'string' &&
    (token.price === undefined || typeof token.price === 'number') &&
    (token.price_change_24h === undefined || typeof token.price_change_24h === 'number') &&
    (token.volume_24h === undefined || typeof token.volume_24h === 'number') &&
    (token.market_cap === undefined || typeof token.market_cap === 'number') &&
    (token.liquidity === undefined || typeof token.liquidity === 'number') &&
    (token.updated_at === undefined || typeof token.updated_at === 'string')
  );
};

export default function CompactPrismPrompt() {
  const [input, setInput] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Get behavioral data context
  const { data: behavioralData } = useBehavioralData()

  const validateInput = (input: string): string | null => {
    if (!input.trim()) {
      return 'Please enter a search query';
    }
    
    if (input.length > 500) {
      return 'Search query is too long (max 500 characters)';
    }
    
    // Basic security check
    if (/[<>{}]/.test(input)) {
      return 'Search query contains invalid characters';
    }
    
    return null;
  };

  // Enhance user prompt with behavioral data context
  const enhancePromptWithBehavioralData = (userPrompt: string, behavioralData: any) => {
    let enhancedPrompt = userPrompt
    
    // Add behavioral context if available
    if (behavioralData.whaleActivity.length > 0) {
      enhancedPrompt += `\n\nContext: There is recent whale activity with ${behavioralData.whaleActivity.length} tokens showing significant whale buys and new holder growth.`
    }
    
    if (behavioralData.newLaunches.length > 0) {
      enhancedPrompt += `\n\nContext: There are ${behavioralData.newLaunches.length} new token launches in the last 24 hours with varying performance.`
    }
    
    if (behavioralData.volumeSpikes.length > 0) {
      enhancedPrompt += `\n\nContext: There are ${behavioralData.volumeSpikes.length} tokens experiencing volume spikes, indicating potential momentum.`
    }
    
    enhancedPrompt += `\n\nPlease consider this behavioral context when analyzing tokens and provide insights about whale activity, new launches, and volume patterns.`
    
    return enhancedPrompt
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input
    const validationError = validateInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (isLoading) return;

    setIsLoading(true)
    setError(null)
    setTokens([])
    setHasSearched(true)

    try {
      // Enhance prompt with behavioral context
      const enhancedPrompt = enhancePromptWithBehavioralData(input.trim(), behavioralData)
      
      const response = await fetch('/api/ai-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          originalPrompt: input.trim(),
          behavioralContext: {
            hasWhaleActivity: behavioralData.whaleActivity.length > 0,
            hasNewLaunches: behavioralData.newLaunches.length > 0,
            hasVolumeSpikes: behavioralData.volumeSpikes.length > 0,
            lastUpdated: behavioralData.lastUpdated
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json()
      
      // Validate response structure
      if (!data || !Array.isArray(data.tokens)) {
        throw new Error('Invalid response format from API');
      }
      
      // Validate each token
      const validTokens = data.tokens.filter(validateToken);
      
      if (validTokens.length !== data.tokens.length) {
        console.warn(`Filtered out ${data.tokens.length - validTokens.length} invalid tokens`);
      }
      
      setTokens(validTokens);
    } catch (err) {
      console.error('Error processing prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to process your request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenClick = (token: Token) => {
    setSelectedToken(token)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedToken(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const clearSearch = () => {
    setInput('')
    setTokens([])
    setError(null)
    setHasSearched(false)
  }

  // Show expanded view if we have results, errors, or are loading
  const isExpanded = hasSearched && (tokens.length > 0 || error || isLoading)

  return (
    <>
      <div className={`bg-[#1a1a1a] border border-[#333333] transition-all duration-300 ${
        isExpanded ? 'p-6' : 'p-3'
      }`}>
        
        {/* Compact Search Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
            
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask Prism: whale activity, breakouts, new launches..."
              disabled={isLoading}
              className="flex-1 text-white bg-transparent placeholder-gray-500 text-sm outline-none font-inter border-b border-[#2a2a2e]/50 focus:border-blue-400/50 transition-colors duration-300 pb-2 disabled:opacity-50"
            />
            
            {input && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-300 text-sm px-2"
              >
                Clear
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-[#2a2a2a] text-white border border-[#444444] text-sm font-medium hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Analyzing...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Expanded Results Section - Only show when needed */}
        {isExpanded && (
          <div className="mt-6 animate-in slide-in-from-top duration-300">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400 py-4">
                <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-sm">Prism is analyzing...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-red-400 text-sm mb-4 p-3 bg-[#2a1a1a] border border-[#444444]">
                <div className="font-medium mb-1">Error</div>
                <div>{error}</div>
              </div>
            )}

            {/* No Results */}
            {!isLoading && !error && tokens.length === 0 && hasSearched && (
              <div className="text-gray-500 text-sm py-4">
                No tokens found matching your criteria. Try adjusting your query.
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && tokens.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Found {tokens.length} tokens
                  </div>
                  <button
                    onClick={clearSearch}
                    className="text-xs text-gray-500 hover:text-gray-400"
                  >
                    Collapse Results
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {tokens.map((token) => (
                    <TokenCard
                      key={token.id}
                      token={token}
                      onClick={handleTokenClick}
                    />
                  ))}
                </div>
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
    </>
  )
}