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
    
    // Transform data for Supabase - filter out invalid tokens
    const tokensForUpsert = marketsData
      .filter(token => token.symbol && token.mint_address) // Only tokens with valid symbol and address
      .map(token => ({
        mint_address: token.mint_address,
        address: token.mint_address,
        symbol: token.symbol.trim().replace(/[^\w]/g, ''), // Clean symbol - alphanumeric only
        name: (token.name || token.symbol || 'Unknown').trim().substring(0, 50), // Limit name length
        liquidity: Number(token.liquidity) || 0,
        price: Number(token.token_price || token.price_usd) || 0,
        volume_24h: Number(token.volume_24h || token.volume_24h_quote) || 0,
        market_cap: Number(token.market_cap) || 0,
        source: 'birdeye-markets'
      }))
      .filter(token => token.symbol.length > 0 && token.symbol.length <= 20); // Valid symbol length
    
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