/**
 * Behavioral Launchpad Crawler - Refactored for BirdEye Data
 * Gets top 500 tokens by volume from BirdEye, then runs comprehensive behavioral analysis
 * Focuses on established tokens with proven volume + behavioral intelligence
 */

import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './services/birdeye';
import { HeliusBehavioralAnalyzer } from './services/helius-behavioral-analysis';
import { getHeliusMetadata } from './services/helius';
import { upsertToken } from './services/supabase';
import { sleep } from './utils';
import { CRAWL_INTERVAL_MS } from './config';
import { HeliusRateLimiter } from './services/rate-limiter';

interface ComprehensiveBehavioralToken {
  mint_address: string;
  name: string;
  symbol: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  liquidity: number;
  
  // Behavioral intelligence
  new_holders_24h: number;
  whale_buys_24h: number;
  volume_spike_ratio: number;
  token_age_hours: number;
  transaction_pattern_score: number;
  smart_money_score: number;
  
  // Quality metrics
  volume_rank: number;
  quality_score: number;
  risk_level: 'low' | 'medium' | 'high';
  
  source: 'birdeye_top' | 'birdeye_trending';
  priority_score: number;
  updated_at: string;
}

interface TradingSignals {
  // High-volume established tokens with behavioral analysis
  volumeLeaders: ComprehensiveBehavioralToken[];
  whaleActivity: ComprehensiveBehavioralToken[];
  holderGrowth: ComprehensiveBehavioralToken[];
  smartMoney: ComprehensiveBehavioralToken[];
  
  // Quality opportunities
  highQualityTokens: ComprehensiveBehavioralToken[];
  emergingOpportunities: ComprehensiveBehavioralToken[];
  
  // Critical alerts
  criticalOpportunities: ComprehensiveBehavioralToken[];
}

class BehavioralLaunchpadCrawler {
  private heliusAnalyzer: HeliusBehavioralAnalyzer;
  private rateLimiter: HeliusRateLimiter;
  private isRunning = false;

  constructor() {
    this.heliusAnalyzer = new HeliusBehavioralAnalyzer();
    this.rateLimiter = new HeliusRateLimiter();
    console.log('🚀 Behavioral Launchpad Crawler initialized');
    console.log('📡 Monitoring: Top 500 tokens by volume + Behavioral analysis');
  }

