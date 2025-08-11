'use client';

import { useEffect, useRef, useState } from 'react';
import { useBirdeyeCandles } from '@/hooks/useBirdeyeCandles';
import type { Interval } from '@/lib/birdeyeClient';
import { Maximize2, Minimize2, X } from 'lucide-react';

type ChartSize = 'small' | 'medium' | 'fullscreen';

interface ResizableChartProps {
  address: string;
  interval?: Interval;
  open: boolean;
  onClose?: () => void;
}

export function ResizableChart({ address, interval = '1m', open, onClose }: ResizableChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState<ChartSize>('small');
  const [showTimeframeSelector, setShowTimeframeSelector] = useState(false);

  console.log('ResizableChart render:', { address, interval, open, chartSize });

  // Only attach when open
  useEffect(() => { 
    console.log('Container effect:', { open, ref: ref.current });
    if (open) setContainer(ref.current); 
    else setContainer(null); 
  }, [open]);

  // Use the real Birdeye chart hook
  useBirdeyeCandles(container, { 
    address, 
    interval, 
    lookbackSec: 24*3600, 
    pollMs: 3000 
  });

  const getChartHeight = () => {
    switch (chartSize) {
      case 'small': return 200;
      case 'medium': return 400;
      case 'fullscreen': return '100vh';
      default: return 200;
    }
  };

  const getChartWidth = () => {
    return chartSize === 'fullscreen' ? '100vw' : '100%';
  };

  const handleSizeChange = (newSize: ChartSize) => {
    setChartSize(newSize);
    if (newSize === 'fullscreen') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  const handleClose = () => {
    setChartSize('small');
    document.body.style.overflow = 'unset';
    onClose?.();
  };

  const timeframes: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

  if (!open) return null;

  return (
    <>
      {/* Chart Container */}
      <div
        ref={ref}
        style={{ 
          width: getChartWidth(), 
          height: getChartHeight(), 
          transition: 'all 300ms ease-in-out',
          position: chartSize === 'fullscreen' ? 'fixed' : 'relative',
          top: chartSize === 'fullscreen' ? 0 : 'auto',
          left: chartSize === 'fullscreen' ? 0 : 'auto',
          zIndex: chartSize === 'fullscreen' ? 9999 : 'auto',
          backgroundColor: chartSize === 'fullscreen' ? '#0a0a0c' : 'transparent',
        }}
        className="relative"
      >
        {/* Chart Controls Overlay */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {/* Timeframe Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTimeframeSelector(!showTimeframeSelector)}
              className="px-3 py-1 bg-[#1a1a1f]/80 text-white text-sm rounded border border-[#2a2a2e] hover:bg-[#1a1a1f] transition-colors"
            >
              {interval}
            </button>
            
            {showTimeframeSelector && (
              <div className="absolute top-full right-0 mt-1 bg-[#1a1a1f] border border-[#2a2a2e] rounded-lg p-2 shadow-lg z-20">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      // TODO: Update interval in parent component
                      setShowTimeframeSelector(false);
                    }}
                    className={`block w-full text-left px-3 py-1 text-sm rounded hover:bg-[#2a2a2e] transition-colors ${
                      tf === interval ? 'text-glowBlue' : 'text-gray-300'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Size Controls */}
          {chartSize !== 'fullscreen' && (
            <button
              onClick={() => handleSizeChange('fullscreen')}
              className="p-2 bg-[#1a1a1f]/80 text-white rounded border border-[#2a2a2e] hover:bg-[#1a1a1f] transition-colors"
              title="Full Screen"
            >
              <Maximize2 size={16} />
            </button>
          )}

          {chartSize === 'fullscreen' && (
            <>
              <button
                onClick={() => handleSizeChange('medium')}
                className="p-2 bg-[#1a1a1f]/80 text-white rounded border border-[#2a2a2e] hover:bg-[#1a1a1f] transition-colors"
                title="Exit Full Screen"
              >
                <Minimize2 size={16} />
              </button>
              <button
                onClick={handleClose}
                className="p-2 bg-[#1a1a1f]/80 text-white rounded border border-[#2a2a2e] hover:bg-[#1a1a1f] transition-colors"
                title="Close Chart"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>

        {/* Size Toggle for Small/Medium */}
        {chartSize !== 'fullscreen' && (
          <div className="absolute bottom-2 right-2 z-10">
            <button
              onClick={() => handleSizeChange(chartSize === 'small' ? 'medium' : 'small')}
              className="px-3 py-1 bg-[#1a1a1f]/80 text-white text-sm rounded border border-[#2a2a2e] hover:bg-[#1a1a1f] transition-colors"
            >
              {chartSize === 'small' ? 'Expand' : 'Contract'}
            </button>
          </div>
        )}
      </div>

      {/* Backdrop for fullscreen */}
      {chartSize === 'fullscreen' && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998]"
          onClick={() => handleSizeChange('medium')}
        />
      )}
    </>
  );
}
