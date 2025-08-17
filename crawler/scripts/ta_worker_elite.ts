/* scripts/ta_worker_elite.ts
   Elite TA Worker - Phase 1 Features
   Includes: Multi-timeframe analysis, VWAP, Support/Resistance, Smart money flow
   Run: npx tsx scripts/ta_worker_elite.ts
*/
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type Candle = {
  ts: string; open: number; high: number; low: number; close: number;
  volume: number; quote_volume_usd: number;
};

type Series = number[];

// ---------- Enhanced Math Utils ----------
const sma = (arr: Series, n: number, i: number) => {
  if (i < n - 1) return arr[i];
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
  if (i < n - 1) return 0;
  const s = arr.slice(i - n + 1, i + 1);
  const m = s.reduce((a, b) => a + b, 0) / n;
  const v = s.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  return Math.sqrt(v);
};

const zscore = (x: number, mean: number, sd: number) => (sd > 0 ? (x - mean) / sd : 0);

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

const maxN = (arr: Series, n: number, i: number) => {
  if (i < n - 1) return arr[i];
  return Math.max(...arr.slice(i - n + 1, i + 1));
};

const minN = (arr: Series, n: number, i: number) => {
  if (i < n - 1) return arr[i];
  return Math.min(...arr.slice(i - n + 1, i + 1));
};

// ---------- ELITE PHASE 1 FEATURES ----------

// 1. VWAP (Volume Weighted Average Price)
function vwap(closes: Series, volumes: Series, highs: Series, lows: Series) {
  const typicalPrices = closes.map((close, i) => (close + highs[i] + lows[i]) / 3);
  const vwapValues: number[] = [];
  
  let cumulativeTPV = 0; // Typical Price * Volume
  let cumulativeVolume = 0;
  
  for (let i = 0; i < typicalPrices.length; i++) {
    cumulativeTPV += typicalPrices[i] * volumes[i];
    cumulativeVolume += volumes[i];
    
    vwapValues[i] = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrices[i];
  }
  
  return vwapValues;
}

// 2. Dynamic Support/Resistance Levels
function findSupportResistance(highs: Series, lows: Series, lookback = 20) {
  const supports: number[] = [];
  const resistances: number[] = [];
  
  for (let i = 0; i < highs.length; i++) {
    if (i < lookback) {
      supports[i] = lows[i];
      resistances[i] = highs[i];
      continue;
    }
    
    // Find significant levels in lookback period
    const recentHighs = highs.slice(i - lookback, i + 1);
    const recentLows = lows.slice(i - lookback, i + 1);
    
    // Support: significant low that held multiple times
    const support = Math.min(...recentLows);
    const resistance = Math.max(...recentHighs);
    
    supports[i] = support;
    resistances[i] = resistance;
  }
  
  return { supports, resistances };
}

// 3. Smart Money Flow Index
function smartMoneyFlow(closes: Series, volumes: Series, highs: Series, lows: Series) {
  const mfi: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      mfi[i] = 50;
      continue;
    }
    
    const typicalPrice = (closes[i] + highs[i] + lows[i]) / 3;
    const prevTypicalPrice = (closes[i-1] + highs[i-1] + lows[i-1]) / 3;
    const moneyFlow = typicalPrice * volumes[i];
    
    // Positive or negative money flow
    const isPositive = typicalPrice > prevTypicalPrice;
    
    if (i < 14) {
      mfi[i] = 50;
      continue;
    }
    
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let j = i - 13; j <= i; j++) {
      const tp = (closes[j] + highs[j] + lows[j]) / 3;
      const prevTp = j > 0 ? (closes[j-1] + highs[j-1] + lows[j-1]) / 3 : tp;
      const mf = tp * volumes[j];
      
      if (tp > prevTp) {
        positiveFlow += mf;
      } else {
        negativeFlow += mf;
      }
    }
    
    const moneyRatio = negativeFlow > 0 ? positiveFlow / negativeFlow : 100;
    mfi[i] = 100 - (100 / (1 + moneyRatio));
  }
  
  return mfi;
}

