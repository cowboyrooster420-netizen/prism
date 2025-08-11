const BASE = 'https://public-api.birdeye.so';
const API_KEY = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || 'YOUR_BIRDEYE_API_KEY';

export type Interval = '1m'|'5m'|'15m'|'30m'|'1h'|'4h'|'1d';

export type BirdeyeBar = {
  t: number; o: number; h: number; l: number; c: number; v?: number;
};

export async function fetchOHLCV(address: string, interval: Interval, fromSec: number, toSec: number) {
  const url = new URL(`${BASE}/defi/ohlcv`);
  url.searchParams.set('address', address);
  url.searchParams.set('type', 'token');
  url.searchParams.set('interval', interval);
  url.searchParams.set('time_from', String(fromSec));
  url.searchParams.set('time_to', String(toSec));

  const res = await fetch(url.toString(), {
    headers: { 'X-API-KEY': API_KEY, 'accept': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Birdeye OHLCV ${res.status}`);
  const json = await res.json();
  const items = json?.data?.items ?? json?.data ?? json?.items ?? [];
  return (items as BirdeyeBar[]);
}
