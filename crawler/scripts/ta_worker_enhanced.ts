/* scripts/ta_worker_enhanced.ts
   Enhanced TA Worker with Historical OHLCV Data Integration
   - Uses the new token_ohlcv_history table instead of candles
   - Automatically collects missing OHLCV data before analysis
   - Improved data quality and error handling
   - Real historical context for technical analysis

   Run: npx tsx scripts/ta_worker_enhanced.ts
*/
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ohlcvCollector } from '../lib/ohlcvCollector';

type OHLCVCandle = {
  timestamp_unix: number;
  timestamp_utc: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  volume_usd?: number;
};

type Series = number[];

// ---------- ENHANCED MATH UTILS ----------
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

// ---------- ENHANCED INDICATORS ----------
function bollingerBands(closes: Series, n: number, k: number, i: number) {
  if (i < n - 1) return { upper: closes[i], middle: closes[i], lower: closes[i], width: 0 };
  
  const m = sma(closes, n, i);
  const sd = stdev(closes, n, i);
  const upper = m + k * sd;
  const lower = m - k * sd;
  const width = m !== 0 ? (upper - lower) / m : 0;
  
  return { upper, middle: m, lower, width };
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
  
  // Wilder's smoothing
  const out: number[] = new Array(trs.length);
  let prev = trs.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  
  for (let i = 0; i < 14; i++) out[i] = prev;
  out[13] = prev;
  
  for (let i = 14; i < trs.length; i++) {
    prev = (prev * 13 + trs[i]) / 14;
    out[i] = prev;
  }
  
  return out;
}

function rsi14(closes: Series) {
  if (closes.length < 2) return new Array(closes.length).fill(50);
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gains.push(Math.max(0, d));
    losses.push(Math.max(0, -d));
  }
  
  const rsi: number[] = new Array(closes.length).fill(50);
  
  if (gains.length < 14) return rsi;
  
  let avgGain = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  let avgLoss = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  
  // First RSI value
  const rs14 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[14] = 100 - 100 / (1 + rs14);
  
  // Subsequent values
  for (let i = 14; i < gains.length; i++) {
    avgGain = (avgGain * 13 + gains[i]) / 14;
    avgLoss = (avgLoss * 13 + losses[i]) / 14;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i + 1] = 100 - 100 / (1 + rs);
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

const maxN = (arr: Series, n: number, i: number) => {
  if (i < n - 1) return arr[i];
  return Math.max(...arr.slice(i - n + 1, i + 1));
};

const minN = (arr: Series, n: number, i: number) => {
  if (i < n - 1) return arr[i];
  return Math.min(...arr.slice(i - n + 1, i + 1));
};

function findSwingLows(closes: Series, window = 2) {
  const lows: number[] = [];
  for (let i = window; i < closes.length - window; i++) {
    const val = closes[i];
    const left = closes.slice(i - window, i);
    const right = closes.slice(i + 1, i + 1 + window);
    if (val <= Math.min(...left) && val <= Math.min(...right)) {
      lows.push(i);
    }
  }
  return lows;
}

// Enhanced volume profile analysis
function volumeProfile(volumes: Series, closes: Series, n: number, i: number) {
  if (i < n - 1) return { volumeMA: volumes[i], volumeRatio: 1, priceVolumeCorr: 0 };
  
  const volSlice = volumes.slice(i - n + 1, i + 1);
  const priceSlice = closes.slice(i - n + 1, i + 1);
  
  const volumeMA = volSlice.reduce((a, b) => a + b, 0) / n;
  const volumeRatio = volumes[i] / (volumeMA || 1);
  
  // Price-volume correlation
  const volMean = volumeMA;
  const priceMean = priceSlice.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let volSumSq = 0;
  let priceSumSq = 0;
  
  for (let j = 0; j < n; j++) {
    const volDiff = volSlice[j] - volMean;
    const priceDiff = priceSlice[j] - priceMean;
    numerator += volDiff * priceDiff;
    volSumSq += volDiff * volDiff;
    priceSumSq += priceDiff * priceDiff;
  }
  
  const priceVolumeCorr = Math.sqrt(volSumSq * priceSumSq) > 0 ? 
    numerator / Math.sqrt(volSumSq * priceSumSq) : 0;
  
  return { volumeMA, volumeRatio, priceVolumeCorr };
}

// ---------- ENHANCED WORKER ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Updated to use mint_address from tokens table instead of hardcoded IDs
const TOKEN_IDS: string[] = process.env.TA_TOKEN_IDS?.split(',') ?? [];
const TIMEFRAMES = (process.env.TA_TIMEFRAMES ?? '1h').split(',');