// 4. Multi-Timeframe Trend Alignment
function calculateTrendAlignment(ema7: Series, ema20: Series, ema50: Series, ema200: Series, i: number) {
  if (i < 200) return 0;
  
  const current = {
    ema7: ema7[i],
    ema20: ema20[i], 
    ema50: ema50[i],
    ema200: ema200[i]
  };
  
  let bullishAlignment = 0;
  
  // Perfect bullish alignment: EMA7 > EMA20 > EMA50 > EMA200
  if (current.ema7 > current.ema20) bullishAlignment += 1;
  if (current.ema20 > current.ema50) bullishAlignment += 1;
  if (current.ema50 > current.ema200) bullishAlignment += 1;
  
  // Additional points for strong trends
  if (current.ema7 > current.ema200) bullishAlignment += 1; // Long-term bullish
  
  return bullishAlignment / 4; // Normalize to 0-1
}

// 5. Volume Profile Analysis
function volumeProfile(closes: Series, volumes: Series, lookback = 50) {
  const profiles: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < lookback) {
      profiles[i] = 0;
      continue;
    }
    
    const recentCloses = closes.slice(i - lookback, i + 1);
    const recentVolumes = volumes.slice(i - lookback, i + 1);
    const currentPrice = closes[i];
    
    // Find where most volume traded relative to current price
    let volumeAtPrice = 0;
    let totalVolume = 0;
    
    for (let j = 0; j < recentCloses.length; j++) {
      totalVolume += recentVolumes[j];
      if (Math.abs(recentCloses[j] - currentPrice) / currentPrice < 0.02) { // Within 2%
        volumeAtPrice += recentVolumes[j];
      }
    }
    
    profiles[i] = totalVolume > 0 ? volumeAtPrice / totalVolume : 0;
  }
  
  return profiles;
}

// ---------- Original Indicators (Enhanced) ----------
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
  
  const out: number[] = [];
  if (trs.length < 14) return trs.map(() => 0);
  
  let prev = trs.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  out[13] = prev;
  
  for (let i = 14; i < trs.length; i++) {
    prev = (prev * 13 + trs[i]) / 14;
    out[i] = prev;
  }
  
  for (let i = 0; i < 13; i++) out[i] = out[13] || 0;
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
  
  if (gains.length < 14) return closes.map(() => 50);
  
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
    rsi[i + 1] = val;
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

// ---------- Database & Main Logic ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TOKEN_IDS: string[] = process.env.TA_TOKEN_IDS?.split(',') ?? [];
const TIMEFRAMES = (process.env.TA_TIMEFRAMES ?? '1h').split(',');

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

