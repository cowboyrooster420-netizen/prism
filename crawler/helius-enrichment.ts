import { runHeliusEnrichment } from './services/helius-enrichment-fixed';

console.log('🚀 Starting Helius Token Enrichment...');
console.log('This will enrich existing tokens with holder counts and transaction data');

runHeliusEnrichment()
  .then(() => {
    console.log('✅ Helius enrichment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Helius enrichment failed:', error);
    process.exit(1);
  }); 