  /**
   * Comprehensive crawl using BirdEye data + behavioral analysis
   */
  async runComprehensiveCrawl(maxTokens: number = 100): Promise<TradingSignals> {
    console.log('\n=== Starting BirdEye + Behavioral Analysis Crawl ===');
    
    try {
      // Step 1: Get top tokens from BirdEye (complete market data)
      console.log('🔍 Phase 1: Fetching top tokens from BirdEye...');
      
      const [topTokens, trendingTokens] = await Promise.allSettled([
        getTopBirdEyeTokens(500),     // Top 500 by volume using V3 endpoint with pagination
        getTrendingBirdEyeTokens(20)  // Trending 20 tokens using V3 endpoint
      ]);

      await sleep(2000); // Rate limiting

      const birdEyeTokens = [
        ...(topTokens.status === 'fulfilled' ? topTokens.value : []),
        ...(trendingTokens.status === 'fulfilled' ? trendingTokens.value : [])
      ];

      console.log(`📊 Total BirdEye tokens: ${birdEyeTokens.length}`);

      // Step 2: Filter for quality tokens with VALID data
      const qualityTokens = birdEyeTokens.filter(token => {
        // Check that all required fields exist and are valid numbers
        const hasValidData = token.v24hUSD && 
                           token.liquidity && 
                           token.mc && 
                           token.price &&
                           typeof token.v24hUSD === 'number' &&
                           typeof token.liquidity === 'number' &&
                           typeof token.mc === 'number' &&
                           typeof token.price === 'number';
        
        // Apply quality thresholds only if data is valid
        if (!hasValidData) {
          console.log(`⚠️ Skipping token ${token.symbol || token.address.slice(0, 8)} - missing or invalid data`);
          return false;
        }
        
        return token.v24hUSD > 10000 &&      // $10k+ daily volume
               token.liquidity > 50000 &&    // $50k+ liquidity
               token.mc > 100000;            // $100k+ market cap
      });

      console.log(`✅ Quality tokens after filtering: ${qualityTokens.length}`);

      // Step 3: Sort by volume and take top tokens
      const topQualityTokens = qualityTokens
        .sort((a, b) => b.v24hUSD - a.v24hUSD)
        .slice(0, maxTokens);

      console.log(`🎯 Analyzing top ${topQualityTokens.length} quality tokens`);

      // Step 4: Run behavioral analysis on each token
      console.log('🧠 Phase 2: Running behavioral analysis...');
      const analyzedTokens: ComprehensiveBehavioralToken[] = [];

      for (let i = 0; i < topQualityTokens.length; i++) {
        const token = topQualityTokens[i];
        
        try {
          console.log(`🔄 [${i + 1}/${topQualityTokens.length}] Analyzing ${token.symbol || token.address.slice(0, 8)}...`);

          // Get metadata if missing
          let finalName = token.name;
          let finalSymbol = token.symbol;
          
          if (!finalName || finalName.startsWith('token-') || finalName.startsWith('Token-')) {
            try {
              await this.rateLimiter.waitForNextCall();
              const heliusMeta = await getHeliusMetadata(token.address);
              finalName = heliusMeta?.name || finalName;
              finalSymbol = heliusMeta?.symbol || finalSymbol;
            } catch (metadataError) {
              console.warn(`⚠️ Failed to get metadata for ${token.address}:`, metadataError);
              // Continue with existing name/symbol
            }
          }

          // Run comprehensive behavioral analysis with BirdEye market data
          let behavioralMetrics;
          try {
            // Pass the complete BirdEye market data to the analyzer
            const marketData = {
              symbol: finalSymbol,
              volume24h: token.v24hUSD,
              priceChange24h: token.v24hChangePercent || 0,
              marketCap: token.mc,
              liquidity: token.liquidity,
              price: token.price
            };
            
            behavioralMetrics = await this.heliusAnalyzer.analyzeBehavioralMetrics(
              token.address,
              token.price, // BirdEye provides real price data
              marketData   // Pass the complete market data for BirdEye-based analysis
            );
          } catch (behavioralError) {
            console.warn(`⚠️ Failed behavioral analysis for ${token.address}:`, behavioralError);
            // Use default metrics
            behavioralMetrics = {
              new_holders_24h: 0,
              whale_buys_24h: 0,
              volume_spike_ratio: 1.0,
              token_age_hours: 24,
              transaction_pattern_score: 0.5,
              smart_money_score: 0.5
            };
          }

          // Calculate quality and risk scores
          const qualityScore = this.calculateQualityScore(token, behavioralMetrics);
          const riskLevel = this.calculateRiskLevel(token, behavioralMetrics);
          const priorityScore = this.calculatePriorityScore(token, behavioralMetrics);

          // Create comprehensive token object
          const comprehensiveToken: ComprehensiveBehavioralToken = {
            mint_address: token.address,
            name: finalName || `Token-${token.address.slice(0, 8)}`,
            symbol: finalSymbol || `TKN${token.address.slice(0, 4)}`,
            price: token.price,
            price_change_24h: token.v24hChangePercent || 0,
            volume_24h: token.v24hUSD,
            market_cap: token.mc,
            liquidity: token.liquidity,
            
            // Behavioral intelligence
            new_holders_24h: behavioralMetrics.new_holders_24h,
            whale_buys_24h: behavioralMetrics.whale_buys_24h,
            volume_spike_ratio: behavioralMetrics.volume_spike_ratio,
            token_age_hours: behavioralMetrics.token_age_hours,
            transaction_pattern_score: behavioralMetrics.transaction_pattern_score,
            smart_money_score: behavioralMetrics.smart_money_score,
            
            // Quality metrics
            volume_rank: i + 1,
            quality_score: qualityScore,
            risk_level: riskLevel,
            
            source: i < 300 ? 'birdeye_top' : 'birdeye_trending',
            priority_score: priorityScore,
            updated_at: new Date().toISOString()
          };

          analyzedTokens.push(comprehensiveToken);

          // Rate limiting between tokens
          await this.rateLimiter.waitForNextCall();
          
          // Wait between batches (every 5 tokens)
          if ((i + 1) % 5 === 0) {
            console.log(`⏳ Batch ${Math.floor((i + 1) / 5)} complete, waiting for batch delay...`);
            await this.rateLimiter.waitForBatch();
          }

        } catch (error) {
          console.warn(`⚠️ Error analyzing token ${token.address}:`, error);
          // Continue with next token
        }
      }

      console.log(`✅ Successfully analyzed ${analyzedTokens.length} tokens`);
      
      if (analyzedTokens.length === 0) {
        console.log('⚠️ No tokens were analyzed - checking why...');
        return this.getEmptySignals();
      }
      
      console.log('📊 Sample analyzed token:', analyzedTokens[0]);

      // Step 5: Categorize tokens by signals
      const signals = this.categorizeTokens(analyzedTokens);

                // Step 6: Write to database
          console.log('💾 Writing analyzed tokens to database...');
          for (const token of analyzedTokens) {
            try {
              // Transform to match EnrichedToken interface with behavioral metrics
              const enrichedToken = {
                mint_address: token.mint_address,  // Required by EnrichedToken interface
                address: token.mint_address,       // Map to the correct database column
                name: token.name,
                symbol: token.symbol,
                market_cap: token.market_cap,
                volume_24h: token.volume_24h,
                liquidity: token.liquidity,
                price: token.price,
                price_change_24h: token.price_change_24h,
                
                // Include behavioral metrics
                whale_buys_24h: token.whale_buys_24h,
                new_holders_24h: token.new_holders_24h,
                volume_spike_ratio: token.volume_spike_ratio,
                token_age_hours: token.token_age_hours,
                
                aiScore: token.priority_score / 100, // Convert to 0-1 scale
                updatedAt: new Date().toISOString()
              };
              
              console.log(`💾 Writing token ${token.symbol} to database...`);
              await upsertToken(enrichedToken);
              console.log(`✅ Successfully wrote ${token.symbol} to database`);
            } catch (dbError) {
              console.error(`❌ Failed to write token ${token.symbol} to database:`, dbError);
            }
          }

      console.log(`✅ Database updated with ${analyzedTokens.length} tokens`);

      return signals;

    } catch (error) {
      console.error('❌ Error in comprehensive crawl:', error);
      return this.getEmptySignals();
    }
  }

