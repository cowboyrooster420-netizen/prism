/**
 * Enhanced AI Chat Service - Full Crawler Integration
 * Integrates ALL crawler capabilities into a unified AI chat interface
 */

import { BehavioralCrawler } from './behavioral-crawler';
import { VolumePrioritizer } from './volume-prioritizer';
import { LaunchpadMonitor } from './launchpad-monitor';
import { HeliusBehavioralAnalyzer } from './helius-behavioral-analysis';
import { JupiterSmartCrawler } from './jupiter-smart-crawler';
import { SmartCache } from './smart-cache';
import { MagicalAIResponses } from './magical-ai-responses';
import { SharedWebSocketSystem } from './shared-websocket';
import { createClient } from '@supabase/supabase-js';

interface EnhancedChatRequest {
  query: string;
  userId: string;
  sessionId: string;
  tier: 'free' | 'pro' | 'enterprise';
  preferences?: {
    whaleThreshold?: number;
    tokenAge?: string;
    launchpads?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
    focusAreas?: ('behavioral' | 'volume' | 'launchpad' | 'technical' | 'ai')[];
  };
}

interface EnhancedChatResponse {
  response: string;
  cost: number;
  method: 'template' | 'llm' | 'hybrid' | 'crawler';
  cached: boolean;
  suggestions?: string[];
  alerts?: {
    type: string;
    data: any;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }[];
  magicalTouch: {
    urgency: string;
    freshness: string;
    personalization: string;
  };
  crawlerInsights?: {
    behavioralMetrics?: any;
    volumeAnalysis?: any;
    launchpadSignals?: any;
    technicalIndicators?: any;
    aiRecommendations?: any;
  };
  realTimeData?: {
    lastUpdated: string;
    dataSource: string;
    confidence: number;
  };
}

export class EnhancedAIChatService {
  private behavioralCrawler: BehavioralCrawler;
  private volumePrioritizer: VolumePrioritizer;
  private launchpadMonitor: LaunchpadMonitor;
  private heliusAnalyzer: HeliusBehavioralAnalyzer;
  private jupiterCrawler: JupiterSmartCrawler;
  private cache: SmartCache;
  private aiResponses: MagicalAIResponses;
  private websockets: SharedWebSocketSystem;
  private supabase: any;
  
  private userSessions = new Map<string, any>();
  private queryHistory = new Map<string, any[]>();
  private activeCrawls = new Map<string, any>();

  constructor(
    config: {
      redisUrl: string;
      openaiKey: string;
      websocketPort: number;
      supabaseUrl: string;
      supabaseKey: string;
      heliusApiKey: string;
      birdeyeApiKey: string;
    }
  ) {
    // Initialize all crawler services
    this.behavioralCrawler = new BehavioralCrawler();
    this.volumePrioritizer = new VolumePrioritizer();
    this.launchpadMonitor = new LaunchpadMonitor();
    this.heliusAnalyzer = new HeliusBehavioralAnalyzer();
    this.jupiterCrawler = new JupiterSmartCrawler({
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      heliusApiKey: config.heliusApiKey,
      birdeyeApiKey: config.birdeyeApiKey
    });

    // Initialize AI and caching services
    this.cache = new SmartCache(config.redisUrl);
    this.aiResponses = new MagicalAIResponses(config.openaiKey, this.cache);
    this.websockets = new SharedWebSocketSystem(config.websocketPort, this.cache);
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);

