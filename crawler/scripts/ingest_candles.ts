/* scripts/ingest_candles.ts
   Fetch OHLCV from BirdEye and upsert into public.candles for multiple timeframes.
   Run: npx tsx scripts/ingest_candles.ts
*/
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ---- Types / Config ----
export type Timeframe = '1m'|'5m'|'15m'|'1h'|'4h'|'1d';
const DEFAULT_TFS: Timeframe[] = ['1m','5m','15m','1h'];
const TIMEFRAMES: Timeframe[] = (process.env.CANDLE_TIMEFRAMES as any)?.split(',')?.filter(Boolean) ?? DEFAULT_TFS;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY!;
const BIRDEYE_BASE_URL = process.env.BIRDEYE_BASE_URL ?? 'https://public-api.birdeye.so';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env vars');
if (!BIRDEYE_API_KEY) throw new Error('Missing BIRDEYE_API_KEY');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- Universe selection from your `tokens` table ----
type UniverseOpts = {
  limit?: number;
  minHolders?: number;
  minTx24h?: number;
  minUsd24h?: number;
  columnMint?: 'mint'|'address'|'token_address';
  columnUsd24h?: 'quote_volume_usd_24h'|'volume_24h_usd'|'usd_volume_24h';
  columnHolders?: 'holder_count'|string;
  columnTx24h?: 'tx_count_last_24h'|string;
};

async function getUniverse(opts: UniverseOpts = {}) {
  const {
    limit = Number(process.env.TA_UNIVERSE_LIMIT ?? 800),
    minHolders = Number(process.env.TA_MIN_HOLDERS ?? 50),
    minTx24h = Number(process.env.TA_MIN_TX24H ?? 20),
    minUsd24h = Number(process.env.TA_MIN_USD24H ?? 5000),
    columnMint = (process.env.TOKENS_MINT_COL as any) || 'mint',
    columnUsd24h = (process.env.TOKENS_USD24H_COL as any) || 'quote_volume_usd_24h',
    columnHolders = (process.env.TOKENS_HOLDER_COL as any) || 'holder_count',
    columnTx24h = (process.env.TOKENS_TX24H_COL as any) || 'tx_count_last_24h',
  } = opts;

  try {
    const sel = `${columnMint}, ${columnHolders}, ${columnTx24h}, ${columnUsd24h}`;
    let q = sb.from('tokens').select(sel)
      .gte(columnHolders, minHolders)
      .gte(columnTx24h, minTx24h)
      .gte(columnUsd24h, minUsd24h)
      .order(columnUsd24h, { ascending: false })
      .limit(limit);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r: any) => r[columnMint]).filter(Boolean) as string[];
  } catch (e: any) {
    // If schema differs, gracefully fallback to any non-null mint addresses
    const { data, error } = await sb.from('tokens').select(columnMint).not(columnMint, 'is', null).limit(1000);
    if (error) throw error;
    return (data ?? []).map((r: any) => r[columnMint]).filter(Boolean) as string[];
  }
}

// ---- Helpers ----
const minutesForTF: Record<Timeframe, number> = { '1m':1, '5m':5, '15m':15, '1h':60, '4h':240, '1d':1440 };
const defaultBackfillDays: Record<Timeframe, number> = { '1m':2, '5m':7, '15m':14, '1h':30, '4h':120, '1d':365 };
const overlapBars = 3; // re-pull last N bars to fix gaps/revisions

function nowSec() { return Math.floor(Date.now() / 1000); }
function toSec(d: Date) { return Math.floor(d.getTime() / 1000); }
function fromSec(s: number) { return new Date(s * 1000); }

// Snap a date to timeframe bucket start (UTC)
function bucketTs(date: Date, tf: Timeframe) {
  const ms = date.getTime();
  const bucketMs = minutesForTF[tf] * 60 * 1000;
  const floored = Math.floor(ms / bucketMs) * bucketMs;
  return new Date(floored);
}

async function getLastTs(token_id: string, timeframe: Timeframe): Promise<Date | null> {
  const { data, error } = await sb.from('candles')
    .select('ts').eq('token_id', token_id).eq('timeframe', timeframe)
    .order('ts', { ascending: false }).limit(1);
  if (error) throw error;
  return data && data.length ? new Date(data[0].ts) : null;
}

// ---- BirdEye fetch (V3 primary, V2 fallback) ----
type BirdEyeCandle = {
  unixTime: number; // seconds
  o?: number; h?: number; l?: number; c?: number; v?: number;
  open?: number; high?: number; low?: number; close?: number; volume?: number;
  quoteVolumeUsd?: number; usdVolume?: number; value?: number;
};

class RateLimitError extends Error {}

