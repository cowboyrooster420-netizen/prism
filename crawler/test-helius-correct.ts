import { HELIUS_API_KEY } from './config';

// Test with SOL token address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function testHeliusCorrect() {
  console.log('🧪 Testing correct Helius API endpoints...');
  
  try {
    // Test 1: Token metadata endpoint
    console.log('📊 Testing token metadata endpoint...');
    const metadataRes = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mintAccounts: [SOL_MINT],
        includeOffChain: true,
        disableCache: false
      })
    });
    
    console.log('Metadata response status:', metadataRes.status);
    const metadataData = await metadataRes.json() as any;
    console.log('Metadata response:', JSON.stringify(metadataData, null, 2).substring(0, 500) + '...');
    
    // Test 2: Token balances endpoint
    console.log('\n📊 Testing token balances endpoint...');
    const balancesRes = await fetch(`https://api.helius.xyz/v0/token-balances?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          mintAccounts: [SOL_MINT]
        }
      })
    });
    
    console.log('Balances response status:', balancesRes.status);
    const balancesData = await balancesRes.json() as any;
    console.log('Balances response:', JSON.stringify(balancesData, null, 2).substring(0, 500) + '...');
    
    // Test 3: Enhanced token metadata endpoint
    console.log('\n📊 Testing enhanced token metadata endpoint...');
    const enhancedRes = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mintAccounts: [SOL_MINT],
        includeOffChain: true,
        disableCache: false,
        includeHolderCount: true
      })
    });
    
    console.log('Enhanced response status:', enhancedRes.status);
    const enhancedData = await enhancedRes.json() as any;
    console.log('Enhanced response:', JSON.stringify(enhancedData, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('❌ Helius API test failed:', error);
  }
}

testHeliusCorrect(); 