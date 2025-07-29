'use client';

import { useState } from 'react';

interface Token {
  name: string;
  symbol: string;
  address: string;
  market_cap: number;
  holders_1h: number;
  whale_buys_1h: number;
  reason: string;
}

interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  type: 'user_message' | 'ai_response';
  tokens?: Token[];
}

export default function PrismPrompt() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Token[]>([]);

  const handlePromptSubmit = async (input: string) => {
    const res = await fetch("/api/prism-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input }),
    });

    const data = await res.json();
    setResults(data.tokens); // Hook this into token display component
    return data.tokens; // Return the tokens for immediate use
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with:', inputValue);
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputValue,
      timestamp: new Date().toISOString(),
      type: 'user_message'
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Use the new handlePromptSubmit function
      const tokens = await handlePromptSubmit(userMessage.message);
      
      // Create AI response with tokens
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        message: `Found ${tokens.length} tokens matching your criteria:`,
        timestamp: new Date().toISOString(),
        type: 'ai_response',
        tokens: tokens
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        type: 'ai_response'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    console.log('Key pressed:', e.key);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(1)}M`;
    }
    if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(1)}K`;
    }
    return `$${marketCap}`;
  };

  return (
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
            {/* Chat Messages */}
            <div className="flex-1 bg-gradient-to-br from-[#0a0a0c]/80 to-[#0d0d0f]/60 rounded-xl border border-[#2a2a2e]/30 p-6 backdrop-blur-sm relative overflow-hidden mb-6">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.02)_1px,_transparent_0)] bg-[size:20px_20px] opacity-30" />
              
              <div className="relative z-10 h-full overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-gray-500 text-sm leading-relaxed font-inter">
                    Ready to analyze Solana tokens and market data. Ask me anything about trending tokens, whale movements, or market insights.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user_message' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                            message.type === 'user_message'
                              ? 'bg-glowBlue/20 text-white border border-glowBlue/30'
                              : 'bg-[#1a1a1f]/80 text-gray-300 border border-[#2a2a2e]/50'
                          }`}
                        >
                          <div className="whitespace-pre-wrap font-inter leading-relaxed">
                            {message.message}
                          </div>
                          
                          {/* Display tokens if available */}
                          {message.tokens && message.tokens.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.tokens.map((token, index) => (
                                <div key={index} className="bg-[#0a0a0c]/50 rounded-lg p-3 border border-[#2a2a2e]/30">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="font-semibold text-white">{token.name} ({token.symbol})</h4>
                                      <p className="text-xs text-gray-400">{token.address.slice(0, 8)}...{token.address.slice(-8)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-glowGreen">{formatMarketCap(token.market_cap)}</p>
                                      <p className="text-xs text-gray-400">MC</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 text-xs text-gray-400 mb-2">
                                    <span>+{token.holders_1h} holders (1h)</span>
                                    <span>{token.whale_buys_1h} whale buys (1h)</span>
                                  </div>
                                  <p className="text-xs text-gray-300">{token.reason}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#1a1a1f]/80 text-gray-300 border border-[#2a2a2e]/50 rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-glowBlue rounded-full animate-pulse" />
                            <span className="text-sm">Prism is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="e.g. find tokens under 10m mc with whale inflows"
                disabled={isLoading}
                className="w-full text-white bg-transparent placeholder-gray-500 text-lg outline-none font-inter font-medium leading-relaxed border-b border-[#2a2a2e]/50 focus:border-glowBlue/50 transition-colors duration-300 pb-3 disabled:opacity-50"
              />
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-glowBlue to-glowPurple transition-all duration-300 group-focus-within:w-full" />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 