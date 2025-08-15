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

export default function PrismPrompt() {
  const [input, setInput] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Get behavioral data context
  const { data: behavioralData, getTokenBehavioralInsights } = useBehavioralData()

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

  return (
    <>
      <div className="h-full relative rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(59,176,255,0.15)] bg-gradient-to-br from-[#1f1f25] via-[#1a1a1f] to-[#0f0f11] border border-[#2a2a2e]/50 p-[2px] group hover:shadow-[0_0_50px_rgba(59,176,255,0.2)] transition-all duration-500">
        <div className="bg-gradient-to-br from-[#0f0f11]/95 to-[#0a0a0c]/90 backdrop-blur-xl rounded-[inherit] p-8 h-full flex flex-col relative">
          {/* Ambient glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 via-transparent to-glowPurple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-glowBlue animate-pulse' : 'bg-glowGreen'}`} />
              <label className="text-sm text-gray-400 uppercase tracking-widest font-semibold">
                Ask Prism
              </label>
            </div>
            
            <div className="flex-1 flex flex-col">
              {/* Input Form */}
              <form onSubmit={handleSubmit} className="relative mb-6">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Try: whale activity in new launches, volume spikes under $10M, or fresh pump.fun tokens"
                  disabled={isLoading}
                  className="w-full text-white bg-transparent placeholder-gray-500 text-lg outline-none font-inter font-medium leading-relaxed border-b border-[#2a2a2e]/50 focus:border-glowBlue/50 transition-colors duration-300 pb-3 disabled:opacity-50"
                />
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-glowBlue to-glowPurple transition-all duration-300 group-focus-within:w-full" />
              </form>

              {/* Results Section */}
              <div className="flex-1 bg-gradient-to-br from-[#0a0a0c]/80 to-[#0d0d0f]/60 rounded-xl border border-[#2a2a2e]/30 p-6 backdrop-blur-sm relative overflow-hidden">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.02)_1px,_transparent_0)] bg-[size:20px_20px] opacity-30" />
                
                <div className="relative z-10 h-full overflow-y-auto">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="w-2 h-2 bg-glowBlue rounded-full animate-pulse" />
                      <span className="text-sm">Prism is analyzing...</span>
                    </div>
                  )}

                  {error && (
                    <div className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="font-medium mb-1">Error</div>
                      <div>{error}</div>
                      <button 
                        onClick={() => setError(null)}
                        className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {!isLoading && !error && tokens.length === 0 && input && (
                    <div className="text-gray-500 text-sm">
                      No tokens found matching your criteria. Try adjusting your filters.
                    </div>
                  )}

                  {!isLoading && !error && tokens.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-400 mb-4">
                        Found {tokens.length} tokens matching your criteria:
                      </div>
                      
                      {/* Behavioral Analysis Summary */}
                      <div className="bg-gradient-to-r from-[#1a1a1f]/50 to-[#0d0d0f]/50 rounded-lg border border-[#2a2a2e]/30 p-4">
                        <div className="text-sm text-gray-400 mb-3 font-medium">🧠 AI Analysis with Behavioral Context</div>
                        <div className="text-xs text-gray-500 leading-relaxed">
                          {behavioralData.whaleActivity.length > 0 && (
                            <div className="mb-2">
                              🐋 <span className="text-blue-400">Whale Activity Detected:</span> {behavioralData.whaleActivity.length} tokens showing significant whale buys and new holder growth
                            </div>
                          )}
                          {behavioralData.newLaunches.length > 0 && (
                            <div className="mb-2">
                              🚀 <span className="text-green-400">New Launches:</span> {behavioralData.newLaunches.length} tokens launched in the last 24 hours
                            </div>
                          )}
                          {behavioralData.volumeSpikes.length > 0 && (
                            <div className="mb-2">
                              📈 <span className="text-purple-400">Volume Spikes:</span> {behavioralData.volumeSpikes.length} tokens experiencing unusual volume increases
                            </div>
                          )}
                          <div className="text-gray-600 mt-2">
                            💡 <span className="text-yellow-400">AI Insight:</span> Your query was enhanced with behavioral data to provide more intelligent token analysis
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                  {!isLoading && !error && !input && (
                    <div className="space-y-4">
                      <div className="text-gray-500 text-sm leading-relaxed font-inter">
                        Ready to analyze Solana tokens with behavioral intelligence. Ask me about whale activity, new launches, volume spikes, or complex trading opportunities.
                      </div>
                      
                      {/* Example Queries */}
                      <div className="bg-gradient-to-r from-[#1a1a1f]/50 to-[#0d0d0f]/50 rounded-lg border border-[#2a2a2e]/30 p-4">
                        <div className="text-sm text-gray-400 mb-3 font-medium">🧠 Try These Intelligent Queries</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { emoji: '🐋', text: 'Show me tokens with whale activity', category: 'Whale Analysis' },
                            { emoji: '🚀', text: 'New pump.fun launches with early signals', category: 'New Launches' },
                            { emoji: '📈', text: 'Volume spikes in small cap tokens', category: 'Volume Analysis' },
                            { emoji: '🎯', text: 'Alpha opportunities with behavioral signals', category: 'Complex Analysis' },
                            { emoji: '💰', text: 'Micro cap gems under $1M with activity', category: 'Market Cap' },
                            { emoji: '🔥', text: 'Fresh launches with growing holders', category: 'Growth Analysis' }
                          ].map((example, index) => (
                            <button
                              key={index}
                              onClick={() => setInput(example.text)}
                              className="text-left p-3 rounded-lg border border-[#2a2a2e]/20 hover:border-[#3a3a3e]/40 hover:bg-[#1a1a1f]/30 transition-all duration-200 group"
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg">{example.emoji}</span>
                                <div>
                                  <div className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                    &ldquo;{example.text}&rdquo;
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {example.category}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Behavioral Data Overview */}
                      <div className="bg-gradient-to-r from-[#1a1a1f]/50 to-[#0d0d0f]/50 rounded-lg border border-[#2a2a2e]/30 p-4">
                        <div className="text-sm text-gray-400 mb-3 font-medium">🪄 Live Behavioral Insights</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-500">Whale Activity:</span>
                            <span className="text-blue-400 font-medium">{behavioralData.whaleActivity.length} tokens</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-gray-500">New Launches:</span>
                            <span className="text-green-400 font-medium">{behavioralData.newLaunches.length} tokens</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            <span className="text-gray-500">Volume Spikes:</span>
                            <span className="text-purple-400 font-medium">{behavioralData.volumeSpikes.length} tokens</span>
                          </div>
                        </div>
                        {behavioralData.lastUpdated && (
                          <div className="text-xs text-gray-600 mt-2">
                            Last updated: {new Date(behavioralData.lastUpdated).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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