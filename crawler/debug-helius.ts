/**
 * Debug Helius API to see why behavioral metrics are zero
 */

import { HELIUS_API_KEY } from './config';

async function testHeliusAPI() {
  // Test with a popular token like SOL
  const testTokenAddress = 'So11111111111111111111111111111111111111112'; // SOL
  
  console.log('🔍 Testing Helius API endpoints...');
  console.log('API Key:', HELIUS_API_KEY ? `${HELIUS_API_KEY.slice(0, 8)}...` : 'MISSING');
  
  try {
    // Test 1: Basic token transactions
    console.log('\n1️⃣ Testing transactions endpoint...');
    const txResponse = await fetch(
      `https://api.helius.xyz/v0/addresses/${testTokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=5`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('Transactions response status:', txResponse.status);
    if (txResponse.ok) {
      const txData = await txResponse.json();
      console.log('Transactions found:', txData.length);
      if (txData.length > 0) {
        console.log('Sample transaction keys:', Object.keys(txData[0]));
      }
    } else {
      console.log('Transactions error:', await txResponse.text());
    }
    
    // Test 2: Token holders using DAS
    console.log('\n2️⃣ Testing token holders endpoint...');
    const holdersResponse = await fetch(
      `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAccounts: [testTokenAddress]
        })
      }
    );
    
    console.log('Holders response status:', holdersResponse.status);
    if (holdersResponse.ok) {
      const holdersData = await holdersResponse.json();
      console.log('Holders data:', holdersData);
    } else {
      console.log('Holders error:', await holdersResponse.text());
    }
    
    // Test 3: Alternative endpoint for token accounts
    console.log('\n3️⃣ Testing token accounts endpoint...');
    const accountsResponse = await fetch(
      `https://api.helius.xyz/v0/tokens/${testTokenAddress}/accounts?api-key=${HELIUS_API_KEY}&limit=10`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('Accounts response status:', accountsResponse.status);
    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      console.log('Token accounts found:', accountsData.length || 'N/A');
      if (accountsData.length > 0) {
        console.log('Sample account keys:', Object.keys(accountsData[0]));
      }
    } else {
      console.log('Accounts error:', await accountsResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

testHeliusAPI();