// Enhanced function to fetch OHLCV data with automatic collection
async function fetchOHLCVWithCollection(
  tokenAddress: string, 
  timeframe: string, 
  daysBack = 30
): Promise<OHLCVCandle[]> {
  console.log(`📊 Fetching OHLCV data for ${tokenAddress} (${timeframe})...`);
  
  try {
    // Try to get existing data first
    let data = await ohlcvCollector.getHistoricalData(tokenAddress, timeframe, daysBack);
    
    // If we have less than 50 candles, try to collect more data
    if (data.length < 50) {
      console.log(`⚠️ Insufficient data (${data.length} candles), collecting more...`);
      
      const success = await ohlcvCollector.collectTokenOHLCV(tokenAddress, timeframe, daysBack);
      if (success) {
        data = await ohlcvCollector.getHistoricalData(tokenAddress, timeframe, daysBack);
        console.log(`✅ Collected ${data.length} candles`);
      } else {
        console.log(`❌ Failed to collect data for ${tokenAddress}`);
      }
    }
    
    // Convert to our candle format
    return data.map(d => ({
      timestamp_unix: d.timestamp,
      timestamp_utc: new Date(d.timestamp * 1000).toISOString(),
      open_price: d.open,
      high_price: d.high,
      low_price: d.low,
      close_price: d.close,
      volume: d.volume || 0,
      volume_usd: (d.volume || 0) * d.close // Rough USD volume estimate
    }));
    
  } catch (error) {
    console.error(`Error fetching OHLCV for ${tokenAddress}:`, error);
    return [];
  }
}

async function upsertTA(rows: any[]) {
  if (rows.length === 0) return;
  
  console.log(`💾 Upserting ${rows.length} TA feature rows...`);
  
  const batch = 500;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    try {
      const { error } = await supabase
        .from('ta_features')
        .upsert(chunk, { onConflict: 'token_id,timeframe,ts' });
      
      if (error) {
        console.error('Error upserting TA features:', error);
        throw error;
      }
    } catch (error) {
      console.error(`Failed to upsert batch ${i / batch + 1}:`, error);
      throw error;
    }
  }
  
  console.log(`✅ Successfully upserted ${rows.length} TA features`);
}

