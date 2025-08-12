const BASE = 'https://public-api.birdeye.so';
const API_KEY = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || 'YOUR_BIRDEYE_API_KEY';

export type Interval = '1m'|'5m'|'15m'|'30m'|'1h'|'4h'|'1d';

// Map our intervals to v3 API format
const mapIntervalToV3 = (interval: Interval): string => {
  const intervalMap: Record<Interval, string> = {
    '1m': '1m',
    '5m': '5m', 
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',  // v3 uses capital H
    '4h': '4H',  // v3 uses capital H
    '1d': '1D'   // v3 uses capital D
  };
  return intervalMap[interval] || interval;
};

export type BirdeyeBar = {
  t: number; o: number; h: number; l: number; c: number; v?: number;
};

// v3 API response format
export type BirdeyeV3Bar = {
  unix_time: number; o: number; h: number; l: number; c: number; v?: number; v_usd?: number;
  address: string; type: string; currency: string;
};

export async function fetchOHLCV(address: string, interval: Interval, fromSec: number, toSec: number) {
  // Validate inputs before making API call
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid address parameter');
  }
  if (fromSec >= toSec) {
    throw new Error('time_from must be less than time_to');
  }
  if (toSec - fromSec > 30 * 24 * 3600) {
    console.warn('⚠️ Large time range requested. Consider smaller ranges for better performance.');
  }

  // Use the v3 endpoint for token OHLCV data
  const url = new URL(`${BASE}/defi/v3/ohlcv`);
  url.searchParams.set('address', address);
  const v3Interval = mapIntervalToV3(interval);
  url.searchParams.set('type', v3Interval);
  url.searchParams.set('currency', 'usd');          // Required by v3 API
  url.searchParams.set('ui_amount_mode', 'raw');    // Required by v3 API
  url.searchParams.set('time_from', String(fromSec));
  url.searchParams.set('time_to', String(toSec));

  // Debug logging (API key removed for security)
  console.log('🔍 Birdeye API Request Details:');
  console.log('  URL:', url.toString().replace(/X-API-KEY=[^&]*/, 'X-API-KEY=***'));
  console.log('  Address:', address);
  console.log('  Interval mapping:', interval, '->', v3Interval);
  console.log('  Time From:', fromSec, '(', new Date(fromSec * 1000), ')');
  console.log('  Time To:', toSec, '(', new Date(toSec * 1000), ')');

  const res = await fetch(url.toString(), {
    headers: { 
      'X-API-KEY': API_KEY, 
      'accept': 'application/json',
      'x-chain': 'solana'  // Required for v3 API
    },
    cache: 'no-store',
  });
  
  console.log('🔍 Birdeye API Response:');
  console.log('  Status:', res.status);
  console.log('  Status Text:', res.statusText);
  console.log('  Headers:', Object.fromEntries(res.headers.entries()));
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Birdeye API Error Response:', errorText);
    throw new Error(`Birdeye OHLCV ${res.status}: ${errorText}`);
  }
  
  const json = await res.json();
  console.log('✅ Birdeye API Success Response:', json);
  
  // v3 endpoint has different response structure
  const v3Items = json?.data?.items ?? [];
  console.log('🔍 Raw v3 items:', v3Items);
  
  // Convert v3 format to our expected format
  const items: BirdeyeBar[] = v3Items.map((item: BirdeyeV3Bar) => ({
    t: item.unix_time,  // v3 uses unix_time instead of t
    o: item.o,
    h: item.h, 
    l: item.l,
    c: item.c,
    v: item.v
  }));
  
  console.log('🔍 Converted OHLCV items:', items);
  return items;
}

