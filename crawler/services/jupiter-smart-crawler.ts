import { createClient } from '@supabase/supabase-js';

// Types
interface JupiterToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

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
  logoUrl?: string;
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
  minVolume24h: 0, // Temporarily disabled for testing
  minLiquidity: 100, // Lowered from 1000
  minHolders: 0, // Lowered from 50 since many tokens won't have holder data
  minPrice: 0.000001,
  maxDaysInactive: 7,
  maxPriceChange24h: 1000, // 1000% in 24h is suspicious
  minTokenAge: 60 * 60 * 1000 // 1 hour minimum age
};

class JupiterSmartCrawler {
  private supabase: any;
  private heliusApiKey: string;
  private birdeyeApiKey: string;

  constructor(config: {
    supabaseUrl: string;
    supabaseKey: string;
    heliusApiKey: string;
    birdeyeApiKey: string;
  }) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.heliusApiKey = config.heliusApiKey;
    this.birdeyeApiKey = config.birdeyeApiKey;
  }

  // Get all tokens from Jupiter
  private async fetchJupiterTokenList(): Promise<JupiterToken[]> {
    try {
      console.log('Fetching Jupiter token list…');
      const response = await fetch('https://token.jup.ag/all');

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }
      
      const tokens = await response.json();
      console.log(`Jupiter returned ${tokens.length} total tokens`);
      
      return tokens;
    } catch (error) {
      console.error('Error fetching Jupiter tokens:', error);
      return [];
    }
  }

  // Get token data from Birdeye (for price, volume, holders)
  private async getBirdeyeTokenData(address: string): Promise<Partial<TokenData> | null> {
    try {
      const [overviewResponse, priceResponse] = await Promise.all([
        fetch(`https://public-api.birdeye.so/defi/token_overview?address=${address}`, {
          headers: { 
            'X-API-KEY': this.birdeyeApiKey,
            'accept': 'application/json',
            'x-chain': 'solana'
          }
        }),
        fetch(`https://public-api.birdeye.so/defi/price?address=${address}`, {
          headers: { 
            'X-API-KEY': this.birdeyeApiKey,
            'accept': 'application/json',
            'x-chain': 'solana'
          }
        })
      ]);

      if (!overviewResponse.ok || !priceResponse.ok) {
        return null;
      }

      const [overviewData, priceData] = await Promise.all([
        overviewResponse.json(),
        priceResponse.json()
      ]);

      const overview = overviewData.data;
      const price = priceData.data;

      if (!overview || !price) return null;

      return {
        price: price.value || 0,
        volume24h: overview.v24hUSD || 0,
        priceChange24h: overview.priceChange24hPercent || 0,
        liquidity: overview.liquidity || 0,
        holders: overview.holder || 0,
        marketCap: overview.mc || 0,
        lastTradeTime: Date.now(),
        source: 'birdeye'
      };
    } catch (error) {
      console.error(`Error fetching Birdeye data for ${address}:`, error);
      return null;
    }
  }

  // Get token data from DexScreener as backup
  private async getDexscreenerTokenData(address: string): Promise<Partial<TokenData> | null> {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);

      if (!response.ok) return null;
      
      const data = await response.json();
      const pair = data.pairs?.[0];
      
      if (!pair) return null;

      return {
        price: parseFloat(pair.priceUsd) || 0,
        volume24h: parseFloat(pair.volume.h24) || 0,
        priceChange24h: parseFloat(pair.priceChange.h24) || 0,
        liquidity: parseFloat(pair.liquidity?.usd) || 0,
        holders: 0, // DexScreener doesn't provide holder count
        marketCap: parseFloat(pair.marketCap) || 0,
        lastTradeTime: Date.now(),
        source: 'dexscreener'
      };
    } catch (error) {
      console.error(`Error fetching DexScreener data for ${address}:`, error);
      return null;
    }
  }

  // Quality filtering functions
  private isQualityToken(tokenData: TokenData): boolean {
    const now = Date.now();
    const maxInactiveTime = QUALITY_THRESHOLDS.maxDaysInactive * 24 * 60 * 60 * 1000;

    // For Jupiter tokens, we're more lenient with holder data since it's often not available
    const hasBasicData = tokenData.volume24h >= QUALITY_THRESHOLDS.minVolume24h &&
      tokenData.liquidity >= QUALITY_THRESHOLDS.minLiquidity &&
      tokenData.price >= QUALITY_THRESHOLDS.minPrice &&
      tokenData.lastTradeTime >= (now - maxInactiveTime) &&
      tokenData.priceChange24h !== null &&
      Math.abs(tokenData.priceChange24h) <= QUALITY_THRESHOLDS.maxPriceChange24h;

    // Only check holders if we have the data (BirdEye provides it, DexScreener doesn't)
    const hasValidHolders = tokenData.holders === 0 || tokenData.holders >= QUALITY_THRESHOLDS.minHolders;

    return hasBasicData && hasValidHolders && !this.isObviousScam(tokenData);
  }

  private isObviousScam(tokenData: TokenData): boolean {
    const suspiciousNamePatterns = ['test', 'fake', 'scam', 'rug', 'moon', 'safe'];
    const nameContainsSuspicious = suspiciousNamePatterns.some(pattern =>
      tokenData.name?.toLowerCase().includes(pattern) ||
      tokenData.symbol?.toLowerCase().includes(pattern)
    );

    return (
      nameContainsSuspicious ||
      tokenData.symbol?.length > 10 ||
      // Only check holders if we have the data and it's suspiciously low
      (tokenData.holders > 0 && tokenData.holders < 5) ||
      (tokenData.volume24h > 0 && tokenData.liquidity > 0 && (tokenData.volume24h / tokenData.liquidity) > 10) ||
      tokenData.name?.length > 50 ||
      !tokenData.name ||
      !tokenData.symbol ||
      tokenData.name === tokenData.symbol // Lazy naming
    );
  }

  private assignTier(tokenData: TokenData): number {
    for (const [tier, config] of Object.entries(TIER_CONFIG)) {
      // For Jupiter tokens, we're more lenient with holder requirements
      const hasValidHolders = tokenData.holders === 0 || tokenData.holders >= config.holders;
      
      if (
        tokenData.volume24h >= config.volume24h &&
        hasValidHolders &&
        tokenData.liquidity >= config.liquidity
      ) {
        return parseInt(tier);
      }
    }
    return 3; // Default to lowest tier
  }

  // Process tokens in batches to avoid rate limits
  private async processTokenBatch(tokens: JupiterToken[], batchSize: number = 50): Promise<TokenData[]> {
    const validTokens: TokenData[] = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokens.length / batchSize)} (${batch.length} tokens)`);
      
      const batchPromises = batch.map(async (jupiterToken) => {
        try {
          // Try Birdeye first, fallback to DexScreener
          let tokenData = await this.getBirdeyeTokenData(jupiterToken.address);
          
          if (!tokenData || tokenData.volume24h === 0) {
            tokenData = await this.getDexscreenerTokenData(jupiterToken.address);
          }
          
          if (!tokenData) {
            console.log(`No market data found for ${jupiterToken.symbol} (${jupiterToken.address})`);
            return null;
          }

          const fullTokenData: TokenData = {
            address: jupiterToken.address,
            name: jupiterToken.name,
            symbol: jupiterToken.symbol,
            logoUrl: jupiterToken.logoURI,
            createdAt: Date.now(), // Jupiter doesn't provide creation time
            ...tokenData
          } as TokenData;

          const isQuality = this.isQualityToken(fullTokenData);
          if (!isQuality) {
            console.log(`Token ${jupiterToken.symbol} failed quality check:`, {
              volume24h: tokenData.volume24h,
              liquidity: tokenData.liquidity,
              holders: tokenData.holders,
              price: tokenData.price
            });
          }

          // Temporarily bypass quality filter for testing
          return fullTokenData;
        } catch (error) {
          console.error(`Error processing token ${jupiterToken.symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      const successfulTokens = batchResults
        .filter((result): result is PromiseFulfilledResult<TokenData> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      validTokens.push(...successfulTokens);
      
      // Rate limiting - wait between batches
      if (i + batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    return validTokens;
  }

  // Database operations
  private async addOrUpdateToken(tokenData: TokenData): Promise<void> {
    const tier = this.assignTier(tokenData);

    // Clean and validate logo URL to avoid database constraint issues
    let cleanLogoUrl = tokenData.logoUrl;
    if (cleanLogoUrl) {
      // Remove problematic characters or set to undefined if URL is too complex
      if (cleanLogoUrl.includes('?') || cleanLogoUrl.includes('&') || 
          cleanLogoUrl.includes('=') || cleanLogoUrl.length > 500) {
        cleanLogoUrl = undefined;
      }
    }

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
          logo_url: cleanLogoUrl,
          is_active: true,
          is_verified: false,
          last_updated: new Date().toISOString(),
          created_at: new Date(tokenData.createdAt).toISOString()
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

  // Main crawler function
  public async runJupiterCrawler(): Promise<void> {
    console.log('🚀 Starting Jupiter-based token crawler…');

    try {
      // 1. Get all tokens from Jupiter
      const jupiterTokens = await this.fetchJupiterTokenList();
      if (jupiterTokens.length === 0) {
        console.error('No tokens received from Jupiter');
        return;
      }

      // 2. Filter out obvious junk before processing
      const filteredTokens = jupiterTokens.filter(token => 
        token.name && 
        token.symbol && 
        token.symbol.length <= 10 &&
        !['test', 'fake', 'scam'].some(pattern => 
          token.name.toLowerCase().includes(pattern) || 
          token.symbol.toLowerCase().includes(pattern)
        )
      ).slice(0, 1000); // Process up to 1,000 tokens for quicker testing

      console.log(`Filtered to ${filteredTokens.length} potentially valid tokens from ${jupiterTokens.length} total`);

      // 3. Process tokens in batches to get market data
      const validTokens = await this.processTokenBatch(filteredTokens, 25); // Increased batch size for 10k tokens
      
      console.log(`Found ${validTokens.length} quality tokens`);

      // 4. Add to database
      let addedCount = 0;
      for (const token of validTokens) {
        await this.addOrUpdateToken(token);
        addedCount++;
        
        // Progress logging
        if (addedCount % 100 === 0) {
          console.log(`Added ${addedCount}/${validTokens.length} tokens to database`);
        }
      }

      // 5. Cleanup old/dead tokens
      await this.cleanupDatabase();

      console.log(`✅ Jupiter crawler completed successfully! Added/updated ${validTokens.length} tokens`);
      
    } catch (error) {
      console.error('❌ Error in Jupiter crawler:', error);
    }
  }

  // Start the crawler with scheduling
  public startScheduledCrawler(): void {
    console.log('Starting scheduled Jupiter crawler…');

    // Run immediately
    this.runJupiterCrawler();

    // Schedule updates every 2 hours for full discovery
    setInterval(() => {
      this.runJupiterCrawler();
    }, 2 * 60 * 60 * 1000);

    // Quick updates for existing tokens every 15 minutes
    setInterval(() => {
      this.updateExistingTokens();
    }, 15 * 60 * 1000);
  }

  // Update existing tokens with fresh data
  private async updateExistingTokens(): Promise<void> {
    try {
      console.log('🔄 Updating existing tokens…');

      // Get active tokens from database
      const { data: existingTokens } = await this.supabase
        .from('tokens')
        .select('address, symbol, tier')
        .eq('is_active', true)
        .order('tier', { ascending: true })
        .limit(500); // Update top 500 tokens

      if (!existingTokens || existingTokens.length === 0) return;

      // Update in smaller batches
      const updateBatches = [];
      for (let i = 0; i < existingTokens.length; i += 20) {
        updateBatches.push(existingTokens.slice(i, i + 20));
      }

      for (const batch of updateBatches) {
        const updatePromises = batch.map(async (token) => {
          const tokenData = await this.getBirdeyeTokenData(token.address);
          if (tokenData && tokenData.volume24h > 0) {
            await this.supabase
              .from('tokens')
              .update({
                price: tokenData.price,
                volume_24h: tokenData.volume24h,
                price_change_24h: tokenData.priceChange24h,
                liquidity: tokenData.liquidity,
                holders: tokenData.holders,
                market_cap: tokenData.marketCap,
                last_updated: new Date().toISOString()
              })
              .eq('address', token.address);
          }
        });

        await Promise.allSettled(updatePromises);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between batches
      }

      console.log(`✅ Updated ${existingTokens.length} existing tokens`);
    } catch (error) {
      console.error('Error updating existing tokens:', error);
    }
  }
}

// Export for use
export default JupiterSmartCrawler; 