import { HELIUS_API_KEY } from './config';

// Test with SOL token address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function testHeliusDAS() {
  console.log('🧪 Testing Helius DAS API for holder information...');
  
  try {
    // Test 1: DAS searchAssets endpoint
    console.log('📊 Testing DAS searchAssets endpoint...');
    const dasRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'searchAssets',
        params: {
          ownerAddress: SOL_MINT,
          grouping: ['collection'],
          page: 1,
          limit: 1000
        }
      })
    });
    
    console.log('DAS response status:', dasRes.status);
    const dasData = await dasRes.json() as any;
    console.log('DAS response:', JSON.stringify(dasData, null, 2).substring(0, 500) + '...');
    
    // Test 2: Try a different approach - get token supply info
    console.log('\n📊 Testing token supply info...');
    const supplyRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [SOL_MINT]
      })
    });
    
    console.log('Supply response status:', supplyRes.status);
    const supplyData = await supplyRes.json() as any;
    console.log('Supply response:', JSON.stringify(supplyData, null, 2));
    
    // Test 3: Try using the token accounts endpoint with a different approach
    console.log('\n📊 Testing token accounts with different method...');
    const accountsRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          {
            filters: [
              {
                dataSize: 165
              },
              {
                memcmp: {
                  offset: 0,
                  bytes: SOL_MINT
                }
              }
            ]
          }
        ]
      })
    });
    
    console.log('Accounts response status:', accountsRes.status);
    const accountsData = await accountsRes.json() as any;
    console.log('Accounts response:', JSON.stringify(accountsData, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Helius DAS API test failed:', error);
  }
}

testHeliusDAS(); 