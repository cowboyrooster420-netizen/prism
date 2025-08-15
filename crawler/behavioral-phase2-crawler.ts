/**
 * Behavioral Phase 2 Crawler
 * Combines Jupiter token discovery with real Helius behavioral analysis
 * Provides production-grade behavioral intelligence for go-to-market
 */

import { JupiterMVPService } from './services/jupiter-mvp';
import { HeliusBehavioralAnalyzer } from './services/helius-behavioral-analysis';
import { VolumePrioritizer } from './services/volume-prioritizer';
import { getHeliusMetadata } from './services/helius';
import { upsertToken } from './services/supabase';
import { sleep } from './utils';
import { CRAWL_INTERVAL_MS } from './config';

interface Phase2BehavioralToken {
  mint_address: string;
  name: string;
  symbol: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  liquidity: number;
  
  // Real behavioral intelligence from Helius
  new_holders_24h: number;
  whale_buys_24h: number;
  volume_spike_ratio: number;
  token_age_hours: number;
  transaction_pattern_score: number;
  smart_money_score: number;
  
  updated_at: string;
}

interface BehavioralSignals {
  volumeSpikes: Phase2BehavioralToken[];
  whaleActivity: Phase2BehavioralToken[];
  holderGrowth: Phase2BehavioralToken[];
  smartMoney: Phase2BehavioralToken[];
  newTokens: Phase2BehavioralToken[];
}

class BehavioralPhase2Crawler {
  private jupiterService: JupiterMVPService;
  private heliusAnalyzer: HeliusBehavioralAnalyzer;
  private volumePrioritizer: VolumePrioritizer;
  private isRunning = false;

  constructor() {
    this.jupiterService = new JupiterMVPService();
    this.heliusAnalyzer = new HeliusBehavioralAnalyzer();
    this.volumePrioritizer = new VolumePrioritizer();
    console.log('🚀 Behavioral Phase 2 Crawler initialized with volume-based prioritization');
  }

  /**
   * Main crawling function with real Helius behavioral analysis
   */
  async runPhase2BehavioralCrawl(maxTokensToAnalyze: number = 25): Promise<BehavioralSignals> {
    console.log('\n=== Starting Phase 2 Behavioral Intelligence Crawl ===');
    
    try {
      // Step 1: Volume-Based Token Prioritization (FOCUS ON TOP 500 BY VOLUME)
      console.log('📈 Phase 1: Volume-Based Token Prioritization...');
      console.log(`🎯 Targeting top ${maxTokensToAnalyze} tokens by 24h volume for behavioral analysis`);
      
      // Get top tokens by volume (this is our new prioritization strategy)
      const volumeBasedTokens = await this.volumePrioritizer.getBehavioralVolumeTargets(maxTokensToAnalyze);
      
      // Get full volume token data for context
      const volumeTokenData = await this.volumePrioritizer.getVolumeBasedPriority(maxTokensToAnalyze);
      
      const tokensToAnalyze = volumeBasedTokens;
      
      console.log(`✅ Selected ${tokensToAnalyze.length} tokens for deep behavioral analysis`);

      // Step 2: Real Behavioral Analysis with Helius
      console.log('🧠 Phase 2: Deep Behavioral Analysis...');
      const enhancedTokens: Phase2BehavioralToken[] = [];
      
      for (let i = 0; i < tokensToAnalyze.length; i++) {
        const tokenAddress = tokensToAnalyze[i];
        
        try {
          console.log(`🔄 [${i + 1}/${tokensToAnalyze.length}] Analyzing ${tokenAddress}...`);

          // Get volume token data (includes BirdEye market data)
          const volumeToken = volumeTokenData.find(t => t.address === tokenAddress);
          
          // Run Helius behavioral analysis (the real magic!)
          const behavioralMetrics = await this.heliusAnalyzer.analyzeBehavioralMetrics(
            tokenAddress,
            volumeToken?.price
          );

          // Enhanced metadata from Helius if needed (fallback only)
          let tokenName = volumeToken?.name;
          let tokenSymbol = volumeToken?.symbol;
          
          if (!tokenName || tokenName.startsWith('token-') || tokenName.startsWith('Token-')) {
            const heliusMetadata = await getHeliusMetadata(tokenAddress);
            tokenName = heliusMetadata?.name || tokenName;
            tokenSymbol = heliusMetadata?.symbol || tokenSymbol;
            await sleep(200); // Rate limit
          }

          // Create enhanced token with real behavioral intelligence
          const enhancedToken: Phase2BehavioralToken = {
            mint_address: tokenAddress,
            name: tokenName || `Token-${tokenAddress.slice(0, 8)}`,
            symbol: tokenSymbol || `TKN${tokenAddress.slice(0, 4)}`,
            price: volumeToken?.price || 0,
            price_change_24h: volumeToken?.priceChange24h || 0,
            volume_24h: volumeToken?.volume24h || 0,
            market_cap: volumeToken?.marketCap || 0,
            liquidity: volumeToken?.liquidity || 0,
            
            // Real behavioral intelligence from Helius
            new_holders_24h: behavioralMetrics.new_holders_24h,
            whale_buys_24h: behavioralMetrics.whale_buys_24h,
            volume_spike_ratio: behavioralMetrics.volume_spike_ratio,
            token_age_hours: behavioralMetrics.token_age_hours,
            transaction_pattern_score: behavioralMetrics.transaction_pattern_score,
            smart_money_score: behavioralMetrics.smart_money_score,
            
            updated_at: new Date().toISOString(),
          };

          enhancedTokens.push(enhancedToken);
          
          console.log(`✅ ${tokenSymbol}: whales=${behavioralMetrics.whale_buys_24h}, holders=+${behavioralMetrics.new_holders_24h}, spike=${behavioralMetrics.volume_spike_ratio.toFixed(2)}x`);
          
          // Rate limiting for API calls
          await sleep(1000); // 1 second between deep analyses
          
        } catch (error) {
          console.error(`❌ Error analyzing ${tokenAddress}:`, error);
        }
      }

      // Step 3: Database persistence
      console.log(`💾 Phase 3: Persisting ${enhancedTokens.length} tokens with behavioral intelligence...`);
      
      for (const token of enhancedTokens) {
        try {
          await upsertToken(token as any);
          await sleep(100);
        } catch (error) {
          console.error(`❌ Failed to upsert ${token.symbol}:`, error);
        }
      }

      // Step 4: Generate behavioral signals
      const behavioralSignals = this.generateBehavioralSignals(enhancedTokens);
      
      console.log(`🎉 Phase 2 behavioral crawl complete: ${enhancedTokens.length} tokens analyzed`);
      this.printBehavioralIntelligence(behavioralSignals);
      
      return behavioralSignals;

    } catch (error) {
      console.error('❌ Phase 2 behavioral crawl failed:', error);
      return this.getEmptySignals();
    }
  }

