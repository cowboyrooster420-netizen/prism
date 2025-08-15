import { BIRDEYE_API_KEY } from '../config';
import { sleep } from '../utils';
import { BirdEyeRateLimiter } from './rate-limiter';

const MAX_TOKENS_PER_CALL = 100; // V3 endpoint max limit
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export async function getTopBirdEyeTokens(limit = 500) {
  console.log(`🔍 Fetching top ${limit} tokens by volume from BirdEye V3...`);
  
  try {
    const allTokens = [];
    const numCalls = Math.ceil(limit / MAX_TOKENS_PER_CALL);
    
    for (let i = 0; i < numCalls; i++) {
      const offset = i * MAX_TOKENS_PER_CALL;
      const callLimit = Math.min(MAX_TOKENS_PER_CALL, limit - offset);
      
      console.log(`📊 Call ${i + 1}/${numCalls}: offset=${offset}, limit=${callLimit}`);
      
      const tokens = await fetchTokenListV3({
        sort_by: 'volume_24h_usd',  // Correct V3 parameter name
        sort_type: 'desc',
        limit: callLimit,
        offset: offset
      });
      
      if (tokens.length > 0) {
        allTokens.push(...tokens);
        console.log(`✅ Call ${i + 1}: Got ${tokens.length} tokens`);
      } else {
        console.warn(`⚠️ Call ${i + 1}: No tokens returned`);
        // If we get no tokens, we've likely reached the end
        break;
      }
      
      // Rate limiting between calls using smart rate limiter
      if (i < numCalls - 1) {
        const rateLimiter = new BirdEyeRateLimiter();
        await rateLimiter.waitForNextCall();
      }
    }
    
    console.log(`🎯 Total tokens fetched: ${allTokens.length}`);
    return allTokens.slice(0, limit);
    
  } catch (error) {
    console.error('❌ Error fetching top tokens:', error);
    return [];
  }
}

export async function getTrendingBirdEyeTokens(limit = 20) {
  console.log(`🔍 Fetching ${limit} trending tokens from BirdEye V3...`);
  
  try {
          const tokens = await fetchTokenListV3({
        sort_by: 'holder',  // Sort by holder count for trending
        sort_type: 'desc',
        limit: Math.min(limit, MAX_TOKENS_PER_CALL),
        offset: 0
      });
    
    console.log(`✅ Trending tokens fetched: ${tokens.length}`);
    return tokens.slice(0, limit);
    
  } catch (error) {
    console.error('❌ Error fetching trending tokens:', error);
    return [];
  }
}

/**
 * Fetch tokens using BirdEye V3 endpoint with retry logic
 */
async function fetchTokenListV3(params: {
  sort_by?: string;
  sort_type?: string;
  limit: number;
  offset: number;
  min_v24hUSD?: number;
  min_liquidity?: number;
  min_mc?: number;
}) {
  let backoffMs = INITIAL_BACKOFF_MS;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        'x-chain': 'solana',
        'sort_by': params.sort_by || 'v24hUSD',
        'sort_type': params.sort_type || 'desc',
        'limit': params.limit.toString(),
        'offset': params.offset.toString()
      });
      
      // Add optional filters
      if (params.min_v24hUSD) queryParams.append('min_v24hUSD', params.min_v24hUSD.toString());
      if (params.min_liquidity) queryParams.append('min_liquidity', params.min_liquidity.toString());
      if (params.min_mc) queryParams.append('min_mc', params.min_mc.toString());

      const url = `https://public-api.birdeye.so/defi/v3/token/list?${queryParams.toString()}`;
      
      const res = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'X-API-KEY': BIRDEYE_API_KEY || '',
        },
      });

      if (res.status === 429) {
        attempts++;
        console.log(`⚠️ Rate limited, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
        await sleep(backoffMs);
        backoffMs *= 2; // Exponential backoff
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`BirdEye V3 API error: ${res.status} - ${errorText}`);
        throw new Error(`BirdEye V3 error: ${res.status} - ${errorText}`);
      }

      const json = await res.json() as any;
      
      if (!json.success) {
        throw new Error(`BirdEye V3 API returned success: false - ${json.message || 'Unknown error'}`);
      }
      
      const tokens = json.data?.items || [];
      console.log(`BirdEye V3: Fetched ${tokens.length} tokens`);
      
      // Transform V3 response to match expected format
      const transformedTokens = tokens.map((token: any) => ({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        price: token.price,
        v24hChangePercent: token.price_change_24h_percent,
        v24hUSD: token.volume_24h_usd,
        mc: token.market_cap,
        liquidity: token.liquidity,
        decimals: token.decimals,
        logoURI: token.logo_uri
      }));
      
      return transformedTokens;
      
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        console.error('BirdEye V3 fetch error after retries:', error);
        return [];
      }
      console.log(`⚠️ Error, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      backoffMs *= 2;
    }
  }
  return [];
}

