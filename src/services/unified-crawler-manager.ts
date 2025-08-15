/**
 * Database Data Manager - Central coordinator for reading token data from database
 * Provides unified access to all token data stored by crawler services
 */

import { createClient } from '@supabase/supabase-js';

// Import services that read from database (not crawlers)
import SmartTokenCrawler from '../../crawler/services/smart-token-crawler';
import AIWatchlistAnalyzer from '../../crawler/services/ai-watchlist-analyzer';
import TechnicalAnalysisService from './technical-analysis-service';

// Types for unified data structures
export interface UnifiedTokenData {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  holders: number;
  marketCap: number;
  tier: number;
  source: string;
  // Enhanced data from database tables
  behavioralMetrics?: {
    whaleTransactions24h: number;
    newHolders24h: number;
    volumeSpike: boolean;
    suspiciousActivity: boolean;
  };
  launchpadData?: {
    isNewLaunch: boolean;
    launchPlatform?: string;
    launchTime?: number;
    earlyWhaleActivity: number;
    riskScore: number;
  };
  aiAnalysis?: {
    bullishScore: number;
    bearishScore: number;
    confidence: number;
    recommendation: string;
    reasoning: string;
  };
  technicalAnalysis?: {
    technical_score: number;
    trend: string;
    momentum: string;
    volatility: string;
    active_signals: string[];
    support_levels: number[];
    resistance_levels: number[];
  };
}

export interface DatabaseDataRequest {
  type: 'behavioral' | 'volume' | 'launchpad' | 'technical' | 'ai_recommendations' | 'all';
  limit?: number;
  filters?: {
    minVolume?: number;
    maxAge?: number;
    tier?: number;
    tokenAddresses?: string[];
  };
  realTime?: boolean;
}

export interface DatabaseDataResponse {
  data: UnifiedTokenData[];
  metadata: {
    dataSource: string[];
    lastUpdated: string;
    confidence: number;
    cached: boolean;
    processingTime: number;
  };
  insights: {
    totalTokens: number;
    averageConfidence: number;
    dataFreshness: string;
    recommendedTokens: number;
  };
}

export class DatabaseDataManager {
  private supabase: any;
  private smartTokenCrawler?: SmartTokenCrawler;
  private aiWatchlistAnalyzer?: AIWatchlistAnalyzer;
  private technicalAnalysisService?: TechnicalAnalysisService;
  
  // Cache for frequently requested data
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  // Service availability tracking
  private serviceStatus = {
    volumePrioritizer: true,
    launchpadMonitor: true,
    heliusAnalyzer: true,
    jupiterCrawler: true,
    smartTokenCrawler: true,
    aiWatchlistAnalyzer: true,
    technicalAnalysisService: true
  };

  constructor(config: {
    supabaseUrl: string;
    supabaseKey: string;
    heliusApiKey: string;
    birdeyeApiKey: string;
    moralisApiKey: string;
    openaiApiKey: string;
  }) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Initialize available database reading services
    // Temporarily disable service initialization to prevent startup issues
    /*
    try {
      this.smartTokenCrawler = new SmartTokenCrawler({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
        heliusApiKey: config.heliusApiKey,
        birdeyeApiKey: config.birdeyeApiKey,
        moralisApiKey: config.moralisApiKey
      });
    } catch (error) {
      console.warn('Smart Token Crawler not available:', error);
      this.serviceStatus.smartTokenCrawler = false;
    }

    try {
      this.aiWatchlistAnalyzer = new AIWatchlistAnalyzer({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
        openaiApiKey: config.openaiApiKey,
        watchlistId: 1 // Default watchlist
      });
    } catch (error) {
      console.warn('AI Watchlist Analyzer not available:', error);
      this.serviceStatus.aiWatchlistAnalyzer = false;
    }

    try {
      this.technicalAnalysisService = new TechnicalAnalysisService({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey
      });
    } catch (error) {
      console.warn('Technical Analysis Service not available:', error);
      this.serviceStatus.technicalAnalysisService = false;
    }
    */
    
    // Set services as unavailable for now
    this.serviceStatus.smartTokenCrawler = false;
    this.serviceStatus.aiWatchlistAnalyzer = false;
    this.serviceStatus.technicalAnalysisService = false;

