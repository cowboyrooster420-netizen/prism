import { HELIUS_API_KEY } from './config';

// Test SOL token address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function testHeliusAPI() {
  console.log('🧪 Testing Helius API calls...');
  
  try {
    // Test holder count
    console.log('📊 Testing holder count...');
    const holderRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByMint',
        params: [SOL_MINT, { encoding: 'jsonParsed' }]
      })
    });
    
    if (holderRes.ok) {
      const holderData = await holderRes.json() as any;
      const accounts = holderData.result?.value || [];
      const holders = accounts.filter((acc: any) => {
        const bal = parseFloat(acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
        return bal > 0;
      }).length;
      console.log(`✅ SOL has ${holders} holders`);
    } else {
      console.error('❌ Holder count failed:', holderRes.status);
    }
    
    // Test metadata
    console.log('📝 Testing metadata...');
    const metaRes = await fetch(`https://api.helius.xyz/v0/token-metadata/by-mint/${SOL_MINT}?api-key=${HELIUS_API_KEY}`);
    
    if (metaRes.ok) {
      const metaData = await metaRes.json() as any;
      console.log(`✅ SOL metadata: ${metaData.onChainMetadata?.metadata?.data?.name || metaData.offChainMetadata?.name}`);
    } else {
      console.error('❌ Metadata failed:', metaRes.status);
    }
    
    // Test transaction count
    console.log('🔄 Testing transaction count...');
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const txRes = await fetch(`https://api.helius.xyz/v0/tokens/${SOL_MINT}/transfers?api-key=${HELIUS_API_KEY}&start=${oneDayAgo}&limit=1000`);
    
    if (txRes.ok) {
      const txData = await txRes.json() as any;
      const txCount = Array.isArray(txData) ? txData.length : 0;
      console.log(`✅ SOL had ${txCount} transfers in last 24h`);
    } else {
      console.error('❌ Transaction count failed:', txRes.status);
    }
    
  } catch (error) {
    console.error('❌ Helius API test failed:', error);
  }
}

testHeliusAPI(); 