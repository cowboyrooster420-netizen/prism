'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, UTCTimestamp, IChartApi } from 'lightweight-charts';

interface ChartData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type ChartType = 'candlestick' | 'line' | 'area';
type IndicatorType = 'sma' | 'ema' | 'bollinger' | 'rsi' | 'macd';

interface MarketStats {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  totalVolume: number;
  avgVolume: number;
  priceRange: number;
}

interface TokenChartProps {
  data: ChartData[];
  height?: number;
  showVolume?: boolean;
  chartType?: ChartType;
  indicators?: IndicatorType[];
  theme?: 'dark' | 'light';
  showCrosshair?: boolean;
  showGrid?: boolean;
  priceFormat?: 'auto' | 'percent';
}

export default function TokenChart({ 
  data, 
  height = 400, 
  showVolume = true, 
  chartType = 'candlestick',
  indicators = ['sma'],
  theme = 'dark',
  showCrosshair = true,
  showGrid = true,
  priceFormat = 'auto'
}: TokenChartProps) {
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);
  const [avgVolume, setAvgVolume] = useState<number | null>(null);
  const [volatility, setVolatility] = useState<number | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<{ [key: string]: any }>({});

  // Enhanced callback ref with error handling
  const setChartContainer = useCallback((element: HTMLDivElement | null) => {
    chartContainerRef.current = element;
    
    if (element) {
      try {
        // Trigger chart creation with error boundary
        createChartInContainer(element);
      } catch (error) {
        console.error('Chart creation failed:', error);
        setIsLoading(false);
      }
    }
  }, [data, height, showVolume, chartType, indicators, theme, showCrosshair, showGrid]);
  
  // Add mouse interaction handlers
  useEffect(() => {
    if (chartRef.current && seriesRef.current) {
      const chart = chartRef.current;
      const series = seriesRef.current;
      
      // Subscribe to crosshair position changes
      chart.subscribeCrosshairMove((param: any) => {
        if (param.time) {
          const dataPoint = param.seriesData?.get(series);
          if (dataPoint) {
            // Could update a tooltip or info panel here
            console.log('Crosshair data:', dataPoint);
          }
        }
      });
      
      // Subscribe to click events
      chart.subscribeClick((param: any) => {
        if (param.time) {
          console.log('Chart clicked at:', new Date(param.time * 1000));
        }
      });
    }
  }, [chartRef.current, seriesRef.current]);

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

    // Create chart with enhanced styling
    const chart = createChart(container, {
      layout: {
        background: { 
          type: ColorType.Solid, 
          color: 'transparent' 
        },
        textColor: theme === 'dark' ? '#e5e7eb' : '#374151',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { 
          color: theme === 'dark' ? 'rgba(42, 42, 46, 0.4)' : 'rgba(229, 231, 235, 0.6)',
          style: 1,
          visible: showGrid
        },
        horzLines: { 
          color: theme === 'dark' ? 'rgba(42, 42, 46, 0.4)' : 'rgba(229, 231, 235, 0.6)',
          style: 1,
          visible: showGrid
        },
      },
      crosshair: {
        mode: showCrosshair ? 1 : 0,
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? 'rgba(42, 42, 46, 0.6)' : 'rgba(229, 231, 235, 0.8)',
        scaleMargins: {
          top: showVolume ? 0.1 : 0.05,
          bottom: showVolume ? 0.25 : 0.05,
        },
        textColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
        borderVisible: true,
        entireTextOnly: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: theme === 'dark' ? 'rgba(42, 42, 46, 0.6)' : 'rgba(229, 231, 235, 0.8)',
        timeVisible: true,
        secondsVisible: false,
        textColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
        borderVisible: true,
        tickMarkFormatter: (time: UTCTimestamp) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });


    // Create main price series based on chart type
    let mainSeries: any;
    
    if (chartType === 'candlestick') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
        borderVisible: true,
        wickVisible: true,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      });
    } else if (chartType === 'line') {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 0,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#3b82f6',
        crosshairMarkerBackgroundColor: '#3b82f6',
        lastValueVisible: true,
        priceLineVisible: true,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      });
    } else if (chartType === 'area') {
      mainSeries = chart.addSeries(LineSeries, {
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineColor: '#3b82f6',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        lastValueVisible: true,
        priceLineVisible: true,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      });
    }
    
    seriesRef.current = mainSeries;

    // Add technical indicators
    if (indicators.length > 0 && dataToUse.length > 20) {
      indicators.forEach((indicator, index) => {
        const colors = ['#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16', '#f97316'];
        const color = colors[index % colors.length];
        
        switch (indicator) {
          case 'sma':
            const smaData = calculateSMA(dataToUse, 20);
            const smaSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 2,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              title: 'SMA(20)',
            });
            smaSeries.setData(smaData);
            indicatorSeriesRef.current['sma'] = smaSeries;
            break;
            
          case 'ema':
            const emaData = calculateEMA(dataToUse, 20);
            const emaSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 2,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              title: 'EMA(20)',
            });
            emaSeries.setData(emaData);
            indicatorSeriesRef.current['ema'] = emaSeries;
            break;
            
          case 'bollinger':
            const bollingerData = calculateBollingerBands(dataToUse, 20, 2);
            // Upper band
            const upperBandSeries = chart.addSeries(LineSeries, {
              color: 'rgba(139, 92, 246, 0.6)',
              lineWidth: 1,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              title: 'BB Upper',
            });
            upperBandSeries.setData(bollingerData.upper);
            
            // Lower band
            const lowerBandSeries = chart.addSeries(LineSeries, {
              color: 'rgba(139, 92, 246, 0.6)',
              lineWidth: 1,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              title: 'BB Lower',
            });
            lowerBandSeries.setData(bollingerData.lower);
            
            indicatorSeriesRef.current['bollinger'] = { upper: upperBandSeries, lower: lowerBandSeries };
            break;
        }
      });
    }

    // Set data based on chart type
    if (chartType === 'candlestick') {
      mainSeries.setData(dataToUse);
    } else {
      // For line and area charts, use close prices
      const lineData = dataToUse.map(d => ({
        time: d.time,
        value: d.close
      }));
      mainSeries.setData(lineData);
    }
    
    // Update comprehensive price and market info
    if (dataToUse.length > 0) {
      const lastCandle = dataToUse[dataToUse.length - 1];
      const firstCandle = dataToUse[0];
      
      // Basic price info
      setCurrentPrice(lastCandle.close);
      const change = ((lastCandle.close - firstCandle.close) / firstCandle.close) * 100;
      setPriceChange(change);
      setVolume(lastCandle.volume || 0);
      
      // 24h high/low
      const high = Math.max(...dataToUse.map(d => d.high));
      const low = Math.min(...dataToUse.map(d => d.low));
      setHigh24h(high);
      setLow24h(low);
      
      // Average volume
      const avgVol = dataToUse.reduce((acc, d) => acc + (d.volume || 0), 0) / dataToUse.length;
      setAvgVolume(avgVol);
      
      // Price volatility (standard deviation)
      const prices = dataToUse.map(d => d.close);
      const mean = prices.reduce((acc, p) => acc + p, 0) / prices.length;
      const variance = prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const volatilityPercent = (stdDev / mean) * 100;
      setVolatility(volatilityPercent);
    }
    
    // Add volume series with enhanced styling
    if (showVolume) {
      const volumeData = dataToUse.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)',
      }));
      
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { 
          type: 'volume',
          precision: 0,
          minMove: 1,
        },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      });
      
      volumeSeries.setData(volumeData);
      volumeSeriesRef.current = volumeSeries;
      
      // Configure volume scale
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
        borderVisible: false,
        textColor: theme === 'dark' ? '#6b7280' : '#9ca3af',
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
  }, [data, height, showVolume, indicators, theme]);

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

  // Technical Indicator Calculations
  const calculateSMA = (data: ChartData[], period: number) => {
    const smaData = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      const average = sum / period;
      smaData.push({ time: data[i].time, value: average });
    }
    return smaData;
  };

  const calculateEMA = (data: ChartData[], period: number) => {
    const emaData = [];
    const multiplier = 2 / (period + 1);
    let ema = data[0].close;
    
    emaData.push({ time: data[0].time, value: ema });
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
      emaData.push({ time: data[i].time, value: ema });
    }
    return emaData;
  };

  const calculateBollingerBands = (data: ChartData[], period: number, stdDev: number) => {
    const smaData = calculateSMA(data, period);
    const upperBand = [];
    const lowerBand = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((acc, d) => acc + d.close, 0) / period;
      const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upperBand.push({
        time: data[i].time,
        value: mean + (standardDeviation * stdDev)
      });
      
      lowerBand.push({
        time: data[i].time,
        value: mean - (standardDeviation * stdDev)
      });
    }
    
    return { upper: upperBand, lower: lowerBand };
  };
  
  // Calculate additional market statistics
  const calculateMarketStats = (data: ChartData[]) => {
    if (data.length === 0) return null;
    
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume || 0);
    
    return {
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      totalVolume: volumes.reduce((a, b) => a + b, 0),
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      priceRange: Math.max(...prices) - Math.min(...prices)
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-gray-400 text-sm">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-[#0f0f11]/60 to-[#1a1a1f]/40 rounded-lg overflow-hidden border border-[#2a2a2e]/20">

      {/* Enhanced Indicator Legend with Values */}
      {indicators.length > 0 && data.length > 20 && (
        <div className="absolute top-3 right-3 z-10 bg-[#1a1a1f]/90 backdrop-blur-sm rounded-xl p-3 border border-[#2a2a2e]/40 shadow-lg">
          <div className="text-xs text-gray-500 mb-2 font-medium">Technical Indicators</div>
          <div className="space-y-2">
            {indicators.map((indicator, index) => {
              const colors = ['#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16', '#f97316'];
              const color = colors[index % colors.length];
              const labels = {
                sma: 'SMA(20)',
                ema: 'EMA(20)',
                bollinger: 'BB(20,2)',
                rsi: 'RSI(14)',
                macd: 'MACD'
              };
              
              // Calculate current indicator value if possible
              let currentValue = '';
              if (data.length > 20) {
                switch (indicator) {
                  case 'sma':
                    const smaData = calculateSMA(data, 20);
                    if (smaData.length > 0) {
                      currentValue = `$${smaData[smaData.length - 1].value.toFixed(6)}`;
                    }
                    break;
                  case 'ema':
                    const emaData = calculateEMA(data, 20);
                    if (emaData.length > 0) {
                      currentValue = `$${emaData[emaData.length - 1].value.toFixed(6)}`;
                    }
                    break;
                }
              }
              
              return (
                <div key={indicator} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-0.5 rounded" 
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-xs text-gray-400 font-medium">
                      {labels[indicator]}
                    </span>
                  </div>
                  {currentValue && (
                    <span className="text-xs font-semibold" style={{ color }}>
                      {currentValue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div ref={setChartContainer} className="w-full" style={{ height: `${height}px` }} />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#0f0f11]/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <div className="text-gray-400 text-sm font-medium">Loading chart data...</div>
          </div>
        </div>
      )}
      
      {/* No Data State */}
      {!isLoading && data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-6xl mb-4 opacity-50">📊</div>
            <div className="text-gray-400 text-lg font-semibold mb-2">No chart data available</div>
            <div className="text-gray-500 text-sm mb-4">Data may be unavailable for this token or timeframe</div>
            <div className="text-xs text-gray-600 bg-[#1a1a1f]/40 rounded-lg p-3 border border-[#2a2a2e]/20">
              <div className="font-medium mb-1">Possible reasons:</div>
              <div>• Token is too new or not actively traded</div>
              <div>• API data source temporarily unavailable</div>
              <div>• Selected timeframe has insufficient data</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Chart Watermark */}
      {currentPrice && (
        <div className="absolute bottom-3 right-3 z-10 text-xs text-gray-600 font-mono opacity-50">
          Powered by Prism Analytics
        </div>
      )}
    </div>
  );
} 