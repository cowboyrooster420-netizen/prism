import { HELIUS_API_KEY } from './config';

// Test with SOL token address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function testHeliusHolders() {
  console.log('🧪 Testing Helius holder count API...');
  console.log('API Key:', HELIUS_API_KEY ? 'Set' : 'Not set');
  
  try {
    // Test holder count with SOL
    console.log('📊 Testing holder count for SOL...');
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByMint',
        params: [SOL_MINT, { encoding: 'jsonParsed' }]
      })
    });
    
    console.log('Response status:', res.status);
    const data = await res.json() as any;
    
    console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    if (data.result?.value) {
      const accounts = data.result.value;
      console.log(`Found ${accounts.length} total accounts`);
      
      // Count accounts with positive balance
      const holders = accounts.filter((acc: any) => {
        const bal = parseFloat(acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
        return bal > 0;
      });
      
      console.log(`Found ${holders.length} holders with positive balance`);
      
      if (holders.length > 0) {
        console.log('Sample holder:', JSON.stringify(holders[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Helius API test failed:', error);
  }
}

testHeliusHolders(); 