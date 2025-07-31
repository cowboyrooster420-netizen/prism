import { BIRDEYE_API_KEY } from '../config';
import { sleep } from '../utils';

export interface BirdEyeMarket {
  address: string;
  symbol: string;
  liquidity: number;
  price: number;
  v24hUSD: number;
  name: string;
  mc: number;
  v24hChangePercent: number;
}

export interface EnrichedMarketData {
  token_price?: number;
  volume_24h?: number;
}

async function fetchMarkets(offset = 0, limit = 500): Promise<BirdEyeMarket[]> {
  try {
    // Use the working tokenlist endpoint
    const url = `https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=${offset}&limit=${limit}&min_liquidity=100`;
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': BIRDEYE_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BirdEye markets API error: ${response.status} - ${errorText}`);
      throw new Error(`BirdEye markets API error: ${response.status} - ${errorText}`);
    }

    const json = await response.json() as any;
    return json.data?.tokens || [];
  } catch (error) {
    console.error(`Failed to fetch markets (offset: ${offset}):`, error);
    return [];
  }
}

async function enrichToken(mint_address: string): Promise<EnrichedMarketData> {
  try {
    const url = `https://public-api.birdeye.so/defi/price_volume/single?address=${mint_address}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': BIRDEYE_API_KEY,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to enrich ${mint_address}: ${response.status}`);
      return {};
    }

    const { data } = await response.json() as any;
    return {
      token_price: data?.value,
      volume_24h: data?.volume24hQuote,
    };
  } catch (error) {
    console.error(`Error enriching token ${mint_address}:`, error);
    return {};
  }
}

export async function getBirdEyeMarkets(limit = 100): Promise<any[]> {
  console.log('🔄 Fetching BirdEye markets data...');
  
  const allTokens: any[] = [];
  const batchSize = 50; // Maximum allowed by API
  const offsets = [0, 50]; // Fetch 100 total tokens
  
  for (const offset of offsets) {
    console.log(`📊 Fetching markets (offset: ${offset})...`);
    
    const markets = await fetchMarkets(offset, batchSize);
    console.log(`✅ Fetched ${markets.length} markets from offset ${offset}`);
    
    for (const token of markets) {
      const { address, symbol, liquidity, price, v24hUSD, name, mc, v24hChangePercent } = token;

      // Enrich with additional price/volume data
      const enriched = await enrichToken(address);
      
      allTokens.push({
        mint_address: address,
        symbol,
        name,
        liquidity,
        price: enriched.token_price ?? price,
        volume_24h: enriched.volume_24h ?? v24hUSD,
        market_cap: mc,
        price_change_24h: v24hChangePercent,
        updated_at: new Date().toISOString()
      });
      
      // Add small delay to respect rate limits
      await sleep(100);
    }
    
    // Add delay between batches
    if (offset < 50) {
      console.log('⏳ Pausing between batches...');
      await sleep(1000);
    }
  }

  console.log(`🎉 Total markets processed: ${allTokens.length}`);
  return allTokens;
} 