function computeEliteFeatures(candles: Candle[], token_id: string, timeframe: string) {
  if (candles.length < 60) return [];

  const ts = candles.map(c => c.ts);
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const vol = candles.map(c => c.volume);

  // Original indicators
  const ema7Arr = emaAll(close, 7);
  const ema20Arr = emaAll(close, 20);
  const ema50Arr = emaAll(close, 50);
  const ema200Arr = emaAll(close, 200);

  const sma7Arr = close.map((_, i) => sma(close, 7, i));
  const sma20Arr = close.map((_, i) => sma(close, 20, i));
  const sma50Arr = close.map((_, i) => sma(close, 50, i));
  const sma200Arr = close.map((_, i) => sma(close, 200, i));

  const rsiArr = rsi14(close);
  const atrArr = atr14(high, low, close);
  const { macdLine, signalLine, hist } = macd(close);

  // ELITE PHASE 1 FEATURES
  const vwapArr = vwap(close, vol, high, low);
  const { supports, resistances } = findSupportResistance(high, low, 20);
  const smartMoneyArr = smartMoneyFlow(close, vol, high, low);
  const volumeProfileArr = volumeProfile(close, vol, 50);

  const out: any[] = [];

  for (let i = 59; i < close.length; i++) {
    // Original features
    const bbW = bollingerWidth(close, 20, 2, i);
    const start = Math.max(19, i - 59);
    const bbSlice: number[] = [];
    for (let k = start; k <= i; k++) bbSlice.push(bollingerWidth(close, 20, 2, k));
    const sorted = [...bbSlice].sort((a, b) => a - b);
    const rankIdx = sorted.findIndex(v => v >= bbW);
    const pctl = rankIdx < 0 ? 100 : Math.round((rankIdx / sorted.length) * 100);

    const volMA20 = sma(vol, 20, i);
    const volMean60 = vol.slice(i - 59, i + 1).reduce((a, b) => a + b, 0) / 60;
    const volSd60 = stdev(vol, 60, i);
    const volZ = zscore(vol[i], volMean60, volSd60);
    const vzSlice = vol.slice(Math.max(0, i - 5), i + 1);
    const vzSlope = slopeK(vzSlice, Math.min(6, i + 1));

    const dHigh20 = maxN(high, 20, i);
    const dLow20 = minN(low, 20, i);
    const closeNow = close[i];
    const breakoutHigh = closeNow > dHigh20;
    const breakoutLow = closeNow < dLow20;
    const nearBreakHigh = closeNow >= 0.99 * dHigh20;

    const cross7_20 = i > 0 && ema7Arr[i] >= ema20Arr[i] && ema7Arr[i - 1] < ema20Arr[i - 1];
    const cross50_200 = i > 0 && ema50Arr[i] >= ema200Arr[i] && ema50Arr[i - 1] < ema200Arr[i - 1];

    // ELITE FEATURES
    const trendAlignment = calculateTrendAlignment(ema7Arr, ema20Arr, ema50Arr, ema200Arr, i);
    const vwapDistance = closeNow !== 0 ? (closeNow - vwapArr[i]) / closeNow : 0;
    const supportDistance = closeNow !== 0 ? (closeNow - supports[i]) / closeNow : 0;
    const resistanceDistance = closeNow !== 0 ? (resistances[i] - closeNow) / closeNow : 0;
    
    // VWAP bands (standard deviation bands around VWAP)
    const vwapStdSlice = close.slice(Math.max(0, i - 19), i + 1);
    const vwapStd = vwapStdSlice.length > 1 ? stdev(vwapStdSlice, vwapStdSlice.length, vwapStdSlice.length - 1) : 0;
    const vwapUpperBand = vwapArr[i] + vwapStd;
    const vwapLowerBand = vwapArr[i] - vwapStd;
    const vwapBandPosition = vwapStd > 0 ? (closeNow - vwapLowerBand) / (vwapUpperBand - vwapLowerBand) : 0.5;

    out.push({
      token_id, timeframe, ts: ts[i],
      
      // Original features
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
      
      // ELITE PHASE 1 FEATURES
      vwap: vwapArr[i],
      vwap_distance: vwapDistance,
      vwap_upper_band: vwapUpperBand,
      vwap_lower_band: vwapLowerBand,
      vwap_band_position: vwapBandPosition,
      support_level: supports[i],
      resistance_level: resistances[i],
      support_distance: supportDistance,
      resistance_distance: resistanceDistance,
      smart_money_index: smartMoneyArr[i],
      trend_alignment_score: trendAlignment,
      volume_profile_score: volumeProfileArr[i],
      
      // Enhanced signals
      vwap_breakout_bullish: closeNow > vwapUpperBand,
      vwap_breakout_bearish: closeNow < vwapLowerBand,
      near_support: supportDistance < 0.02 && supportDistance > -0.02, // Within 2%
      near_resistance: resistanceDistance < 0.02 && resistanceDistance > -0.02,
      smart_money_bullish: smartMoneyArr[i] > 50,
      trend_alignment_strong: trendAlignment > 0.75,
      
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

async function getAllTokenIds() {
  const { data, error } = await supabase
    .from('tokens')
    .select('mint_address')
    .limit(1000);
  
  if (error) {
    console.error('Error fetching tokens:', error);
    return [];
  }
  
  return data?.map(t => t.mint_address) || [];
}

async function runOnce() {
  let tokensToProcess = TOKEN_IDS;
  
  if (TOKEN_IDS.length === 0) {
    console.log('🔍 No specific TOKEN_IDS provided. Fetching all tokens from database...');
    tokensToProcess = await getAllTokenIds();
  }
  
  if (tokensToProcess.length === 0) {
    console.error('No tokens found to process.');
    return;
  }

  console.log('🚀 Starting ELITE TA Worker - Phase 1 Features');
  console.log('📊 New Features: VWAP, Support/Resistance, Smart Money Flow, Trend Alignment');
  console.log(`🎯 Processing ${tokensToProcess.length} tokens`);

  for (const timeframe of TIMEFRAMES) {
    for (const token of tokensToProcess) {
      try {
        const candles = await fetchCandlesFromDB(token, timeframe, 300);
        const rows = computeEliteFeatures(candles, token, timeframe);
        await upsertTA(rows);
        console.log(`[elite-ta] upserted ${rows.length} rows for ${token} ${timeframe}`);
      } catch (e) {
        console.error(`[elite-ta] error ${token} ${timeframe}`, e);
      }
    }
  }

  await supabase.rpc('refresh_ta_latest');
  console.log('[elite-ta] refreshed ta_latest');
  console.log('✅ Elite TA computation complete!');
}

runOnce().then(() => process.exit(0));