/**
 * Behavioral Data Crawler
 * Integrates Jupiter MVP service with existing crawler architecture
 * Focuses on behavioral signals for MVP
 */

import { JupiterMVPService } from './jupiter-mvp';
import { getHeliusMetadata } from './helius';
import { upsertToken } from './supabase';
import { sleep } from '../utils';

interface BehavioralToken {
  mint_address: string;
  name: string;
  symbol: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  liquidity: number;
  
  // Behavioral fields from our schema
  new_holders_24h: number;
  whale_buys_24h: number;
  volume_spike_ratio: number;
  token_age_hours: number;
  
  updated_at: string;
}

interface BehavioralMetrics {
  new_holders_24h: number;
  whale_buys_24h: number;
  volume_spike_ratio: number;
  token_age_hours: number;
}

export class BehavioralCrawler {
  private jupiterService: JupiterMVPService;
  private isRunning = false;

  constructor() {
    this.jupiterService = new JupiterMVPService();
    console.log('🧠 Behavioral Crawler initialized');
  }

  /**
   * Main crawling function that discovers tokens and collects behavioral data
   */
  async runBehavioralCrawl(): Promise<void> {
    console.log('\n=== Starting Behavioral Data Crawl ===');
    
    try {
      // Step 1: Discover token universe from Jupiter (FREE)
      console.log('🌍 Discovering token universe from Jupiter...');
      const allTokens = await this.jupiterService.getTokenUniverse();
      
      if (allTokens.length === 0) {
        console.log('❌ No tokens discovered. Exiting...');
        return;
      }
      
      console.log(`✅ Discovered ${allTokens.length} verified tokens`);

      // Step 2: Select priority tokens for behavioral analysis
      console.log('🎯 Selecting priority tokens for behavioral analysis...');
      const priorityTokenAddresses = this.jupiterService.getPriorityTokens(allTokens, 50);
      console.log(`✅ Selected ${priorityTokenAddresses.length} priority tokens`);

      // Step 3: Prepare behavioral data for all priority tokens
      console.log('📊 Preparing behavioral data...');
      const behavioralDataBatch = this.jupiterService.batchPrepareBehavioralData(priorityTokenAddresses);
      
      // Step 4: Process tokens with behavioral data
      const processedTokens: BehavioralToken[] = [];
      
      for (const tokenAddress of priorityTokenAddresses) {
        try {
          const jupiterToken = allTokens.find(t => t.address === tokenAddress);
          if (!jupiterToken) continue;

          console.log(`🔄 Processing ${jupiterToken.symbol} (${tokenAddress})...`);

          // Get behavioral data from our Jupiter service
          const behavioralData = behavioralDataBatch[tokenAddress];
          
          // For MVP, we'll simulate some behavioral metrics
          // In Phase 2, these will come from Helius transaction analysis
          const behavioralMetrics = await this.calculateBehavioralMetrics(tokenAddress, jupiterToken);

          // Create enhanced token with behavioral data
          const behavioralToken: BehavioralToken = {
            mint_address: tokenAddress,
            name: jupiterToken.name,
            symbol: jupiterToken.symbol,
            price: 0, // Will be populated from BirdEye if needed
            price_change_24h: 0,
            volume_24h: 0,
            market_cap: 0,
            liquidity: 0,
            
            // Behavioral data
            new_holders_24h: behavioralMetrics.new_holders_24h,
            whale_buys_24h: behavioralMetrics.whale_buys_24h,
            volume_spike_ratio: behavioralMetrics.volume_spike_ratio,
            token_age_hours: behavioralMetrics.token_age_hours,
            
            updated_at: new Date().toISOString(),
          };

          processedTokens.push(behavioralToken);
          
          // Rate limiting to be respectful
          await sleep(100);
          
        } catch (error) {
          console.error(`❌ Error processing ${tokenAddress}:`, error);
        }
      }

      // Step 5: Upsert behavioral data to database
      console.log(`💾 Upserting ${processedTokens.length} tokens with behavioral data...`);
      
      for (const token of processedTokens) {
        try {
          await upsertToken(token as any);
          console.log(`✅ Upserted behavioral data for ${token.symbol}`);
        } catch (error) {
          console.error(`❌ Failed to upsert ${token.symbol}:`, error);
        }
        
        await sleep(50); // Small delay between database operations
      }

      console.log(`🎉 Behavioral crawl complete: ${processedTokens.length} tokens processed`);
      
    } catch (error) {
      console.error('❌ Behavioral crawl failed:', error);
    }
  }