function computeEnhancedFeatures(candles: OHLCVCandle[], token_id: string, timeframe: string) {
  if (candles.length < 60) {
    console.log(`⚠️ Insufficient candles (${candles.length}) for ${token_id}, skipping...`);
    return [];
  }
  
  console.log(`🧮 Computing features for ${candles.length} candles...`);

  const ts = candles.map(c => c.timestamp_utc);
  const close = candles.map(c => c.close_price);
  const high = candles.map(c => c.high_price);
  const low = candles.map(c => c.low_price);
  const vol = candles.map(c => c.volume);
  const volUsd = candles.map(c => c.volume_usd || 0);

  // Pre-compute all indicators
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

  const out: any[] = [];

  // Start from index 59 to ensure we have enough data for all indicators
  for (let i = 59; i < close.length; i++) {
    // Enhanced Bollinger Bands analysis
    const bb = bollingerBands(close, 20, 2, i);
    const bbPosition = bb.width > 0 ? (close[i] - bb.lower) / (bb.upper - bb.lower) : 0.5;
    
    // Bollinger Band width percentile over last 60 periods
    const start = Math.max(19, i - 59);
    const bbWidths: number[] = [];
    for (let k = start; k <= i; k++) {
      bbWidths.push(bollingerBands(close, 20, 2, k).width);
    }
    const sortedWidths = [...bbWidths].sort((a, b) => a - b);
    const rankIdx = sortedWidths.findIndex(v => v >= bb.width);
    const bbWidthPctl = rankIdx < 0 ? 100 : Math.round((rankIdx / sortedWidths.length) * 100);

    // Enhanced volume analysis
    const volProfile = volumeProfile(vol, close, 20, i);
    const volUsdMA20 = volUsd.slice(Math.max(0, i - 19), i + 1).reduce((a, b) => a + b, 0) / Math.min(20, i + 1);
    
    // Volume momentum and trend
    const volMean60 = vol.slice(Math.max(0, i - 59), i + 1).reduce((a, b) => a + b, 0) / Math.min(60, i + 1);
    const volSd60 = stdev(vol, Math.min(60, i + 1), i);
    const volZ = zscore(vol[i], volMean60, volSd60);
    
    const volSlice = vol.slice(Math.max(0, i - 5), i + 1);
    const volSlope = slopeK(volSlice, Math.min(6, i + 1));

    // Donchian channels and breakouts
    const dHigh20 = maxN(high, 20, i);
    const dLow20 = minN(low, 20, i);
    const dHigh50 = maxN(high, 50, i);
    const dLow50 = minN(low, 50, i);
    
    const closeNow = close[i];
    const breakoutHigh20 = closeNow > dHigh20;
    const breakoutLow20 = closeNow < dLow20;
    const breakoutHigh50 = closeNow > dHigh50;
    const nearBreakHigh20 = closeNow >= 0.99 * dHigh20;
    const nearBreakLow20 = closeNow <= 1.01 * dLow20;

    // Moving average convergence/divergence signals
    const cross7_20 = i > 0 && ema7Arr[i] >= ema20Arr[i] && ema7Arr[i - 1] < ema20Arr[i - 1];
    const cross20_50 = i > 0 && ema20Arr[i] >= ema50Arr[i] && ema20Arr[i - 1] < ema50Arr[i - 1];
    const cross50_200 = i > 0 && ema50Arr[i] >= ema200Arr[i] && ema50Arr[i - 1] < ema200Arr[i - 1];
    
    // Price momentum
    const priceSlope5 = slopeK(close.slice(Math.max(0, i - 4), i + 1), Math.min(5, i + 1));
    const priceSlope10 = slopeK(close.slice(Math.max(0, i - 9), i + 1), Math.min(10, i + 1));
    
    // ATR-based volatility metrics
    const atrCurrent = atrArr[i] || 0;
    const atrMA20 = atrArr.slice(Math.max(0, i - 19), i + 1).reduce((a, b) => a + b, 0) / Math.min(20, i + 1);
    const volatilityRatio = atrMA20 > 0 ? atrCurrent / atrMA20 : 1;

    // RSI divergence analysis
    const bullishRsiDiv = (() => {
      const swingLows = findSwingLows(close.slice(0, i + 1), 2);
      if (swingLows.length >= 2) {
        const L2 = swingLows[swingLows.length - 1];
        const L1 = swingLows[swingLows.length - 2];
        const priceLL = close[L2] < close[L1];
        const rsiHigher = (rsiArr[L2] ?? 0) > (rsiArr[L1] ?? 0);
        return priceLL && rsiHigher;
      }
      return false;
    })();

    // Support/resistance levels
    const supportLevel = Math.min(dLow20, bb.lower);
    const resistanceLevel = Math.max(dHigh20, bb.upper);
    const supportDistance = (closeNow - supportLevel) / closeNow;
    const resistanceDistance = (resistanceLevel - closeNow) / closeNow;

    out.push({
      token_id,
      timeframe,
      ts: ts[i],
      
      // Moving averages
      sma7: sma7Arr[i],
      sma20: sma20Arr[i],
      sma50: sma50Arr[i],
      sma200: sma200Arr[i],
      ema7: ema7Arr[i],
      ema20: ema20Arr[i],
      ema50: ema50Arr[i],
      ema200: ema200Arr[i],
      
      // Oscillators
      rsi14: rsiArr[i] ?? 50,
      macd: macdLine[i] ?? 0,
      macd_signal: signalLine[i] ?? 0,
      macd_hist: hist[i] ?? 0,
      
      // Volatility
      atr14: atrCurrent,
      atr_ma20: atrMA20,
      volatility_ratio: volatilityRatio,
      
      // Bollinger Bands
      bb_upper: bb.upper,
      bb_middle: bb.middle,
      bb_lower: bb.lower,
      bb_width: bb.width,
      bb_position: bbPosition,
      bb_width_pctl60: bbWidthPctl,
      
      // Donchian channels
      donchian_high_20: dHigh20,
      donchian_low_20: dLow20,
      donchian_high_50: dHigh50,
      donchian_low_50: dLow50,
      
      // Volume analysis
      vol_ma20: volProfile.volumeMA,
      vol_usd_ma20: volUsdMA20,
      vol_ratio: volProfile.volumeRatio,
      vol_z60: volZ,
      vol_slope: volSlope,
      price_volume_corr: volProfile.priceVolumeCorr,
      
      // Momentum
      price_slope_5: priceSlope5,
      price_slope_10: priceSlope10,
      
      // Cross signals
      cross_ema7_over_ema20: cross7_20,
      cross_ema20_over_ema50: cross20_50,
      cross_ema50_over_ema200: cross50_200,
      
      // Breakouts
      breakout_high_20: breakoutHigh20,
      breakout_low_20: breakoutLow20,
      breakout_high_50: breakoutHigh50,
      near_breakout_high_20: nearBreakHigh20,
      near_breakout_low_20: nearBreakLow20,
      
      // Support/Resistance
      support_level: supportLevel,
      resistance_level: resistanceLevel,
      support_distance: supportDistance,
      resistance_distance: resistanceDistance,
      
      // Divergences
      bullish_rsi_div: bullishRsiDiv,
      
      // Market structure
      trend_strength: Math.abs(priceSlope10),
      trend_direction: priceSlope10 > 0 ? 1 : -1,
      
      // Composite scores
      bullish_score: (() => {
        let score = 0;
        if (cross7_20) score += 0.2;
        if (cross20_50) score += 0.2;
        if (cross50_200) score += 0.3;
        if (rsiArr[i] > 30 && rsiArr[i] < 70) score += 0.1;
        if (breakoutHigh20) score += 0.2;
        if (bullishRsiDiv) score += 0.2;
        if (volProfile.volumeRatio > 1.2) score += 0.1;
        if (priceSlope10 > 0) score += 0.1;
        return Math.min(1, score);
      })(),
      
      bearish_score: (() => {
        let score = 0;
        if (breakoutLow20) score += 0.3;
        if (rsiArr[i] > 80) score += 0.2;
        if (rsiArr[i] < 20) score += 0.1; // Oversold can be bullish
        if (priceSlope10 < 0) score += 0.2;
        if (bbPosition > 0.9) score += 0.1; // Near upper BB
        if (volatilityRatio > 2) score += 0.1; // High volatility warning
        return Math.min(1, score);
      })(),
    });
  }

  console.log(`✅ Computed ${out.length} feature rows`);
  return out;
}

