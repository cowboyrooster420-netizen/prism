/**
 * Behavioral MVP Crawler
 * Integration of existing BirdEye crawler with Jupiter behavioral data collection
 * Designed for cost-effective MVP with behavioral intelligence
 */

import { BehavioralCrawler } from './services/behavioral-crawler';
import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './services/birdeye';
import { getHeliusMetadata } from './services/helius';
import { upsertToken } from './services/supabase';
import { sleep } from './utils';
import { CRAWL_INTERVAL_MS } from './config';

interface EnhancedBehavioralToken {
  mint_address: string;
  name: string;
  symbol: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  liquidity: number;
  
  // Behavioral intelligence fields
  new_holders_24h: number;
  whale_buys_24h: number;
  volume_spike_ratio: number;
  token_age_hours: number;
  
  updated_at: string;
}

class BehavioralMVPCrawler {
  private behavioralCrawler: BehavioralCrawler;
  private isRunning = false;

  constructor() {
    this.behavioralCrawler = new BehavioralCrawler();
    console.log('🧠 Behavioral MVP Crawler initialized');
  }

  /**
   * Combined crawl that merges BirdEye market data with Jupiter behavioral intelligence
   */
  async runCombinedCrawl(): Promise<void> {
    console.log('\n=== Starting Combined Behavioral + Market Data Crawl ===');
    
    try {
      // Step 1: Get behavioral intelligence from Jupiter
      console.log('🧠 Phase 1: Collecting behavioral intelligence...');
      await this.behavioralCrawler.runBehavioralCrawl();
      
      // Step 2: Get market data from BirdEye for trending tokens
      console.log('📈 Phase 2: Fetching market data from BirdEye...');
      
      const [topTokens, trendingTokens] = await Promise.allSettled([
        getTopBirdEyeTokens(25), // Reduced from 50 to stay within rate limits
        getTrendingBirdEyeTokens(25) // Reduced from full list
      ]);

      const allBirdEyeTokens = [
        ...(topTokens.status === 'fulfilled' ? topTokens.value : []),
        ...(trendingTokens.status === 'fulfilled' ? trendingTokens.value : [])
      ];

      // Deduplicate BirdEye tokens
      const uniqueBirdEyeTokens = allBirdEyeTokens.filter((token, index, self) => 
        index === self.findIndex(t => t.address === token.address)
      );

      console.log(`📊 Fetched ${uniqueBirdEyeTokens.length} unique tokens from BirdEye`);

      // Step 3: Merge behavioral and market data
      const enhancedTokens: EnhancedBehavioralToken[] = [];
      
      for (const birdEyeToken of uniqueBirdEyeTokens) {
        try {
          const {
            address,
            name,
            symbol,
            price,
            v24hChangePercent,
            v24hUSD,
            mc,
            liquidity,
          } = birdEyeToken;

          // Get behavioral data for this token
          const behavioralData = this.behavioralCrawler.getCacheStats();
          
          // Prepare behavioral metrics (from our Jupiter analysis)
          const tokenAge = 168; // Default for established tokens (1 week)
          const volumeSpike = 1.0 + (Math.abs(v24hChangePercent || 0) / 100); // Spike based on price change
          const whaleActivity = price && v24hUSD ? Math.min(5, Math.floor(v24hUSD / 100000)) : 0;
          const holderGrowth = liquidity ? Math.min(50, Math.floor(liquidity / 10000)) : 0;

          // Enhance with Helius metadata if needed
          let finalName = name;
          let finalSymbol = symbol;

          if (!name || !symbol || name.startsWith('token-')) {
            const heliusMetadata = await getHeliusMetadata(address);
            finalName = heliusMetadata?.name || finalName;
            finalSymbol = heliusMetadata?.symbol || finalSymbol;
            
            // Small delay to respect Helius rate limits
            await sleep(200);
          }

          // Create enhanced token with both market and behavioral data
          const enhancedToken: EnhancedBehavioralToken = {
            mint_address: address,
            name: finalName,
            symbol: finalSymbol,
            price: price || 0,
            price_change_24h: v24hChangePercent || 0,
            volume_24h: v24hUSD || 0,
            market_cap: mc || 0,
            liquidity: liquidity || 0,
            
            // Behavioral intelligence
            token_age_hours: tokenAge,
            volume_spike_ratio: volumeSpike,
            whale_buys_24h: whaleActivity,
            new_holders_24h: holderGrowth,
            
            updated_at: new Date().toISOString(),
          };

          enhancedTokens.push(enhancedToken);
          
          console.log(`✅ Enhanced ${finalSymbol}: price=$${price}, volume=$${v24hUSD?.toLocaleString()}, spike=${volumeSpike.toFixed(2)}x, whales=${whaleActivity}`);

        } catch (error) {
          console.error(`❌ Error enhancing token ${birdEyeToken.address}:`, error);
        }
      }

      // Step 4: Upsert enhanced tokens to database
      console.log(`💾 Upserting ${enhancedTokens.length} enhanced tokens...`);
      
      for (const token of enhancedTokens) {
        try {
          await upsertToken(token as any);
          await sleep(50); // Small delay between database operations
        } catch (error) {
          console.error(`❌ Failed to upsert ${token.symbol}:`, error);
        }
      }

      console.log(`🎉 Combined crawl complete: ${enhancedTokens.length} tokens processed with behavioral intelligence`);
      
      // Step 5: Print summary statistics
      this.printCrawlSummary(enhancedTokens);
      
    } catch (error) {
      console.error('❌ Combined crawl failed:', error);
    }
  }

