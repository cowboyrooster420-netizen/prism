/* scripts/ta_worker.ts
   Compute TA features from public.candles into public.ta_features, refresh ta_latest.
   Run: npx tsx scripts/ta_worker.ts
*/
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type Candle = {
  ts: string; open: number; high: number; low: number; close: number;
  volume: number; quote_volume_usd: number;
};

type Series = number[];

// ---------- math utils ----------
const sma = (arr: Series, n: number, i: number) => {
  const s = arr.slice(i - n + 1, i + 1);
  return s.reduce((a, b) => a + b, 0) / n;
};
const emaAll = (arr: Series, n: number) => {
  const k = 2 / (n + 1);
  const out: number[] = [];
  let prev = arr[0];
  out[0] = prev;
  for (let i = 1; i < arr.length; i++) {
    const val = arr[i] * k + prev * (1 - k);
    out.push(val);
    prev = val;
  }
  return out;
};
const stdev = (arr: Series, n: number, i: number) => {
  const s = arr.slice(i - n + 1, i + 1);
  const m = s.reduce((a, b) => a + b, 0) / n;
  const v = s.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  return Math.sqrt(v);
};
const zscore = (x: number, mean: number, sd: number) => (sd > 0 ? (x - mean) / sd : 0);

// linear slope of last k points
const slopeK = (arr: Series, k: number) => {
  if (arr.length < k) return 0;
  const y = arr.slice(-k);
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const xMean = (n + 1) / 2;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const num = y.reduce((acc, yi, i) => acc + (x[i] - xMean) * (yi - yMean), 0);
  const den = x.reduce((acc, xi) => acc + (xi - xMean) ** 2, 0);
  return den > 0 ? num / den : 0;
};

// ---------- indicators ----------
function bollingerWidth(closes: Series, n: number, k: number, i: number) {
  if (i < n - 1) return 0;
  const m = sma(closes, n, i);
  const sd = stdev(closes, n, i);
  const upper = m + k * sd, lower = m - k * sd;
  return m !== 0 ? (upper - lower) / m : 0;
}

function atr14(highs: Series, lows: Series, closes: Series) {
  const trs: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    const prevClose = i > 0 ? closes[i - 1] : closes[0];
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - prevClose),
      Math.abs(lows[i] - prevClose),
    );
    trs.push(tr);
  }
  // Wilder’s smoothing
  const out: number[] = [];
  let prev = trs.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  out[13] = prev;
  for (let i = 14; i < trs.length; i++) {
    prev = (prev * 13 + trs[i]) / 14;
    out[i] = prev;
  }
  for (let i = 0; i < 13 && i < out.length; i++) out[i] = out[13];
  return out;
}

function rsi14(closes: Series) {
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gains.push(Math.max(0, d));
    losses.push(Math.max(0, -d));
  }
  const avgGain: number[] = [];
  const avgLoss: number[] = [];
  let g = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  let l = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  avgGain[13] = g; avgLoss[13] = l;
  for (let i = 14; i < gains.length; i++) {
    g = (g * 13 + gains[i]) / 14;
    l = (l * 13 + losses[i]) / 14;
    avgGain[i] = g; avgLoss[i] = l;
  }
  const rsi: number[] = new Array(closes.length).fill(50);
  for (let i = 0; i < avgGain.length; i++) {
    const rs = (avgLoss[i] ?? 0) === 0 ? 100 : (avgGain[i] ?? 0) / (avgLoss[i] ?? 1e-9);
    const val = 100 - 100 / (1 + rs);
    rsi[i + 1] = val; // shift by one because gains/losses start at index 1
  }
  return rsi;
}

function macd(closes: Series, fast = 12, slow = 26, signal = 9) {
  const emaFast = emaAll(closes, fast);
  const emaSlow = emaAll(closes, slow);
  const macdLine = emaFast.map((v, i) => v - (emaSlow[i] ?? 0));
  const signalLine = emaAll(macdLine, signal);
  const hist = macdLine.map((v, i) => v - (signalLine[i] ?? 0));
  return { macdLine, signalLine, hist };
}

const maxN = (arr: Series, n: number, i: number) => Math.max(...arr.slice(i - n + 1, i + 1));
const minN = (arr: Series, n: number, i: number) => Math.min(...arr.slice(i - n + 1, i + 1));

function findSwingLows(closes: Series, window = 2) {
  const lows: number[] = [];
  for (let i = window; i < closes.length - window; i++) {
    const val = closes[i];
    const left = closes.slice(i - window, i);
    const right = closes.slice(i + 1, i + 1 + window);
    if (val <= Math.min(...left) && val <= Math.min(...right)) lows.push(i);
  }
  return lows;
}

// ---------- worker ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TOKEN_IDS: string[] = process.env.TA_TOKEN_IDS?.split(',') ?? [];
const TIMEFRAMES = (process.env.TA_TIMEFRAMES ?? '5m,15m,1h').split(',');

async function fetchCandlesFromDB(token_id: string, timeframe: string, limit = 300): Promise<Candle[]> {
  const { data, error } = await supabase
    .from('candles')
    .select('ts,open,high,low,close,volume,quote_volume_usd')
    .eq('token_id', token_id)
    .eq('timeframe', timeframe)
    .order('ts', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ts: r.ts,
    open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close),
    volume: Number(r.volume), quote_volume_usd: Number(r.quote_volume_usd),
  }));
}

