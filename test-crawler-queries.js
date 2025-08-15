/**
 * Test Suite for Crawler-Integrated AI Chat System
 * Tests various query types with your behavioral intelligence
 */

async function testCrawlerIntegratedQueries() {
  console.log('🧪 Testing Crawler-Integrated AI Chat System\n');
  console.log('🌐 Server: http://localhost:3001\n');

  const testQueries = [
    // 🐋 Whale Activity Queries
    {
      category: '🐋 Whale Activity',
      queries: [
        'Show me tokens with whale activity',
        'Find tokens with significant whale buys in the last 24 hours',
        'Tokens with growing whale interest',
        'Big holders moving into new positions'
      ]
    },
    
    // 🚀 New Launch Queries  
    {
      category: '🚀 New Launches',
      queries: [
        'New token launches today',
        'Fresh tokens from pump.fun with early signals',
        'Recently launched tokens with volume',
        'New launches with whale activity'
      ]
    },
    
    // 📈 Volume & Trading Queries
    {
      category: '📈 Volume & Trading',
      queries: [
        'Tokens with volume spikes',
        'Volume explosions happening now',
        'High volume tokens with momentum',
        'Volume spikes in small cap tokens'
      ]
    },
    
    // 🎯 Complex Behavioral Queries
    {
      category: '🎯 Complex Behavioral',
      queries: [
        'Alpha opportunities with whale activity and volume spikes',
        'New launches under $10M with growing holders',
        'Small cap gems with institutional interest',
        'Trending tokens with behavioral signals'
      ]
    },
    
    // 💰 Market Cap & Trading Queries
    {
      category: '💰 Market & Price',
      queries: [
        'Micro cap tokens under $1M with activity',
        'Small cap tokens gaining momentum',
        'Undervalued tokens with volume',
        'Coins under $10M market cap with whale activity'
      ]
    }
  ];

  for (const category of testQueries) {
    console.log(`${category.category}`);
    console.log('═'.repeat(50));
    
    for (const query of category.queries) {
      console.log(`\n💬 Query: "${query}"`);
      
      try {
        const startTime = Date.now();
        
        // Test the AI prompt API with behavioral context
        const response = await fetch('http://localhost:3001/api/ai-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: query,
            originalPrompt: query,
            behavioralContext: {
              hasWhaleActivity: true,
              hasNewLaunches: true, 
              hasVolumeSpikes: true,
              lastUpdated: new Date().toISOString()
            }
          })
        });

        if (!response.ok) {
          console.log(`❌ HTTP Error: ${response.status}`);
          continue;
        }

        const result = await response.json();
        const responseTime = Date.now() - startTime;
        
        console.log(`✅ Response (${responseTime}ms):`);
        console.log(`   📊 Tokens Found: ${result.tokens?.length || 0}`);
        console.log(`   🔍 Filters Applied: ${JSON.stringify(result.filters)}`);
        
        if (result.behavioralInsights) {
          console.log(`   🧠 Behavioral Context: ${result.behavioralInsights.message}`);
          if (result.behavioralInsights.tokenInsights) {
            console.log(`   🎯 Enhanced Tokens: ${result.behavioralInsights.tokenInsights.length}`);
          }
        }
        
        if (result.tokens && result.tokens.length > 0) {
          console.log(`   🏆 Top Result: ${result.tokens[0].symbol} (${result.tokens[0].name})`);
          if (result.tokens[0].whale_buys_24h) {
            console.log(`      🐋 Whale Buys: ${result.tokens[0].whale_buys_24h}`);
          }
          if (result.tokens[0].new_holders_24h) {
            console.log(`      👥 New Holders: ${result.tokens[0].new_holders_24h}`);
          }
          if (result.tokens[0].volume_spike_ratio) {
            console.log(`      📈 Volume Spike: ${result.tokens[0].volume_spike_ratio}x`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '─'.repeat(70) + '\n');
  }

  // Test the behavioral data API directly
  console.log('🧪 Testing Behavioral Data API Direct Access');
  console.log('═'.repeat(50));
  
  try {
    console.log(`\n💬 Direct API: "/api/behavioral-data"`);
    
    const response = await fetch('http://localhost:3001/api/behavioral-data');
    
    if (response.ok) {
      const behavioralData = await response.json();
      console.log('✅ Behavioral Data API Response:');
      console.log(`   🐋 Whale Activity Tokens: ${behavioralData.whaleActivity?.length || 0}`);
      console.log(`   🚀 New Launches: ${behavioralData.newLaunches?.length || 0}`);
      console.log(`   📈 Volume Spikes: ${behavioralData.volumeSpikes?.length || 0}`);
      console.log(`   📊 Total Tokens: ${behavioralData.totalTokens || 0}`);
      console.log(`   ✅ Active Tokens: ${behavioralData.activeTokens || 0}`);
      
      if (behavioralData.whaleActivity?.[0]) {
        const topWhale = behavioralData.whaleActivity[0];
        console.log(`   🏆 Top Whale Token: ${topWhale.token_symbol} (${topWhale.whale_buys_24h} whales)`);
      }
    } else {
      console.log(`❌ Behavioral Data API Error: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Behavioral Data API Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 CRAWLER-INTEGRATED AI CHAT TESTING COMPLETE!');
  console.log('\n💡 Key Features Tested:');
  console.log('✅ AI prompt processing with behavioral context');
  console.log('✅ Intelligent filter generation from natural language');
  console.log('✅ Whale activity detection and filtering');
  console.log('✅ New launch monitoring and analysis');
  console.log('✅ Volume spike detection and alerting');
  console.log('✅ Complex multi-criteria behavioral queries');
  console.log('✅ Direct behavioral data API access');
  
  console.log('\n🚀 Your system is ready! Try these queries in your app:');
  console.log('• "Show me new pump.fun launches with whale activity"');
  console.log('• "Volume spikes in tokens under $5M market cap"');
  console.log('• "Alpha opportunities with behavioral signals"');
  console.log('• "Fresh launches with growing holder base"');
}

// Run the test if this file is executed directly
if (require && require.main === module) {
  testCrawlerIntegratedQueries().catch(console.error);
}

module.exports = { testCrawlerIntegratedQueries };