// Legacy functions for backward compatibility
export async function getTopBirdEyeTokensLegacy(limit = 50) {
  let backoffMs = INITIAL_BACKOFF_MS;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const res = await fetch(`https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=${limit}&min_liquidity=100`, {
        headers: {
          'accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': BIRDEYE_API_KEY || '',
        },
      });

      if (res.status === 429) {
        attempts++;
        console.log(`⚠️ Rate limited, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
        await sleep(backoffMs);
        backoffMs *= 2;
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`BirdEye legacy API error: ${res.status} - ${errorText}`);
        throw new Error(`BirdEye legacy error: ${res.status} - ${errorText}`);
      }

      const json = await res.json() as any;
      const tokens = (json.data?.tokens || []).slice(0, limit);
      console.log(`BirdEye legacy: Fetched ${tokens.length} tokens`);
      return tokens;
      
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        console.error('BirdEye legacy fetch error after retries:', error);
        return [];
      }
      console.log(`⚠️ Error, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      backoffMs *= 2;
    }
  }
  return [];
}

export async function getTrendingBirdEyeTokensLegacy(limit = 20) {
  let backoffMs = INITIAL_BACKOFF_MS;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const res = await fetch(`https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`, {
        headers: {
          'accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': BIRDEYE_API_KEY || '',
        },
      });

      if (res.status === 429) {
        attempts++;
        console.log(`⚠️ Rate limited, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
        await sleep(backoffMs);
        backoffMs *= 2;
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`BirdEye trending legacy API error: ${res.status} - ${errorText}`);
        throw new Error(`BirdEye trending legacy error: ${res.status} - ${errorText}`);
      }

      const json = await res.json() as any;
      const tokens = (json.data?.tokens || []).slice(0, limit);
      console.log(`BirdEye trending legacy: Fetched ${tokens.length} tokens`);
      return tokens;
      
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        console.error('BirdEye trending legacy fetch error after retries:', error);
        return [];
      }
      console.log(`⚠️ Error, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      backoffMs *= 2;
    }
  }
  return [];
}

// New function specifically for homepage trending display
export async function getHomepageTrendingTokens(limit = 20) {
  let backoffMs = INITIAL_BACKOFF_MS;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      const res = await fetch(`https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${limit}`, {
        headers: {
          'accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': BIRDEYE_API_KEY || '',
        },
      });

      if (res.status === 429) {
        attempts++;
        console.log(`⚠️ Rate limited, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
        await sleep(backoffMs);
        backoffMs *= 2;
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`BirdEye homepage trending API error: ${res.status} - ${errorText}`);
        throw new Error(`BirdEye homepage trending error: ${res.status} - ${errorText}`);
      }

      const json = await res.json() as any;
      const tokens = (json.data?.tokens || []).slice(0, limit);
      
      // Transform to match homepage format
      const trendingTokens = tokens.map((token: any) => ({
        symbol: token.symbol || 'UNKNOWN',
        priceChange: token.price24hChangePercent || 0,
        price: token.price || 0,
        volume: token.volume24hUSD || 0,
        marketCap: token.marketcap || 0,
        address: token.address,
        name: token.name || token.symbol,
        rank: token.rank || 0,
        logoURI: token.logoURI || '',
        liquidity: token.liquidity || 0,
        volumeChange: token.volume24hChangePercent || 0,
        fdv: token.fdv || 0
      }));

      console.log(`BirdEye: Fetched ${trendingTokens.length} homepage trending tokens`);
      return trendingTokens;
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        console.error('BirdEye homepage trending fetch error after retries:', error);
        return [];
      }
      console.log(`⚠️ Error, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      backoffMs *= 2;
    }
  }
  return [];
} 