import { MORALIS_API_KEY } from './config';

// Test with a known token address
const TEST_MINT = '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN'; // This is the one from your example

async function testMoralisAPI() {
  console.log('🧪 Testing Moralis API...');
  console.log('API Key:', MORALIS_API_KEY ? 'Set' : 'Not set');
  
  try {
    // Test holder count endpoint
    console.log('📊 Testing holder count endpoint...');
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
    };

    const response = await fetch(`https://solana-gateway.moralis.io/token/mainnet/holders/${TEST_MINT}`, options);
    
    console.log('Response status:', response.status);
    const data = await response.json() as any;
    
    console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    // Try to extract holder count
    let holderCount = 0;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.result)) {
        holderCount = data.result.length;
      } else if (data.result && Array.isArray(data.result)) {
        holderCount = data.result.length;
      } else if (typeof data.count === 'number') {
        holderCount = data.count;
      } else if (typeof data.total === 'number') {
        holderCount = data.total;
      }
    }
    
    console.log(`📈 Extracted holder count: ${holderCount}`);
    
  } catch (error) {
    console.error('❌ Moralis API test failed:', error);
  }
}

testMoralisAPI(); 