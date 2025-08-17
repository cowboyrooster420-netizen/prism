import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ohlcvCollector } from '../../lib/ohlcvCollector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      limit = 10,
      timeframes = ['1h'],
      daysBack = 7,
      minVolume = 1000,
      tier = null
    } = req.body;

    console.log(`🔄 Starting bulk OHLCV collection for top ${limit} tokens`);

    // Get active tokens from database
    let query = supabase
      .from('tokens')
      .select('mint_address, symbol, volume_24h')
      .eq('is_active', true)
      .gte('volume_24h', minVolume)
      .order('volume_24h', { ascending: false })
      .limit(limit);

    if (tier) {
      query = query.eq('tier', tier);
    }

    const { data: tokens, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch tokens: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ error: 'No active tokens found' });
    }

    console.log(`📊 Found ${tokens.length} tokens to process`);
    
    const results: any[] = [];
    let successCount = 0;
    let totalAttempts = 0;

    for (const token of tokens) {
      console.log(`🪙 Processing ${token.symbol} (${token.mint_address})`);
      
      for (const timeframe of timeframes) {
        totalAttempts++;
        
        try {
          const success = await ohlcvCollector.collectTokenOHLCV(
            token.mint_address,
            timeframe,
            daysBack
          );

          if (success) {
            successCount++;
          }

          results.push({
            tokenAddress: token.mint_address,
            symbol: token.symbol,
            timeframe,
            success,
            volume24h: token.volume_24h,
            timestamp: new Date().toISOString()
          });

          // Rate limiting - delay between requests
          await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error) {
          console.error(`❌ Error collecting ${token.symbol} ${timeframe}:`, error);
          results.push({
            tokenAddress: token.mint_address,
            symbol: token.symbol,
            timeframe,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    const summary = {
      totalTokens: tokens.length,
      totalAttempts,
      successCount,
      successRate: Math.round((successCount / totalAttempts) * 100),
      timeframes,
      daysBack
    };

    console.log(`✅ Bulk collection completed:`);
    console.log(`   - Tokens processed: ${summary.totalTokens}`);
    console.log(`   - Success rate: ${summary.successRate}% (${successCount}/${totalAttempts})`);

    res.status(200).json({
      success: true,
      message: `Bulk OHLCV collection completed with ${summary.successRate}% success rate`,
      summary,
      results
    });

  } catch (error) {
    console.error('❌ Error in bulk OHLCV collection:', error);
    res.status(500).json({
      error: 'Failed to collect bulk OHLCV data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}