  /**
   * Calculate quality score based on market data and behavioral metrics
   */
  private calculateQualityScore(token: any, behavioralMetrics: any): number {
    let score = 0;
    
    // Market data quality (40%)
    if (token.v24hUSD > 100000) score += 40;        // High volume
    else if (token.v24hUSD > 50000) score += 30;    // Medium volume
    else if (token.v24hUSD > 10000) score += 20;    // Low volume
    
    // Liquidity quality (30%)
    if (token.liquidity > 500000) score += 30;      // High liquidity
    else if (token.liquidity > 100000) score += 20; // Medium liquidity
    else if (token.liquidity > 50000) score += 10;  // Low liquidity
    
    // Behavioral quality (30%)
    if (behavioralMetrics.smart_money_score > 0.7) score += 30;
    else if (behavioralMetrics.smart_money_score > 0.4) score += 20;
    else if (behavioralMetrics.smart_money_score > 0.1) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate risk level based on various factors
   */
  private calculateRiskLevel(token: any, behavioralMetrics: any): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    // Volume stability
    if (token.v24hUSD < 50000) riskScore += 2;
    if (token.v24hUSD < 20000) riskScore += 2;
    
    // Liquidity risk
    if (token.liquidity < 100000) riskScore += 2;
    if (token.liquidity < 50000) riskScore += 2;
    
    // Behavioral risk
    if (behavioralMetrics.volume_spike_ratio > 5) riskScore += 2; // Extreme volatility
    if (behavioralMetrics.suspicious_activity) riskScore += 3;
    
    if (riskScore <= 3) return 'low';
    if (riskScore <= 6) return 'medium';
    return 'high';
  }

  /**
   * Calculate priority score for ranking
   */
  private calculatePriorityScore(token: any, behavioralMetrics: any): number {
    let score = 0;
    
    // Volume rank (40%)
    score += (100 - token.volume_rank) * 0.4;
    
    // Quality score (30%)
    score += token.quality_score * 0.3;
    
    // Behavioral signals (30%)
    score += behavioralMetrics.smart_money_score * 30;
    score += Math.min(behavioralMetrics.whale_buys_24h * 5, 30);
    
    return Math.min(score, 100);
  }