    console.log('🚀 Database Data Manager initialized');
    console.log('📊 Service Status:', this.serviceStatus);
  }

  /**
   * Main method to get unified data from database
   */
  async getDatabaseData(request: DatabaseDataRequest): Promise<DatabaseDataResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    if (!request.realTime) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`🔍 Fetching ${request.type} data from database...`);

    try {
      const data = await this.aggregateDataFromDatabase(request);
      const enrichedData = await this.enrichWithDatabaseData(data, request);
      
      const response: DatabaseDataResponse = {
        data: enrichedData,
        metadata: {
          dataSource: this.getActiveSources(request.type),
          lastUpdated: new Date().toISOString(),
          confidence: this.calculateConfidence(enrichedData),
          cached: false,
          processingTime: Date.now() - startTime
        },
        insights: {
          totalTokens: enrichedData.length,
          averageConfidence: this.calculateAverageConfidence(enrichedData),
          dataFreshness: this.assessDataFreshness(enrichedData),
          recommendedTokens: enrichedData.filter(t => t.aiAnalysis?.recommendation === 'add').length
        }
      };

      // Cache the response
      this.setCache(cacheKey, response, this.getCacheTTL(request.type));
      
      console.log(`✅ Retrieved ${enrichedData.length} tokens from database in ${Date.now() - startTime}ms`);
      return response;

    } catch (error) {
      console.error('❌ Error in database data aggregation:', error);
      return this.getFallbackResponse(request, startTime);
    }
  }

  /**
   * Aggregate data from database sources
   */
  private async aggregateDataFromDatabase(request: DatabaseDataRequest): Promise<UnifiedTokenData[]> {
    const baseQuery = this.supabase
      .from('tokens')
      .select('*')
      .eq('is_active', true);

    // Apply filters based on request type
    if (request.type === 'volume') {
      baseQuery.order('volume_24h', { ascending: false });
    } else if (request.type === 'behavioral') {
      baseQuery.gte('whale_buys_24h', 1).order('whale_buys_24h', { ascending: false });
    } else if (request.type === 'launchpad') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      baseQuery.gte('created_at', oneDayAgo).order('created_at', { ascending: false });
    } else {
      baseQuery.order('volume_24h', { ascending: false });
    }

    // Apply additional filters
    if (request.filters) {
      if (request.filters.minVolume) {
        baseQuery.gte('volume_24h', request.filters.minVolume);
      }
      if (request.filters.tier) {
        baseQuery.eq('tier', request.filters.tier);
      }
      if (request.filters.tokenAddresses) {
        baseQuery.in('address', request.filters.tokenAddresses);
      }
    }

    // Apply limit
    baseQuery.limit(request.limit || 50);

    const { data, error } = await baseQuery;
    
    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    return (data || []).map(this.transformToUnifiedFormat);
  }

  /**
   * Enrich base data with additional database tables
   */
  private async enrichWithDatabaseData(
    baseData: UnifiedTokenData[], 
    request: DatabaseDataRequest
  ): Promise<UnifiedTokenData[]> {
    const enrichmentPromises = baseData.map(async (token) => {
      const enriched = { ...token };

      try {
        // Add behavioral metrics if available
        if (request.type === 'behavioral' || request.type === 'all') {
          enriched.behavioralMetrics = await this.getBehavioralMetrics(token.address);
        }

        // Add launchpad data if available
        if (request.type === 'launchpad' || request.type === 'all') {
          enriched.launchpadData = await this.getLaunchpadData(token.address);
        }

        // Add AI analysis if available
        if (request.type === 'ai_recommendations' || request.type === 'all') {
          enriched.aiAnalysis = await this.getAIAnalysis(token.address);
        }

        // Add technical analysis if available
        if (request.type === 'technical' || request.type === 'all') {
          enriched.technicalAnalysis = await this.getTechnicalAnalysis(token.address);
        }

      } catch (error) {
        console.warn(`⚠️ Error enriching token ${token.symbol}:`, error);
      }

      return enriched;
    });

    return Promise.all(enrichmentPromises);
  }

  /**
   * Get behavioral metrics for a specific token
   */
  private async getBehavioralMetrics(address: string): Promise<any> {
    // Query behavioral data from database or API
    const { data } = await this.supabase
      .from('behavioral_data')
      .select('*')
      .eq('token_address', address)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data ? {
      whaleTransactions24h: data.whale_buys_24h || 0,
      newHolders24h: data.new_holders_24h || 0,
      volumeSpike: data.volume_spike || false,
      suspiciousActivity: data.suspicious_activity || false
    } : null;
  }

  /**
   * Get launchpad data for a specific token
   */
  private async getLaunchpadData(address: string): Promise<any> {
    // Check if token is a recent launch
    const { data } = await this.supabase
      .from('tokens')
      .select('created_at, source')
      .eq('address', address)
      .single();

    if (!data) return null;

    const launchTime = new Date(data.created_at).getTime();
    const now = Date.now();
    const isNewLaunch = (now - launchTime) < (24 * 60 * 60 * 1000); // 24 hours

    return {
      isNewLaunch,
      launchPlatform: data.source,
      launchTime,
      earlyWhaleActivity: 0, // Would be populated by launchpad monitor
      riskScore: 0.5 // Default risk score
    };
  }

  /**
   * Get AI analysis for a specific token
   */
  private async getAIAnalysis(address: string): Promise<any> {
    const { data } = await this.supabase
      .from('ai_analysis')
      .select('*')
      .eq('token_address', address)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data ? {
      bullishScore: data.bullish_score,
      bearishScore: data.bearish_score,
      confidence: data.confidence_score,
      recommendation: data.recommendation,
      reasoning: data.reasoning
    } : null;
  }

  /**
   * Get technical analysis for a specific token
   */
  private async getTechnicalAnalysis(address: string): Promise<any> {
    if (!this.technicalAnalysisService) return null;

    try {
      const analysis = await this.technicalAnalysisService.getTokenAnalysis(address);
      return analysis ? {
        technical_score: analysis.technical_score,
        trend: analysis.trend,
        momentum: analysis.momentum,
        volatility: analysis.volatility,
        active_signals: analysis.active_signals,
        support_levels: analysis.support_levels,
        resistance_levels: analysis.resistance_levels
      } : null;
    } catch (error) {
      console.warn(`Error getting TA for ${address}:`, error);
      return null;
    }
  }

  /**
   * Transform database token to unified format
   */
  private transformToUnifiedFormat(dbToken: any): UnifiedTokenData {
    return {
      address: dbToken.address,
      name: dbToken.name || 'Unknown',
      symbol: dbToken.symbol || 'UNK',
      price: dbToken.price || 0,
      volume24h: dbToken.volume_24h || 0,
      priceChange24h: dbToken.price_change_24h || 0,
      liquidity: dbToken.liquidity || 0,
      holders: dbToken.holders || 0,
      marketCap: dbToken.market_cap || 0,
      tier: dbToken.tier || 3,
      source: dbToken.source || 'unknown'
    };
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(request: DatabaseDataRequest): string {
    return `database_${request.type}_${JSON.stringify(request.filters)}_${request.limit}`;
  }

  private getFromCache(key: string): DatabaseDataResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return { ...cached.data, metadata: { ...cached.data.metadata, cached: true } };
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: DatabaseDataResponse, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getCacheTTL(type: string): number {
    const ttlMap: Record<string, number> = {
      volume: 30000,      // 30 seconds
      behavioral: 120000, // 2 minutes  
      launchpad: 300000,  // 5 minutes
      technical: 300000,  // 5 minutes
      ai_recommendations: 900000, // 15 minutes
      all: 60000         // 1 minute
    };
    return ttlMap[type] || 60000;
  }

  /**
   * Helper methods
   */
  private getActiveSources(type: string): string[] {
    const sources = ['database'];
    Object.entries(this.serviceStatus).forEach(([service, active]) => {
      if (active) sources.push(service);
    });
    return sources;
  }

  private calculateConfidence(data: UnifiedTokenData[]): number {
    if (data.length === 0) return 0;
    
    const scores = data.map(token => {
      let confidence = 0.7; // Base confidence
      
      if (token.behavioralMetrics) confidence += 0.1;
      if (token.launchpadData) confidence += 0.1;
      if (token.aiAnalysis) confidence += 0.1;
      
      return confidence;
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateAverageConfidence(data: UnifiedTokenData[]): number {
    const confidences = data
      .map(t => t.aiAnalysis?.confidence)
      .filter(c => c !== undefined) as number[];
    
    return confidences.length > 0 
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
      : 0.5;
  }

  private assessDataFreshness(data: UnifiedTokenData[]): string {
    // Simple freshness assessment
    return 'live'; // Would be more sophisticated in production
  }

  private getFallbackResponse(request: DatabaseDataRequest, startTime: number): DatabaseDataResponse {
    return {
      data: [],
      metadata: {
        dataSource: ['fallback'],
        lastUpdated: new Date().toISOString(),
        confidence: 0.3,
        cached: false,
        processingTime: Date.now() - startTime
      },
      insights: {
        totalTokens: 0,
        averageConfidence: 0,
        dataFreshness: 'stale',
        recommendedTokens: 0
      }
    };
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const checks: { [key: string]: boolean } = {};
    
    // Test database connection
    try {
      await this.supabase.from('tokens').select('count').limit(1);
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // Test other services
    checks.smartTokenCrawler = this.serviceStatus.smartTokenCrawler;
    checks.aiWatchlistAnalyzer = this.serviceStatus.aiWatchlistAnalyzer;
    checks.technicalAnalysisService = this.serviceStatus.technicalAnalysisService;
    
    return checks;
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<any> {
    const { data: tokenCount } = await this.supabase
      .from('tokens')
      .select('count')
      .eq('is_active', true);

    const { data: behavioralCount } = await this.supabase
      .from('behavioral_data')
      .select('count');

    return {
      totalTokens: tokenCount?.[0]?.count || 0,
      behavioralRecords: behavioralCount?.[0]?.count || 0,
      cacheSize: this.cache.size,
      serviceStatus: this.serviceStatus,
      uptime: process.uptime()
    };
  }
}

export default DatabaseDataManager;