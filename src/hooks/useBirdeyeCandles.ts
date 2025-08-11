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
  lookbackSec = 60 * 60 * 24,
  pollMs = 3000,
}: Opts) {
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('useBirdeyeCandles effect triggered:', { container, address, interval });
    
    if (!container || !address) {
      console.log('Early return - no container or address:', { container: !!container, address: !!address });
      return;
    }

    console.log('Starting chart creation...');

    try {
      // 1) Create chart
      console.log('Creating chart with container:', container);
      const chart = createChart(container, {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#AAB2C0' },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, rightOffset: 6, barSpacing: 8 },
        crosshair: { mode: 1 },
      });
      console.log('Chart created successfully:', chart);
      
      const series = chart.addSeries(CandlestickSeries);
      console.log('Candlestick series added:', series);
      
      chartRef.current = chart;

      // 2) Load initial history on demand
      (async () => {
        try {
          console.log('Fetching initial data from Birdeye...');
          const nowSec = Math.floor(Date.now() / 1000);
          const data = await fetchOHLCV(address, interval, nowSec - lookbackSec, nowSec);
          console.log('Birdeye data received:', data);
          
          if (data && data.length > 0) {
            const bars = data.map(b => ({
              time: b.t as Time,
              open: b.o, high: b.h, low: b.l, close: b.c,
            }));
            bars.sort((a, b) => (a.time as number) - (b.time as number));
            console.log('Setting chart data:', bars);
            series.setData(bars);
            chart.timeScale().fitContent();
            console.log('Chart data set successfully');
          } else {
            console.warn('No data received from Birdeye');
          }
        } catch (error) {
          console.error('Error fetching initial data:', error);
          console.error('Error details:', {
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
          console.error('Polling error:', e);
        }
      };
      pollRef.current = window.setInterval(tick, pollMs);
      console.log('Polling started');

      // 4) Cleanup on unmount or when address/interval changes
      return () => {
        console.log('Cleaning up chart...');
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        chart.remove();
        chartRef.current = null;
      };
    } catch (error) {
      console.error('Error in chart creation:', error);
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
