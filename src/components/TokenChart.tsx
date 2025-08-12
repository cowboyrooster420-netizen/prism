'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, UTCTimestamp } from 'lightweight-charts';

interface ChartData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TokenChartProps {
  data: ChartData[];
  height?: number;
  showVolume?: boolean;
  showIndicators?: boolean;
  theme?: 'dark' | 'light';
}

export default function TokenChart({ 
  data, 
  height = 200, 
  showVolume = true, 
  showIndicators = true,
  theme = 'dark'
}: TokenChartProps) {
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false); // Set to false immediately for testing
  const chartRef = useRef<any>(null);

  // Callback ref to handle container availability
  const setChartContainer = useCallback((element: HTMLDivElement | null) => {
    chartContainerRef.current = element;
    
    if (element) {
      // Trigger chart creation immediately when container is available
      createChartInContainer(element);
    }
  }, [data, height, showVolume, showIndicators, theme]);

  const createChartInContainer = useCallback((container: HTMLDivElement) => {
    
    // Clean up existing chart safely
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.warn('Chart already disposed:', e);
      }
      chartRef.current = null;
    }

    // For testing: use hardcoded data if no data provided
    const testData = [
      { time: 1726670700 as UTCTimestamp, open: 128, high: 129, low: 127, close: 128.5, volume: 1000 },
      { time: 1726671600 as UTCTimestamp, open: 128.5, high: 130, low: 128, close: 129, volume: 1200 },
      { time: 1726672500 as UTCTimestamp, open: 129, high: 131, low: 128.5, close: 130, volume: 900 }
    ];

    const dataToUse = data.length > 0 ? data : testData;

    // Create chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme === 'dark' ? '#ffffff' : '#000000',
      },
      grid: {
        vertLines: { color: theme === 'dark' ? '#2a2a2e' : '#e5e7eb' },
        horzLines: { color: theme === 'dark' ? '#2a2a2e' : '#e5e7eb' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3bb0ff',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#3bb0ff',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? '#2a2a2e' : '#e5e7eb',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: theme === 'dark' ? '#2a2a2e' : '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });


    // Add candlestick series
    const candlestickChartSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#3bff75',
      downColor: '#ff6b6b',
      borderDownColor: '#ff6b6b',
      borderUpColor: '#3bff75',
      wickDownColor: '#ff6b6b',
      wickUpColor: '#3bff75',
    });

    // Volume series will be added below with data

    // Add SMA indicator if enabled
    if (showIndicators && dataToUse.length > 2) {  // Use smaller threshold for test
      const smaData = calculateSMA(dataToUse, Math.min(dataToUse.length, 20));
      const smaChartSeries = chart.addSeries(LineSeries, {
        color: '#8b5cf6',
        lineWidth: 2,
        priceLineVisible: false,
      });
      smaChartSeries.setData(smaData);
    }

    // Set data
    candlestickChartSeries.setData(dataToUse);
    
    if (showVolume) {
      const volumeData = dataToUse.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? '#3bff75' : '#ff6b6b',
      }));
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#3bb0ff',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      volumeSeries.setData(volumeData);
      
      // Set scale margins for the volume scale
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
    }


    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          });
        } catch (e) {
          console.warn('Chart disposed during resize:', e);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    setIsLoading(false);
    
    // Store chart reference and resize handler for cleanup
    chartRef.current = chart;
    
    // Return cleanup function for resize listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, height, showVolume, showIndicators, theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.warn('Chart already disposed on unmount:', e);
        }
        chartRef.current = null;
      }
    };
  }, []);

  // Calculate Simple Moving Average
  const calculateSMA = (data: ChartData[], period: number) => {
    const smaData = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      const average = sum / period;
      smaData.push({
        time: data[i].time,
        value: average,
      });
    }
    
    return smaData;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-gray-400 text-sm">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={setChartContainer} className="w-full" style={{ height: `${height}px` }} />
      {showIndicators && data.length > 0 && (
        <div className="absolute top-2 left-2 text-xs text-gray-400">
          <span className="inline-block w-3 h-0.5 bg-purple-500 mr-1"></span>
          SMA(20)
        </div>
      )}
    </div>
  );
} 