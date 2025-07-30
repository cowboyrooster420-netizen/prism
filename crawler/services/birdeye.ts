import { BIRDEYE_API_KEY } from '../config';
import { sleep } from '../utils';

const MAX_TOKENS_PER_CRAWL = 50;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export async function getTopBirdEyeTokens(limit = MAX_TOKENS_PER_CRAWL) {
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
        backoffMs *= 2; // Exponential backoff
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`BirdEye API error: ${res.status} - ${errorText}`);
        throw new Error(`BirdEye tokenlist error: ${res.status} - ${errorText}`);
      }

      const json = await res.json() as any;
      const tokens = (json.data?.tokens || []).slice(0, limit);
      console.log(`BirdEye: Fetched ${tokens.length} tokens`);
      return tokens; // includes name, address, price, volume, etc.
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        console.error('BirdEye tokenlist fetch error after retries:', error);
        return [];
      }
      console.log(`⚠️ Error, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      backoffMs *= 2;
    }
  }
  return [];
}

export async function getTrendingBirdEyeTokens(limit = 20) {
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
        backoffMs *= 2; // Exponential backoff
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`BirdEye trending API error: ${res.status} - ${errorText}`);
        throw new Error(`BirdEye trending error: ${res.status} - ${errorText}`);
      }

      const json = await res.json() as any;
      const tokens = (json.data?.tokens || []).slice(0, limit);
      console.log(`BirdEye: Fetched ${tokens.length} trending tokens`);
      return tokens; // includes name, address, price, volume, etc.
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        console.error('BirdEye trending fetch error after retries:', error);
        return [];
      }
      console.log(`⚠️ Error, retrying in ${backoffMs}ms (attempt ${attempts}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      backoffMs *= 2;
    }
  }
  return [];
} 