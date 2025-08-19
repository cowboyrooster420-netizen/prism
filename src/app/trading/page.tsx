'use client'

import { useState, useEffect } from 'react';
import EnhancedTradingChart from '../../components/EnhancedTradingChart';
import TokenSelector from '../../components/TokenSelector';

interface Token {
  address: string;
  symbol?: string;
  name?: string;
  dataPoints?: number;
}

export default function TradingPage() {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<Token | null>(null);

  // Default to a common token if available
  useEffect(() => {
    // You can set a default token address here
    const defaultToken = process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ADDRESS;
    if (defaultToken && !selectedToken) {
      setSelectedToken(defaultToken);
    }
  }, [selectedToken]);

  const handleTokenSelect = (tokenAddress: string, tokenInfo: Token) => {
    setSelectedToken(tokenAddress);
    setSelectedTokenInfo(tokenInfo);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Trading Chart</h1>
              <p className="text-gray-400 text-sm mt-1">
                Real-time OHLCV data from the Prism hot token detection system
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Token Selector */}
              <div className="w-80">
                <TokenSelector
                  selectedToken={selectedToken}
                  onTokenSelect={handleTokenSelect}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {selectedToken ? (
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <EnhancedTradingChart
              tokenAddress={selectedToken}
              symbol={selectedTokenInfo?.symbol || selectedTokenInfo?.name}
              height={600}
              autoRefresh={true}
              onTimeframeChange={(timeframe) => {
                console.log('Timeframe changed to:', timeframe);
              }}
            />
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Select a Token to Begin
              </h3>
              
              <p className="text-gray-400 text-sm mb-6">
                Choose a token from the dropdown above to view its real-time OHLCV data and technical analysis.
              </p>
              
              <div className="bg-gray-700 rounded-lg p-4 text-left">
                <h4 className="text-sm font-medium text-white mb-2">Features Available:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Real-time OHLCV data from multiple timeframes</li>
                  <li>• Technical indicators (SMA, EMA, RSI, MACD)</li>
                  <li>• Hot token tier information and scoring</li>
                  <li>• Auto-refresh based on data frequency</li>
                  <li>• Multi-tier data collection (1m, 5m, 1h)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-300">Prism System Active</span>
        </div>
      </div>
    </div>
  );
}