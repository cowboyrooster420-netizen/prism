'use client'

import { useState, useEffect } from 'react';
import TokenChart from './TokenChart';
import { fetchOHLCV } from '@/lib/birdeyeClient';
import { UTCTimestamp } from 'lightweight-charts';

interface Token {
  id: string | number;
  name: string;
  symbol: string;
  mint_address: string;
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
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartInterval, setChartInterval] = useState<'1h' | '4h' | '1d'>('1h');
  const [showIndicators, setShowIndicators] = useState(true);

  // Validate Solana address format
  const isValidSolanaAddress = (address: string): boolean => {
    return Boolean(address && address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address));
  };

  // Fetch chart data when modal opens or interval changes
  useEffect(() => {
    if (!token?.mint_address || !isOpen) return;

    // Skip if address is invalid
    if (!isValidSolanaAddress(token.mint_address)) {
      console.warn('Invalid mint address for chart:', token.mint_address);
      setChartLoading(false);
      return;
    }

    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        // Adjust time range based on interval
        const timeRanges = {
          '1h': 24 * 3600, // 24 hours for 1h candles
          '4h': 7 * 24 * 3600, // 7 days for 4h candles
          '1d': 30 * 24 * 3600 // 30 days for 1d candles
        };
        const fromSec = nowSec - timeRanges[chartInterval];
        
        // For debugging: test with different addresses to isolate the problem
        let addressToUse = token.mint_address;
        let addressSource = 'token';
        
        if (!isValidSolanaAddress(token.mint_address)) {
          console.warn('⚠️ Invalid token address format:', token.mint_address);
          // Test with known good addresses
          addressToUse = 'So11111111111111111111111111111111111111112'; // SOL
          addressSource = 'SOL_fallback';
        } else {
          console.log('✅ Token address format is valid:', token.mint_address);
        }
        
        // Test with multiple known good addresses for debugging
        const testAddresses = [
          { addr: 'So11111111111111111111111111111111111111112', name: 'SOL' },
          { addr: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USDC' },
          { addr: token.mint_address, name: `${token.symbol} (original)` }
        ];
        
        console.log('🔍 Will test chart with address:', addressToUse, `(${addressSource})`);
        console.log('📋 Available test addresses:', testAddresses);
        
        console.log('📊 Fetching OHLCV data with:', {
          address: addressToUse,
          interval: chartInterval,
          fromSec,
          toSec: nowSec,
          timeRange: `${(nowSec - fromSec) / 3600} hours`
        });
        
        const data = await fetchOHLCV(addressToUse, chartInterval, fromSec, nowSec);
        
        if (data && data.length > 0) {
          const chartData = data
            .map(bar => ({
              time: bar.t as UTCTimestamp,
              open: bar.o,
              high: bar.h,
              low: bar.l,
              close: bar.c,
              volume: bar.v || 0
            }))
            .sort((a, b) => (a.time as number) - (b.time as number));
          
          console.log('🔍 TokenDetailModal: Setting chart data:', {
            rawDataLength: data.length,
            chartDataLength: chartData.length,
            firstChartData: chartData[0],
            lastChartData: chartData[chartData.length - 1]
          });
          
          setChartData(chartData);
        } else {
          console.log('❌ TokenDetailModal: No data to set');
          setChartData([]);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        setChartData([]); // Clear any existing data on error
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartData();
  }, [token?.mint_address, isOpen, chartInterval]);

  if (!isOpen || !token) return null;

  // Debug logging
  console.log('🔍 TokenDetailModal - Token Data:', {
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    mint_address: token.mint_address,
    mint_addressLength: token.mint_address?.length || 0,
    mint_addressType: typeof token.mint_address,
    hasMintAddress: !!token.mint_address,
    isMintAddressValid: token.mint_address && token.mint_address.length >= 32 && token.mint_address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(token.mint_address),
    mint_addressStartsWith: token.mint_address?.slice(0, 10),
    mint_addressEndsWith: token.mint_address?.slice(-10)
  });

  // Additional debug info when trying to fetch chart data
  console.log('🔍 Attempting to fetch chart data for:', {
    token_symbol: token.symbol,
    mint_address: token.mint_address,
    is_valid_solana_address: isValidSolanaAddress(token.mint_address),
    modal_is_open: isOpen
  });

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
                    <p className="text-xs font-mono text-gray-300 break-all mt-1">{token.mint_address}</p>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-gray-400 uppercase tracking-widest">Price Chart</h3>
                  <div className="flex items-center gap-3">
                    {/* Interval Selector */}
                    <div className="flex bg-[#2a2a2e]/50 rounded-lg p-1">
                      {(['1h', '4h', '1d'] as const).map((interval) => (
                        <button
                          key={interval}
                          onClick={() => setChartInterval(interval)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            chartInterval === interval
                              ? 'bg-glowBlue text-white'
                              : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          {interval}
                        </button>
                      ))}
                    </div>
                    {/* Indicator Toggle */}
                    <button
                      onClick={() => setShowIndicators(!showIndicators)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        showIndicators
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-[#2a2a2e]/50 text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      SMA
                    </button>
                  </div>
                </div>
                <div className="h-80">
                  {chartLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-400 text-sm">Loading chart data...</div>
                    </div>
                  ) : (
                    <TokenChart 
                      data={chartData}
                      height={320}
                      showVolume={true}
                      showIndicators={showIndicators}
                      theme="dark"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 