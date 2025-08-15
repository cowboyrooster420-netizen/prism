/**
 * Detailed Helius API analysis to understand transaction structure
 */

import { HELIUS_API_KEY } from './config';

async function analyzeHeliusData() {
  // Test with BONK - should have lots of activity
  const testTokenAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
  
  console.log('🔍 Analyzing Helius transaction data structure...');
  
  try {
    // Get recent transactions for BONK
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${testTokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=3`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.ok) {
      const transactions = await response.json();
      console.log(`Found ${transactions.length} transactions for BONK`);
      
      for (let i = 0; i < Math.min(2, transactions.length); i++) {
        const tx = transactions[i];
        console.log(`\n📝 Transaction ${i + 1}:`);
        console.log('Signature:', tx.signature);
        console.log('Timestamp:', tx.timestamp, new Date(tx.timestamp * 1000));
        console.log('Type:', tx.type);
        console.log('Description:', tx.description);
        
        // Check token transfers
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          console.log('🪙 Token Transfers:');
          tx.tokenTransfers.forEach((transfer: any, idx: number) => {
            console.log(`  Transfer ${idx + 1}:`, {
              mint: transfer.mint,
              amount: transfer.tokenAmount,
              fromUserAccount: transfer.fromUserAccount,
              toUserAccount: transfer.toUserAccount
            });
          });
        }
        
        // Check native transfers  
        if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
          console.log('💰 Native Transfers:');
          tx.nativeTransfers.forEach((transfer: any, idx: number) => {
            console.log(`  Native ${idx + 1}:`, {
              amount: transfer.amount,
              fromUserAccount: transfer.fromUserAccount,
              toUserAccount: transfer.toUserAccount
            });
          });
        }
        
        // Check events
        if (tx.events) {
          console.log('📅 Events:');
          Object.keys(tx.events).forEach(eventType => {
            console.log(`  ${eventType}:`, tx.events[eventType]);
          });
        }
      }
    } else {
      console.log('Error:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

analyzeHeliusData();