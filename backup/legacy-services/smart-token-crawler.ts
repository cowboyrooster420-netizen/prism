import { createClient } from '@supabase/supabase-js';

// Types
interface TokenData {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  holders: number;
  marketCap: number;
  createdAt: number;
  lastTradeTime: number;
  tier?: number;
  source: string;
}

interface DiscoverySource {
  name: string;
  fetcher: () => Promise<TokenData[]>;
  priority: number;
}

interface TierConfig {
  volume24h: number;
  holders: number;
  liquidity: number;
  updateFrequency: number; // minutes
}

// Configuration
const TIER_CONFIG: Record<number, TierConfig> = {
  1: { volume24h: 50000, holders: 500, liquidity: 100000, updateFrequency: 5 },
  2: { volume24h: 10000, holders: 100, liquidity: 25000, updateFrequency: 30 },
  3: { volume24h: 1000, holders: 50, liquidity: 10000, updateFrequency: 240 }
};

const QUALITY_THRESHOLDS = {
  minVolume24h: 100, // Lowered from 1000
  minLiquidity: 1000, // Lowered from 10000
  minHolders: 0, // Lowered from 50 since BirdEye doesn't provide holder counts
  minPrice: 0.000001,
  maxDaysInactive: 7,
  maxPriceChange24h: 1000, // 1000% in 24h is suspicious
  minTokenAge: 60 * 60 * 1000 // 1 hour minimum age
};

class SmartTokenCrawler {
  private supabase: any;
  private heliusApiKey: string;
  private birdeyeApiKey: string;
  private moralisApiKey: string;

