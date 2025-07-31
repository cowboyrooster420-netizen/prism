import { runHeliusEnrichment } from './services/helius-enrichment';

// Test with a known token (SOL)
async function testHeliusEnrichment() {
  console.log('🧪 Testing Helius enrichment with SOL token...');
  
  try {
    // Test the enrichment function
    await runHeliusEnrichment(1); // Process just 1 token
    
    console.log('✅ Helius enrichment test completed');
  } catch (error) {
    console.error('❌ Helius enrichment test failed:', error);
  }
}

testHeliusEnrichment(); 