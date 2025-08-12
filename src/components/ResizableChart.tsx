'use client';

import { useEffect, useRef, useState } from 'react';
import type { Interval } from '@/lib/birdeyeClient';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { useBirdeyeCandles } from '@/hooks/useBirdeyeCandles';

type ChartSize = 'normal' | 'fullscreen';

interface ResizableChartProps {
  address: string;
  interval?: Interval;
  open: boolean;
  onClose?: () => void;
}

export function ResizableChart({ address, interval = '1m', open, onClose }: ResizableChartProps) {
  console.log('🔍 ResizableChart - Props:', { address, interval, open });
  
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState<ChartSize>('normal');
  const [showTimeframeSelector, setShowTimeframeSelector] = useState(false);
  const [containerReady, setContainerReady] = useState(false);

  // Validate Solana address format
  const isValidSolanaAddress = (addr: string): boolean => {
    return Boolean(addr && addr.length >= 32 && addr.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr));
  };

  // Wait for container to be ready
  useEffect(() => {
    if (chartContainerRef.current) {
      setContainerReady(true);
    }
  }, []);

  const getChartHeight = () => {
    switch (chartSize) {
      case 'normal': return 400;
      case 'fullscreen': return '100vh';
      default: return 400;
    }
  };

  const getChartWidth = () => {
    return chartSize === 'fullscreen' ? '100vw' : '100%';
  };

  const handleFullscreen = () => {
    setChartSize('fullscreen');
    document.body.style.overflow = 'hidden';
  };

  const handleReturnToModal = () => {
    setChartSize('normal');
    document.body.style.overflow = 'auto';
  };

  const timeframes: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  if (!open) return null;

  // Show error message if address is invalid
  if (!isValidSolanaAddress(address)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-[#1a1a1e] rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-lg font-semibold">Chart Unavailable</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="text-center p-6">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">Invalid Token Address</h3>
            <p className="text-gray-400 text-sm mb-4">
              This token does not have a valid Solana mint address.
            </p>
            <div className="bg-[#2a2a2e]/50 rounded-lg p-3 text-xs font-mono text-gray-300">
              <div>Address: {address || 'undefined'}</div>
              <div>Length: {address?.length || 0}</div>
              <div>Valid: {isValidSolanaAddress(address) ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed z-50 bg-[#1a1a1e] border border-[#2a2a2e] rounded-lg shadow-2xl transition-all duration-300 ${
        chartSize === 'fullscreen' 
          ? 'inset-0 rounded-none border-0' 
          : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a2e]">
        <div className="flex items-center space-x-3">
          <h3 className="text-white font-semibold">Token Chart</h3>
          <span className="text-gray-400 text-sm">
            {address.slice(0, 8)}...{address.slice(-8)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Timeframe Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTimeframeSelector(!showTimeframeSelector)}
              className="px-3 py-1 bg-[#2a2a2e] text-white rounded hover:bg-[#3a3a3e] transition-colors"
            >
              {interval}
            </button>
            
            {showTimeframeSelector && (
              <div className="absolute top-full right-0 mt-1 bg-[#1a1a1e] border border-[#2a2a2e] rounded-lg shadow-lg z-10 min-w-[80px]">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setShowTimeframeSelector(false);
                      // TODO: Add interval change functionality
                      console.log('Changing interval to:', tf);
                    }}
                    className="block w-full text-left px-2 py-1 text-sm text-white hover:bg-[#2a2a2e] rounded transition-colors"
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          {chartSize === 'normal' ? (
            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Maximize2 size={16} />
            </button>
          ) : (
            <button
              onClick={handleReturnToModal}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Minimize2 size={16} />
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef}
        className="flex-1"
        style={{ 
          height: getChartHeight(),
          width: getChartWidth()
        }}
      />
      
      {/* Use the hook with the chart container when ready */}
      {containerReady && chartContainerRef.current && (
        <ChartDataFetcher 
          container={chartContainerRef.current} 
          address={address} 
          interval={interval} 
        />
      )}
    </div>
  );
}

// Separate component to handle the chart data fetching
function ChartDataFetcher({ 
  container, 
  address, 
  interval 
}: { 
  container: HTMLDivElement; 
  address: string; 
  interval: Interval; 
}) {
  console.log('🔍 ChartDataFetcher - Initializing with:', { container, address, interval });
  
  useBirdeyeCandles(container, { 
    address, 
    interval, 
    lookbackSec: 24*3600, 
    pollMs: 3000 
  });
  
  return null; // This component doesn't render anything
}
