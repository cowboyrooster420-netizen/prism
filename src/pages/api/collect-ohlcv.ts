import { NextApiRequest, NextApiResponse } from 'next';
import { ohlcvCollector } from '../../lib/ohlcvCollector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      tokenAddress, 
      timeframes = ['1h'], 
      daysBack = 30,
      force = false 
    } = req.body;

    if (!tokenAddress) {
      return res.status(400).json({ error: 'Token address is required' });
    }

    console.log(`🚀 Starting OHLCV collection for ${tokenAddress}`);
    console.log(`📊 Timeframes: ${timeframes.join(', ')}`);
    console.log(`📅 Days back: ${daysBack}`);

    const results: any[] = [];

    for (const timeframe of timeframes) {
      console.log(`📈 Collecting ${timeframe} data for ${tokenAddress}...`);
      
      const success = await ohlcvCollector.collectTokenOHLCV(
        tokenAddress, 
        timeframe, 
        daysBack
      );

      results.push({
        tokenAddress,
        timeframe,
        success,
        timestamp: new Date().toISOString()
      });

      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`✅ Collection completed: ${successCount}/${totalCount} successful`);

    res.status(200).json({
      success: successCount === totalCount,
      message: `OHLCV collection completed: ${successCount}/${totalCount} successful`,
      results,
      tokenAddress,
      timeframes,
      daysBack
    });

  } catch (error) {
    console.error('❌ Error in OHLCV collection:', error);
    res.status(500).json({
      error: 'Failed to collect OHLCV data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}