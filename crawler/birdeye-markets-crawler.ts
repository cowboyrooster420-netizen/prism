import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import { getBirdEyeMarkets } from './services/birdeye-markets';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function upsertToSupabase(tokens: any[]) {
  try {
    const { error } = await supabase
      .from('tokens')
      .upsert(tokens, { onConflict: 'mint_address' });
    
    if (error) {
      console.error('❌ Error inserting to Supabase:', error);
    } else {
      console.log(`✅ Successfully upserted ${tokens.length} tokens to Supabase.`);
    }
  } catch (error) {
    console.error('❌ Failed to upsert to Supabase:', error);
  }
}

async function runBirdEyeMarketsCrawler() {
  console.log('🚀 Starting BirdEye Markets Crawler...');
  console.log('This will fetch market data and enrich tokens with price/volume information');
  
  try {
    // Fetch markets data
    const marketsData = await getBirdEyeMarkets(1000);
    
    if (marketsData.length === 0) {
      console.log('❌ No markets data fetched');
      return;
    }
    
    console.log(`📊 Processing ${marketsData.length} market tokens...`);
    
    // Transform data for Supabase
    const tokensForUpsert = marketsData.map(token => ({
      mint_address: token.mint_address,
      symbol: token.symbol,
      liquidity: token.liquidity,
      price: token.token_price || token.price_usd,
      volume_24h: token.volume_24h || token.volume_24h_quote,
      updated_at: token.updated_at
    }));
    
    // Upsert to Supabase
    await upsertToSupabase(tokensForUpsert);
    
    console.log('🎉 BirdEye Markets Crawler completed successfully!');
    
  } catch (error) {
    console.error('❌ BirdEye Markets Crawler failed:', error);
  }
}

// Run the crawler
runBirdEyeMarketsCrawler()
  .then(() => {
    console.log('✅ Crawler finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Crawler failed:', error);
    process.exit(1);
  }); 