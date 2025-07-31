import { HELIUS_API_KEY } from './config';

async function testHeliusSimple() {
  console.log('🧪 Testing Helius API with simple endpoints...');
  console.log('API Key:', HELIUS_API_KEY ? 'Set' : 'Not set');
  
  try {
    // Test basic RPC call
    console.log('📊 Testing basic RPC call...');
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth'
      })
    });
    
    console.log('Response status:', res.status);
    const data = await res.text();
    console.log('Response:', data.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Helius API test failed:', error);
  }
}

testHeliusSimple(); 