  constructor(config: {
    supabaseUrl: string;
    supabaseKey: string;
    heliusApiKey: string;
    birdeyeApiKey: string;
    moralisApiKey: string;
  }) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.heliusApiKey = config.heliusApiKey;
    this.birdeyeApiKey = config.birdeyeApiKey;
    this.moralisApiKey = config.moralisApiKey;
  }

  // Quality filtering functions
  private isQualityToken(tokenData: TokenData): boolean {
    const now = Date.now();
    const maxInactiveTime = QUALITY_THRESHOLDS.maxDaysInactive * 24 * 60 * 60 * 1000;

    return (
      tokenData.volume24h >= QUALITY_THRESHOLDS.minVolume24h &&
      tokenData.liquidity >= QUALITY_THRESHOLDS.minLiquidity &&
      tokenData.holders >= QUALITY_THRESHOLDS.minHolders &&
      tokenData.price >= QUALITY_THRESHOLDS.minPrice &&
      tokenData.lastTradeTime >= (now - maxInactiveTime) &&
      tokenData.priceChange24h !== null &&
      Math.abs(tokenData.priceChange24h) <= QUALITY_THRESHOLDS.maxPriceChange24h &&
      tokenData.createdAt <= (now - QUALITY_THRESHOLDS.minTokenAge) &&
      !this.isObviousScam(tokenData)
    );
  }

  private isObviousScam(tokenData: TokenData): boolean {
    const suspiciousNamePatterns = ['test', 'fake', 'scam', 'rug'];
    const nameContainsSuspicious = suspiciousNamePatterns.some(pattern =>
      tokenData.name?.toLowerCase().includes(pattern) ||
      tokenData.symbol?.toLowerCase().includes(pattern)
    );

    return (
      nameContainsSuspicious ||
      tokenData.symbol?.length > 10 ||
      tokenData.holders < 10 ||
      (tokenData.volume24h / tokenData.liquidity) > 10 || // Volume way higher than liquidity
      tokenData.name?.length > 50 || // Suspiciously long names
      !tokenData.name || !tokenData.symbol
    );
  }

  private assignTier(tokenData: TokenData): number {
    for (const [tier, config] of Object.entries(TIER_CONFIG)) {
      if (
        tokenData.volume24h >= config.volume24h &&
        tokenData.holders >= config.holders &&
        tokenData.liquidity >= config.liquidity
      ) {
        return parseInt(tier);
      }
    }
    return 3; // Default to lowest tier
  }

  // API fetchers for different sources
  private async fetchBirdeyeTokens(): Promise<TokenData[]> {
    try {
      const response = await fetch('https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=50&min_liquidity=100', {
        headers: {
          'accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': this.birdeyeApiKey
        }
      });

      if (!response.ok) throw new Error(`Birdeye API error: ${response.status}`);
      
      const data = await response.json() as any;
      return data.data?.tokens?.map((token: any) => ({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        price: token.price,
        volume24h: token.v24hUSD || 0,
        priceChange24h: token.v24hChangePercent || 0,
        liquidity: token.liquidity || 0,
        holders: token.holder || 0,
        marketCap: token.mc || 0,
        createdAt: Date.now(), // Birdeye doesn't provide creation time
        lastTradeTime: Date.now(),
        source: 'birdeye'
      })) || [];
    } catch (error) {
      console.error('Error fetching Birdeye tokens:', error);
      return [];
    }
  }

  private async fetchDexscreenerTokens(): Promise<TokenData[]> {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana');

      if (!response.ok) throw new Error(`DexScreener API error: ${response.status}`);
      
      const data = await response.json() as any;
      return data.pairs?.slice(0, 100).map((pair: any) => ({
        address: pair.baseToken.address,
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        price: parseFloat(pair.priceUsd) || 0,
        volume24h: parseFloat(pair.volume.h24) || 0,
        priceChange24h: parseFloat(pair.priceChange.h24) || 0,
        liquidity: parseFloat(pair.liquidity?.usd) || 0,
        holders: 0, // DexScreener doesn't provide holder count
        marketCap: parseFloat(pair.marketCap) || 0,
        createdAt: new Date(pair.pairCreatedAt).getTime(),
        lastTradeTime: Date.now(),
        source: 'dexscreener'
      })) || [];
    } catch (error) {
      console.error('Error fetching DexScreener tokens:', error);
      return [];
    }
  }

  private async fetchRaydiumPools(): Promise<TokenData[]> {
    try {
      const response = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet');

      if (!response.ok) throw new Error(`Raydium API error: ${response.status}`);
      
      const data = await response.json() as any;
      return data.official?.filter((pool: any) => pool.lpAmount > 10000).slice(0, 50).map((pool: any) => ({
        address: pool.baseMint,
        name: pool.name || 'Unknown',
        symbol: pool.name?.split('/')[0] || 'Unknown',
        price: 0, // Raydium doesn't provide direct price
        volume24h: parseFloat(pool.volume24h) || 0,
        priceChange24h: 0,
        liquidity: parseFloat(pool.lpAmount) || 0,
        holders: 0,
        marketCap: 0,
        createdAt: Date.now(),
        lastTradeTime: Date.now(),
        source: 'raydium'
      })) || [];
    } catch (error) {
      console.error('Error fetching Raydium pools:', error);
      return [];
    }
  }

  // Multi-source validation
  private async validateTokenAcrossSources(tokenAddress: string): Promise<boolean> {
    const sources = await Promise.allSettled([
      this.fetchTokenFromBirdeye(tokenAddress),
      this.fetchTokenFromDexscreener(tokenAddress)
    ]);

    const validSources = sources
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<TokenData>).value);

    // Token must exist in at least 2 sources
    if (validSources.length < 2) return false;

    // Basic consistency check - prices shouldn't differ by more than 50%
    const prices = validSources.map(token => token.price).filter(price => price > 0);
    if (prices.length >= 2) {
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      if ((maxPrice - minPrice) / minPrice > 0.5) return false;
    }

    return true;
  }

  private async fetchTokenFromBirdeye(address: string): Promise<TokenData | null> {
    try {
      const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${address}`, {
        headers: {
          'accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': this.birdeyeApiKey
        }
      });

      if (!response.ok) return null;
      
      const data = await response.json() as any;
      return data.data ? {
        address,
        name: data.data.name,
        symbol: data.data.symbol,
        price: data.data.price,
        volume24h: data.data.v24hUSD || 0,
        priceChange24h: data.data.priceChange24h || 0,
        liquidity: data.data.liquidity || 0,
        holders: data.data.holder || 0,
        marketCap: data.data.mc || 0,
        createdAt: Date.now(),
        lastTradeTime: Date.now(),
        source: 'birdeye'
      } : null;
    } catch {
      return null;
    }
  }

  private async fetchTokenFromDexscreener(address: string): Promise<TokenData | null> {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);

      if (!response.ok) return null;
      
      const data = await response.json() as any;
      const pair = data.pairs?.[0];
      
      return pair ? {
        address,
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        price: parseFloat(pair.priceUsd) || 0,
        volume24h: parseFloat(pair.volume.h24) || 0,
        priceChange24h: parseFloat(pair.priceChange.h24) || 0,
        liquidity: parseFloat(pair.liquidity?.usd) || 0,
        holders: 0,
        marketCap: parseFloat(pair.marketCap) || 0,
        createdAt: new Date(pair.pairCreatedAt).getTime(),
        lastTradeTime: Date.now(),
        source: 'dexscreener'
      } : null;
    } catch {
      return null;
    }
  }

  // Database operations
  private async addOrUpdateToken(tokenData: TokenData): Promise<void> {
    const tier = this.assignTier(tokenData);

    try {
      const { error } = await this.supabase
        .from('tokens')
        .upsert({
          address: tokenData.address,
          name: tokenData.name,
          symbol: tokenData.symbol,
          price: tokenData.price,
          volume_24h: tokenData.volume24h,
          price_change_24h: tokenData.priceChange24h,
          liquidity: tokenData.liquidity,
          holders: tokenData.holders,
          market_cap: tokenData.marketCap,
          tier,
          source: tokenData.source,
          is_active: true,
          is_verified: false, // Will be updated by verification process
          created_at: new Date(tokenData.createdAt).toISOString(),
          last_updated: new Date().toISOString()
        }, { 
          onConflict: 'address' 
        });

      if (error) {
        console.error('Error upserting token:', error);
      }
    } catch (error) {
      console.error('Database error:', error);
    }
  }

  private async cleanupDatabase(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      // Deactivate tokens with 0 volume for 7+ days (don't delete, just mark inactive)
      await this.supabase
        .from('tokens')
        .update({ is_active: false })
        .eq('volume_24h', 0)
        .lt('last_updated', sevenDaysAgo);

      // Demote tokens that lost activity (move from tier 1/2 to tier 3)
      await this.supabase
        .from('tokens')
        .update({ tier: 3 })
        .lt('volume_24h', 100)
        .in('tier', [1, 2]);

      console.log('Database cleanup completed');
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
  }

  private removeDuplicates(tokens: TokenData[]): TokenData[] {
    const seen = new Set();
    return tokens.filter(token => {
      if (seen.has(token.address)) return false;
      seen.add(token.address);
      return true;
    });
  }

  // Main crawler function
  public async runQualityCrawler(): Promise<void> {
    console.log('🚀 Starting quality token crawler...');

    try {
      // 1. Discover tokens from multiple sources
      const discoveredTokens: TokenData[] = [];
      
      console.log('📊 Fetching from Birdeye...');
      const birdeyeTokens = await this.fetchBirdeyeTokens();
      discoveredTokens.push(...birdeyeTokens);
      console.log(`✅ Birdeye: ${birdeyeTokens.length} tokens`);
      
      console.log('📊 Fetching from DexScreener...');
      const dexscreenerTokens = await this.fetchDexscreenerTokens();
      discoveredTokens.push(...dexscreenerTokens);
      console.log(`✅ DexScreener: ${dexscreenerTokens.length} tokens`);
      
      console.log('📊 Fetching from Raydium...');
      const raydiumTokens = await this.fetchRaydiumPools();
      discoveredTokens.push(...raydiumTokens);
      console.log(`✅ Raydium: ${raydiumTokens.length} tokens`);
      
      console.log(`📈 Total discovered tokens: ${discoveredTokens.length}`);
      
      // 2. Remove duplicates and apply quality filters
      const uniqueTokens = this.removeDuplicates(discoveredTokens);
      console.log(`🔍 Unique tokens: ${uniqueTokens.length}`);
      
      const qualityTokens = uniqueTokens.filter(token => this.isQualityToken(token));
      console.log(`✨ Quality tokens after filtering: ${qualityTokens.length}`);
      
      // 3. Validate across sources (for new tokens)
      const validatedTokens: TokenData[] = [];
      
      for (const token of qualityTokens) {
        // Skip validation for tokens we already have in database
        const { data: existingToken } = await this.supabase
          .from('tokens')
          .select('address')
          .eq('address', token.address)
          .single();
          
        if (existingToken) {
          validatedTokens.push(token);
        } else {
          // New token - validate across sources
          if (await this.validateTokenAcrossSources(token.address)) {
            validatedTokens.push(token);
          }
        }
      }
      
      console.log(`✅ Validated tokens: ${validatedTokens.length}`);
      
      // 4. Add to database
      for (const token of validatedTokens) {
        await this.addOrUpdateToken(token);
      }
      
      // 5. Cleanup old/dead tokens
      await this.cleanupDatabase();
      
      console.log('🎉 Quality crawler completed successfully');
      
    } catch (error) {
      console.error('❌ Error in quality crawler:', error);
    }
  }

  // Start the crawler with scheduling
  public startScheduledCrawler(): void {
    console.log('🔄 Starting scheduled crawler...');

    // Run immediately
    this.runQualityCrawler();

    // Schedule tier-based updates
    setInterval(() => {
      this.runQualityCrawler();
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
}

// Export for use
export default SmartTokenCrawler; 