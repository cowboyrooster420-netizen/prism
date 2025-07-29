import { Token } from '../types';

export function filterTokens(tokens: Token[]): Token[] {
  console.log(`Filtering ${tokens.length} tokens...`);
  
  const filtered = tokens.filter(token => {
    // Name-based filters
    const name = token.name?.toLowerCase() || '';
    const symbol = token.symbol?.toLowerCase() || '';
    
    const suspiciousTerms = ['rug', 'scam', 'fake', 'test', 'moon', 'safe'];
    const hasSuspiciousName = suspiciousTerms.some(term => 
      name.includes(term) || symbol.includes(term)
    );
    
    if (hasSuspiciousName) {
      console.log(`Filtered out suspicious token: ${token.name} (${token.symbol})`);
      return false;
    }
    
    // Community filters
    if (token.holder_count && token.holder_count < 20) {
      console.log(`Filtered out low holder count: ${token.name} (${token.holder_count} holders)`);
      return false;
    }
    
    // Volume filters
    if (token.volume_24h && token.volume_24h < 1000) {
      console.log(`Filtered out low volume: ${token.name} ($${token.volume_24h} volume)`);
      return false;
    }
    
    // Optional: Market cap filter
    if (token.market_cap && token.market_cap < 10000) {
      console.log(`Filtered out low market cap: ${token.name} ($${token.market_cap} MC)`);
      return false;
    }
    
    // Optional: Liquidity filter
    if (token.liquidity && token.liquidity < 500) {
      console.log(`Filtered out low liquidity: ${token.name} ($${token.liquidity} liquidity)`);
      return false;
    }
    
    return true;
  });
  
  console.log(`Filtered to ${filtered.length} tokens`);
  return filtered;
} 