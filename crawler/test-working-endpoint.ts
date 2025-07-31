import { BIRDEYE_API_KEY } from './config';

async function testWorkingEndpoint() {
  console.log('🧪 Testing the working BirdEye endpoint...');
  console.log('API Key:', BIRDEYE_API_KEY ? 'Set' : 'Not set');
  
  const url = 'https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=10&min_liquidity=100';
  
  try {
    console.log(`🔍 Testing: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': BIRDEYE_API_KEY || '',
      },
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json() as any;
      console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      
      if (data.data?.tokens && Array.isArray(data.data.tokens)) {
        console.log(`✅ Found ${data.data.tokens.length} tokens`);
        if (data.data.tokens.length > 0) {
          console.log('Sample token keys:', Object.keys(data.data.tokens[0]));
          console.log('Sample token:', JSON.stringify(data.data.tokens[0], null, 2));
        }
      }
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error(`❌ Error testing endpoint:`, error);
  }
}

testWorkingEndpoint(); 