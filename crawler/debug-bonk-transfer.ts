/**
 * Debug BONK token transfer structure to fix amount extraction
 */

import { HELIUS_API_KEY } from './config';

async function debugBONKTransfer() {
  const bonkAddress = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  
  console.log('🔍 Debugging BONK token transfer structure...');
  
  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${bonkAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=3`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.ok) {
      const transactions = await response.json();
      
      for (let i = 0; i < Math.min(2, transactions.length); i++) {
        const tx = transactions[i];
        console.log(`\n📝 Transaction ${i + 1}:`);
        console.log('Type:', tx.type);
        
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          console.log('🪙 All token transfers:');
          tx.tokenTransfers.forEach((transfer: any, idx: number) => {
            console.log(`Transfer ${idx + 1}:`, {
              mint: transfer.mint === bonkAddress ? 'BONK ✅' : transfer.mint?.slice(0, 8) + '...',
              amount: transfer.amount,
              tokenAmount: transfer.tokenAmount,
              uiTokenAmount: transfer.uiTokenAmount,
              fromUserAccount: transfer.fromUserAccount?.slice(0, 8) + '...',
              toUserAccount: transfer.toUserAccount?.slice(0, 8) + '...'
            });
          });
          
          // Test our extraction logic
          const relevantTransfer = tx.tokenTransfers.find((transfer: any) => 
            transfer.mint === bonkAddress
          );
          
          console.log('\n🎯 Extracted BONK transfer:', relevantTransfer ? {
            mint: 'BONK',
            amount: relevantTransfer.amount,
            tokenAmount: relevantTransfer.tokenAmount,
            uiTokenAmount: relevantTransfer.uiTokenAmount
          } : 'NOT FOUND');
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBONKTransfer();