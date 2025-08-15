/**
 * Jupiter MVP Service
 * Simple, reliable Jupiter integration for MVP behavioral data
 */

import { sleep } from '../utils';

interface JupiterToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

interface MVPBehavioralData {
  token_age_hours: number;
  volume_spike_ratio: number;
  whale_buys_24h: number;    // Will be populated by Helius
  new_holders_24h: number;   // Will be populated by Helius
}

export class JupiterMVPService {
  private readonly JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict';
  private tokenCache: Map<string, JupiterToken> = new Map();
  
  constructor() {
    console.log('🚀 Jupiter MVP Service initialized');
  }

  /**
   * Get comprehensive token universe from Jupiter (FREE)
   * This replaces expensive token discovery calls
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
   * Calculate token age based on Jupiter listing
   * Simple heuristic for MVP
   */
  calculateTokenAge(tokenAddress: string): number {
    const token = this.tokenCache.get(tokenAddress);
    
    if (!token) {
      // If not in Jupiter's strict list, assume it's very new
      return 24; // 24 hours for unknown tokens
    }
    
    // Tokens in Jupiter's strict list are usually established
    // This is a simple heuristic - in production we'd use blockchain data
    return 168; // 1 week for known tokens
  }

  /**
   * Check if token is in Jupiter's verified list
   * Good indicator of legitimacy
   */
  isVerifiedToken(tokenAddress: string): boolean {
    return this.tokenCache.has(tokenAddress);
  }

  /**
   * Get token metadata from Jupiter cache
   */
  getTokenMetadata(tokenAddress: string): JupiterToken | null {
    return this.tokenCache.get(tokenAddress) || null;
  }

  /**
   * Calculate basic quality score based on Jupiter data
   */
  calculateBasicQualityScore(tokenAddress: string): number {
    const token = this.tokenCache.get(tokenAddress);
    
    if (!token) {
      return 20; // Low score for unknown tokens
    }
    
    let score = 50; // Base score for known tokens
    
    // Bonus points for having metadata
    if (token.name && token.symbol) score += 10;
    if (token.logoURI) score += 5;
    if (token.tags && token.tags.length > 0) score += 10;
    
    // Special tags bonus
    if (token.tags?.includes('verified')) score += 15;
    if (token.tags?.includes('community')) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * Prepare MVP behavioral data structure
   * Jupiter provides some data, placeholders for Helius data
   */
  prepareMVPBehavioralData(tokenAddress: string): Partial<MVPBehavioralData> {
    return {
      token_age_hours: this.calculateTokenAge(tokenAddress),
      volume_spike_ratio: 1.0, // Default, will be calculated from price/volume data
      whale_buys_24h: 0,       // Placeholder - needs Helius transaction analysis
      new_holders_24h: 0       // Placeholder - needs Helius holder analysis
    };
  }

  /**
   * Get priority tokens for behavioral analysis
   * Returns tokens that should be prioritized for expensive API calls
   */
  getPriorityTokens(allTokens: JupiterToken[], limit: number = 100): string[] {
    // For MVP, prioritize tokens with good metadata and verification
    const scored = allTokens
      .map(token => ({
        address: token.address,
        score: this.calculateBasicQualityScore(token.address)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return scored.map(item => item.address);
  }

  /**
   * Batch prepare behavioral data for multiple tokens
   */
  batchPrepareBehavioralData(tokenAddresses: string[]): Record<string, Partial<MVPBehavioralData>> {
    const results: Record<string, Partial<MVPBehavioralData>> = {};
    
    for (const address of tokenAddresses) {
      results[address] = this.prepareMVPBehavioralData(address);
    }
    
    return results;
  }

  /**
   * Get cache stats for monitoring
   */
  getCacheStats(): { tokenCount: number; knownTokens: number; coverage: number } {
    const totalInCache = this.tokenCache.size;
    return {
      tokenCount: totalInCache,
      knownTokens: totalInCache,
      coverage: totalInCache > 0 ? 100 : 0
    };
  }
}