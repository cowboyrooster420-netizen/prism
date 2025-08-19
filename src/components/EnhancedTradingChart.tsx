'use client'

import { useState, useRef, useEffect, useCallback } from 'react';
import { createChart, ColorType, UTCTimestamp, IChartApi, ISeriesApi, CandlestickSeriesOptions, HistogramSeriesOptions, LineSeriesOptions } from 'lightweight-charts';
import { useOHLCVData, useTokenTier, OHLCVData } from '../hooks/useOHLCVData';

interface ChartData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type IndicatorType = 'sma' | 'ema' | 'rsi' | 'macd';
type DrawingTool = 'crosshair' | 'trendline' | 'horizontal' | 'rectangle' | 'fibonacci' | 'alert';
type ScaleMode = 'linear' | 'log';
type Theme = 'dark' | 'light';

interface EnhancedTradingChartProps {
  tokenAddress: string;
  symbol?: string;
  height?: number;
  defaultTimeframe?: Timeframe;
  autoRefresh?: boolean;
  onTimeframeChange?: (timeframe: Timeframe) => void;
}

interface ChartLayout {
  name: string;
  timeframe: Timeframe;
  indicators: IndicatorType[];
  scaleMode: ScaleMode;
  theme: Theme;
  drawings: any[];
}

export default function EnhancedTradingChart({ 
  tokenAddress,
  symbol = 'Token',
  height = 600,
  defaultTimeframe = '1h',
  autoRefresh = true,
  onTimeframeChange
}: EnhancedTradingChartProps) {
  // Chart state
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(['sma']);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [drawings, setDrawings] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{x: number, y: number, time: number, price: number} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<string>('default');
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const drawingSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  // Data hooks
  const { 
    data: ohlcvData, 
    loading: dataLoading, 
    error: dataError, 
    lastUpdated, 
    refresh: refreshData,
    hasData 
  } = useOHLCVData({
    tokenAddress,
    timeframe,
    daysBack: 30,
    autoRefresh,
    refreshInterval: timeframe === '1m' ? 60000 : timeframe === '5m' ? 300000 : 3600000
  });

  const { 
    tierInfo, 
    loading: tierLoading 
  } = useTokenTier(tokenAddress);

  // Convert OHLCV data to chart format and ensure proper sorting
  const chartData: ChartData[] = ohlcvData
    .map(candle => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }))
    .sort((a, b) => a.time - b.time) // Ensure ascending time order for lightweight-charts
    .filter((candle, index, arr) => { // Remove duplicates by timestamp
      return index === 0 || candle.time !== arr[index - 1].time;
    });

  // Theme configuration
  const chartThemes = {
    dark: {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#758696', style: 3, width: 1 },
        horzLine: { color: '#758696', style: 3, width: 1 },
      },
      priceScale: {
        borderColor: '#485c7b',
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true,
        secondsVisible: false,
      },
    },
    light: {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#000000',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#758696', style: 3, width: 1 },
        horzLine: { color: '#758696', style: 3, width: 1 },
      },
      priceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    },
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      ...chartThemes[theme],
      handleScroll: {
        mouseWheel: activeTool === 'crosshair',
        pressedMouseMove: activeTool === 'crosshair',
      },
      handleScale: {
        axisPressedMouseMove: activeTool === 'crosshair',
        mouseWheel: activeTool === 'crosshair',
        pinch: activeTool === 'crosshair',
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: height 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Drawing event handlers
    const handleChartClick = (param: any) => {
      if (activeTool === 'crosshair') return;
      
      if (!param.point || !param.time) return;
      
      const price = candlestickSeriesRef.current?.coordinateToPrice(param.point.y) as number;
      const time = param.time as number;
      
      if (!isDrawing) {
        // Start drawing
        setIsDrawing(true);
        setDrawingStart({
          x: param.point.x,
          y: param.point.y,
          time,
          price
        });
      } else {
        // Finish drawing
        if (drawingStart) {
          const newDrawing = {
            id: Date.now().toString(),
            type: activeTool,
            start: drawingStart,
            end: {
              x: param.point.x,
              y: param.point.y,
              time,
              price
            }
          };
          
          setDrawings(prev => [...prev, newDrawing]);
          setIsDrawing(false);
          setDrawingStart(null);
        }
      }
    };

    chart.subscribeClick(handleChartClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeClick(handleChartClick);
      chart.remove();
    };
  }, [theme, height, activeTool, isDrawing, drawingStart]);

  // Update chart data
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !volumeSeriesRef.current) return;
    if (chartData.length === 0) return;

    try {
      // Validate data is properly sorted before setting
      for (let i = 1; i < chartData.length; i++) {
        if (chartData[i].time <= chartData[i - 1].time) {
          console.error('Data ordering error at index', i, {
            current: chartData[i].time,
            previous: chartData[i - 1].time
          });
          return; // Don't set data if it's not properly ordered
        }
      }

      // Set candlestick data
      candlestickSeriesRef.current.setData(chartData);

      // Set volume data
      const volumeData = chartData
        .filter(d => d.volume !== undefined && d.volume > 0)
        .map(d => ({
          time: d.time,
          value: d.volume!,
          color: d.close >= d.open ? '#26a69a' : '#ef5350'
        }));

      volumeSeriesRef.current.setData(volumeData);

      // Fit content
      chartRef.current.timeScale().fitContent();

    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }, [chartData]);

  // Calculate and display indicators
  const calculateSMA = useCallback((data: ChartData[], period: number) => {
    const smaData: Array<{ time: UTCTimestamp; value: number }> = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      smaData.push({
        time: data[i].time,
        value: sum / period
      });
    }
    
    return smaData;
  }, []);

  const calculateEMA = useCallback((data: ChartData[], period: number) => {
    const emaData: Array<{ time: UTCTimestamp; value: number }> = [];
    const multiplier = 2 / (period + 1);
    
    let ema = data[0]?.close || 0;
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema = data[i].close;
      } else {
        ema = (data[i].close - ema) * multiplier + ema;
      }
      
      emaData.push({
        time: data[i].time,
        value: ema
      });
    }
    
    return emaData;
  }, []);

  // Update indicators
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    // Clear existing indicators
    indicatorSeriesRef.current.forEach(series => {
      chartRef.current?.removeSeries(series);
    });
    indicatorSeriesRef.current.clear();

    // Add active indicators
    activeIndicators.forEach(indicator => {
      let series: ISeriesApi<"Line">;
      
      switch (indicator) {
        case 'sma':
          series = chartRef.current!.addLineSeries({
            color: '#2196F3',
            lineWidth: 2,
          });
          const smaData = calculateSMA(chartData, 20);
          series.setData(smaData);
          indicatorSeriesRef.current.set('sma', series);
          break;
          
        case 'ema':
          series = chartRef.current!.addLineSeries({
            color: '#FF9800',
            lineWidth: 2,
          });
          const emaData = calculateEMA(chartData, 20);
          series.setData(emaData);
          indicatorSeriesRef.current.set('ema', series);
          break;
      }
    });
  }, [activeIndicators, chartData, calculateSMA, calculateEMA]);

  // Update drawings
  useEffect(() => {
    if (!chartRef.current) return;

    // Clear existing drawings
    drawingSeriesRef.current.forEach(series => {
      chartRef.current?.removeSeries(series);
    });
    drawingSeriesRef.current.clear();

    // Add drawings
    drawings.forEach(drawing => {
      if (drawing.type === 'trendline' || drawing.type === 'horizontal') {
        const series = chartRef.current!.addLineSeries({
          color: drawing.type === 'trendline' ? '#FFD700' : '#FF6B6B',
          lineWidth: 2,
          lineStyle: 2,
        });
        
        const lineData = [];
        if (drawing.type === 'trendline') {
          // Ensure trendline points are in chronological order
          const startPoint = { time: drawing.start.time as UTCTimestamp, value: drawing.start.price };
          const endPoint = { time: drawing.end.time as UTCTimestamp, value: drawing.end.price };
          
          if (drawing.start.time <= drawing.end.time) {
            lineData.push(startPoint, endPoint);
          } else {
            lineData.push(endPoint, startPoint);
          }
        } else {
          // Horizontal line - extend across visible range
          const timeRange = chartRef.current!.timeScale().getVisibleRange();
          if (timeRange) {
            lineData.push(
              { time: timeRange.from as UTCTimestamp, value: drawing.start.price },
              { time: timeRange.to as UTCTimestamp, value: drawing.start.price }
            );
          }
        }
        
        series.setData(lineData);
        drawingSeriesRef.current.set(drawing.id, series);
      }
    });
  }, [drawings]);

  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    onTimeframeChange?.(newTimeframe);
  };

  const toggleIndicator = (indicator: IndicatorType) => {
    setActiveIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const clearDrawings = () => {
    setDrawings([]);
    setIsDrawing(false);
    setDrawingStart(null);
  };

  const undoLastDrawing = () => {
    setDrawings(prev => prev.slice(0, -1));
  };

  const handleToolChange = (tool: DrawingTool) => {
    setActiveTool(tool);
    setIsDrawing(false);
    setDrawingStart(null);
    
    // Update chart interaction based on tool
    if (chartRef.current) {
      const isDrawingTool = tool !== 'crosshair';
      chartRef.current.applyOptions({
        handleScale: {
          axisPressedMouseMove: !isDrawingTool,
          mouseWheel: !isDrawingTool,
          pinch: !isDrawingTool,
        },
        handleScroll: {
          mouseWheel: !isDrawingTool,
          pressedMouseMove: !isDrawingTool,
        },
      });
    }
  };

  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-red-500 text-white';
      case 2: return 'bg-orange-500 text-white';
      case 3: return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className={`trading-chart relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          {/* Symbol and Tier Info */}
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-white">
              {symbol} • {tokenAddress.slice(0, 8)}...
            </h2>
            {tierInfo && (
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTierBadgeColor(tierInfo.tier)}`}>
                  Tier {tierInfo.tier}
                </span>
                <span className="text-sm text-gray-300">
                  Score: {tierInfo.hotnessScore.toFixed(1)}
                </span>
                {tierInfo.rank && (
                  <span className="text-sm text-gray-300">
                    Rank: #{tierInfo.rank}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Data Status */}
          <div className="flex items-center space-x-2">
            {dataLoading && (
              <div className="flex items-center space-x-1 text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-xs">Loading...</span>
              </div>
            )}
            {hasData && !dataLoading && (
              <div className="flex items-center space-x-1 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs">
                  {chartData.length} candles
                  {lastUpdated && (
                    <span className="text-gray-400 ml-1">
                      • {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </span>
              </div>
            )}
            {dataError && (
              <div className="flex items-center space-x-1 text-red-400">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs">{dataError}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Drawing Tools */}
          <div className="flex bg-gray-800 rounded-lg p-1 mr-4">
            {([
              { tool: 'crosshair', icon: '✛', label: 'Crosshair' },
              { tool: 'trendline', icon: '📈', label: 'Trend Line' },
              { tool: 'horizontal', icon: '─', label: 'Horizontal' },
              { tool: 'rectangle', icon: '▭', label: 'Rectangle' },
              { tool: 'fibonacci', icon: 'φ', label: 'Fibonacci' }
            ] as { tool: DrawingTool; icon: string; label: string }[]).map(({ tool, icon, label }) => (
              <button
                key={tool}
                onClick={() => handleToolChange(tool)}
                className={`px-2 py-1 text-sm rounded transition-colors ${tool === activeTool
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                title={label}
              >
                {icon}
              </button>
            ))}
            
            {/* Drawing Controls */}
            <div className="border-l border-gray-600 ml-1 pl-1">
              <button
                onClick={undoLastDrawing}
                disabled={drawings.length === 0}
                className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-300"
                title="Undo Last Drawing"
              >
                ↶
              </button>
              <button
                onClick={clearDrawings}
                disabled={drawings.length === 0}
                className="px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-300"
                title="Clear All Drawings"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Current Drawing Status */}
          {isDrawing && (
            <div className="flex items-center space-x-1 text-yellow-400 bg-yellow-400 bg-opacity-10 px-2 py-1 rounded">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Drawing {activeTool}...</span>
            </div>
          )}

          {/* Timeframe Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['1m', '5m', '15m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicators */}
          <div className="relative">
            <button
              onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors"
            >
              Indicators
            </button>
            
            {isIndicatorsOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                <div className="p-2">
                  {(['sma', 'ema', 'rsi', 'macd'] as IndicatorType[]).map((indicator) => (
                    <label key={indicator} className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeIndicators.includes(indicator)}
                        onChange={() => toggleIndicator(indicator)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">{indicator.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshData}
            disabled={dataLoading}
            className="p-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <svg className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Drawing Instructions */}
      {activeTool !== 'crosshair' && (
        <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 p-2 mx-3 rounded">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-xs text-blue-300">
              {activeTool === 'trendline' && 'Click two points to draw a trend line'}
              {activeTool === 'horizontal' && 'Click to draw a horizontal line at price level'}
              {activeTool === 'rectangle' && 'Click two corners to draw a rectangle'}
              {activeTool === 'fibonacci' && 'Click start and end points for Fibonacci retracement'}
              {activeTool === 'alert' && 'Click to set a price alert'}
              {isDrawing && ' (Click again to finish)'}
            </span>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {!hasData && !dataLoading && !dataError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
            <div className="text-center text-gray-400">
              <div className="text-lg mb-2">No data available</div>
              <div className="text-sm">OHLCV data not found for this token and timeframe</div>
            </div>
          </div>
        )}
        
        {dataError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
            <div className="text-center text-red-400">
              <div className="text-lg mb-2">Data Error</div>
              <div className="text-sm mb-4">{dataError}</div>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div 
          ref={chartContainerRef} 
          className={`w-full ${
            activeTool !== 'crosshair' 
              ? 'cursor-crosshair' 
              : 'cursor-default'
          }`} 
          style={{ height: `${height}px` }} 
        />
        
        {/* Drawing Stats */}
        {drawings.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-90 px-3 py-1 rounded text-xs text-gray-300">
            {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}