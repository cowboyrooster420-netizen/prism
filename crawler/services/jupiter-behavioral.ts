/**
 * Jupiter Behavioral Service
 * Collects behavioral data using Jupiter's free APIs for MVP
 */

import { sleep } from '../utils';

// Types for Jupiter API responses
interface JupiterToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

interface JupiterQuoteResponse {
  data: {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    priceImpactPct: number;
    routePlan: Array<{
      swapInfo: {
        ammKey: string;
        label: string;
        inputMint: string;
        outputMint: string;
        inAmount: string;
        outAmount: string;
        feeAmount: string;
        feeMint: string;
      };
      percent: number;
    }>;
  };
}

interface JupiterPriceResponse {
  data: Record<string, {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
  }>;
}

// Behavioral data types
interface BehavioralMetrics {
  new_holders_24h: number;
  whale_buys_24h: number;
  volume_spike_ratio: number;
  token_age_hours: number;
}

interface LiquidityDepthData {
  price_impact_10k: number;    // Price impact for $10k trade
  price_impact_50k: number;    // Price impact for $50k trade
  price_impact_100k: number;   // Price impact for $100k trade
  route_efficiency: number;    // Number of routes available
  liquidity_score: number;     // Overall liquidity health (0-100)
}

export class JupiterBehavioralService {
  private readonly JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';
  private readonly JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
  private readonly JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict'; // Use strict list for quality
  
  private readonly USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';
  
  private tokenCache: Map<string, JupiterToken> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  
  constructor() {
    console.log('🚀 Jupiter Behavioral Service initialized');
  }

  /**
   * Get comprehensive token universe from Jupiter
   * This replaces expensive token discovery API calls
   */
  async getTokenUniverse(): Promise<JupiterToken[]> {
    try {
      console.log('📊 Fetching Jupiter token universe...');
      
      const response = await fetch(this.JUPITER_TOKEN_LIST);
      if (!response.ok) {
        throw new Error(`Jupiter token list failed: ${response.status}`);
      }
      
      const tokens: JupiterToken[] = await response.json();
      
      // Cache tokens for later use
      tokens.forEach(token => {
        this.tokenCache.set(token.address, token);
      });
      
      console.log(`✅ Loaded ${tokens.length} tokens from Jupiter`);
      return tokens;
      
    } catch (error) {
      console.error('❌ Error fetching Jupiter token universe:', error);
      return [];
    }
  }

  /**
   * Get real-time price data for multiple tokens
   * Free alternative to BirdEye price API
   */
  async getPrices(tokenAddresses: string[]): Promise<Record<string, number>> {
    try {
      // Jupiter price API can handle up to 100 tokens per request
      const chunks = this.chunkArray(tokenAddresses, 100);
      const allPrices: Record<string, number> = {};
      
      for (const chunk of chunks) {
        const ids = chunk.join(',');
        
        try {
          const response = await fetch(`${this.JUPITER_PRICE_API}?ids=${ids}`);
          
          if (response.ok) {
            const data = await response.json();
            
            // Handle different response structures
            const priceData = data.data || data;
            
            Object.entries(priceData).forEach(([address, info]: [string, any]) => {
              const price = info.price || info;
              if (typeof price === 'number') {
                allPrices[address] = price;
                
                // Cache price for 30 seconds
                this.priceCache.set(address, {
                  price,
                  timestamp: Date.now()
                });
              }
            });
          }
        } catch (apiError) {
          console.warn(`Price API failed for chunk: ${apiError}`);
        }
        
        // Small delay between chunks to be respectful
        if (chunks.length > 1) {
          await sleep(100);
        }
      }
      
      return allPrices;
      
    } catch (error) {
      console.error('❌ Error fetching Jupiter prices:', error);
      return {};
    }
  }

  /**
   * Analyze liquidity depth to detect whale activity potential
   * Uses Jupiter's quote API to measure price impact at different trade sizes
   */
  async analyzeLiquidityDepth(tokenAddress: string): Promise<LiquidityDepthData> {
    try {
      const tradeSizes = [10000, 50000, 100000]; // $10k, $50k, $100k USD
      const priceImpacts: number[] = [];
      let routeCount = 0;
      
      for (const sizeUSD of tradeSizes) {
        try {
          // Convert USD to USDC amount (assuming 1:1)
          const amount = sizeUSD * 1000000; // USDC has 6 decimals
          
          // Get quote for buying the token with USDC
          const quoteUrl = `${this.JUPITER_API_BASE}/quote?inputMint=${this.USDC_MINT}&outputMint=${tokenAddress}&amount=${amount}&slippageBps=50`;
          
          const response = await fetch(quoteUrl);
          if (response.ok) {
            const quote = await response.json();
            // Handle different response structures
            const priceImpact = quote.priceImpactPct || quote.data?.priceImpactPct || 0;
            const routes = quote.routePlan || quote.data?.routePlan || [];
            
            priceImpacts.push(priceImpact);
            routeCount = Math.max(routeCount, routes.length);
          } else {
            priceImpacts.push(999); // High impact if no route available
          }
          
          // Rate limiting
          await sleep(200);
          
        } catch (error) {
          console.warn(`Quote failed for ${tokenAddress} at $${sizeUSD}:`, error);
          priceImpacts.push(999);
        }
      }
      
      // Calculate liquidity score (lower price impact = higher score)
      const avgPriceImpact = priceImpacts.reduce((a, b) => a + b, 0) / priceImpacts.length;
      const liquidityScore = Math.max(0, Math.min(100, 100 - (avgPriceImpact * 2)));
      
      return {
        price_impact_10k: priceImpacts[0] || 999,
        price_impact_50k: priceImpacts[1] || 999,
        price_impact_100k: priceImpacts[2] || 999,
        route_efficiency: routeCount,
        liquidity_score: liquidityScore
      };
      
    } catch (error) {
      console.error(`❌ Error analyzing liquidity for ${tokenAddress}:`, error);
      return {
        price_impact_10k: 999,
        price_impact_50k: 999,
        price_impact_100k: 999,
        route_efficiency: 0,
        liquidity_score: 0
      };
    }
  }