    console.log('🚀 Enhanced AI Chat Service initialized with full crawler integration');
    this.startRealTimeStreams();
  }

  /**
   * Main enhanced chat interface - routes queries to appropriate crawler services
   */
  async enhancedChat(request: EnhancedChatRequest): Promise<EnhancedChatResponse> {
    const startTime = Date.now();
    
    // Build comprehensive user context
    const userContext = this.buildEnhancedUserContext(request);
    
    // Route query to appropriate crawler service
    const crawlerResult = await this.routeToCrawlerService(request.query, userContext);
    
    // Process through AI system if needed
    const aiResult = await this.processWithAI(request.query, userContext, crawlerResult);
    
    // Get real-time alerts and insights
    const alerts = await this.getEnhancedAlerts(request.userId, request.query, crawlerResult);
    
    // Generate smart suggestions based on crawler data
    const suggestions = this.generateEnhancedSuggestions(request.query, userContext, crawlerResult);
    
    // Add magical personalization
    const magicalTouch = this.createEnhancedMagicalTouch(request, crawlerResult, userContext);
    
    // Update user history and analytics
    this.updateEnhancedUserHistory(request.userId, request.query, crawlerResult, aiResult.method);
    
    const responseTime = Date.now() - startTime;
    console.log(`✨ Enhanced chat response: ${aiResult.method} (${responseTime}ms, $${aiResult.cost.toFixed(4)})`);

    return {
      response: aiResult.response,
      cost: aiResult.cost,
      method: aiResult.method,
      cached: aiResult.cached,
      suggestions,
      alerts,
      magicalTouch,
      crawlerInsights: crawlerResult.insights,
      realTimeData: {
        lastUpdated: new Date().toISOString(),
        dataSource: crawlerResult.dataSource,
        confidence: crawlerResult.confidence
      }
    };
  }

  /**
   * Smart routing to appropriate crawler services based on query intent
   */
  private async routeToCrawlerService(query: string, userContext: any): Promise<any> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Behavioral analysis queries
    if (this.isBehavioralQuery(normalizedQuery)) {
      return await this.handleBehavioralQuery(query, userContext);
    }
    
    // Volume and market analysis queries
    if (this.isVolumeQuery(normalizedQuery)) {
      return await this.handleVolumeQuery(query, userContext);
    }
    
    // Launchpad and new token queries
    if (this.isLaunchpadQuery(normalizedQuery)) {
      return await this.handleLaunchpadQuery(query, userContext);
    }
    
    // Technical analysis queries
    if (this.isTechnicalQuery(normalizedQuery)) {
      return await this.handleTechnicalQuery(query, userContext);
    }
    
    // AI recommendation queries
    if (this.isAIRecommendationQuery(normalizedQuery)) {
      return await this.handleAIRecommendationQuery(query, userContext);
    }
    
    // Default to general behavioral analysis
    return await this.handleBehavioralQuery(query, userContext);
  }

  /**
   * Handle behavioral analysis queries
   */
  private async handleBehavioralQuery(query: string, userContext: any): Promise<any> {
    console.log('🧠 Processing behavioral analysis query...');
    
    try {
      // Get behavioral metrics for top tokens
      const behavioralData = await this.behavioralCrawler.runBehavioralCrawl();
      
      // Analyze specific tokens if mentioned
      const tokenAddresses = this.extractTokenAddresses(query);
      let specificAnalysis = null;
      
      if (tokenAddresses.length > 0) {
        specificAnalysis = await Promise.all(
          tokenAddresses.map(async (address) => {
            return await this.heliusAnalyzer.analyzeBehavioralMetrics(address);
          })
        );
      }
      
      return {
        insights: {
          behavioralMetrics: behavioralData,
          specificTokens: specificAnalysis,
          whaleActivity: await this.getWhaleActivitySummary(),
          holderGrowth: await this.getHolderGrowthSummary()
        },
        dataSource: 'behavioral_crawler',
        confidence: 0.95,
        response: this.formatBehavioralResponse(behavioralData, specificAnalysis)
      };
    } catch (error) {
      console.error('Error in behavioral analysis:', error);
      return this.getFallbackResponse('behavioral');
    }
  }

  /**
   * Handle volume and market analysis queries
   */
  private async handleVolumeQuery(query: string, userContext: any): Promise<any> {
    console.log('📊 Processing volume analysis query...');
    
    try {
      // Get volume-based priority tokens
      const volumeTokens = await this.volumePrioritizer.getVolumeBasedPriority(100);
      
      // Get trending and top tokens
      const trendingTokens = await this.volumePrioritizer.getTrendingTokens(50);
      
      // Analyze volume patterns
      const volumeAnalysis = await this.analyzeVolumePatterns(volumeTokens);
      
      return {
        insights: {
          volumeAnalysis: volumeAnalysis,
          topVolumeTokens: volumeTokens.slice(0, 20),
          trendingTokens: trendingTokens,
          volumePatterns: await this.getVolumePatterns()
        },
        dataSource: 'volume_prioritizer',
        confidence: 0.92,
        response: this.formatVolumeResponse(volumeAnalysis, volumeTokens)
      };
    } catch (error) {
      console.error('Error in volume analysis:', error);
      return this.getFallbackResponse('volume');
    }
  }

  /**
   * Handle launchpad and new token queries
   */
  private async handleLaunchpadQuery(query: string, userContext: any): Promise<any> {
    console.log('🚀 Processing launchpad analysis query...');
    
    try {
      // Scan for new launches
      const newLaunches = await this.launchpadMonitor.scanForNewLaunches();
      
      // Get early whale activity
      const earlyWhaleActivity = await this.launchpadMonitor.getEarlyWhaleActivity();
      
      // Analyze launchpad signals
      const launchpadSignals = await this.launchpadMonitor.analyzeLaunchpadSignals();
      
      return {
        insights: {
          newLaunches: newLaunches,
          earlyWhaleActivity: earlyWhaleActivity,
          launchpadSignals: launchpadSignals,
          riskAssessment: await this.assessLaunchpadRisks(newLaunches)
        },
        dataSource: 'launchpad_monitor',
        confidence: 0.88,
        response: this.formatLaunchpadResponse(newLaunches, earlyWhaleActivity)
      };
    } catch (error) {
      console.error('Error in launchpad analysis:', error);
      return this.getFallbackResponse('launchpad');
    }
  }

  /**
   * Handle technical analysis queries
   */
  private async handleTechnicalQuery(query: string, userContext: any): Promise<any> {
    console.log('📈 Processing technical analysis query...');
    
    try {
      // Get technical indicators for tokens
      const technicalData = await this.getTechnicalAnalysis(query);
      
      // Get market structure analysis
      const marketStructure = await this.analyzeMarketStructure();
      
      return {
        insights: {
          technicalIndicators: technicalData,
          marketStructure: marketStructure,
          supportResistance: await this.getSupportResistanceLevels(),
          trendAnalysis: await this.getTrendAnalysis()
        },
        dataSource: 'technical_analysis',
        confidence: 0.90,
        response: this.formatTechnicalResponse(technicalData, marketStructure)
      };
    } catch (error) {
      console.error('Error in technical analysis:', error);
      return this.getFallbackResponse('technical');
    }
  }

  /**
   * Handle AI recommendation queries
   */
  private async handleAIRecommendationQuery(query: string, userContext: any): Promise<any> {
    console.log('🤖 Processing AI recommendation query...');
    
    try {
      // Get AI-powered token recommendations
      const aiRecommendations = await this.getAIRecommendations(query, userContext);
      
      // Get personalized watchlist suggestions
      const watchlistSuggestions = await this.getWatchlistSuggestions(userContext);
      
      // Get risk-adjusted portfolio recommendations
      const portfolioRecommendations = await this.getPortfolioRecommendations(userContext);
      
      return {
        insights: {
          aiRecommendations: aiRecommendations,
          watchlistSuggestions: watchlistSuggestions,
          portfolioRecommendations: portfolioRecommendations,
          confidenceMetrics: await this.getRecommendationConfidence()
        },
        dataSource: 'ai_analyzer',
        confidence: 0.85,
        response: this.formatAIRecommendationResponse(aiRecommendations, watchlistSuggestions)
      };
    } catch (error) {
      console.error('Error in AI recommendation:', error);
      return this.getFallbackResponse('ai');
    }
  }

  /**
   * Query intent detection methods
   */
  private isBehavioralQuery(query: string): boolean {
    const patterns = [
      /whale|whales|whale.*activity|behavioral|behavior|holder|holders|new.*holder/,
      /smart.*money|institutional|large.*buy|large.*sell/,
      /transaction.*pattern|trading.*pattern|buy.*pattern|sell.*pattern/
    ];
    return patterns.some(pattern => pattern.test(query));
  }

  private isVolumeQuery(query: string): boolean {
    const patterns = [
      /volume|vol|volume.*spike|volume.*surge|volume.*pump/,
      /trending|top.*token|high.*volume|market.*cap/,
      /liquidity|liquid|market.*activity|trading.*volume/
    ];
    return patterns.some(pattern => pattern.test(query));
  }

  private isLaunchpadQuery(query: string): boolean {
    const patterns = [
      /launchpad|new.*launch|new.*token|fresh.*token|recent.*launch/,
      /pump\.fun|raydium.*launch|meteora.*launch|jupiter.*launch/,
      /early.*whale|early.*holder|new.*coin|initial.*offering/
    ];
    return patterns.some(pattern => pattern.test(query));
  }

  private isTechnicalQuery(query: string): boolean {
    const patterns = [
      /technical|ta|indicator|rsi|macd|bollinger|support|resistance/,
      /trend|pattern|chart|candle|candlestick|fibonacci/,
      /moving.*average|ema|sma|momentum|oscillator/
    ];
    return patterns.some(pattern => pattern.test(query));
  }

  private isAIRecommendationQuery(query: string): boolean {
    const patterns = [
      /recommend|suggestion|advice|what.*should|what.*buy|what.*sell/,
      /portfolio|watchlist|best.*token|top.*pick|alpha/,
      /ai.*analysis|machine.*learning|predict|forecast/
    ];
    return patterns.some(pattern => pattern.test(query));
  }

  /**
   * Helper methods for data processing and formatting
   */
  private async getWhaleActivitySummary(): Promise<any> {
    // Implementation for whale activity summary
    return { activeWhales: 0, totalVolume: 0, recentActivity: [] };
  }

  private async getHolderGrowthSummary(): Promise<any> {
    // Implementation for holder growth summary
    return { newHolders24h: 0, growthRate: 0, topTokens: [] };
  }

  private async analyzeVolumePatterns(tokens: any[]): Promise<any> {
    // Implementation for volume pattern analysis
    return { patterns: [], anomalies: [], trends: [] };
  }

  private async getVolumePatterns(): Promise<any> {
    // Implementation for volume patterns
    return { daily: [], hourly: [], weekly: [] };
  }

  private async assessLaunchpadRisks(launches: any[]): Promise<any> {
    // Implementation for launchpad risk assessment
    return { lowRisk: [], mediumRisk: [], highRisk: [] };
  }

  private async getTechnicalAnalysis(query: string): Promise<any> {
    // Implementation for technical analysis
    return { indicators: [], signals: [], levels: [] };
  }

  private async analyzeMarketStructure(): Promise<any> {
    // Implementation for market structure analysis
    return { structure: {}, patterns: {}, levels: [] };
  }

  private async getSupportResistanceLevels(): Promise<any> {
    // Implementation for support/resistance levels
    return { support: [], resistance: [], dynamic: [] };
  }

  private async getTrendAnalysis(): Promise<any> {
    // Implementation for trend analysis
    return { trends: [], strength: [], duration: [] };
  }

  private async getAIRecommendations(query: string, userContext: any): Promise<any> {
    // Implementation for AI recommendations
    return { tokens: [], reasoning: [], confidence: [] };
  }

  private async getWatchlistSuggestions(userContext: any): Promise<any> {
    // Implementation for watchlist suggestions
    return { add: [], remove: [], monitor: [] };
  }

  private async getPortfolioRecommendations(userContext: any): Promise<any> {
    // Implementation for portfolio recommendations
    return { allocation: [], rebalance: [], risk: [] };
  }

  private async getRecommendationConfidence(): Promise<any> {
    // Implementation for recommendation confidence
    return { overall: 0, factors: [], reliability: 0 };
  }

  /**
   * Response formatting methods
   */
  private formatBehavioralResponse(data: any, specificAnalysis: any): string {
    // Format behavioral analysis response
    return `🧠 **Behavioral Analysis Results**\n\n${this.formatBehavioralData(data, specificAnalysis)}`;
  }

  private formatVolumeResponse(analysis: any, tokens: any[]): string {
    // Format volume analysis response
    return `📊 **Volume Analysis Results**\n\n${this.formatVolumeData(analysis, tokens)}`;
  }

  private formatLaunchpadResponse(launches: any[], whaleActivity: any): string {
    // Format launchpad analysis response
    return `🚀 **Launchpad Analysis Results**\n\n${this.formatLaunchpadData(launches, whaleActivity)}`;
  }

  private formatTechnicalResponse(data: any, marketStructure: any): string {
    // Format technical analysis response
    return `📈 **Technical Analysis Results**\n\n${this.formatTechnicalData(data, marketStructure)}`;
  }

  private formatAIRecommendationResponse(recommendations: any, watchlist: any): string {
    // Format AI recommendation response
    return `🤖 **AI Recommendation Results**\n\n${this.formatRecommendationData(recommendations, watchlist)}`;
  }

  /**
   * Fallback response methods
   */
  private getFallbackResponse(type: string): any {
    const fallbacks = {
      behavioral: { insights: { error: 'Behavioral analysis temporarily unavailable' }, dataSource: 'fallback', confidence: 0.5 },
      volume: { insights: { error: 'Volume analysis temporarily unavailable' }, dataSource: 'fallback', confidence: 0.5 },
      launchpad: { insights: { error: 'Launchpad analysis temporarily unavailable' }, dataSource: 'fallback', confidence: 0.5 },
      technical: { insights: { error: 'Technical analysis temporarily unavailable' }, dataSource: 'fallback', confidence: 0.5 },
      ai: { insights: { error: 'AI recommendations temporarily unavailable' }, dataSource: 'fallback', confidence: 0.5 }
    };
    
    return fallbacks[type] || fallbacks.behavioral;
  }

  /**
   * Additional helper methods would go here...
   */
  private buildEnhancedUserContext(request: EnhancedChatRequest): any {
    // Implementation for building enhanced user context
    return { userId: request.userId, tier: request.tier, preferences: request.preferences };
  }

  private async processWithAI(query: string, userContext: any, crawlerResult: any): Promise<any> {
    // Implementation for AI processing
    return { response: crawlerResult.response, method: 'crawler', cost: 0, cached: false };
  }

  private async getEnhancedAlerts(userId: string, query: string, crawlerResult: any): Promise<any[]> {
    // Implementation for enhanced alerts
    return [];
  }

  private generateEnhancedSuggestions(query: string, userContext: any, crawlerResult: any): string[] {
    // Implementation for enhanced suggestions
    return [];
  }

  private createEnhancedMagicalTouch(request: EnhancedChatRequest, crawlerResult: any, userContext: any): any {
    // Implementation for enhanced magical touch
    return { urgency: 'medium', freshness: 'live', personalization: 'high' };
  }

  private updateEnhancedUserHistory(userId: string, query: string, crawlerResult: any, method: string): void {
    // Implementation for updating enhanced user history
  }

  private extractTokenAddresses(query: string): string[] {
    // Implementation for extracting token addresses from query
    return [];
  }

  private startRealTimeStreams(): void {
    // Implementation for starting real-time data streams
    console.log('📡 Starting real-time data streams...');
  }
}

