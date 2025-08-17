import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://igyzlakymfosdeepvunk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlneXpsYWt5bWZvc2RlZXB2dW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NDYxNjIsImV4cCI6MjA2OTMyMjE2Mn0.xHqCW8olB3X_02T6Kk65hbWrBfjwWhuhxwVS9XujesE'
);

async function debugEdgePipelineAPI() {
  console.log('🔍 Debugging Edge Pipeline API logic...');
  
  // Step 1: Get TA data
  console.log('\n📊 Step 1: Fetching TA data...');
  const { data: taData, error: taError } = await supabase
    .from('ta_latest')
    .select(`
      token_id, ts, created_at,
      rsi14, vwap, smart_money_index, trend_alignment_score
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (taError) {
    console.error('❌ TA Error:', taError);
    return;
  }

  console.log(`✅ Found ${taData?.length || 0} TA records`);
  if (taData && taData.length > 0) {
    console.log('Sample TA data:', taData.slice(0, 2));
  }

  // Step 2: Get token metadata
  if (taData && taData.length > 0) {
    const tokenIds = taData.map(ta => ta.token_id);
    console.log('\n📊 Step 2: Looking for token metadata for IDs:', tokenIds);
    
    const { data: tokenMetadata, error: tokenError } = await supabase
      .from('tokens')
      .select('mint_address, symbol, name, price, volume_24h, market_cap, liquidity')
      .in('mint_address', tokenIds);

    if (tokenError) {
      console.error('❌ Token metadata error:', tokenError);
      return;
    }

    console.log(`✅ Found ${tokenMetadata?.length || 0} token metadata records`);
    if (tokenMetadata && tokenMetadata.length > 0) {
      console.log('Sample token metadata:', tokenMetadata);
    }

    // Step 3: Test the join logic
    console.log('\n🔗 Step 3: Testing join logic...');
    const tokenMetaMap = new Map();
    if (tokenMetadata) {
      tokenMetadata.forEach(token => {
        tokenMetaMap.set(token.mint_address, token);
        console.log(`Added to map: ${token.mint_address} -> ${token.symbol}`);
      });
    }

    const tokens = taData.map(ta => {
      const meta = tokenMetaMap.get(ta.token_id);
      console.log(`Joining TA ${ta.token_id} with meta:`, meta ? `${meta.symbol}` : 'NOT FOUND');
      return {
        token_id: ta.token_id,
        symbol: meta?.symbol || 'UNKNOWN',
        name: meta?.name || 'Unknown Token',
        vwap: ta.vwap,
        smart_money_index: ta.smart_money_index,
        hasMetadata: !!meta
      };
    });

    console.log('\n📊 Final joined tokens:', tokens);
  }
}

debugEdgePipelineAPI().then(() => process.exit(0));