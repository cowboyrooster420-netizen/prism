/**
 * Volume-Based Token Prioritizer for MVP
 * Focuses on top 500 tokens by volume for behavioral analysis
 */

import { getTopBirdEyeTokens, getTrendingBirdEyeTokens } from './birdeye';
import { JupiterMVPService } from './jupiter-mvp';
import { sleep } from '../utils';

interface VolumeToken {
  address: string;
  name: string;
  symbol: string;
  volume24h: number;
  price: number;
  marketCap: number;
  liquidity: number;
  priceChange24h: number;
  source: 'birdeye' | 'jupiter';
  volumeRank: number;
}

interface PrioritizationConfig {
  minVolume24h: number;      // Minimum $1k daily volume
  minLiquidity: number;      // Minimum $10k liquidity  
  minMarketCap: number;      // Minimum $100k market cap
  maxTokens: number;         // Top 500 tokens
  includeNewTokens: boolean; // Include high-volume new tokens
}

export class VolumePrioritizer {
  private jupiterService: JupiterMVPService;
  private config: PrioritizationConfig;

  constructor(config?: Partial<PrioritizationConfig>) {
    this.jupiterService = new JupiterMVPService();
    this.config = {
      minVolume24h: 1000,        // $1k minimum daily volume
      minLiquidity: 10000,       // $10k minimum liquidity
      minMarketCap: 100000,      // $100k minimum market cap
      maxTokens: 500,            // Top 500 tokens
      includeNewTokens: true,    // Include high-volume new tokens
      ...config
    };
    
    console.log('📊 Volume Prioritizer initialized for top', this.config.maxTokens, 'tokens by volume');
  }

