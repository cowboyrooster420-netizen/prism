'use client'

import { useState, useEffect } from 'react';
import TradingChart from './TradingChart';
import { fetchOHLCV } from '@/lib/birdeyeClient';
import { UTCTimestamp } from 'lightweight-charts';
import { calculatePrismScore, getPrismScoreBadgeColor } from '../lib/prismScore';
import { analyzeTokenReasons, getColorClasses, type TokenWithBehavioral } from '../lib/tokenReasonAnalyzer';

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
  
  // Behavioral metrics
  whale_buys_24h?: number;
  new_holders_24h?: number;
  volume_spike_ratio?: number;
  token_age_hours?: number;
  transaction_pattern_score?: number;
  smart_money_score?: number;
  holder_count?: number;
  
  // Technical analysis
  rsi14?: number;
  breakout_high_20?: boolean;
  near_breakout_high_20?: boolean;
  cross_ema7_over_ema20?: boolean;
  cross_ema50_over_ema200?: boolean;
  
  // Elite TA
  vwap?: number;
  vwap_distance?: number;
  vwap_band_position?: number;
  support_level?: number;
  resistance_level?: number;
  support_distance?: number;
  resistance_distance?: number;
  smart_money_index?: number;
  trend_alignment_score?: number;
  volume_profile_score?: number;
  vwap_breakout_bullish?: boolean;
  vwap_breakout_bearish?: boolean;
  near_support?: boolean;
  near_resistance?: boolean;
  smart_money_bullish?: boolean;
  trend_alignment_strong?: boolean;
}

