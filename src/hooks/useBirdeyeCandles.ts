import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, Time } from 'lightweight-charts';
import { fetchOHLCV, Interval } from '@/lib/birdeyeClient';

type Opts = {
  address: string;            // token mint
  interval?: Interval;        // default '1m'
  lookbackSec?: number;       // default 24h
  pollMs?: number;            // default 3000
};

export function useBirdeyeCandles(container: HTMLDivElement | null, {
  address, 
  interval = '1m', 
  lookbackSec = 24*3600, 
  pollMs = 3000 
}: {
  address: string;            // token mint
  interval?: Interval;        // chart timeframe
  lookbackSec?: number;      // how far back to fetch
  pollMs?: number;           // polling interval
}) {
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const pollRef = useRef<number | null>(null);

  // Validate Solana address format
  const isValidSolanaAddress = (addr: string): boolean => {
    // Solana addresses are base58 encoded and typically 32-44 characters long
    return Boolean(addr && addr.length >= 32 && addr.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr));
  };

  useEffect(() => {
    console.log('🔍 useBirdeyeCandles - Effect triggered:', {
      container: Boolean(container),
      containerElement: container,
      address,
      addressLength: address?.length || 0,
      isValidAddress: Boolean(isValidSolanaAddress(address)),
      interval,
      lookbackSec,
      pollMs
    });

    if (!container || !address) {
      console.log('❌ useBirdeyeCandles: No container or address provided');
      return;
    }

    // Validate address before proceeding
    if (!isValidSolanaAddress(address)) {
      console.error('❌ Invalid Solana address provided to useBirdeyeCandles:', address);
      console.error('Address must be a valid Solana mint address (32-44 characters, base58 encoded)');
      return;
    }

    console.log('✅ useBirdeyeCandles: All validations passed, creating chart...');

    try {
      console.log('🔍 Creating chart with container:', container);
      console.log('🔍 Container dimensions:', {
        width: container.offsetWidth,
        height: container.offsetHeight,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight
      });
      
      const chartOptions = {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#AAB2C0' },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, rightOffset: 6, barSpacing: 8 },
        crosshair: { mode: 1 },
        width: container.offsetWidth || 800,
        height: container.offsetHeight || 400,
      };
      console.log('🔍 Chart options:', chartOptions);
      
      const chart = createChart(container, chartOptions);
      console.log('✅ Chart created successfully:', chart);
      
      const series = chart.addSeries(CandlestickSeries);
      console.log('✅ Candlestick series added:', series);
      
      chartRef.current = chart;

      // 2) Load initial history on demand
      (async () => {
        try {
          console.log('🔍 Fetching initial data from Birdeye...');
          const nowSec = Math.floor(Date.now() / 1000);
          const fromSec = nowSec - lookbackSec;
          console.log('🔍 Time range:', { from: new Date(fromSec * 1000), to: new Date(nowSec * 1000) });
          
          const data = await fetchOHLCV(address, interval, fromSec, nowSec);
          console.log('✅ Birdeye data received:', data);
          
          if (data && data.length > 0) {
            const bars = data.map(b => ({
              time: b.t as Time,
              open: b.o, high: b.h, low: b.l, close: b.c,
            }));
            bars.sort((a, b) => (a.time as number) - (b.time as number));
            console.log('🔍 Setting chart data:', bars);
            series.setData(bars);
            chart.timeScale().fitContent();
            console.log('✅ Chart data set successfully');
          } else {
            console.warn('⚠️ No data received from Birdeye');
          }
        } catch (error) {
          console.error('❌ Error fetching initial data:', error);
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : String(error),
            error: error
          });
        }
      })();

      // 3) Start lightweight polling ONLY while the chart is mounted
      const tick = async () => {
        try {
          const to = Math.floor(Date.now() / 1000);
          const from = to - Math.max(300, resolutionToWindow(interval)); // small window
          const latest = await fetchOHLCV(address, interval, from, to);
          if (!latest.length) return;
          const last = latest[latest.length - 1];
          series.update({
            time: last.t as Time,
            open: last.o, high: last.h, low: last.l, close: last.c,
          });
        } catch (e) { 
          console.error('❌ Polling error:', e);
        }
      };
      pollRef.current = window.setInterval(tick, pollMs);
      console.log('✅ Polling started');

      // 4) Cleanup on unmount or when address/interval changes
      return () => {
        console.log('🧹 Cleaning up chart...');
        if (pollRef.current) { 
          clearInterval(pollRef.current); 
          pollRef.current = null; 
        }
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (error) {
      console.error('❌ Error in chart creation:', error);
      console.error('❌ Chart creation error details:', {
        message: error instanceof Error ? error.message : String(error),
        error: error
      });
    }
  }, [container, address, interval, lookbackSec, pollMs]);
}

function resolutionToWindow(interval: Interval): number {
  switch (interval) {
    case '1m': return 1200;   // 20m
    case '5m': return 3600;   // 1h
    case '15m': return 3*3600;
    case '30m': return 6*3600;
    case '1h': return 12*3600;
    case '4h': return 24*3600;
    case '1d': return 7*24*3600;
    default: return 1800;
  }
}
