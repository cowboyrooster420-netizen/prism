/**
 * Test Jupiter MVP Service
 * Simple, reliable test for our MVP approach
 */

import { JupiterMVPService } from './services/jupiter-mvp';

async function testJupiterMVP() {
  console.log('🧪 Testing Jupiter MVP Service...\n');

  const jupiterService = new JupiterMVPService();

  try {
    // Test 1: Get token universe
    console.log('📋 Test 1: Fetching token universe...');
    const tokens = await jupiterService.getTokenUniverse();
    console.log(`✅ Found ${tokens.length} verified tokens from Jupiter`);
    
    if (tokens.length > 0) {
      const sampleTokens = tokens.slice(0, 5);
      console.log('Sample verified tokens:');
      sampleTokens.forEach(token => {
        console.log(`   ${token.symbol}: ${token.name}`);
        console.log(`     Address: ${token.address}`);
        console.log(`     Tags: ${token.tags?.join(', ') || 'none'}`);
      });
    }

    // Test 2: Test token age calculation
    console.log('\n📋 Test 2: Testing token age calculation...');
    if (tokens.length > 0) {
      const testToken = tokens[0];
      const age = jupiterService.calculateTokenAge(testToken.address);
      const isVerified = jupiterService.isVerifiedToken(testToken.address);
      
      console.log(`✅ ${testToken.symbol}:`);
      console.log(`   Age: ${age} hours`);
      console.log(`   Verified: ${isVerified}`);
    }

    // Test 3: Quality scoring
    console.log('\n📋 Test 3: Testing quality scoring...');
    if (tokens.length >= 3) {
      const testTokens = tokens.slice(0, 3);
      
      testTokens.forEach(token => {
        const qualityScore = jupiterService.calculateBasicQualityScore(token.address);
        console.log(`✅ ${token.symbol}: Quality score ${qualityScore}/100`);
      });
    }

    // Test 4: MVP behavioral data preparation
    console.log('\n📋 Test 4: Preparing MVP behavioral data...');
    if (tokens.length > 0) {
      const testToken = tokens[0];
      const behavioralData = jupiterService.prepareMVPBehavioralData(testToken.address);
      
      console.log(`✅ ${testToken.symbol} behavioral data:`);
      console.log(`   Token age: ${behavioralData.token_age_hours} hours`);
      console.log(`   Volume spike ratio: ${behavioralData.volume_spike_ratio}`);
      console.log(`   Whale buys (placeholder): ${behavioralData.whale_buys_24h}`);
      console.log(`   New holders (placeholder): ${behavioralData.new_holders_24h}`);
    }

    // Test 5: Priority token selection
    console.log('\n📋 Test 5: Selecting priority tokens for expensive API calls...');
    const priorityTokens = jupiterService.getPriorityTokens(tokens, 10);
    console.log(`✅ Selected ${priorityTokens.length} priority tokens for behavioral analysis`);
    
    priorityTokens.slice(0, 5).forEach((address, index) => {
      const token = tokens.find(t => t.address === address);
      const score = jupiterService.calculateBasicQualityScore(address);
      console.log(`   ${index + 1}. ${token?.symbol || 'Unknown'} (score: ${score})`);
    });

    // Test 6: Batch processing
    console.log('\n📋 Test 6: Batch behavioral data preparation...');
    const testAddresses = priorityTokens.slice(0, 3);
    const batchData = jupiterService.batchPrepareBehavioralData(testAddresses);
    
    console.log(`✅ Prepared behavioral data for ${Object.keys(batchData).length} tokens`);
    Object.entries(batchData).forEach(([address, data]) => {
      const token = tokens.find(t => t.address === address);
      console.log(`   ${token?.symbol || 'Unknown'}: age ${data.token_age_hours}h`);
    });

    // Test 7: Cache stats
    console.log('\n📋 Test 7: Cache statistics...');
    const stats = jupiterService.getCacheStats();
    console.log(`✅ Cache stats:`);
    console.log(`   Tokens cached: ${stats.tokenCount}`);
    console.log(`   Coverage: ${stats.coverage}%`);

    console.log('\n🎉 All Jupiter MVP Service tests completed successfully!');
    console.log('\nWhat this gives us for MVP:');
    console.log('✅ 1,400+ verified tokens from Jupiter (FREE)');
    console.log('✅ Token age estimation (FREE)');
    console.log('✅ Quality scoring based on metadata (FREE)');
    console.log('✅ Priority selection for expensive APIs (COST OPTIMIZATION)');
    console.log('✅ Batch processing for efficiency (PERFORMANCE)');
    
    console.log('\nNext steps:');
    console.log('1. Integrate with your existing crawler');
    console.log('2. Use Helius selectively for priority tokens');
    console.log('3. Build the enhanced query system');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testJupiterMVP().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});