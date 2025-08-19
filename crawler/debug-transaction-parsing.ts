/**
 * Debug transaction parsing to see actual data structure
 */

import { HELIUS_API_KEY } from './config';

async function debugTransactionParsing() {
  console.log('🔍 Debugging transaction parsing...');
  
  const usdcTokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  
  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${usdcTokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=3&type=TRANSFER`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.ok) {
      const transactions = await response.json();
      console.log(`📊 Found ${transactions.length} transactions`);
      
      transactions.forEach((tx: any, index: number) => {
        console.log(`\n🔎 Transaction ${index + 1}:`);
        console.log('Signature:', tx.signature);
        console.log('Timestamp:', tx.timestamp, new Date(tx.timestamp * 1000).toISOString());
        console.log('Type:', tx.type);
        console.log('Description:', tx.description);
        
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          console.log('Token Transfers:');
          tx.tokenTransfers.forEach((transfer: any, i: number) => {
            console.log(`  Transfer ${i + 1}:`);
            console.log(`    Mint: ${transfer.mint}`);
            console.log(`    Amount: ${transfer.tokenAmount}`);
            console.log(`    From: ${transfer.fromUserAccount}`);
            console.log(`    To: ${transfer.toUserAccount}`);
            console.log(`    Is USDC transfer: ${transfer.mint === usdcTokenAddress}`);
          });
        } else {
          console.log('No token transfers found');
        }
        
        if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
          console.log('Native Transfers:');
          tx.nativeTransfers.forEach((transfer: any, i: number) => {
            console.log(`  Native ${i + 1}: ${transfer.amount} lamports from ${transfer.fromUserAccount} to ${transfer.toUserAccount}`);
          });
        }
      });
      
    } else {
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('Failed:', error);
  }
}

debugTransactionParsing();