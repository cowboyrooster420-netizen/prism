import { BIRDEYE_API_KEY, HELIUS_API_KEY } from '../config';
import { sleep } from '../utils/sleep';
import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './birdeye';
import { getHeliusMetadata } from './helius';
import { upsertToken } from './supabase';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface EnhancedToken {
  mint_address: string;
  name: string;
  symbol: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  liquidity: number;
  // Helius enriched fields
  holder_count?: number;
  description?: string;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

async function fetchWithRetry(url: string, options: RequestInit, attempts = 0, backoffMs = INITIAL_BACKOFF_MS): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (res.status === 429) {
      console.warn(`API rate limit hit (429). Retrying in ${backoffMs / 1000}s...`);
      await sleep(backoffMs);
      return fetchWithRetry(url, options, attempts + 1, backoffMs * 2);
    }
    return res;
  } catch (error) {
    if (attempts < MAX_RETRIES - 1) {
      console.error(`Fetch error (attempt ${attempts + 1}/${MAX_RETRIES}):`, error);
      await sleep(backoffMs);
      return fetchWithRetry(url, options, attempts + 1, backoffMs * 2);
    }
    throw error;
  }
}

async function getHeliusTokenEnrichment(mintAddress: string): Promise<{
  holder_count?: number;
  description?: string;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  tags?: string[];
} | null> {
  try {
    // Get basic metadata
    const metadata = await getHeliusMetadata(mintAddress);
    
    // Get additional token info from Helius
    const res = await fetchWithRetry(
      `https://api.helius.xyz/v0/token-metadata/by-mint/${mintAddress}?api-key=${HELIUS_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn(`Helius enrichment failed for ${mintAddress}: ${res.status}`);
      return null;
    }

    const json = await res.json() as any;
    
    // Extract enrichment data
    const offChainData = json.offChainMetadata;
    const onChainData = json.onChainMetadata;
    
    return {
      description: offChainData?.description || onChainData?.metadata?.data?.uri,
      image: offChainData?.image || onChainData?.metadata?.data?.uri,
      website: offChainData?.external_url,
      twitter: offChainData?.twitter,
      telegram: offChainData?.telegram,
      discord: offChainData?.discord,
      tags: offChainData?.tags || [],
    };
  } catch (error) {
    console.error(`Error enriching token ${mintAddress} with Helius:`, error);
    return null;
  }
}

async function getHolderCount(mintAddress: string): Promise<number> {
  try {
    // Use Helius to get holder count
    const res = await fetchWithRetry(
      `https://api.helius.xyz/v0/addresses/${mintAddress}/balances?api-key=${HELIUS_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn(`Holder count failed for ${mintAddress}: ${res.status}`);
      return 0;
    }

    const json = await res.json() as any;
    // This is a simplified approach - you might need to adjust based on actual API response
    return json.length || 0;
  } catch (error) {
    console.error(`Error getting holder count for ${mintAddress}:`, error);
    return 0;
  }
}

export async function enhancedCrawl() {
  console.log('\n=== Starting Enhanced Crawler (BirdEye + Helius) ===');

  try {
    // Step 1: Fetch tokens from BirdEye
    console.log('🔄 Fetching top tokens from BirdEye...');
    const topTokens = await getTopBirdEyeTokens(50);
    await sleep(2000);

    console.log('🔄 Fetching trending tokens from BirdEye...');
    const trendingTokens = await getTrendingBirdEyeTokens(20);

    // Combine and deduplicate tokens
    const allTokens = [...topTokens, ...trendingTokens];
    const uniqueTokens = allTokens.filter((token, index, self) =>
      index === self.findIndex(t => t.address === token.address)
    );

    console.log(`📊 Fetched ${topTokens.length} top tokens + ${trendingTokens.length} trending tokens = ${uniqueTokens.length} unique tokens`);

    // Step 2: Enrich with Helius data
    const enrichedTokens: EnhancedToken[] = [];
    
    for (const token of uniqueTokens) {
      const {
        address,
        name,
        symbol,
        price,
        v24hChangePercent,
        v24hUSD,
        mc,
        liquidity,
      } = token;

      console.log(`🔄 Enriching ${symbol} (${address})...`);

      // Get Helius enrichment data
      const [heliusEnrichment, holderCount] = await Promise.allSettled([
        getHeliusTokenEnrichment(address),
        getHolderCount(address)
      ]);

      const enrichment = heliusEnrichment.status === 'fulfilled' ? heliusEnrichment.value : null;
      const holders = holderCount.status === 'fulfilled' ? holderCount.value : 0;

      // Create enhanced token
      const enhancedToken: EnhancedToken = {
        mint_address: address,
        name: name || enrichment?.description?.split(' ')[0] || `Token-${address.slice(0, 8)}`,
        symbol: symbol || `TKN${address.slice(0, 4)}`,
        price: price || 0,
        price_change_24h: v24hChangePercent || 0,
        volume_24h: v24hUSD || 0,
        market_cap: mc || 0,
        liquidity: liquidity || 0,
        holder_count: holders,
        description: enrichment?.description,
        image: enrichment?.image,
        website: enrichment?.website,
        twitter: enrichment?.twitter,
        telegram: enrichment?.telegram,
        discord: enrichment?.discord,
        tags: enrichment?.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      enrichedTokens.push(enhancedToken);
      
      // Rate limiting
      await sleep(500); // 500ms between tokens to respect rate limits
    }

    // Step 3: Upsert to database
    console.log(`🔄 Upserting ${enrichedTokens.length} enhanced tokens...`);
    
    for (const token of enrichedTokens) {
      try {
        await upsertToken(token as any); // Type assertion for compatibility
        console.log(`✅ Enhanced token upserted: ${token.symbol} (${token.name})`);
      } catch (error) {
        console.error(`❌ Failed to upsert enhanced token ${token.symbol}:`, error);
      }
      
      await sleep(100); // Small delay between upserts
    }

    console.log(`✅ Enhanced crawl complete: ${enrichedTokens.length} tokens processed`);
    return enrichedTokens;

  } catch (error) {
    console.error('❌ Enhanced crawl failed:', error);
    return [];
  }
} 