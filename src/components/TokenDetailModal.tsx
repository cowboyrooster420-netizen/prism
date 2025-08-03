'use client'

import { useState, useEffect } from 'react';
import TokenChart from './TokenChart';

interface Token {
  id: string | number;
  name: string;
  symbol: string;
  address: string;
  price?: number;
  price_change_24h?: number;
  volume_24h?: number;
  market_cap?: number;
  liquidity?: number;
  updated_at?: string;
}

interface TokenDetailModalProps {
  token: Token | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenDetailModal({ token, isOpen, onClose }: TokenDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && token) {
      // Simulate chart data - in a real app, you'd fetch this from an API
      generateMockChartData();
    }
  }, [isOpen, token]);

  const generateMockChartData = () => {
    const data = [];
    const now = Date.now();
    const basePrice = token?.price || 1;
    
    for (let i = 24; i >= 0; i--) {
      const time = now - (i * 60 * 60 * 1000); // 24 hours ago to now
      const randomChange = (Math.random() - 0.5) * 0.1; // ±5% change
      const price = basePrice * (1 + randomChange);
      const volume = (token?.volume_24h || 1000000) * (0.5 + Math.random() * 1);
      
      data.push({
        time,
        price,
        volume
      });
    }
    setChartData(data);
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return price < 0.01 ? `$${price.toFixed(6)}` : `$${price.toFixed(4)}`;
  };

  const formatVolume = (volume?: number) => {
    if (!volume) return 'N/A';
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatMarketCap = (mc?: number) => {
    if (!mc) return 'N/A';
    if (mc >= 1000000000) return `$${(mc / 1000000000).toFixed(2)}B`;
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(1)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };

  const formatLiquidity = (liq?: number) => {
    if (!liq) return 'N/A';
    if (liq >= 1000000) return `$${(liq / 1000000).toFixed(1)}M`;
    if (liq >= 1000) return `$${(liq / 1000).toFixed(1)}K`;
    return `$${liq.toFixed(0)}`;
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!isOpen || !token) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-[#1f1f25] via-[#1a1a1f] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-2xl shadow-[0_0_50px_rgba(59,176,255,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2e]/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-glowBlue to-glowPurple rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {token.symbol.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{token.name}</h2>
              <p className="text-gray-400">{token.symbol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#2a2a2e]/50 hover:bg-[#3a3a3f]/50 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Key Metrics */}
            <div className="lg:col-span-1 space-y-4">
              {/* Price Section */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Price</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current Price</span>
                    <span className="text-2xl font-bold text-white">{formatPrice(token.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">24h Change</span>
                    <span className={`font-semibold ${(token.price_change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(token.price_change_24h || 0) >= 0 ? '+' : ''}{token.price_change_24h?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Market Data */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Market Data</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Market Cap</span>
                    <span className="text-glowGreen font-semibold">{formatMarketCap(token.market_cap)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">24h Volume</span>
                    <span className="text-glowBlue font-semibold">{formatVolume(token.volume_24h)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Liquidity</span>
                    <span className="text-glowPurple font-semibold">{formatLiquidity(token.liquidity)}</span>
                  </div>
                </div>
              </div>

              {/* Token Info */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Token Info</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Mint Address</span>
                    <p className="text-xs font-mono text-gray-300 break-all mt-1">{token.address}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-gray-300 text-sm">{getTimeAgo(token.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Actions</h3>
                <div className="space-y-2">
                  <button className="w-full bg-gradient-to-r from-glowBlue to-glowPurple text-white py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    View on Birdeye
                  </button>
                  <button className="w-full bg-[#2a2a2e]/50 text-gray-300 py-2 px-4 rounded-lg font-semibold hover:bg-[#3a3a3f]/50 transition-colors">
                    Add to Watchlist
                  </button>
                  <button className="w-full bg-[#2a2a2e]/50 text-gray-300 py-2 px-4 rounded-lg font-semibold hover:bg-[#3a3a3f]/50 transition-colors">
                    Share Token
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Charts */}
            <div className="lg:col-span-2 space-y-4">
              {/* Price Chart */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">24h Price Chart</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-gray-400">Loading chart...</div>
                  </div>
                ) : (
                  <TokenChart data={chartData} height={200} type="price" />
                )}
              </div>

              {/* Volume Chart */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">24h Volume Chart</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-gray-400">Loading chart...</div>
                  </div>
                ) : (
                  <TokenChart data={chartData} height={200} type="volume" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 