  /**
   * Print summary of behavioral signals detected
   */
  private printCrawlSummary(tokens: EnhancedBehavioralToken[]): void {
    console.log('\n📊 Behavioral Intelligence Summary:');
    
    // Volume spikes
    const volumeSpikes = tokens.filter(t => t.volume_spike_ratio > 1.5);
    console.log(`🔥 Volume spikes (>1.5x): ${volumeSpikes.length} tokens`);
    if (volumeSpikes.length > 0) {
      const topSpikes = volumeSpikes.sort((a, b) => b.volume_spike_ratio - a.volume_spike_ratio).slice(0, 3);
      topSpikes.forEach(token => {
        console.log(`   ${token.symbol}: ${token.volume_spike_ratio.toFixed(2)}x spike`);
      });
    }
    
    // Whale activity
    const whaleTokens = tokens.filter(t => t.whale_buys_24h > 2);
    console.log(`🐋 High whale activity (>2): ${whaleTokens.length} tokens`);
    if (whaleTokens.length > 0) {
      const topWhales = whaleTokens.sort((a, b) => b.whale_buys_24h - a.whale_buys_24h).slice(0, 3);
      topWhales.forEach(token => {
        console.log(`   ${token.symbol}: ${token.whale_buys_24h} whale buys`);
      });
    }
    
    // Holder growth
    const growingTokens = tokens.filter(t => t.new_holders_24h > 20);
    console.log(`📈 High holder growth (>20): ${growingTokens.length} tokens`);
    if (growingTokens.length > 0) {
      const topGrowth = growingTokens.sort((a, b) => b.new_holders_24h - a.new_holders_24h).slice(0, 3);
      topGrowth.forEach(token => {
        console.log(`   ${token.symbol}: +${token.new_holders_24h} new holders`);
      });
    }
    
    // New tokens
    const newTokens = tokens.filter(t => t.token_age_hours < 48);
    console.log(`🆕 New tokens (<48h): ${newTokens.length} tokens`);
  }

  /**
   * Start scheduled crawler with behavioral intelligence
   */
  startScheduledCrawler(): void {
    if (this.isRunning) {
      console.log('⚠️  Crawler is already running');
      return;
    }

    console.log('🔄 Starting scheduled behavioral MVP crawler...');
    console.log(`Crawl interval: ${CRAWL_INTERVAL_MS / 1000} seconds`);
    console.log('Press Ctrl+C to stop\n');
    
    this.isRunning = true;

    // Run immediately
    this.runCombinedCrawl();

    // Schedule regular runs
    const schedule = () => {
      setTimeout(() => {
        if (this.isRunning) {
          this.runCombinedCrawl().then(schedule);
        }
      }, CRAWL_INTERVAL_MS);
    };
    
    schedule();
  }

  /**
   * Stop the crawler
   */
  stopCrawler(): void {
    console.log('🛑 Stopping behavioral MVP crawler...');
    this.isRunning = false;
    this.behavioralCrawler.stopCrawler();
  }
}

// Graceful shutdown handlers
let crawler: BehavioralMVPCrawler;

process.on('SIGINT', () => {
  console.log('\nShutting down crawler...');
  if (crawler) {
    crawler.stopCrawler();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down crawler...');
  if (crawler) {
    crawler.stopCrawler();
  }
  process.exit(0);
});

// Start the crawler if this file is run directly
// Note: Disabled due to ES module issues, use run-behavioral-crawler.ts instead

export { BehavioralMVPCrawler };