async function getActiveTokens(): Promise<string[]> {
  console.log('📋 Fetching active tokens...');
  
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('mint_address')
      .eq('is_active', true)
      .gte('volume_24h', 10000) // Only tokens with decent volume
      .order('volume_24h', { ascending: false })
      .limit(50); // Limit to top 50 tokens

    if (error) throw error;
    
    const tokens = (data || []).map((r: any) => r.mint_address);
    console.log(`✅ Found ${tokens.length} active tokens`);
    return tokens;
  } catch (error) {
    console.error('Error fetching active tokens:', error);
    return TOKEN_IDS; // Fallback to env tokens
  }
}

async function runEnhancedTA() {
  console.log('🚀 Starting Enhanced TA Worker...');
  console.log(`📊 Timeframes: ${TIMEFRAMES.join(', ')}`);
  
  // Get tokens to analyze
  let tokensToAnalyze = TOKEN_IDS;
  if (tokensToAnalyze.length === 0) {
    tokensToAnalyze = await getActiveTokens();
  }
  
  if (tokensToAnalyze.length === 0) {
    console.error('❌ No tokens to analyze. Set TA_TOKEN_IDS env var or ensure active tokens exist.');
    return;
  }
  
  console.log(`🎯 Analyzing ${tokensToAnalyze.length} tokens: ${tokensToAnalyze.slice(0, 3).join(', ')}${tokensToAnalyze.length > 3 ? '...' : ''}`);

  let totalProcessed = 0;
  let totalErrors = 0;

  for (const timeframe of TIMEFRAMES) {
    console.log(`\n⏰ Processing timeframe: ${timeframe}`);
    
    for (const token of tokensToAnalyze) {
      try {
        console.log(`\n📈 Processing ${token} (${timeframe})...`);
        
        // Fetch OHLCV data with automatic collection
        const candles = await fetchOHLCVWithCollection(token, timeframe, 60); // 60 days for better analysis
        
        if (candles.length < 60) {
          console.log(`⚠️ Skipping ${token}: insufficient data (${candles.length} candles)`);
          continue;
        }
        
        // Compute enhanced features
        const rows = computeEnhancedFeatures(candles, token, timeframe);
        
        if (rows.length > 0) {
          await upsertTA(rows);
          console.log(`✅ ${token} ${timeframe}: ${rows.length} features computed`);
          totalProcessed++;
        } else {
          console.log(`⚠️ ${token} ${timeframe}: no features computed`);
        }
        
        // Rate limiting to be nice to the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (e) {
        console.error(`❌ Error processing ${token} ${timeframe}:`, e);
        totalErrors++;
      }
    }
  }

  // Refresh the materialized view
  try {
    console.log('\n🔄 Refreshing ta_latest materialized view...');
    await supabase.rpc('refresh_ta_latest');
    console.log('✅ ta_latest refreshed successfully');
  } catch (error) {
    console.error('❌ Error refreshing ta_latest:', error);
  }

  console.log('\n📊 Enhanced TA Worker Summary:');
  console.log(`   ✅ Successfully processed: ${totalProcessed}`);
  console.log(`   ❌ Errors encountered: ${totalErrors}`);
  console.log(`   📈 Success rate: ${Math.round((totalProcessed / (totalProcessed + totalErrors)) * 100)}%`);
  console.log('🎉 Enhanced TA Worker completed!');
}

// Export for use in other modules
export { computeEnhancedFeatures, fetchOHLCVWithCollection };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedTA()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}