  /**
   * Calculate token age in hours
   * Estimates based on Jupiter token list inclusion or other heuristics
   */
  async calculateTokenAge(tokenAddress: string): Promise<number> {
    try {
      // For MVP, we'll use a simple heuristic
      // In production, you'd want to use Helius or Solscan to get first transaction
      
      const token = this.tokenCache.get(tokenAddress);
      
      if (!token) {
        // If not in Jupiter's strict list, assume it's very new
        return 24; // 24 hours default for unknown tokens
      }
      
      // Tokens in Jupiter's strict list are usually established
      // We can enhance this later with actual blockchain data
      return 168; // 1 week default for known tokens
      
    } catch (error) {
      console.error(`❌ Error calculating age for ${tokenAddress}:`, error);
      return 0;
    }
  }

  /**
   * Detect whale activity using price impact analysis
   * High price impact at whale trade sizes indicates potential whale activity
   */
  async detectWhaleActivity(tokenAddress: string): Promise<number> {
    try {
      const liquidityData = await this.analyzeLiquidityDepth(tokenAddress);
      
      // Whale activity score based on price impact
      // Lower price impact = easier for whales to trade = higher whale activity potential
      let whaleScore = 0;
      
      if (liquidityData.price_impact_50k < 5) whaleScore += 3; // Easy for whales to buy $50k
      else if (liquidityData.price_impact_50k < 10) whaleScore += 2;
      else if (liquidityData.price_impact_50k < 20) whaleScore += 1;
      
      if (liquidityData.price_impact_100k < 10) whaleScore += 2; // Easy for whales to buy $100k
      else if (liquidityData.price_impact_100k < 20) whaleScore += 1;
      
      if (liquidityData.route_efficiency > 3) whaleScore += 1; // Multiple routes available
      
      return whaleScore; // 0-6 scale
      
    } catch (error) {
      console.error(`❌ Error detecting whale activity for ${tokenAddress}:`, error);
      return 0;
    }
  }

  /**
   * Main function to collect all behavioral metrics for a token
   */
  async collectBehavioralMetrics(tokenAddress: string): Promise<Partial<BehavioralMetrics>> {
    try {
      console.log(`🔍 Collecting behavioral metrics for ${tokenAddress}...`);
      
      // For MVP, we'll use Jupiter-derived metrics
      // Later we can enhance with Helius transaction analysis
      
      const [liquidityData, tokenAge, whaleActivityScore] = await Promise.allSettled([
        this.analyzeLiquidityDepth(tokenAddress),
        this.calculateTokenAge(tokenAddress),
        this.detectWhaleActivity(tokenAddress)
      ]);
      
      const metrics: Partial<BehavioralMetrics> = {
        // For MVP, we'll estimate these from Jupiter data
        // In Phase 2, we'll get real transaction data from Helius
        token_age_hours: tokenAge.status === 'fulfilled' ? tokenAge.value : 0,
        whale_buys_24h: whaleActivityScore.status === 'fulfilled' ? whaleActivityScore.value : 0,
        
        // Volume spike will come from comparing Jupiter prices over time
        volume_spike_ratio: 1.0, // Default, will calculate from price history
        
        // New holders will need Helius integration
        new_holders_24h: 0 // Placeholder for now
      };
      
      console.log(`✅ Collected behavioral metrics for ${tokenAddress}:`, metrics);
      return metrics;
      
    } catch (error) {
      console.error(`❌ Error collecting behavioral metrics for ${tokenAddress}:`, error);
      return {};
    }
  }

  /**
   * Utility function to chunk arrays for batch processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get cached price if available and fresh (< 30 seconds old)
   */
  private getCachedPrice(tokenAddress: string): number | null {
    const cached = this.priceCache.get(tokenAddress);
    if (cached && (Date.now() - cached.timestamp) < 30000) {
      return cached.price;
    }
    return null;
  }
}