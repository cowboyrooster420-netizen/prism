/**
 * Test the new BirdEye-based behavioral analysis
 */

import { HeliusBehavioralAnalyzer } from './services/helius-behavioral-analysis';

async function testBehavioralAnalysis() {
  console.log('🧪 Testing BirdEye-based behavioral analysis...');
  
  const analyzer = new HeliusBehavioralAnalyzer();
  
  // Test with sample market data that should generate realistic metrics
  const testMarketData = {
    symbol: 'TESTCOIN',
    volume24h: 250000, // $250k volume
    priceChange24h: 15, // +15% price change
    marketCap: 2000000, // $2M market cap
    liquidity: 85000, // $85k liquidity
    price: 0.5
  };
  
  console.log('📊 Test market data:', testMarketData);
  
  try {
    const metrics = await analyzer.analyzeBehavioralMetrics(
      'TEST1234567890', // dummy address
      0.5, // price
      testMarketData
    );
    
    console.log('\n✅ Generated behavioral metrics:');
    console.log(`🐋 Whale buys: ${metrics.whale_buys_24h}`);
    console.log(`📈 New holders: ${metrics.new_holders_24h}`);
    console.log(`💥 Volume spike: ${metrics.volume_spike_ratio}x`);
    console.log(`⏰ Token age: ${metrics.token_age_hours}h`);
    console.log(`🔍 Pattern score: ${metrics.transaction_pattern_score}`);
    console.log(`💰 Smart money: ${metrics.smart_money_score}`);
    
    // Test that metrics are realistic (non-zero)
    if (metrics.whale_buys_24h > 0 || metrics.new_holders_24h > 0 || metrics.volume_spike_ratio > 1.1) {
      console.log('\n✅ SUCCESS: Behavioral metrics are being generated correctly!');
      console.log('🎯 The issue was that market data wasn\'t being passed to the analyzer');
    } else {
      console.log('\n❌ FAILED: Metrics are still zero/default values');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBehavioralAnalysis();