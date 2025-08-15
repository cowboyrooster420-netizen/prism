/**
 * Test the TokenCard reason analyzer with sample data
 */

import { analyzeTokenReasons } from './src/lib/tokenReasonAnalyzer';

// Test different types of tokens
const testTokens = [
  {
    symbol: 'HOTTOKEN',
    price_change_24h: 45,
    volume_24h: 2500000,
    whale_buys_24h: 15,
    new_holders_24h: 850,
    volume_spike_ratio: 8.5,
    token_age_hours: 6,
    smart_money_score: 0.9
  },
  {
    symbol: 'STEADYTOKEN', 
    price_change_24h: 5,
    volume_24h: 150000,
    whale_buys_24h: 3,
    new_holders_24h: 45,
    volume_spike_ratio: 1.2,
    token_age_hours: 120,
    smart_money_score: 0.7
  },
  {
    symbol: 'PUMPTOKEN',
    price_change_24h: 150,
    volume_24h: 5000000, 
    whale_buys_24h: 8,
    new_holders_24h: 1200,
    volume_spike_ratio: 25,
    token_age_hours: 2,
    smart_money_score: 0.3
  }
];

console.log('🎯 Testing TokenCard Reason Analyzer\n');

testTokens.forEach(token => {
  console.log(`📊 ${token.symbol}:`);
  console.log(`   Price Change: +${token.price_change_24h}%`);
  console.log(`   Volume: $${(token.volume_24h / 1000000).toFixed(1)}M`);
  console.log(`   Whale Buys: ${token.whale_buys_24h}`);
  console.log(`   New Holders: ${token.new_holders_24h}`);
  console.log(`   Volume Spike: ${token.volume_spike_ratio}x`);
  console.log(`   Age: ${token.token_age_hours}h`);
  
  const reasons = analyzeTokenReasons(token);
  console.log('   Reasons:');
  reasons.forEach(reason => {
    console.log(`   🔵 ${reason.color.toUpperCase()} DOT - ${reason.text}`);
  });
  console.log('');
});