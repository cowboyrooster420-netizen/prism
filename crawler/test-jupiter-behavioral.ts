/**
 * Test Jupiter Behavioral Service
 * Run this to verify Jupiter APIs are working correctly
 */

import { JupiterBehavioralService } from './services/jupiter-behavioral';

async function testJupiterBehavioral() {
  console.log('🧪 Testing Jupiter Behavioral Service...\n');

  const jupiterService = new JupiterBehavioralService();

  try {
    // Test 1: Get token universe
    console.log('📋 Test 1: Fetching token universe...');
    const tokens = await jupiterService.getTokenUniverse();
    console.log(`✅ Found ${tokens.length} tokens`);
    
    if (tokens.length > 0) {
      const sampleTokens = tokens.slice(0, 3);
      console.log('Sample tokens:');
      sampleTokens.forEach(token => {
        console.log(`   ${token.symbol}: ${token.name} (${token.address})`);
      });
    }

    // Test 2: Get prices for some popular tokens
    console.log('\n📋 Test 2: Fetching prices...');
    const testAddresses = [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    ];
    
    const prices = await jupiterService.getPrices(testAddresses);
    console.log('✅ Price data:');
    Object.entries(prices).forEach(([address, price]) => {
      const symbol = address === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'USDC';
      console.log(`   ${symbol}: $${price}`);
    });

    // Test 3: Analyze liquidity depth for SOL
    console.log('\n📋 Test 3: Analyzing liquidity depth for SOL...');
    const solAddress = 'So11111111111111111111111111111111111111112';
    const liquidityData = await jupiterService.analyzeLiquidityDepth(solAddress);
    console.log('✅ Liquidity analysis:');
    console.log(`   Price impact $10K: ${liquidityData.price_impact_10k}%`);
    console.log(`   Price impact $50K: ${liquidityData.price_impact_50k}%`);
    console.log(`   Price impact $100K: ${liquidityData.price_impact_100k}%`);
    console.log(`   Route efficiency: ${liquidityData.route_efficiency} routes`);
    console.log(`   Liquidity score: ${liquidityData.liquidity_score}/100`);

    // Test 4: Collect behavioral metrics
    console.log('\n📋 Test 4: Collecting behavioral metrics for SOL...');
    const behavioralMetrics = await jupiterService.collectBehavioralMetrics(solAddress);
    console.log('✅ Behavioral metrics:');
    console.log(`   Token age: ${behavioralMetrics.token_age_hours} hours`);
    console.log(`   Whale activity score: ${behavioralMetrics.whale_buys_24h}`);
    console.log(`   Volume spike ratio: ${behavioralMetrics.volume_spike_ratio}`);
    console.log(`   New holders: ${behavioralMetrics.new_holders_24h}`);

    // Test 5: Test with a smaller token if available
    if (tokens.length > 10) {
      console.log('\n📋 Test 5: Testing with smaller token...');
      const smallerToken = tokens[10]; // Pick a token further down the list
      console.log(`Testing with ${smallerToken.symbol} (${smallerToken.address})`);
      
      const smallTokenMetrics = await jupiterService.collectBehavioralMetrics(smallerToken.address);
      console.log('✅ Smaller token metrics:');
      console.log(`   ${smallerToken.symbol} whale activity: ${smallTokenMetrics.whale_buys_24h}`);
      console.log(`   ${smallerToken.symbol} age: ${smallTokenMetrics.token_age_hours} hours`);
    }

    console.log('\n🎉 All Jupiter Behavioral Service tests completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Integrate this service into your existing crawler');
    console.log('2. Start populating behavioral data in the database');
    console.log('3. Build the enhanced query system');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testJupiterBehavioral().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});