  /**
   * Generate behavioral signals for natural language queries
   */
  private generateBehavioralSignals(tokens: Phase2BehavioralToken[]): BehavioralSignals {
    return {
      volumeSpikes: tokens
        .filter(t => t.volume_spike_ratio > 2.0)
        .sort((a, b) => b.volume_spike_ratio - a.volume_spike_ratio)
        .slice(0, 10),
        
      whaleActivity: tokens
        .filter(t => t.whale_buys_24h > 2)
        .sort((a, b) => b.whale_buys_24h - a.whale_buys_24h)
        .slice(0, 10),
        
      holderGrowth: tokens
        .filter(t => t.new_holders_24h > 20)
        .sort((a, b) => b.new_holders_24h - a.new_holders_24h)
        .slice(0, 10),
        
      smartMoney: tokens
        .filter(t => t.smart_money_score > 5)
        .sort((a, b) => b.smart_money_score - a.smart_money_score)
        .slice(0, 10),
        
      newTokens: tokens
        .filter(t => t.token_age_hours < 72)
        .sort((a, b) => a.token_age_hours - b.token_age_hours)
        .slice(0, 10)
    };
  }

  /**
   * Print comprehensive behavioral intelligence summary
   */
  private printBehavioralIntelligence(signals: BehavioralSignals): void {
    console.log('\n🧠 === BEHAVIORAL INTELLIGENCE SUMMARY ===');
    
    console.log(`\n🔥 Volume Spikes (${signals.volumeSpikes.length} tokens):`);
    signals.volumeSpikes.slice(0, 5).forEach(token => {
      console.log(`   ${token.symbol}: ${token.volume_spike_ratio.toFixed(2)}x spike ($${token.volume_24h?.toLocaleString()})`);
    });
    
    console.log(`\n🐋 Whale Activity (${signals.whaleActivity.length} tokens):`);
    signals.whaleActivity.slice(0, 5).forEach(token => {
      console.log(`   ${token.symbol}: ${token.whale_buys_24h} whale buys (score: ${token.transaction_pattern_score})`);
    });
    
    console.log(`\n📈 Holder Growth (${signals.holderGrowth.length} tokens):`);
    signals.holderGrowth.slice(0, 5).forEach(token => {
      console.log(`   ${token.symbol}: +${token.new_holders_24h} new holders (${token.token_age_hours}h old)`);
    });
    
    console.log(`\n🎯 Smart Money Activity (${signals.smartMoney.length} tokens):`);
    signals.smartMoney.slice(0, 5).forEach(token => {
      console.log(`   ${token.symbol}: ${token.smart_money_score} smart money score (${token.whale_buys_24h} whales)`);
    });
    
    console.log(`\n🆕 New Tokens (${signals.newTokens.length} tokens):`);
    signals.newTokens.slice(0, 5).forEach(token => {
      console.log(`   ${token.symbol}: ${token.token_age_hours}h old (+${token.new_holders_24h} holders, ${token.whale_buys_24h} whales)`);
    });

    console.log('\n✅ Ready for natural language queries like:');
    console.log('   • "Show me tokens with whale activity and volume spikes"');
    console.log('   • "Find new tokens with growing holder base"');
    console.log('   • "Tokens with smart money activity in the last 24h"');
    console.log('   • "Volume spikes over 3x with whale buying"');
  }

  /**
   * Run quick behavioral scan (lighter version for frequent monitoring)
   */
  async runQuickBehavioralScan(): Promise<BehavioralSignals> {
    console.log('\n=== Quick Behavioral Scan ===');
    return await this.runPhase2BehavioralCrawl(10); // Analyze fewer tokens
  }

  /**
   * Run deep behavioral analysis (comprehensive version for periodic deep dives)
   */
  async runDeepBehavioralAnalysis(): Promise<BehavioralSignals> {
    console.log('\n=== Deep Behavioral Analysis ===');
    return await this.runPhase2BehavioralCrawl(50); // Analyze more tokens
  }

  /**
   * Start scheduled Phase 2 crawler
   */
  startScheduledCrawler(): void {
    if (this.isRunning) {
      console.log('⚠️  Crawler is already running');
      return;
    }

    console.log('🔄 Starting scheduled Phase 2 behavioral crawler...');
    console.log('Features:');
    console.log('✅ Real whale transaction detection via Helius');
    console.log('✅ Actual holder count analysis');
    console.log('✅ Volume spike detection from blockchain data');
    console.log('✅ Smart money pattern recognition');
    console.log('✅ Transaction pattern analysis');
    console.log(`Crawl interval: ${CRAWL_INTERVAL_MS / 1000} seconds\n`);
    
    this.isRunning = true;

    // Run immediately
    this.runPhase2BehavioralCrawl();

    // Schedule regular runs
    const schedule = () => {
      setTimeout(() => {
        if (this.isRunning) {
          this.runPhase2BehavioralCrawl().then(schedule);
        }
      }, CRAWL_INTERVAL_MS);
    };
    
    schedule();
  }

  /**
   * Stop the crawler
   */
  stopCrawler(): void {
    console.log('🛑 Stopping Phase 2 behavioral crawler...');
    this.isRunning = false;
  }

  private getEmptySignals(): BehavioralSignals {
    return {
      volumeSpikes: [],
      whaleActivity: [],
      holderGrowth: [],
      smartMoney: [],
      newTokens: []
    };
  }
}

// Graceful shutdown handlers
let crawler: BehavioralPhase2Crawler;

process.on('SIGINT', () => {
  console.log('\nShutting down Phase 2 crawler...');
  if (crawler) {
    crawler.stopCrawler();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Phase 2 crawler...');
  if (crawler) {
    crawler.stopCrawler();
  }
  process.exit(0);
});

// Start the crawler if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  crawler = new BehavioralPhase2Crawler();
  
  console.log('🚀 Starting Phase 2 Behavioral Intelligence Crawler...');
  console.log('🧠 PRODUCTION-GRADE BEHAVIORAL ANALYSIS:');
  console.log('✅ Real whale transaction detection ($10k+ trades)');
  console.log('✅ Actual holder count changes via Helius DAS');
  console.log('✅ Volume spike analysis from blockchain data');
  console.log('✅ Smart money pattern recognition');
  console.log('✅ Bot trading detection');
  console.log('✅ Liquidity event tracking');
  console.log('✅ Suspicious activity detection\n');
  
  // Offer different running modes
  const args = process.argv.slice(2);
  if (args.includes('--quick')) {
    crawler.runQuickBehavioralScan();
  } else if (args.includes('--deep')) {
    crawler.runDeepBehavioralAnalysis();
  } else {
    crawler.startScheduledCrawler();
  }
}

export { BehavioralPhase2Crawler };