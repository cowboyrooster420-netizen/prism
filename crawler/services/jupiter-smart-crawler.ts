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

// Updated quality thresholds that are realistic for crypto markets
const QUALITY_THRESHOLDS = {
  minVolume24h: 1000,
  minLiquidity: 10000,
  minHolders: 0,  // Jupiter tokens often don't have holder data, so we're more lenient
  minPrice: 0.000001,
  maxDaysInactive: 7,
  
  // MUCH more realistic price change thresholds for crypto
  maxPriceChange24h: 10000,  // 10,000% (100x) - allows for extreme but legitimate pumps
  minPriceChange24h: -99.9,  // -99.9% (near zero) - allows for major crashes but not impossible -100%
  
  // Additional anti-scam filters that don't rely on price movement
  maxVolumeToLiquidityRatio: 20,  // Volume shouldn't be 20x+ higher than liquidity (pump detection)
  minTokenAge: 60 * 60 * 1000,    // 1 hour minimum age
  maxNameLength: 50,              // Suspiciously long names
  maxSymbolLength: 10             // Suspiciously long symbols
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

  // Updated quality checking function
  private isQualityToken(tokenData: TokenData): boolean {
    const now = Date.now();
    const maxInactiveTime = QUALITY_THRESHOLDS.maxDaysInactive * 24 * 60 * 60 * 1000;

    // Basic volume/liquidity checks (removed holder requirement)
    const passesBasicChecks = (
      tokenData.volume24h >= QUALITY_THRESHOLDS.minVolume24h &&
      tokenData.liquidity >= QUALITY_THRESHOLDS.minLiquidity &&
      tokenData.price >= QUALITY_THRESHOLDS.minPrice &&
      tokenData.lastTradeTime >= (now - maxInactiveTime)
    );

    if (!passesBasicChecks) return false;

    // Updated price change validation - much more lenient
    const priceChangeValid = (
      tokenData.priceChange24h !== null &&
      tokenData.priceChange24h >= QUALITY_THRESHOLDS.minPriceChange24h &&
      tokenData.priceChange24h <= QUALITY_THRESHOLDS.maxPriceChange24h
    );

    if (!priceChangeValid) {
      console.log(`Token ${tokenData.symbol} rejected for price change: ${tokenData.priceChange24h}%`);
      return false;
    }

    // Anti-pump detection (volume way higher than liquidity)
    const volumeToLiquidityRatio = tokenData.liquidity > 0 ? tokenData.volume24h / tokenData.liquidity : 0;
    if (volumeToLiquidityRatio > QUALITY_THRESHOLDS.maxVolumeToLiquidityRatio) {
      console.log(`Token ${tokenData.symbol} rejected for suspicious volume/liquidity ratio: ${volumeToLiquidityRatio.toFixed(2)}x`);
      return false;
    }

    // Token age check - skip for Jupiter tokens since we don't have reliable creation dates
    // if (tokenData.createdAt > (now - QUALITY_THRESHOLDS.minTokenAge)) {
    //   console.log(`Token ${tokenData.symbol} rejected for being too new`);
    //   return false;
    // }

    // Name/symbol length checks
    if (tokenData.name.length > QUALITY_THRESHOLDS.maxNameLength ||
        tokenData.symbol.length > QUALITY_THRESHOLDS.maxSymbolLength) {
      console.log(`Token ${tokenData.symbol} rejected for suspicious name/symbol length`);
      return false;
    }

    // Scam detection
    if (this.isObviousScam(tokenData)) {
      console.log(`Token ${tokenData.symbol} rejected as obvious scam`);
      return false;
    }

    return true;
  }

  // Enhanced scam detection that doesn't rely on price movements
  private isObviousScam(tokenData: TokenData): boolean {
    const suspiciousNamePatterns = [
      'test', 'fake', 'scam', 'rug', 'honeypot',
      'airdrop', 'claim', 'winner', 'congratulations',
      'free', 'bonus', 'gift', 'reward'
    ];

    const nameContainsSuspicious = suspiciousNamePatterns.some(pattern =>
      tokenData.name?.toLowerCase().includes(pattern) ||
      tokenData.symbol?.toLowerCase().includes(pattern)
    );

    // Red flags for scam tokens (removed holder check)
    return (
      nameContainsSuspicious ||
      !tokenData.name ||                           // Missing name
      !tokenData.symbol ||                         // Missing symbol
      tokenData.name === tokenData.symbol ||       // Lazy naming
      tokenData.name.length < 2 ||                 // Too short name
      tokenData.symbol.length < 2 ||               // Too short symbol
      /^[0-9]+$/.test(tokenData.symbol) ||         // Symbol is just numbers
      /[^\w\s-.]/.test(tokenData.name) ||          // Strange characters in name
      tokenData.name.toUpperCase() === tokenData.name && tokenData.name.length > 10 // ALL CAPS long names
    );
  }

  // Updated tier assignment (removed holder requirements)
  private assignTier(tokenData: TokenData): number {
    // Tier 1: High volume, good liquidity
    if (
      tokenData.volume24h >= 50000 &&
      tokenData.liquidity >= 100000
    ) {
      return 1;
    }

    // Tier 2: Medium volume, decent liquidity
    if (
      tokenData.volume24h >= 10000 &&
      tokenData.liquidity >= 25000
    ) {
      return 2;
    }

    // Tier 3: Low but real volume
    return 3;
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
              price: tokenData.price,
              priceChange24h: tokenData.priceChange24h
            });
            return null;
          }

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
      // Very aggressive URL cleaning to avoid database constraint violations
      if (cleanLogoUrl.includes('?') || cleanLogoUrl.includes('&') || 
          cleanLogoUrl.includes('=') || cleanLogoUrl.length > 200 ||
          cleanLogoUrl.includes('githubusercontent.com') ||
          cleanLogoUrl.includes('statics.solscan.io') ||
          cleanLogoUrl.includes('img.fotofolio.xyz') ||
          cleanLogoUrl.includes('pbs.twimg.com') ||
          cleanLogoUrl.includes('cdn.bridgesplit.com') ||
          cleanLogoUrl.includes('dd.dexscreener.com') ||
          cleanLogoUrl.includes('image-cdn.solana.fm') ||
          cleanLogoUrl.includes('hivemapper-marketing-public.s3') ||
          cleanLogoUrl.includes('creator-hub-prod.s3') ||
          cleanLogoUrl.includes('4183046207-files.gitbook.io') ||
          cleanLogoUrl.includes('pajamas.cat') ||
          cleanLogoUrl.includes('gateway.irys.xyz') ||
          cleanLogoUrl.includes('shdw-drive.genesysgo.net') ||
          cleanLogoUrl.includes('arweave.net') ||
          cleanLogoUrl.includes('chexbacca.com') ||
          cleanLogoUrl.includes('www.circle.com') ||
          cleanLogoUrl.includes('ipfs.io') ||
          cleanLogoUrl.includes('raw.githubusercontent.com') ||
          cleanLogoUrl.includes('fotofolio.xyz') ||
          cleanLogoUrl.includes('genesysgo.net')) {
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
      ).slice(0, 10000); // Process up to 10,000 tokens

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