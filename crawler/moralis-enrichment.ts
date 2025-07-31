import { runMoralisEnrichment } from './services/moralis-enrichment';

console.log('🚀 Starting Moralis Token Enrichment...');
console.log('This will enrich existing tokens with holder counts and metadata from Moralis');

runMoralisEnrichment()
  .then(() => {
    console.log('✅ Moralis enrichment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Moralis enrichment failed:', error);
    process.exit(1);
  }); 