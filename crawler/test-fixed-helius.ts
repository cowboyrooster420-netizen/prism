/**
 * Test if the Helius API fixes work with a regular token
 */

import { HELIUS_API_KEY } from './config';

async function testFixedHelius() {
  // Test with BONK instead of USDC - regular token with lots of activity
  const testTokenAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
  
  console.log('🧪 Testing fixed Helius endpoints with BONK...');
  
  try {
    // Test 1: Fixed transactions endpoint (no 'before' parameter)
    console.log('\n1️⃣ Testing FIXED transactions endpoint...');
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${testTokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=10`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('Status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SUCCESS! Found ${data.length} transactions`);
      
      // Test transaction parsing
      if (data.length > 0) {
        const tx = data[0];
        console.log('Sample transaction:');
        console.log('- Signature:', tx.signature);
        console.log('- Token transfers:', tx.tokenTransfers?.length || 0);
        
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          const relevantTransfer = tx.tokenTransfers.find((transfer: any) => 
            transfer.mint === testTokenAddress
          );
          if (relevantTransfer) {
            console.log('- BONK amount:', relevantTransfer.amount);
            console.log('- From:', relevantTransfer.fromUserAccount?.slice(0, 8) + '...');
            console.log('- To:', relevantTransfer.toUserAccount?.slice(0, 8) + '...');
          }
        }
      }
    } else {
      console.log('❌ FAILED:', await response.text());
    }
    
    // Test 2: Holder count with RPC
    console.log('\n2️⃣ Testing holder count RPC...');
    const rpcResponse = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByMint',
        params: [testTokenAddress, { encoding: 'jsonParsed' }]
      })
    });
    
    console.log('RPC Status:', rpcResponse.status);
    if (rpcResponse.ok) {
      const rpcData = await rpcResponse.json();
      const accounts = rpcData.result?.value || [];
      console.log(`✅ SUCCESS! Found ${accounts.length} token accounts`);
      
      // Count holders with positive balance
      const holders = accounts.filter((acc: any) => {
        try {
          const balance = parseFloat(acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
          return balance > 0;
        } catch {
          return false;
        }
      }).length;
      
      console.log(`- Active holders: ${holders}`);
    } else {
      console.log('❌ RPC FAILED:', await rpcResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedHelius();