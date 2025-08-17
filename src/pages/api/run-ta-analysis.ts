import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ohlcvCollector } from '../../lib/ohlcvCollector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import the enhanced TA computation functions
// Note: This is a simplified version for API use

type Series = number[];

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

const rsi14 = (closes: Series) => {
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
  
  const rs14 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[14] = 100 - 100 / (1 + rs14);
  
  for (let i = 14; i < gains.length; i++) {
    avgGain = (avgGain * 13 + gains[i]) / 14;
    avgLoss = (avgLoss * 13 + losses[i]) / 14;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i + 1] = 100 - 100 / (1 + rs);
  }
  
  return rsi;
};

const macd = (closes: Series, fast = 12, slow = 26, signal = 9) => {
  const emaFast = emaAll(closes, fast);
  const emaSlow = emaAll(closes, slow);
  const macdLine = emaFast.map((v, i) => v - (emaSlow[i] ?? 0));
  const signalLine = emaAll(macdLine, signal);
  const hist = macdLine.map((v, i) => v - (signalLine[i] ?? 0));
  return { macdLine, signalLine, hist };
};

async function performTAAnalysis(tokenAddress: string, timeframe: string = '1h') {
  console.log(`🔍 Performing TA analysis for ${tokenAddress} (${timeframe})`);
  
  try {
    // Get historical OHLCV data
    const historicalData = await ohlcvCollector.getHistoricalData(tokenAddress, timeframe, 30);
    
    if (historicalData.length < 20) {
      // Try to collect data if we don't have enough
      console.log(`📊 Insufficient data, collecting for ${tokenAddress}...`);
      await ohlcvCollector.collectTokenOHLCV(tokenAddress, timeframe, 30);
      const newData = await ohlcvCollector.getHistoricalData(tokenAddress, timeframe, 30);
      
      if (newData.length < 20) {
        throw new Error(`Insufficient historical data: ${newData.length} candles`);
      }
      
      historicalData.splice(0, historicalData.length, ...newData);
    }
    
    // Extract price series
    const closes = historicalData.map(d => d.close);
    const highs = historicalData.map(d => d.high);
    const lows = historicalData.map(d => d.low);
    const volumes = historicalData.map(d => d.volume || 0);
    
    // Calculate indicators
    const sma20 = closes.map((_, i) => sma(closes, 20, i));
    const ema20 = emaAll(closes, 20);
    const rsi = rsi14(closes);
    const macdData = macd(closes);
    
    const latestIndex = closes.length - 1;
    const currentPrice = closes[latestIndex];
    const currentSMA20 = sma20[latestIndex];
    const currentEMA20 = ema20[latestIndex];
    const currentRSI = rsi[latestIndex];
    const currentMACD = macdData.macdLine[latestIndex];
    const currentMACDSignal = macdData.signalLine[latestIndex];
    const currentMACDHist = macdData.hist[latestIndex];
    
    // Generate signals
    const signals = [];
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Price vs MA signals
    if (currentPrice > currentSMA20) {
      signals.push('Price above SMA20 (bullish)');
      bullishScore += 0.2;
    } else {
      signals.push('Price below SMA20 (bearish)');
      bearishScore += 0.2;
    }
    
    // RSI signals
    if (currentRSI < 30) {
      signals.push('RSI oversold (potential bullish reversal)');
      bullishScore += 0.3;
    } else if (currentRSI > 70) {
      signals.push('RSI overbought (potential bearish reversal)');
      bearishScore += 0.3;
    } else if (currentRSI > 45 && currentRSI < 55) {
      signals.push('RSI neutral');
    }
    
    // MACD signals
    if (currentMACD > currentMACDSignal) {
      signals.push('MACD bullish crossover');
      bullishScore += 0.25;
    } else {
      signals.push('MACD bearish crossover');
      bearishScore += 0.25;
    }
    
    // Volume analysis
    const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const currentVolume = volumes[latestIndex];
    
    if (currentVolume > avgVolume * 1.5) {
      signals.push('High volume (increased interest)');
      bullishScore += 0.15;
    }
    
    // Trend analysis
    const priceChange5 = (currentPrice - closes[latestIndex - 5]) / closes[latestIndex - 5];
    const priceChange10 = (currentPrice - closes[latestIndex - 10]) / closes[latestIndex - 10];
    
    if (priceChange10 > 0.05) {
      signals.push('Strong uptrend (10-period)');
      bullishScore += 0.2;
    } else if (priceChange10 < -0.05) {
      signals.push('Strong downtrend (10-period)');
      bearishScore += 0.2;
    }
    
    // Overall signal
    const netScore = bullishScore - bearishScore;
    let overallSignal = 'NEUTRAL';
    let confidence = Math.abs(netScore);
    
    if (netScore > 0.3) {
      overallSignal = 'BULLISH';
    } else if (netScore < -0.3) {
      overallSignal = 'BEARISH';
    }
    
    return {
      tokenAddress,
      timeframe,
      analysis: {
        currentPrice,
        priceChange5d: priceChange5,
        priceChange10d: priceChange10,
        indicators: {
          sma20: currentSMA20,
          ema20: currentEMA20,
          rsi: currentRSI,
          macd: currentMACD,
          macdSignal: currentMACDSignal,
          macdHistogram: currentMACDHist,
        },
        volume: {
          current: currentVolume,
          average10d: avgVolume,
          ratio: currentVolume / avgVolume,
        },
        signals,
        scores: {
          bullish: bullishScore,
          bearish: bearishScore,
          net: netScore,
        },
        overallSignal,
        confidence: Math.min(confidence, 1),
        dataPoints: historicalData.length,
        lastUpdated: new Date().toISOString(),
      }
    };
    
  } catch (error) {
    console.error(`Error in TA analysis for ${tokenAddress}:`, error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      tokenAddress, 
      timeframe = '1h',
      collectData = true 
    } = req.body;

    if (!tokenAddress) {
      return res.status(400).json({ error: 'Token address is required' });
    }

    console.log(`🚀 Starting TA analysis for ${tokenAddress}`);

    // Perform the analysis
    const analysis = await performTAAnalysis(tokenAddress, timeframe);

    // Optionally store results in database
    if (collectData) {
      try {
        const { error } = await supabase
          .from('ta_analysis_results')
          .upsert({
            token_address: tokenAddress,
            timeframe,
            analysis_data: analysis.analysis,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'token_address,timeframe'
          });

        if (error) {
          console.warn('Failed to store analysis results:', error);
        }
      } catch (storeError) {
        console.warn('Error storing analysis:', storeError);
      }
    }

    console.log(`✅ TA analysis completed for ${tokenAddress}`);

    res.status(200).json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('❌ Error in TA analysis:', error);
    res.status(500).json({
      error: 'Failed to perform TA analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}