interface TokenDetailModalProps {
  token: Token | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenDetailModal({ token, isOpen, onClose }: TokenDetailModalProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

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
        const fromSec = nowSec - timeRanges['1h']; // Default to 1h interval
        
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
          interval: '1h',
          fromSec,
          toSec: nowSec,
          timeRange: `${(nowSec - fromSec) / 3600} hours`
        });
        
        const data = await fetchOHLCV(addressToUse, '1h', fromSec, nowSec);
        
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
  }, [token?.mint_address, isOpen]);

  // Calculate Prism Score and Token Insights
  const prismScore = (() => {
    try {
      return calculatePrismScore(token);
    } catch (error) {
      console.warn('Prism score calculation failed:', error);
      return { score: 0, rating: 'Weak' as const, confidence: 'Low' as const, primarySignal: 'Unable to calculate', color: 'text-gray-400' };
    }
  })();
  
  // Analyze token insights
  const tokenReasons = (() => {
    try {
      return analyzeTokenReasons(token as TokenWithBehavioral);
    } catch (error) {
      console.warn('Token reason analysis failed:', error);
      return [];
    }
  })();

  // Format behavioral metrics
  const formatPercent = (value?: number) => {
    if (!value) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatScore = (value?: number) => {
    if (!value) return 'N/A';
    return `${Math.round(value)}/100`;
  };

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

  const formatHolders = (holders?: number) => {
    if (!holders) return 'N/A';
    if (holders >= 1000000) return `${(holders / 1000000).toFixed(1)}M`;
    if (holders >= 1000) return `${(holders / 1000).toFixed(1)}K`;
    return holders.toString();
  };

  const formatAge = (hours?: number) => {
    if (!hours) return 'N/A';
    if (hours < 24) return `${Math.round(hours)}h`;
    if (hours < 168) return `${Math.round(hours / 24)}d`;
    return `${Math.round(hours / 168)}w`;
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
      <div className="relative w-full max-w-6xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-[#1f1f25] via-[#1a1a1f] to-[#0f0f11] border border-[#2a2a2e]/50 rounded-2xl shadow-[0_0_60px_rgba(59,176,255,0.25)] animate-in fade-in-50 zoom-in-95 duration-300">
        {/* Ambient glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 via-transparent to-glowPurple/5 rounded-[inherit]" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-[#2a2a2e]/30 bg-gradient-to-r from-[#1a1a1f]/80 to-[#1f1f25]/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-glowBlue to-glowPurple rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">
                {token.symbol.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">{token.name}</h2>
              <p className="text-gray-400 font-medium">{token.symbol}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">
                {token.mint_address.slice(0, 8)}...{token.mint_address.slice(-8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#2a2a2e]/50 hover:bg-[#3a3a3f]/50 text-gray-400 hover:text-white transition-all duration-200 flex items-center justify-center group hover:scale-105"
          >
            <span className="transform group-hover:rotate-90 transition-transform duration-200">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="relative p-6 overflow-y-auto max-h-[calc(95vh-120px)] custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Key Metrics */}
            <div className="lg:col-span-1 space-y-4">
              {/* Price Section */}
              <div className="bg-gradient-to-br from-[#1a1a1f]/70 to-[#161618]/60 rounded-xl p-5 border border-[#2a2a2e]/40 hover:border-[#3a3a3f]/50 transition-all duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4 relative z-10">Price</h3>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Current Price</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">{formatPrice(token.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">24h Change</span>
                    <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2 ${
                      (token.price_change_24h || 0) >= 0 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${(token.price_change_24h || 0) >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {(token.price_change_24h || 0) >= 0 ? '+' : ''}{token.price_change_24h?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Data */}
              <div className="bg-gradient-to-br from-[#1a1a1f]/70 to-[#161618]/60 rounded-xl p-5 border border-[#2a2a2e]/40 hover:border-[#3a3a3f]/50 transition-all duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-glowGreen/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4 relative z-10">Market Data</h3>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">Market Cap</span>
                    <span className="text-glowGreen font-bold text-lg">{formatMarketCap(token.market_cap)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">24h Volume</span>
                    <span className="text-glowBlue font-bold text-lg">{formatVolume(token.volume_24h)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">Liquidity</span>
                    <span className="text-glowPurple font-bold text-lg">{formatLiquidity(token.liquidity)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">Holders</span>
                    <span className="text-orange-400 font-bold text-lg">{formatHolders(token.holder_count)}</span>
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

              {/* Prism Score */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Prism Score</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Overall Score</span>
                    <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${getPrismScoreBadgeColor(prismScore.score)}`}>
                      {prismScore.score}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Rating</span>
                    <span className={`font-semibold ${prismScore.color}`}>{prismScore.rating}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Confidence</span>
                    <span className="text-gray-300 text-sm">{prismScore.confidence}</span>
                  </div>
                  <div className="pt-2 border-t border-[#2a2a2e]/30">
                    <span className="text-gray-400 text-xs">Primary Signal</span>
                    <p className="text-gray-300 text-sm mt-1">{prismScore.primarySignal}</p>
                  </div>
                </div>
              </div>

              {/* Token Insights */}
              {tokenReasons && tokenReasons.length > 0 && (
                <div className="bg-gradient-to-br from-[#1a1a1f]/70 to-[#161618]/60 rounded-xl p-5 border border-[#2a2a2e]/40 hover:border-[#3a3a3f]/50 transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-glowPurple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />
                  <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4 relative z-10">AI Token Insights</h3>
                  <div className="space-y-3 relative z-10">
                    {tokenReasons.map((reason, index) => {
                      const colorClasses = getColorClasses(reason.color);
                      return (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-[#0f0f11]/40 border border-[#2a2a2e]/20 hover:border-[#3a3a3f]/30 transition-all duration-200">
                          <div className={`w-3 h-3 ${colorClasses.dot} rounded-full flex-shrink-0 mt-0.5 shadow-sm`}></div>
                          <div className="flex-1">
                            <span className={`${colorClasses.text} text-sm font-medium leading-relaxed`}>{reason.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#2a2a2e]/30 relative z-10">
                    <p className="text-xs text-gray-500 italic">Analysis powered by Prism AI • Updated {getTimeAgo(token.updated_at)}</p>
                  </div>
                </div>
              )}

              {/* Risk Assessment */}
              <div className="bg-gradient-to-br from-[#1a1a1f]/70 to-[#161618]/60 rounded-xl p-5 border border-[#2a2a2e]/40 hover:border-[#3a3a3f]/50 transition-all duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4 relative z-10">Risk Assessment</h3>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Liquidity Risk</span>
                    <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      (token.liquidity || 0) > 1000000 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      (token.liquidity || 0) > 100000 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {(token.liquidity || 0) > 1000000 ? 'Low' :
                       (token.liquidity || 0) > 100000 ? 'Medium' : 'High'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Age Risk</span>
                    <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      (token.token_age_hours || 0) > 168 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      (token.token_age_hours || 0) > 24 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {(token.token_age_hours || 0) > 168 ? 'Low' :
                       (token.token_age_hours || 0) > 24 ? 'Medium' : 'High'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Volatility Risk</span>
                    <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      Math.abs(token.price_change_24h || 0) < 20 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      Math.abs(token.price_change_24h || 0) < 50 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {Math.abs(token.price_change_24h || 0) < 20 ? 'Low' :
                       Math.abs(token.price_change_24h || 0) < 50 ? 'Medium' : 'High'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Actions</h3>
                <div className="space-y-2">
                  <button className="w-full bg-[#2a2a2e]/50 text-gray-300 py-2 px-4 rounded-lg font-semibold hover:bg-[#3a3a3f]/50 transition-colors">
                    Add to Watchlist
                  </button>
                  <button className="w-full bg-[#2a2a2e]/50 text-gray-300 py-2 px-4 rounded-lg font-semibold hover:bg-[#3a3a3f]/50 transition-colors">
                    Share Token
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Charts and Analytics */}
            <div className="lg:col-span-2 space-y-4">
              {/* Price Chart */}
              <div className="bg-gradient-to-br from-[#1a1a1f]/70 to-[#161618]/60 rounded-xl border border-[#2a2a2e]/40 hover:border-glowBlue/30 transition-all duration-300 group h-[500px]">
                <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />
                <div className="h-full relative z-10 rounded-lg overflow-hidden">
                  {chartLoading ? (
                    <div className="flex flex-col items-center justify-center h-full bg-[#0f0f11]/40">
                      <div className="w-8 h-8 border-2 border-glowBlue border-t-transparent rounded-full animate-spin mb-3"></div>
                      <div className="text-gray-400 text-sm font-medium">Loading chart data...</div>
                      <div className="text-gray-500 text-xs mt-1">Fetching 1h candles</div>
                    </div>
                  ) : chartData.length > 0 ? (
                    <TradingChart 
                      data={chartData}
                      height={500}
                      symbol={`${token.symbol}/USDC`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-[#0f0f11]/40">
                      <div className="text-gray-400 text-sm font-medium mb-2">📈 No chart data available</div>
                      <div className="text-gray-500 text-xs text-center max-w-xs">
                        Chart data may be unavailable for this token or the selected timeframe.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Behavioral Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Whale Activity */}
                <div className="bg-gradient-to-br from-[#1a1a1f]/70 to-[#161618]/60 rounded-xl p-5 border border-[#2a2a2e]/40 hover:border-glowBlue/30 transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div className="w-8 h-8 bg-gradient-to-br from-glowBlue to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">🐋</span>
                    </div>
                    <h3 className="text-sm text-gray-400 uppercase tracking-widest">Whale Activity</h3>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-[#0f0f11]/40">
                      <span className="text-gray-400 text-sm">24h Whale Buys</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          (token.whale_buys_24h || 0) > 5 ? 'bg-emerald-400' :
                          (token.whale_buys_24h || 0) > 0 ? 'bg-yellow-400' : 'bg-gray-400'
                        }`} />
                        <span className="text-glowBlue font-bold text-lg">
                          {token.whale_buys_24h || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-[#0f0f11]/40">
                      <span className="text-gray-400 text-sm">Smart Money Score</span>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                          (token.smart_money_score || 0) >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                          (token.smart_money_score || 0) >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {token.smart_money_score ? `${token.smart_money_score}/100` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-[#0f0f11]/40">
                      <span className="text-gray-400 text-sm">Transaction Pattern</span>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                          (token.transaction_pattern_score || 0) >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                          (token.transaction_pattern_score || 0) >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {token.transaction_pattern_score ? `${token.transaction_pattern_score}/100` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Growth Metrics */}
                <div className="bg-gradient-to-br from-[#1a1a1f]/70 to-[#161618]/60 rounded-xl p-5 border border-[#2a2a2e]/40 hover:border-glowGreen/30 transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-glowGreen/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div className="w-8 h-8 bg-gradient-to-br from-glowGreen to-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">📈</span>
                    </div>
                    <h3 className="text-sm text-gray-400 uppercase tracking-widest">Growth Metrics</h3>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-[#0f0f11]/40">
                      <span className="text-gray-400 text-sm">New Holders (24h)</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          (token.new_holders_24h || 0) > 100 ? 'bg-emerald-400' :
                          (token.new_holders_24h || 0) > 0 ? 'bg-yellow-400' : 'bg-gray-400'
                        }`} />
                        <span className="text-glowGreen font-bold text-lg">
                          {token.new_holders_24h ? `+${token.new_holders_24h}` : '0'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-[#0f0f11]/40">
                      <span className="text-gray-400 text-sm">Volume Spike Ratio</span>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                          (token.volume_spike_ratio || 0) >= 3 ? 'bg-emerald-500/20 text-emerald-400' :
                          (token.volume_spike_ratio || 0) >= 2 ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {token.volume_spike_ratio ? `${token.volume_spike_ratio.toFixed(1)}x` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-[#0f0f11]/40">
                      <span className="text-gray-400 text-sm">Token Age</span>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                          (token.token_age_hours || 0) > 168 ? 'bg-emerald-500/20 text-emerald-400' :
                          (token.token_age_hours || 0) > 24 ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {formatAge(token.token_age_hours)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Analysis */}
              <div className="bg-[#1a1a1f]/60 rounded-xl p-4 border border-[#2a2a2e]/30">
                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Technical Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* RSI */}
                  <div className="text-center">
                    <div className="text-gray-400 text-xs mb-1">RSI (14)</div>
                    <div className={`text-lg font-bold ${
                      (token.rsi14 || 0) > 70 ? 'text-red-400' :
                      (token.rsi14 || 0) < 30 ? 'text-emerald-400' : 'text-gray-300'
                    }`}>
                      {token.rsi14 ? token.rsi14.toFixed(1) : 'N/A'}
                    </div>
                  </div>
                  
                  {/* VWAP */}
                  <div className="text-center">
                    <div className="text-gray-400 text-xs mb-1">VWAP Distance</div>
                    <div className={`text-lg font-bold ${
                      (token.vwap_distance || 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {token.vwap_distance ? `${token.vwap_distance > 0 ? '+' : ''}${token.vwap_distance.toFixed(2)}%` : 'N/A'}
                    </div>
                  </div>
                  
                  {/* Support/Resistance */}
                  <div className="text-center">
                    <div className="text-gray-400 text-xs mb-1">Near Support</div>
                    <div className={`text-lg font-bold ${
                      token.near_support ? 'text-emerald-400' : 'text-gray-400'
                    }`}>
                      {token.near_support ? '✓' : '✗'}
                    </div>
                  </div>
                  
                  {/* Breakout */}
                  <div className="text-center">
                    <div className="text-gray-400 text-xs mb-1">Breakout (20d)</div>
                    <div className={`text-lg font-bold ${
                      token.breakout_high_20 ? 'text-emerald-400' : 
                      token.near_breakout_high_20 ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {token.breakout_high_20 ? '✓' : token.near_breakout_high_20 ? '~' : '✗'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 