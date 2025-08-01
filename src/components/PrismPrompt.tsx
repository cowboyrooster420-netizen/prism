'use client'

import { useState } from 'react'
import TokenCard from './TokenCard'
import TokenDetailModal from './TokenDetailModal'

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

export default function PrismPrompt() {
  const [input, setInput] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setTokens([])

    try {
      const response = await fetch('/api/ai-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      })

      if (!response.ok) {
        throw new Error('Failed to process prompt')
      }

      const data = await response.json()
      setTokens(data.tokens || [])
    } catch (err) {
      console.error('Error processing prompt:', err)
      setError('Failed to process your request. Please try again.')
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
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Try: tokens with volume_24h > 100k and market_cap < 5m"
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
                    <div className="text-red-400 text-sm mb-4">
                      {error}
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
                    <div className="text-gray-500 text-sm leading-relaxed font-inter">
                      Ready to analyze Solana tokens and market data. Ask me anything about trending tokens, whale movements, or market insights.
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