  /**
   * Get top tokens prioritized by 24h volume
   */
  async getVolumeBasedPriority(limit: number = 50): Promise<VolumeToken[]> {
    console.log(`📈 Fetching top ${limit} tokens by volume...`);
    
    try {
      // Step 1: Get market data from BirdEye (best volume data)
      const [topTokens, trendingTokens] = await Promise.allSettled([
        getTopBirdEyeTokens(200),     // Get more tokens to filter from
        getTrendingBirdEyeTokens(100) // Trending may have good volume too
      ]);

      await sleep(1000); // Rate limiting

      const birdEyeTokens = [
        ...(topTokens.status === 'fulfilled' ? topTokens.value : []),
        ...(trendingTokens.status === 'fulfilled' ? trendingTokens.value : [])
      ];

      // Step 2: Get Jupiter token universe for verification and metadata
      const jupiterTokens = await this.jupiterService.getTokenUniverse();
      const jupiterTokenMap = new Map(jupiterTokens.map(token => [token.address, token]));

      // Step 3: Process and rank tokens by volume
      const volumeTokens = await this.processVolumeTokens(birdEyeTokens, jupiterTokenMap);

      // Step 4: Apply filters and sort by volume
      const filteredTokens = volumeTokens
        .filter(token => this.meetsVolumeThresholds(token))
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, Math.min(limit, this.config.maxTokens));

      // Step 5: Add volume ranks
      filteredTokens.forEach((token, index) => {
        token.volumeRank = index + 1;
      });

      console.log(`✅ Selected ${filteredTokens.length} high-volume tokens for behavioral analysis`);
      this.printVolumeStats(filteredTokens);

      return filteredTokens;

    } catch (error) {
      console.error('❌ Error in volume-based prioritization:', error);
      return [];
    }
  }

  /**
   * Get tokens prioritized by volume with behavioral potential
   */
  async getBehavioralVolumeTargets(limit: number = 25): Promise<string[]> {
    const volumeTokens = await this.getVolumeBasedPriority(limit * 2); // Get more to filter
    
    // Prioritize tokens with behavioral analysis potential
    const behavioralTargets = volumeTokens
      .filter(token => {
        return (
          token.volume24h > 5000 &&     // At least $5k volume for meaningful whale detection
          token.liquidity > 25000 &&    // Good liquidity for real trading activity
          Math.abs(token.priceChange24h) > 5 // Some price movement for spike detection
        );
      })
      .slice(0, limit)
      .map(token => token.address);

    console.log(`🎯 Selected ${behavioralTargets.length} tokens optimized for behavioral analysis`);
    return behavioralTargets;
  }

  /**
   * Get specific categories of high-volume tokens
   */
  async getVolumeCategories() {
    const allVolumeTokens = await this.getVolumeBasedPriority(200);
    
    return {
      // Ultra high volume (top 50)
      ultraHighVolume: allVolumeTokens
        .filter(t => t.volume24h > 100000)
        .slice(0, 50),
      
      // High volume movers (big price changes + volume)
      highVolumeMovers: allVolumeTokens
        .filter(t => t.volume24h > 10000 && Math.abs(t.priceChange24h) > 15)
        .slice(0, 30),
      
      // New high-volume tokens (good for trend detection)
      newHighVolume: allVolumeTokens
        .filter(t => t.volume24h > 5000 && this.isLikelyNewToken(t))
        .slice(0, 20),
      
      // Stable high-volume (good for whale detection)
      stableHighVolume: allVolumeTokens
        .filter(t => t.volume24h > 25000 && Math.abs(t.priceChange24h) < 10 && t.liquidity > 100000)
        .slice(0, 25)
    };
  }

  /**
   * Process BirdEye tokens into volume-prioritized format
   */
  private async processVolumeTokens(
    birdEyeTokens: any[], 
    jupiterTokenMap: Map<string, any>
  ): Promise<VolumeToken[]> {
    const volumeTokens: VolumeToken[] = [];

    // Remove duplicates first
    const uniqueBirdEyeTokens = birdEyeTokens.filter((token, index, self) => 
      index === self.findIndex(t => t.address === token.address)
    );

    for (const birdEyeToken of uniqueBirdEyeTokens) {
      try {
        const jupiterToken = jupiterTokenMap.get(birdEyeToken.address);
        
        // Prefer Jupiter metadata (more reliable) but fall back to BirdEye
        const volumeToken: VolumeToken = {
          address: birdEyeToken.address,
          name: jupiterToken?.name || birdEyeToken.name || `Token-${birdEyeToken.address.slice(0, 8)}`,
          symbol: jupiterToken?.symbol || birdEyeToken.symbol || `TKN${birdEyeToken.address.slice(0, 4)}`,
          volume24h: birdEyeToken.v24hUSD || 0,
          price: birdEyeToken.price || 0,
          marketCap: birdEyeToken.mc || 0,
          liquidity: birdEyeToken.liquidity || 0,
          priceChange24h: birdEyeToken.v24hChangePercent || 0,
          source: jupiterToken ? 'jupiter' : 'birdeye',
          volumeRank: 0 // Will be set later
        };

        if (volumeToken.volume24h > 0) { // Only include tokens with volume data
          volumeTokens.push(volumeToken);
        }

      } catch (error) {
        console.warn(`Error processing token ${birdEyeToken.address}:`, error);
      }
    }

    return volumeTokens;
  }

  /**
   * Check if token meets volume thresholds for behavioral analysis
   */
  private meetsVolumeThresholds(token: VolumeToken): boolean {
    return (
      token.volume24h >= this.config.minVolume24h &&
      token.liquidity >= this.config.minLiquidity &&
      token.marketCap >= this.config.minMarketCap &&
      token.price > 0 &&
      token.name !== null &&
      token.symbol !== null &&
      !this.isObviouslyInvalid(token)
    );
  }

  /**
   * Filter out obviously invalid or scam tokens
   */
  private isObviouslyInvalid(token: VolumeToken): boolean {
    const suspiciousPatterns = ['test', 'fake', 'scam', 'rug', 'honey'];
    const name = token.name.toLowerCase();
    const symbol = token.symbol.toLowerCase();
    
    return (
      suspiciousPatterns.some(pattern => name.includes(pattern) || symbol.includes(pattern)) ||
      token.symbol.length > 10 ||
      name.length > 50 ||
      (token.volume24h / token.liquidity) > 50 // Suspicious volume/liquidity ratio
    );
  }

  /**
   * Heuristic to identify likely new tokens
   */
  private isLikelyNewToken(token: VolumeToken): boolean {
    // New tokens often have:
    // - High volume relative to market cap
    // - High price volatility
    // - Lower liquidity relative to volume
    const volumeToMarketCapRatio = token.marketCap > 0 ? token.volume24h / token.marketCap : 0;
    const volumeToLiquidityRatio = token.liquidity > 0 ? token.volume24h / token.liquidity : 0;
    
    return (
      volumeToMarketCapRatio > 0.1 || // Volume > 10% of market cap
      volumeToLiquidityRatio > 2 ||   // Volume > 2x liquidity  
      Math.abs(token.priceChange24h) > 50 // High volatility
    );
  }

  /**
   * Print volume statistics for analysis
   */
  private printVolumeStats(tokens: VolumeToken[]): void {
    if (tokens.length === 0) return;

    const totalVolume = tokens.reduce((sum, token) => sum + token.volume24h, 0);
    const avgVolume = totalVolume / tokens.length;
    const topVolume = tokens[0]?.volume24h || 0;
    const medianVolume = tokens[Math.floor(tokens.length / 2)]?.volume24h || 0;

    console.log('\n📊 Volume Prioritization Stats:');
    console.log(`   Total 24h Volume: $${totalVolume.toLocaleString()}`);
    console.log(`   Average Volume: $${avgVolume.toLocaleString()}`);
    console.log(`   Top Token Volume: $${topVolume.toLocaleString()}`);
    console.log(`   Median Volume: $${medianVolume.toLocaleString()}`);
    
    console.log('\n🔝 Top 5 by Volume:');
    tokens.slice(0, 5).forEach((token, index) => {
      console.log(`   ${index + 1}. ${token.symbol}: $${token.volume24h.toLocaleString()} (${token.priceChange24h.toFixed(1)}%)`);
    });

    // Show source distribution
    const jupiterCount = tokens.filter(t => t.source === 'jupiter').length;
    const birdEyeCount = tokens.filter(t => t.source === 'birdeye').length;
    console.log(`\n📍 Sources: ${jupiterCount} Jupiter verified, ${birdEyeCount} BirdEye exclusive`);
  }

  /**
   * Get configuration info
   */
  getConfig(): PrioritizationConfig {
    return { ...this.config };
  }
}