async function fetchBirdEyeCandles(
  mint: string,
  timeframe: Timeframe,
  fromSecIncl: number,
  toSecExcl: number
): Promise<BirdEyeCandle[]> {
  const params = new URLSearchParams({
    address: mint,
    type: timeframe,               // '1m'|'5m'|'15m'|'1h'|'4h'|'1d' (BirdEye commonly supports up to 1h)
    time_from: String(fromSecIncl),
    time_to: String(toSecExcl),
  });

  const endpoints = [
    `${BIRDEYE_BASE_URL}/defi/ohlcv3?${params.toString()}`,
    `${BIRDEYE_BASE_URL}/defi/ohlcv?${params.toString()}` // fallback to v2
  ];

  for (const url of endpoints) {
    const res = await fetch(url, {
      headers: { 'X-API-KEY': BIRDEYE_API_KEY, 'accept': 'application/json', 'x-chain': 'solana' }
    });
    if (res.status === 429) throw new RateLimitError('BirdEye rate limit');
    if (!res.ok) continue;
    const json = await res.json();
    const items: any[] = json?.data?.items ?? json?.data?.candles ?? json?.data ?? json?.items ?? [];
    if (Array.isArray(items)) return items as BirdEyeCandle[];
  }
  return [];
}

// Map BirdEye candle → our schema row
function adaptCandle(token_id: string, timeframe: Timeframe, b: BirdEyeCandle) {
  const ts = fromSec(b.unixTime ?? (b as any).t ?? (b as any).time ?? 0);
  const bucket = bucketTs(ts, timeframe);
  const open  = b.o ?? (b as any).open ?? 0;
  const high  = b.h ?? (b as any).high ?? 0;
  const low   = b.l ?? (b as any).low  ?? 0;
  const close = b.c ?? (b as any).close ?? 0;
  const volume = b.v ?? (b as any).volume ?? 0;

  // USD volume key names vary; otherwise approximate using close * volume
  let quote_volume_usd =
    (b as any).quoteVolumeUsd ??
    (b as any).usdVolume ??
    (b as any).value ??
    (Number.isFinite(close) && Number.isFinite(volume) ? close * volume : 0);

  if (!Number.isFinite(quote_volume_usd) || quote_volume_usd < 0) quote_volume_usd = 0;

  return {
    token_id, timeframe, ts: bucket.toISOString(),
    open, high, low, close,
    volume, quote_volume_usd
  };
}

async function upsertCandlesBatch(rows: any[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await sb.from('candles').upsert(chunk, { onConflict: 'token_id,timeframe,ts' });
    if (error) throw error;
    // small pacing between batches
    await sleep(80);
  }
}

// Basic limiter / retry
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e: any) {
      lastErr = e;
      const jitter = Math.floor(Math.random() * 500);
      if (e instanceof RateLimitError) await sleep(1500 + i * 1200 + jitter);
      else await sleep(500 + i * 500 + jitter);
    }
  }
  throw lastErr;
}

// Determine fetch window (incremental with overlap; else backfill)
function computeWindow(last: Date | null, tf: Timeframe) {
  const to = nowSec();
  if (last) {
    const overlapSec = overlapBars * minutesForTF[tf] * 60;
    const from = Math.max(0, Math.floor(last.getTime()/1000) - overlapSec);
    return { from, to };
  } else {
    const days = defaultBackfillDays[tf] ?? 7;
    const from = to - days * 24 * 3600;
    return { from, to };
  }
}

// Chunk time: avoid asking for huge ranges in one call
function chunkRanges(from: number, to: number, tf: Timeframe) {
  const stepSec = 1000 * minutesForTF[tf] * 60; // ~1000 bars per request
  const out: Array<{from:number;to:number}> = [];
  let a = from;
  while (a < to) {
    const b = Math.min(to, a + stepSec);
    out.push({ from: a, to: b });
    a = b;
  }
  return out;
}

// ---- Main ----
async function run() {
  const universe = await getUniverse();
  if (!universe.length) {
    console.error('No tokens in universe. Relax thresholds or verify column names.');
    return;
  }

  const batchSize = 8;  // tune for your BirdEye tier
  for (let i = 0; i < universe.length; i += batchSize) {
    const batch = universe.slice(i, i + batchSize);

    for (const tf of TIMEFRAMES) {
      await Promise.all(batch.map(async (mint) => {
        try {
          const last = await getLastTs(mint, tf as Timeframe);
          const { from, to } = computeWindow(last, tf as Timeframe);

          if (to - from <= minutesForTF[tf as Timeframe] * 60) return;

          const ranges = chunkRanges(from, to, tf as Timeframe);
          let total = 0;

          for (const r of ranges) {
            const items = await withRetry(() => fetchBirdEyeCandles(mint, tf as Timeframe, r.from, r.to));
            if (!items.length) continue;
            const rows = items
              .map(b => adaptCandle(mint, tf as Timeframe, b))
              .filter(row =>
                row.ts && Number.isFinite(row.open) && Number.isFinite(row.close) &&
                Number.isFinite(row.high) && Number.isFinite(row.low) &&
                Number.isFinite(row.volume)
              );
            if (rows.length) {
              await upsertCandlesBatch(rows);
              total += rows.length;
              await sleep(120);
            }
          }

          if (total) {
            console.log(`[candles] ${mint} ${tf} upserted ${total} bars`);
          }
        } catch (e: any) {
          console.error(`[candles] error ${mint} ${tf}:`, e?.message || e);
        }
      }));
      await sleep(300);
    }

    await sleep(800);
  }

  console.log('[candles] done.');
}

run().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});

