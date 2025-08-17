'use client'

import { useState, useRef, useEffect, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, UTCTimestamp, IChartApi } from 'lightweight-charts';

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
type DrawingTool = 'crosshair' | 'trendline' | 'horizontal' | 'alert';
type ScaleMode = 'linear' | 'log';
type Theme = 'dark' | 'light';

interface TradingChartProps {
  data: ChartData[];
  symbol?: string;
  height?: number;
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

export default function TradingChart({ 
  data, 
  symbol = 'SOL/USDC',
  height = 600,
  onTimeframeChange
}: TradingChartProps) {
  // Chart state
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(['sma']);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showIndicatorsDropdown, setShowIndicatorsDropdown] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Chart refs
  const chartRef = useRef<IChartApi | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Timeframe options
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    onTimeframeChange?.(newTimeframe);
  };
  
  // Toggle indicator
  const toggleIndicator = (indicator: IndicatorType) => {
    setActiveIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };
  
  // Preset configurations
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'ema_20_50':
        setActiveIndicators(['ema']);
        break;
      case 'ema_50_200':
        setActiveIndicators(['ema']);
        break;
      case 'reset':
        setActiveIndicators(['sma']);
        setScaleMode('linear');
        setZoom(1);
        break;
    }
  };

  // Create and setup chart
  useEffect(() => {
    console.log('TradingChart data:', data);
    if (!containerRef.current || data.length === 0) {
      console.log('Chart not rendering - missing container or data');
      return;
    }

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme === 'dark' ? '#e5e7eb' : '#374151',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { 
          color: theme === 'dark' ? 'rgba(42, 42, 46, 0.4)' : 'rgba(229, 231, 235, 0.6)',
          style: 1,
          visible: true
        },
        horzLines: { 
          color: theme === 'dark' ? 'rgba(42, 42, 46, 0.4)' : 'rgba(229, 231, 235, 0.6)',
          style: 1,
          visible: true
        },
      },
      crosshair: {
        mode: 1,
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
        scaleMargins: { top: 0.1, bottom: 0.25 },
        textColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
        borderVisible: true,
      },
      timeScale: {
        borderColor: theme === 'dark' ? 'rgba(42, 42, 46, 0.6)' : 'rgba(229, 231, 235, 0.8)',
        timeVisible: true,
        secondsVisible: false,
        textColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
        borderVisible: true,
      },
      width: containerRef.current.clientWidth,
      height: isFullscreen ? window.innerHeight - 100 : height - 100,
    });

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
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

    candlestickSeries.setData(data);
    seriesRef.current = candlestickSeries;

    // Add technical indicators
    const indicatorRefs: any = {};
    if (activeIndicators.length > 0 && data.length > 20) {
      activeIndicators.forEach((indicator, index) => {
        const colors = ['#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16'];
        const color = colors[index % colors.length];
        
        switch (indicator) {
          case 'sma':
            const smaData = calculateSMA(data, 20);
            const smaSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 2,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
            });
            smaSeries.setData(smaData);
            indicatorRefs['sma'] = smaSeries;
            break;
            
          case 'ema':
            const emaData = calculateEMA(data, 20);
            const emaSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 2,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
            });
            emaSeries.setData(emaData);
            indicatorRefs['ema'] = emaSeries;
            break;
            
          case 'rsi':
            const rsiData = calculateRSI(data, 14);
            const rsiSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 2,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceScaleId: 'rsi',
            });
            rsiSeries.setData(rsiData);
            
            // Configure RSI scale (0-100)
            chart.priceScale('rsi').applyOptions({
              scaleMargins: { top: 0.8, bottom: 0 },
              borderVisible: false,
            });
            
            indicatorRefs['rsi'] = rsiSeries;
            break;
            
          case 'macd':
            const macdData = calculateMACD(data);
            const macdSeries = chart.addSeries(LineSeries, {
              color: color,
              lineWidth: 2,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceScaleId: 'macd',
            });
            macdSeries.setData(macdData);
            
            // Configure MACD scale
            chart.priceScale('macd').applyOptions({
              scaleMargins: { top: 0.8, bottom: 0 },
              borderVisible: false,
            });
            
            indicatorRefs['macd'] = macdSeries;
            break;
        }
      });
    }

    chartRef.current = chart;

    // Add drawing tools functionality
    if (activeTool !== 'crosshair') {
      let isDrawing = false;
      let startPoint: any = null;
      
      const handleChartClick = (param: any) => {
        if (!param.time || !param.seriesData) return;
        
        const price = param.seriesData.get(candlestickSeries)?.close;
        if (!price) return;
        
        if (activeTool === 'trendline') {
          if (!isDrawing) {
            // Start drawing
            startPoint = { time: param.time, price };
            isDrawing = true;
          } else {
            // Finish drawing
            const endPoint = { time: param.time, price };
            
            // Create a simple trendline using LineSeries (basic implementation)
            const trendlineData = [
              { time: startPoint.time, value: startPoint.price },
              { time: endPoint.time, value: endPoint.price }
            ];
            
            const trendlineSeries = chart.addSeries(LineSeries, {
              color: '#ff6b6b',
              lineWidth: 2,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              lineStyle: 2, // Dashed line
            });
            
            trendlineSeries.setData(trendlineData);
            
            isDrawing = false;
            startPoint = null;
          }
        } else if (activeTool === 'horizontal') {
          // Add horizontal line at current price
          const horizontalLineData = data.map(point => ({
            time: point.time,
            value: price
          }));
          
          const horizontalSeries = chart.addSeries(LineSeries, {
            color: '#4ecdc4',
            lineWidth: 1,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            lineStyle: 1, // Dotted line
          });
          
          horizontalSeries.setData(horizontalLineData);
        } else if (activeTool === 'alert') {
          // Add price alert marker (visual indicator)
          console.log(`Price alert set at $${price.toFixed(6)} for time ${new Date(param.time * 1000)}`);
          // In a real implementation, you'd save this to state/database
        }
      };
      
      chart.subscribeClick(handleChartClick);
    }

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: containerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight - 100 : height - 100,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, theme, height, isFullscreen, activeIndicators, activeTool]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowIndicatorsDropdown(false);
      }
    };

    if (showIndicatorsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showIndicatorsDropdown]);

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

  const calculateRSI = (data: ChartData[], period: number = 14) => {
    const rsiData = [];
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      rsiData.push({ time: data[i + 1].time, value: rsi });
    }
    
    return rsiData;
  };

  const calculateMACD = (data: ChartData[]) => {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdLine = [];
    
    const startIndex = Math.max(0, ema26.length - ema12.length);
    
    for (let i = startIndex; i < ema12.length; i++) {
      const macdValue = ema12[i].value - ema26[i - startIndex].value;
      macdLine.push({ time: ema12[i].time, value: macdValue });
    }
    
    return macdLine;
  };
  
  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-[100]' : ''} ${
      theme === 'dark' 
        ? 'bg-[#0a0a0a] text-white' 
        : 'bg-white text-gray-900'
    }`} style={{ height: isFullscreen ? '100vh' : `${height}px` }}>
      
      {/* Top Bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        theme === 'dark' 
          ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Pair Label */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{symbol}</span>
          </div>
          
          {/* Timeframes */}
          <div className="flex items-center gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
                  timeframe === tf
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          {/* Indicators Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowIndicatorsDropdown(!showIndicatorsDropdown)}
              className={`px-3 py-1.5 text-sm font-medium rounded border transition-all duration-200 flex items-center gap-2 ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#3a3a3a]'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              <span>Indicators ({activeIndicators.length})</span>
              <span className={`text-xs transition-transform duration-200 ${showIndicatorsDropdown ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {/* Dropdown Menu */}
            {showIndicatorsDropdown && (
              <div className={`absolute top-full left-0 mt-1 w-64 rounded-lg border shadow-lg transition-all duration-200 z-50 ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-[#2a2a2a]'
                  : 'bg-white border-gray-200'
              }`}>
              <div className="p-3">
                <div className="text-xs font-medium mb-2 text-gray-500">OVERLAYS</div>
                {(['sma', 'ema'] as const).map((indicator) => (
                  <label key={indicator} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeIndicators.includes(indicator)}
                      onChange={() => toggleIndicator(indicator)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">{indicator.toUpperCase()}</span>
                  </label>
                ))}
                
                <div className="text-xs font-medium mb-2 mt-3 text-gray-500">OSCILLATORS</div>
                {(['rsi', 'macd'] as const).map((indicator) => (
                  <label key={indicator} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeIndicators.includes(indicator)}
                      onChange={() => toggleIndicator(indicator)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">{indicator.toUpperCase()}</span>
                  </label>
                ))}
                
                <hr className={`my-2 ${theme === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-200'}`} />
                
                <div className="text-xs font-medium mb-2 text-gray-500">PRESETS</div>
                <button
                  onClick={() => applyPreset('ema_20_50')}
                  className={`w-full text-left text-sm py-1 px-2 rounded hover:bg-opacity-50 ${
                    theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'
                  }`}
                >
                  EMA 20/50
                </button>
                <button
                  onClick={() => applyPreset('ema_50_200')}
                  className={`w-full text-left text-sm py-1 px-2 rounded hover:bg-opacity-50 ${
                    theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100'
                  }`}
                >
                  EMA 50/200
                </button>
              </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded transition-all duration-200 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Toggle theme"
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          
          {/* Save Layout */}
          <button
            className={`p-2 rounded transition-all duration-200 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Save layout"
          >
            💾
          </button>
          
          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded transition-all duration-200 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Toggle fullscreen"
          >
            ⛶
          </button>
          
          {/* Reset Chart */}
          <button
            onClick={() => applyPreset('reset')}
            className={`p-2 rounded transition-all duration-200 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Reset chart"
          >
            ↻
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Left Tool Rail */}
        <div className={`w-12 border-r flex flex-col items-center py-2 gap-2 ${
          theme === 'dark' 
            ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          {/* Crosshair */}
          <button
            onClick={() => setActiveTool('crosshair')}
            className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-all duration-200 ${
              activeTool === 'crosshair'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Crosshair"
          >
            ✛
          </button>
          
          {/* Trendline */}
          <button
            onClick={() => setActiveTool('trendline')}
            className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-all duration-200 ${
              activeTool === 'trendline'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Trendline"
          >
            ╱
          </button>
          
          {/* Horizontal Line */}
          <button
            onClick={() => setActiveTool('horizontal')}
            className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-all duration-200 ${
              activeTool === 'horizontal'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Horizontal line"
          >
            ─
          </button>
          
          {/* Price Alert */}
          <button
            onClick={() => setActiveTool('alert')}
            className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-all duration-200 ${
              activeTool === 'alert'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Price alert"
          >
            🔔
          </button>
        </div>
        
        {/* Chart Container */}
        <div className="flex-1 flex flex-col">
          {/* Chart Area */}
          <div 
            ref={containerRef}
            className={`flex-1 relative ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white'}`}
            style={{ height: isFullscreen ? 'calc(100vh - 100px)' : `${height - 100}px` }}
          >
            
            {/* Scale Toggle (bottom-right) */}
            <div className="absolute bottom-4 right-4">
              <button
                onClick={() => setScaleMode(scaleMode === 'linear' ? 'log' : 'linear')}
                className={`px-3 py-1 text-xs font-medium rounded border transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:text-gray-900'
                }`}
              >
                {scaleMode === 'linear' ? 'Linear' : 'Log'}
              </button>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className={`flex items-center justify-between px-4 py-2 border-t ${
            theme === 'dark' 
              ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            {/* Left - Status */}
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Loaded: {timeframe} · Last update {new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            
            {/* Center - Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(zoom * 1.2)}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all duration-200 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={() => setZoom(zoom / 1.2)}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all duration-200 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Zoom out"
              >
                –
              </button>
              <button
                onClick={() => setZoom(1)}
                className={`px-3 py-1 text-sm rounded transition-all duration-200 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Reset zoom"
              >
                Reset
              </button>
            </div>
            
            {/* Right - Scale Toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Scale:
              </span>
              <button
                onClick={() => setScaleMode('linear')}
                className={`px-2 py-1 text-sm rounded transition-all duration-200 ${
                  scaleMode === 'linear'
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Linear
              </button>
              <span className={`${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>|</span>
              <button
                onClick={() => setScaleMode('log')}
                className={`px-2 py-1 text-sm rounded transition-all duration-200 ${
                  scaleMode === 'log'
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Log
              </button>
            </div>
          </div>
        </div>
        
        {/* Right Flyout Panel */}
        {showRightPanel && (
          <div className={`w-80 border-l ${
            theme === 'dark' 
              ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="p-4">
              <h3 className="text-lg font-medium mb-4">Chart Settings</h3>
              
              {/* Layout Section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2">Layouts</h4>
                <div className="space-y-2">
                  <button className={`w-full text-left px-3 py-2 rounded transition-all duration-200 ${
                    theme === 'dark'
                      ? 'hover:bg-[#2a2a2a]'
                      : 'hover:bg-gray-100'
                  }`}>
                    Save Current Layout
                  </button>
                  <button className={`w-full text-left px-3 py-2 rounded transition-all duration-200 ${
                    theme === 'dark'
                      ? 'hover:bg-[#2a2a2a]'
                      : 'hover:bg-gray-100'
                  }`}>
                    Load Layout
                  </button>
                </div>
              </div>
              
              {/* Quick Presets */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2">Quick Presets</h4>
                <div className="space-y-1">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">SMA 50</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">EMA 20/50</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">RSI</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">MACD</span>
                  </label>
                </div>
              </div>
              
              {/* Restore Defaults */}
              <button
                onClick={() => applyPreset('reset')}
                className={`w-full px-3 py-2 rounded border transition-all duration-200 ${
                  theme === 'dark'
                    ? 'border-[#2a2a2a] hover:bg-[#2a2a2a]'
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                Restore Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}