  /**
   * Calculate behavioral metrics for a token
   * For MVP, this provides baseline metrics. Phase 2 will add real Helius analysis.
   */
  private async calculateBehavioralMetrics(tokenAddress: string, jupiterToken: any): Promise<BehavioralMetrics> {
    try {
      // Get token age from Jupiter service
      const tokenAge = this.jupiterService.calculateTokenAge(tokenAddress);
      const qualityScore = this.jupiterService.calculateBasicQualityScore(tokenAddress);
      
      // For MVP, simulate behavioral metrics based on token quality
      // These will be replaced with real transaction analysis in Phase 2
      const behavioralMetrics: BehavioralMetrics = {
        token_age_hours: tokenAge,
        volume_spike_ratio: 1.0 + (Math.random() * 0.5), // 1.0 to 1.5x baseline
        
        // Simulate whale activity based on quality score
        whale_buys_24h: Math.floor((qualityScore / 100) * Math.random() * 5),
        
        // Simulate holder growth based on token verification and age
        new_holders_24h: this.jupiterService.isVerifiedToken(tokenAddress) 
          ? Math.floor(Math.random() * 50) + 5 
          : Math.floor(Math.random() * 10)
      };

      return behavioralMetrics;
      
    } catch (error) {
      console.error(`Error calculating behavioral metrics for ${tokenAddress}:`, error);
      
      // Return default metrics on error
      return {
        token_age_hours: 24,
        volume_spike_ratio: 1.0,
        whale_buys_24h: 0,
        new_holders_24h: 0
      };
    }
  }

  /**
   * Enhanced crawl with Helius selective enrichment for high-priority tokens
   * This uses expensive APIs only on tokens that matter
   */
  async runEnhancedBehavioralCrawl(maxHeliusTokens: number = 10): Promise<void> {
    console.log('\n=== Starting Enhanced Behavioral Data Crawl ===');
    
    try {
      // Run basic behavioral crawl first
      await this.runBehavioralCrawl();
      
      // Then enhance top tokens with Helius data
      console.log(`🔍 Enhancing top ${maxHeliusTokens} tokens with Helius data...`);
      
      const allTokens = await this.jupiterService.getTokenUniverse();
      const priorityTokens = this.jupiterService.getPriorityTokens(allTokens, maxHeliusTokens);
      
      for (const tokenAddress of priorityTokens) {
        try {
          console.log(`🔄 Enhancing ${tokenAddress} with Helius...`);
          
          // Get additional metadata from Helius
          const heliusMetadata = await getHeliusMetadata(tokenAddress);
          
          // TODO: Add Helius transaction analysis here in Phase 2
          // This would include:
          // - Real whale transaction detection
          // - Actual holder count changes
          // - Volume spike analysis from transaction data
          
          if (heliusMetadata) {
            console.log(`✅ Enhanced ${tokenAddress} with Helius metadata`);
          }
          
          // Rate limiting for expensive API
          await sleep(500);
          
        } catch (error) {
          console.error(`❌ Error enhancing ${tokenAddress} with Helius:`, error);
        }
      }
      
      console.log('🎉 Enhanced behavioral crawl complete');
      
    } catch (error) {
      console.error('❌ Enhanced behavioral crawl failed:', error);
    }
  }

  /**
   * Start scheduled behavioral crawler
   */
  startScheduledCrawler(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      console.log('⚠️  Crawler is already running');
      return;
    }

    console.log(`🔄 Starting scheduled behavioral crawler (every ${intervalMinutes} minutes)...`);
    this.isRunning = true;

    // Run immediately
    this.runBehavioralCrawl();

    // Schedule regular runs
    const intervalMs = intervalMinutes * 60 * 1000;
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      this.runBehavioralCrawl();
    }, intervalMs);
  }

  /**
   * Stop the scheduled crawler
   */
  stopCrawler(): void {
    console.log('🛑 Stopping behavioral crawler...');
    this.isRunning = false;
  }

  /**
   * Get cache statistics from Jupiter service
   */
  getCacheStats(): any {
    return this.jupiterService.getCacheStats();
  }
}