/**
 * Test just the whale activity analysis function
 */

import { HELIUS_API_KEY } from './config';

// Simplified whale analysis test
async function testWhaleAnalysis() {
  console.log('🐋 Testing whale activity analysis...');
  
  const usdcTokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const WHALE_THRESHOLD_USD = 10000;
  const testPriceUsd = 1; // USDC price
  
  try {
    // Get recent transactions directly from API
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${usdcTokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=100&type=TRANSFER`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      console.log('API Error:', response.status, await response.text());
      return;
    }
    
    const transactions = await response.json();
    console.log(`📊 Found ${transactions.length} transactions`);
    
    // Process transactions for whale activity
    let whaleTransactions = 0;
    let totalWhaleVolume = 0;
    
    // Filter last 24 hours
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - (24 * 3600);
    
    transactions.forEach((tx: any) => {
      if (tx.timestamp < dayAgo) return; // Skip old transactions
      
      if (tx.tokenTransfers) {
        tx.tokenTransfers.forEach((transfer: any) => {
          if (transfer.mint === usdcTokenAddress) {
            const tokenAmount = Math.abs(transfer.tokenAmount || 0);
            const amountUsd = tokenAmount * testPriceUsd;
            
            if (amountUsd >= WHALE_THRESHOLD_USD) {
              whaleTransactions++;
              totalWhaleVolume += amountUsd;
              console.log(`🐋 Whale transaction: $${amountUsd.toLocaleString()} USDC from ${transfer.fromUserAccount} to ${transfer.toUserAccount}`);
            }
          }
        });
      }
    });
    
    console.log(`\n📊 Results:`);
    console.log(`Whale transactions (24h): ${whaleTransactions}`);
    console.log(`Total whale volume: $${totalWhaleVolume.toLocaleString()}`);
    console.log(`Analysis working: ${whaleTransactions > 0 ? '✅ YES' : '⚠️ No whale activity detected'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWhaleAnalysis();