/**
 * Test the real behavioral analysis functions
 */

import { HeliusBehavioralAnalyzer } from './services/helius-behavioral-analysis';

async function testBehavioralAnalysisFunctions() {
  console.log('🧪 Testing Helius Behavioral Analysis Functions...');
  
  const analyzer = new HeliusBehavioralAnalyzer();
  
  // Test with a popular SPL token (USDC)
  const testTokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const testPriceUsd = 1; // USDC price
  
  try {
    console.log('\n🔬 Testing full behavioral analysis...');
    const result = await analyzer.analyzeBehavioralMetrics(testTokenAddress, testPriceUsd);
    
    console.log('\n📊 Results:');
    console.log(`Analysis Source: ${result.analysisSource}`);
    console.log(`Data Confidence: ${(result.dataConfidence * 100).toFixed(1)}%`);
    console.log(`Real Data Percentage: ${result.realDataPercentage.toFixed(1)}%`);
    console.log(`New Holders 24h: ${result.new_holders_24h}`);
    console.log(`Whale Buys 24h: ${result.whale_buys_24h}`);
    console.log(`Volume Spike Ratio: ${result.volume_spike_ratio.toFixed(2)}`);
    console.log(`Smart Money Score: ${result.smart_money_score.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBehavioralAnalysisFunctions();