/**
 * Quick test crawl to verify behavioral metrics are saved
 */

import { BehavioralLaunchpadCrawler } from './behavioral-launchpad-crawler';

// Override the class to limit tokens for quick testing
class QuickTestCrawler {
  private crawler: any;
  
  constructor() {
    // Import the crawler class directly
  }
  
  async testQuickCrawl() {
    console.log('🧪 Starting quick test crawl...');
    
    try {
      // Get just a few tokens for testing
      const { getTopBirdEyeTokens } = await import('./services/birdeye');
      const { HeliusBehavioralAnalyzer } = await import('./services/helius-behavioral-analysis');
      const { upsertToken } = await import('./services/supabase');
      
      console.log('🔍 Fetching 3 tokens from BirdEye...');
      const tokens = await getTopBirdEyeTokens(3);
      
      if (!tokens || tokens.length === 0) {
        console.log('❌ No tokens found from BirdEye');
        return;
      }
      
      console.log(`📊 Got ${tokens.length} tokens, analyzing first one...`);
      const testToken = tokens[0];
      
      // Analyze the first token with behavioral metrics
      const analyzer = new HeliusBehavioralAnalyzer();
      
      const marketData = {
        symbol: testToken.symbol || 'TEST',
        volume24h: testToken.v24hUSD || 0,
        priceChange24h: testToken.v24hChangePercent || 0,
        marketCap: testToken.mc || 0,
        liquidity: testToken.liquidity || 0,
        price: testToken.price || 0
      };
      
      console.log('🧠 Running behavioral analysis...');
      const behavioralMetrics = await analyzer.analyzeBehavioralMetrics(
        testToken.address,
        testToken.price,
        marketData
      );
      
      console.log('📈 Generated metrics:', {
        whale_buys: behavioralMetrics.whale_buys_24h,
        new_holders: behavioralMetrics.new_holders_24h,
        volume_spike: behavioralMetrics.volume_spike_ratio,
        token_age: behavioralMetrics.token_age_hours
      });
      
      // Create enriched token with behavioral metrics
      const enrichedToken = {
        mint_address: testToken.address,
        address: testToken.address,
        name: testToken.name || 'Test Token',
        symbol: testToken.symbol || 'TEST',
        market_cap: testToken.mc || 0,
        volume_24h: testToken.v24hUSD || 0,
        liquidity: testToken.liquidity || 0,
        price: testToken.price || 0,
        price_change_24h: testToken.v24hChangePercent || 0,
        
        // Include behavioral metrics
        whale_buys_24h: behavioralMetrics.whale_buys_24h,
        new_holders_24h: behavioralMetrics.new_holders_24h,
        volume_spike_ratio: behavioralMetrics.volume_spike_ratio,
        token_age_hours: behavioralMetrics.token_age_hours,
        
        updatedAt: new Date().toISOString()
      };
      
      console.log('💾 Saving to database...');
      const success = await upsertToken(enrichedToken);
      
      if (success) {
        console.log('✅ Token saved successfully with behavioral metrics!');
        console.log(`🎯 Test token: ${enrichedToken.symbol}`);
        console.log(`🐋 Whale buys: ${enrichedToken.whale_buys_24h}`);
        console.log(`📈 New holders: ${enrichedToken.new_holders_24h}`);
        console.log(`💥 Volume spike: ${enrichedToken.volume_spike_ratio}x`);
      } else {
        console.log('❌ Failed to save token');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
}

const testCrawler = new QuickTestCrawler();
testCrawler.testQuickCrawl();