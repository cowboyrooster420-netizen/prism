import { Token, EnrichedToken } from '../types';
import { sleep } from '../utils/sleep';

export async function enrichToken(token: Token): Promise<EnrichedToken | null> {
  try {
    const enriched: EnrichedToken = {
      ...token,
      aiScore: await calculateAIScore(token),
      updatedAt: new Date().toISOString(),
    };

    // Add market metrics
    enriched.marketMetrics = await getMarketMetrics(token.mint_address);
    
    // Add social metrics (if available)
    enriched.socialMetrics = await getSocialMetrics(token.symbol);
    
    // Add technical indicators
    enriched.technicalMetrics = await getTechnicalMetrics(token.mint_address);

    console.log(`Enriched token: ${token.name} (${token.symbol}) - AI Score: ${enriched.aiScore.toFixed(2)}`);
    return enriched;
  } catch (error) {
    console.error(`Failed to enrich token ${token.mint_address}:`, error);
    return null; // Return null to skip this token
  }
}

async function calculateAIScore(token: Token): Promise<number> {
  // This could integrate with your existing AI system
  // For now, we'll use a simple scoring algorithm
  const factors = [
    // Normalize holder count (0-1 scale)
    Math.min((token.holder_count || 0) / 1000, 1),
    // Normalize volume (0-1 scale)
    Math.min((token.volume_24h || 0) / 100000, 1),
    // Normalize market cap (0-1 scale)
    Math.min((token.market_cap || 0) / 1000000, 1),
    // Normalize liquidity (0-1 scale)
    Math.min((token.liquidity || 0) / 10000, 1),
  ];
  
  // Calculate weighted average
  const weights = [0.3, 0.3, 0.2, 0.2]; // Holder count, volume, market cap, liquidity
  const weightedSum = factors.reduce((sum, factor, index) => sum + factor * weights[index], 0);
  
  return Math.min(weightedSum, 1); // Ensure score is between 0-1
}

async function getMarketMetrics(mintAddress: string) {
  // Fetch from DEX APIs, price feeds, etc.
  // For now, return mock data
  await sleep(50); // Simulate API call delay
  
  return {
    volatility24h: Math.random() * 100,
    priceChange1h: (Math.random() - 0.5) * 20,
    priceChange24h: (Math.random() - 0.5) * 50,
  };
}

async function getSocialMetrics(symbol?: string) {
  // Fetch from social APIs
  // For now, return mock data
  await sleep(50); // Simulate API call delay
  
  return {
    twitterMentions: Math.floor(Math.random() * 1000),
    telegramMembers: Math.floor(Math.random() * 5000),
    discordMembers: Math.floor(Math.random() * 2000),
  };
}

async function getTechnicalMetrics(mintAddress: string) {
  // Calculate technical indicators
  // For now, return mock data
  await sleep(50); // Simulate API call delay
  
  return {
    rsi: Math.random() * 100,
    macd: (Math.random() - 0.5) * 2,
    volumeSpike: Math.random() > 0.8,
  };
} 