  /**
   * Categorize tokens by trading signals
   */
  private categorizeTokens(tokens: ComprehensiveBehavioralToken[]): TradingSignals {
    const signals: TradingSignals = {
      volumeLeaders: [],
      whaleActivity: [],
      holderGrowth: [],
      smartMoney: [],
      highQualityTokens: [],
      emergingOpportunities: [],
      criticalOpportunities: []
    };

    tokens.forEach(token => {
      // Volume leaders (top 50 by volume)
      if (token.volume_rank <= 50) {
        signals.volumeLeaders.push(token);
      }

      // Whale activity
      if (token.whale_buys_24h > 0) {
        signals.whaleActivity.push(token);
      }

      // Holder growth
      if (token.new_holders_24h > 10) {
        signals.holderGrowth.push(token);
      }

      // Smart money
      if (token.smart_money_score > 0.6) {
        signals.smartMoney.push(token);
      }

      // High quality
      if (token.quality_score > 80) {
        signals.highQualityTokens.push(token);
      }

      // Emerging opportunities
      if (token.volume_rank > 50 && token.volume_rank <= 200 && token.quality_score > 60) {
        signals.emergingOpportunities.push(token);
      }

      // Critical opportunities (high volume + high quality + smart money)
      if (token.volume_rank <= 100 && token.quality_score > 85 && token.smart_money_score > 0.7) {
        signals.criticalOpportunities.push(token);
      }
    });

    return signals;
  }

  /**
   * Quick analysis (top 50 tokens)
   */
  async runQuickAnalysis(): Promise<TradingSignals> {
    console.log('\n=== Quick Analysis (Top 50) ===');
    return await this.runComprehensiveCrawl(50);
  }

  /**
   * Deep analysis (top 200 tokens)
   */
  async runDeepAnalysis(): Promise<TradingSignals> {
    console.log('\n=== Deep Analysis (Top 200) ===');
    return await this.runComprehensiveCrawl(200);
  }

  /**
   * Full analysis (top 500 tokens)
   */
  async runFullAnalysis(): Promise<TradingSignals> {
    console.log('\n=== Full Analysis (Top 500) ===');
    return await this.runComprehensiveCrawl(500);
  }

  /**
   * Start scheduled comprehensive crawler
   */
  startScheduledCrawler(): void {
    if (this.isRunning) {
      console.log('⚠️  Crawler is already running');
      return;
    }

    console.log('🔄 Starting scheduled Behavioral Analysis Crawler...');
    console.log('Features:');
    console.log('✅ Top 500 tokens by volume from BirdEye');
    console.log('✅ Complete market data (price, volume, market cap)');
    console.log('✅ Comprehensive behavioral analysis via Helius');
    console.log('✅ Quality scoring and risk assessment');
    console.log('✅ Smart money detection and whale activity');
    console.log('✅ Priority ranking for trading decisions');
    console.log(`Crawl interval: ${CRAWL_INTERVAL_MS / 1000} seconds\n`);
    
    this.isRunning = true;

    // Run immediately
    this.runComprehensiveCrawl();

    // Schedule regular runs
    const schedule = () => {
      setTimeout(() => {
        if (this.isRunning) {
          this.runComprehensiveCrawl().then(schedule);
        }
      }, CRAWL_INTERVAL_MS);
    };
    
    schedule();
  }

  stopCrawler(): void {
    console.log('🛑 Stopping Behavioral Analysis Crawler...');
    this.isRunning = false;
  }

  private getEmptySignals(): TradingSignals {
    return {
      volumeLeaders: [], whaleActivity: [], holderGrowth: [], smartMoney: [],
      highQualityTokens: [], emergingOpportunities: [], criticalOpportunities: []
    };
  }
}

// Graceful shutdown
let crawler: BehavioralLaunchpadCrawler;

process.on('SIGINT', () => {
  console.log('\nShutting down Behavioral Launchpad Crawler...');
  if (crawler) crawler.stopCrawler();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Behavioral Launchpad Crawler...');
  if (crawler) crawler.stopCrawler();
  process.exit(0);
});

// Start crawler if run directly
crawler = new BehavioralLaunchpadCrawler();

console.log('🚀 Starting Behavioral Analysis Crawler...');
console.log('🎯 COMPLETE COVERAGE:');
console.log('✅ Top 500 tokens by volume from BirdEye');
console.log('✅ Complete market data (price, volume, market cap)');
console.log('✅ Comprehensive behavioral analysis via Helius');
console.log('✅ Quality scoring and risk assessment');
console.log('✅ Smart money detection and whale activity');
console.log('✅ Priority ranking for trading decisions');

const args = process.argv.slice(2);
if (args.includes('--quick')) {
  crawler.runQuickAnalysis();
} else if (args.includes('--deep')) {
  crawler.runDeepAnalysis();
} else if (args.includes('--full')) {
  crawler.runFullAnalysis();
} else {
  crawler.startScheduledCrawler();
}

export { BehavioralLaunchpadCrawler };