async function upsertTA(rows: any[]) {
  if (rows.length === 0) return;
  const batch = 500;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const { error } = await supabase
      .from('ta_features')
      .upsert(chunk, { onConflict: 'token_id,timeframe,ts' });
    if (error) throw error;
  }
}

function computeFeatures(candles: Candle[], token_id: string, timeframe: string) {
  if (candles.length < 60) return [];

  const ts = candles.map(c => c.ts);
  const close = candles.map(c => c.close);
  const high  = candles.map(c => c.high);
  const low   = candles.map(c => c.low);
  const vol   = candles.map(c => c.volume);

  const ema7Arr  = emaAll(close, 7);
  const ema20Arr = emaAll(close, 20);
  const ema50Arr = emaAll(close, 50);
  const ema200Arr= emaAll(close, 200);

  const sma7Arr  = close.map((_,i)=> i>=6 ? sma(close,7,i)  : close[i]);
  const sma20Arr = close.map((_,i)=> i>=19? sma(close,20,i) : close[i]);
  const sma50Arr = close.map((_,i)=> i>=49? sma(close,50,i) : close[i]);
  const sma200Arr= close.map((_,i)=> i>=199? sma(close,200,i): close[i]);

  const rsiArr   = rsi14(close);
  const atrArr   = atr14(high, low, close);
  const { macdLine, signalLine, hist } = macd(close);

  const out: any[] = [];

  for (let i = 59; i < close.length; i++) {
    // bb width + percentile vs last 60 (guard early bars)
    const bbW = bollingerWidth(close, 20, 2, i);
    const start = Math.max(19, i - 59);
    const bbSlice: number[] = [];
    for (let k = start; k <= i; k++) bbSlice.push(bollingerWidth(close, 20, 2, k));
    const sorted = [...bbSlice].sort((a, b) => a - b);
    const rankIdx = sorted.findIndex(v => v >= bbW);
    const pctl = rankIdx < 0 ? 100 : Math.round((rankIdx / sorted.length) * 100);

    // volume stats
    const volMA20 = i >= 19 ? sma(vol, 20, i) : vol[i];
    const volMean60 = vol.slice(i - 59, i + 1).reduce((a, b) => a + b, 0) / 60;
    const volSd60 = stdev(vol, 60, i);
    const volZ = zscore(vol[i], volMean60, volSd60);
    const vzSlice = vol.slice(Math.max(0, i - 5), i + 1);
    const vzSlope = slopeK(vzSlice, Math.min(6, i + 1));

    // donchian & breakouts
    const dHigh20 = maxN(high, 20, i);
    const dLow20  = minN(low, 20, i);
    const closeNow = close[i];
    const breakoutHigh = closeNow > dHigh20;
    const breakoutLow  = closeNow < dLow20;
    const nearBreakHigh = closeNow >= 0.99 * dHigh20;

    // cross events
    const cross7_20 = i > 0 && ema7Arr[i] >= ema20Arr[i] && ema7Arr[i - 1] < ema20Arr[i - 1];
    const cross50_200 = i > 0 && ema50Arr[i] >= ema200Arr[i] && ema50Arr[i - 1] < ema200Arr[i - 1];

    out.push({
      token_id, timeframe, ts: ts[i],
      sma7: sma7Arr[i], sma20: sma20Arr[i], sma50: sma50Arr[i], sma200: sma200Arr[i],
      ema7: ema7Arr[i], ema20: ema20Arr[i], ema50: ema50Arr[i], ema200: ema200Arr[i],
      rsi14: rsiArr[i] ?? 50,
      macd: macdLine[i], macd_signal: signalLine[i], macd_hist: hist[i],
      atr14: atrArr[i],
      donchian_high_20: dHigh20, donchian_low_20: dLow20,
      bb_width: bbW, bb_width_pctl60: pctl,
      vol_ma20: volMA20, vol_z60: volZ, vol_z60_slope: vzSlope,
      cross_ema7_over_ema20: cross7_20,
      cross_ema50_over_ema200: cross50_200,
      breakout_high_20: breakoutHigh,
      breakout_low_20: breakoutLow,
      near_breakout_high_20: nearBreakHigh,
      bullish_rsi_div: (() => {
        let bullDiv = false;
        const sw = findSwingLows(close.slice(0, i + 1), 2);
        if (sw.length >= 2) {
          const L2 = sw[sw.length - 1], L1 = sw[sw.length - 2];
          const priceLL = close[L2] < close[L1];
          const rsiHigher = (rsiArr[L2] ?? 0) > (rsiArr[L1] ?? 0);
          bullDiv = (priceLL && rsiHigher) || (!priceLL && (rsiArr[L2] ?? 0) >= (rsiArr[L1] ?? 0));
        }
        return bullDiv;
      })(),
    });
  }

  return out;
}

async function runOnce() {
  if (TOKEN_IDS.length === 0) {
    console.error('No TOKEN_IDS provided. Set TA_TOKEN_IDS env var.');
    return;
  }

  for (const timeframe of TIMEFRAMES) {
    for (const token of TOKEN_IDS) {
      try {
        const candles = await fetchCandlesFromDB(token, timeframe, 300);
        const rows = computeFeatures(candles, token, timeframe);
        await upsertTA(rows);
        console.log(`[ta] upserted ${rows.length} rows for ${token} ${timeframe}`);
      } catch (e) {
        console.error(`[ta] error ${token} ${timeframe}`, e);
      }
    }
  }

  await supabase.rpc('refresh_ta_latest');
  console.log('[ta] refreshed ta_latest');
}

runOnce().then(() => process.exit(0));
