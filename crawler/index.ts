import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './services/birdeye';
import { getHeliusMetadata } from './services/helius';
import { upsertToken } from './services/supabase';
import { sleep } from './utils';
import { CRAWL_INTERVAL_MS } from './config';

let isRunning = true;

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('\nShutting down crawler...');
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down crawler...');
  isRunning = false;
  process.exit(0);
});

async function crawl() {
  if (!isRunning) return;
  
  try {
    console.log('\n=== Starting BirdEye-based crawl ===');

    // Fetch top tokens first, then trending tokens with delay to avoid rate limits
    console.log('🔄 Fetching top tokens...');
    const topTokens = await getTopBirdEyeTokens();
    await sleep(2000); // Wait 2 seconds between API calls
    
    console.log('🔄 Fetching trending tokens...');
    const trendingTokens = await getTrendingBirdEyeTokens();

    // Combine and deduplicate tokens by address
    const allTokens = [...topTokens, ...trendingTokens];
    const uniqueTokens = allTokens.filter((token, index, self) => 
      index === self.findIndex(t => t.address === token.address)
    );

    console.log(`📊 Fetched ${topTokens.length} top tokens + ${trendingTokens.length} trending tokens = ${uniqueTokens.length} unique tokens`);

    const enrichedTokens = [];
    for (const token of uniqueTokens) {
      const {
        address,
        name,
        symbol,
        price,
        v24hChangePercent,
        v24hUSD,
        mc,
        liquidity,
      } = token;

      let finalName = name;
      let finalSymbol = symbol;

      if (!name || !symbol || name.startsWith('token-')) {
        const heliusMeta = await getHeliusMetadata(address);
        finalName = heliusMeta?.name || finalName;
        finalSymbol = heliusMeta?.symbol || finalSymbol;
      }

      enrichedTokens.push({
        mint_address: address,
        name: finalName,
        symbol: finalSymbol,
        price,
        price_change_24h: v24hChangePercent,
        volume_24h: v24hUSD,
        market_cap: mc,
        liquidity,
        updated_at: new Date().toISOString(),
      } as any);

      // Respect BirdEye rate limits
      await sleep(200); // Optional fine-tuning
    }

    // Write to database ONLY - don't return data
    console.log('💾 Writing tokens to database...');
    for (const token of enrichedTokens) {
      await upsertToken(token);
    }

    console.log(`✅ Successfully updated ${enrichedTokens.length} tokens in database`);
    
  } catch (error) {
    console.error('❌ Crawler error:', error);
    // Don't crash, just log and continue
  }
  
  // Schedule next crawl
  if (isRunning) {
    console.log(`⏰ Next crawl in ${CRAWL_INTERVAL_MS / 1000} seconds...`);
    setTimeout(crawl, CRAWL_INTERVAL_MS);
  }
}

// Start the crawler as a background service
console.log('🚀 Starting Solana Token Crawler (Database Writer Mode)...');
console.log(`Crawl interval: ${CRAWL_INTERVAL_MS / 1000} seconds`);
console.log('Press Ctrl+C to stop');
console.log('📝 Note: Crawler only writes to database, does not return data');

crawl(); 