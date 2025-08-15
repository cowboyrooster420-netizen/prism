import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igyzlakymfosdeepvunk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc0NjE2MiwiZXhwIjoyMDY5MzIyMTYyfQ.JJVj4TzIlAWrHJ3yn4ptzvreSEAmgGurzRXM0L-LGJI';
const BIRDEYE_API_KEY = '75934a93cc5f45fdb97e99901de6967b';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simpleCanldleIngestion() {
  console.log('🔍 Simple Candle Ingestion with Working BirdEye API\n');
  
  // Use specific high-volume tokens that we know exist
  const tokens = [
    { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
    { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  ];
  
  const timeframes = ['1H', '1D'];  // Working timeframes
  const workingEndpoint = 'https://public-api.birdeye.so/defi/ohlcv';
  
  for (const token of tokens) {
    console.log(`\n🪙 Processing ${token.symbol} (${token.address})`);
    
    for (const timeframe of timeframes) {
      console.log(`  ⏰ Timeframe: ${timeframe}`);
      
      try {
        // Fetch candles for last 7 days
        const params = new URLSearchParams({
          address: token.address,
          type: timeframe,
          time_from: String(Math.floor(Date.now() / 1000) - 7 * 24 * 3600),
          time_to: String(Math.floor(Date.now() / 1000)),
        });
        
        const response = await fetch(`${workingEndpoint}?${params.toString()}`, {
          headers: {
            'X-API-KEY': BIRDEYE_API_KEY,
            'accept': 'application/json',
            'x-chain': 'solana'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`    ❌ API Error: ${errorText}`);
          continue;
        }
        
        const data = await response.json();
        const candles = data?.data?.items || [];
        
        console.log(`    📊 Found ${candles.length} candles`);
        
        if (candles.length === 0) {
          console.log('    ⚠️  No candles returned');
          continue;
        }
        
        // Convert and insert candles
        const candleRows = candles.map((candle: any) => ({
          token_id: token.address,
          timeframe: timeframe.toLowerCase(), // Convert to lowercase for consistency
          ts: new Date(candle.unixTime * 1000).toISOString(),
          open: candle.o || 0,
          high: candle.h || 0,
          low: candle.l || 0,
          close: candle.c || 0,
          volume: candle.v || 0,
          quote_volume_usd: (candle.v || 0) * (candle.c || 0) // Approximate USD volume
        })).filter(row => 
          row.open > 0 && row.high > 0 && row.low > 0 && row.close > 0
        );
        
        if (candleRows.length === 0) {
          console.log('    ⚠️  No valid candles after filtering');
          continue;
        }
        
        console.log(`    💾 Inserting ${candleRows.length} valid candles...`);
        console.log(`    📋 Sample candle: ${JSON.stringify(candleRows[0], null, 2)}`);
        
        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < candleRows.length; i += batchSize) {
          const batch = candleRows.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from('candles')
            .upsert(batch, { 
              onConflict: 'token_id,timeframe,ts',
              ignoreDuplicates: false 
            });
          
          if (error) {
            console.log(`    ❌ Database Error: ${error.message}`);
            console.log(`    🔍 Error details: ${JSON.stringify(error, null, 2)}`);
          } else {
            console.log(`    ✅ Batch ${Math.floor(i/batchSize) + 1} inserted successfully`);
          }
        }
        
      } catch (error) {
        console.log(`    ❌ Error processing ${token.symbol} ${timeframe}: ${error}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n📊 Checking final candle counts...');
  
  // Check what we inserted
  const { data: candleCounts } = await supabase
    .from('candles')
    .select('token_id, timeframe, count(*)')
    .eq('token_id', tokens[0].address) // Just check one token for now
    .limit(10);
  
  if (candleCounts) {
    console.log('Final candle counts:', candleCounts);
  }
  
  // Get total count
  const { count: totalCandles } = await supabase
    .from('candles')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n🎉 Total candles in database: ${totalCandles}`);
}

simpleCanldleIngestion();