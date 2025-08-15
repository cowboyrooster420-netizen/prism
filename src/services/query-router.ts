/**
 * Query Router - Intelligent intent detection and crawler service routing
 * Analyzes user queries and routes them to appropriate crawler services
 */

export interface QueryIntent {
  primary: 'behavioral' | 'volume' | 'launchpad' | 'technical' | 'ai_recommendations' | 'general';
  secondary?: string[];
  confidence: number;
  extractedTokens: string[];
  extractedMetrics: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'medium' | 'complex';
}

export interface QueryContext {
  userId?: string;
  sessionHistory?: string[];
  userPreferences?: {
    focusAreas?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
    experienceLevel?: 'beginner' | 'intermediate' | 'expert';
  };
  currentMarketCondition?: 'bullish' | 'bearish' | 'neutral' | 'volatile';
}

export interface RoutingDecision {
  intent: QueryIntent;
  crawlerServices: string[];
  priority: number;
  estimatedResponseTime: number;
  cacheable: boolean;
  realTimeRequired: boolean;
  dataRequirements: {
    limit: number;
    filters: any;
    freshness: 'real-time' | 'recent' | 'cached';
  };
  responseStrategy: 'immediate' | 'progressive' | 'comprehensive';
}

export class QueryRouter {
  private behavioralPatterns: RegExp[];
  private volumePatterns: RegExp[];
  private launchpadPatterns: RegExp[];
  private technicalPatterns: RegExp[];
  private aiRecommendationPatterns: RegExp[];
  private urgencyPatterns: RegExp[];
  private tokenAddressPattern: RegExp;
  
  // Pattern weights for multi-intent scenarios
  private patternWeights = {
    behavioral: 1.0,
    volume: 0.9,
    launchpad: 1.1,
    technical: 0.8,
    ai_recommendations: 0.7
  };

  constructor() {
    this.initializePatterns();
    console.log('🧠 Query Router initialized with pattern matching');
  }

  private initializePatterns(): void {
    // Behavioral analysis patterns (enhanced from your existing system)
    this.behavioralPatterns = [
      /whale|whales|whale.*activity|whale.*movement|whale.*buys?|whale.*sells?/i,
      /smart.*money|institutional|institutions?|big.*holders?/i,
      /behavioral?|behavior|holder.*growth|new.*holders?/i,
      /transaction.*patterns?|trading.*patterns?|buy.*patterns?|sell.*patterns?/i,
      /large.*buys?|large.*sells?|massive.*volume|suspicious.*activity/i,
      /holder.*distribution|wallet.*analysis|address.*analysis/i
    ];

    // Volume and market analysis patterns
    this.volumePatterns = [
      /volume|vol|volume.*spike|volume.*surge|volume.*pump|volume.*analysis/i,
      /trending|top.*tokens?|high.*volume|market.*activity|trading.*volume/i,
      /liquidity|liquid|market.*cap|mcap|market.*depth/i,
      /price.*action|price.*movement|momentum|volatility/i,
      /market.*leaders|volume.*leaders|most.*traded/i
    ];

    // Launchpad and new token patterns
    this.launchpadPatterns = [
      /launchpad|launch.*pad|new.*launch|new.*tokens?|fresh.*tokens?/i,
      /pump\.fun|pump.*fun|raydium.*launch|meteora.*launch|jupiter.*launch/i,
      /early.*whale|early.*holders?|new.*coins?|initial.*offering/i,
      /recent.*launch|just.*launched|launched.*today|brand.*new/i,
      /rug.*pull|scam.*tokens?|safe.*launch|verified.*launch/i,
      /alpha.*tokens?|gem.*hunting|early.*entry|first.*day/i
    ];

    // Technical analysis patterns
    this.technicalPatterns = [
      /technical|ta|technical.*analysis|chart.*analysis/i,
      /indicators?|rsi|macd|bollinger|support|resistance/i,
      /trends?|patterns?|charts?|candles?|candlesticks?|fibonacci/i,
      /moving.*averages?|ema|sma|momentum|oscillators?/i,
      /breakout|breakdown|reversal|continuation|flag|pennant/i,
      /overbought|oversold|divergence|convergence/i,
      /golden.*cross|death.*cross|crossover/i,
      /atr|volatility|squeeze|expansion/i,
      /donchian|channel|band/i
    ];

    // AI recommendation patterns
    this.aiRecommendationPatterns = [
      /recommend|recommendation|suggestions?|advice|what.*should/i,
      /what.*buy|what.*sell|best.*tokens?|top.*picks?|alpha/i,
      /portfolio|watchlist|investment|allocation/i,
      /ai.*analysis|machine.*learning|predict|forecast|score/i,
      /bullish|bearish|outlook|sentiment|opinion/i,
      /gems?|diamonds?|hidden.*gems?|undervalued|opportunities?/i
    ];

    // Urgency detection patterns
    this.urgencyPatterns = [
      /urgent|asap|immediately|right.*now|quick|fast|emergency/i, // critical
      /soon|today|this.*hour|breaking|alert|warning/i, // high
      /when.*convenient|later|sometime|eventually/i // low
    ];

    // Token address pattern (Solana addresses)
    this.tokenAddressPattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
  }

  /**
   * Main routing method - analyzes query and returns routing decision
   */
  async routeQuery(query: string, context?: QueryContext): Promise<RoutingDecision> {
    console.log(`🔍 Routing query: "${query.substring(0, 50)}..."`);
    
    const intent = this.detectIntent(query, context);
    const extractedTokens = this.extractTokenAddresses(query);
    const urgency = this.detectUrgency(query);
    
    // Determine which crawler services to use
    const crawlerServices = this.determineCrawlerServices(intent);
    
    // Calculate response strategy and requirements
    const responseStrategy = this.determineResponseStrategy(intent, urgency, extractedTokens);
    const dataRequirements = this.calculateDataRequirements(intent, extractedTokens, context);
    
    const decision: RoutingDecision = {
      intent,
      crawlerServices,
      priority: this.calculatePriority(intent, urgency),
      estimatedResponseTime: this.estimateResponseTime(crawlerServices, responseStrategy),
      cacheable: this.isCacheable(intent, urgency),
      realTimeRequired: this.requiresRealTime(intent, urgency),
      dataRequirements,
      responseStrategy
    };

    console.log(`📊 Routing decision: ${intent.primary} -> [${crawlerServices.join(', ')}]`);
    return decision;
  }

  /**
   * Detect user intent from query text
   */
  private detectIntent(query: string, context?: QueryContext): QueryIntent {
    const normalizedQuery = query.toLowerCase().trim();
    const scores: { [key: string]: number } = {};
    
    // Score each pattern category
    scores.behavioral = this.scorePatterns(normalizedQuery, this.behavioralPatterns) * this.patternWeights.behavioral;
    scores.volume = this.scorePatterns(normalizedQuery, this.volumePatterns) * this.patternWeights.volume;
    scores.launchpad = this.scorePatterns(normalizedQuery, this.launchpadPatterns) * this.patternWeights.launchpad;
    scores.technical = this.scorePatterns(normalizedQuery, this.technicalPatterns) * this.patternWeights.technical;
    scores.ai_recommendations = this.scorePatterns(normalizedQuery, this.aiRecommendationPatterns) * this.patternWeights.ai_recommendations;

    // Apply context-based adjustments
    if (context?.userPreferences?.focusAreas) {
      context.userPreferences.focusAreas.forEach(area => {
        if (scores[area]) {
          scores[area] *= 1.2; // Boost user's preferred areas
        }
      });
    }

    // Determine primary intent
    const maxScore = Math.max(...Object.values(scores));
    const primary = Object.keys(scores).find(key => scores[key] === maxScore) as any;
    
    // Determine secondary intents (scores > 0.3 of max)
    const secondary = Object.keys(scores)
      .filter(key => key !== primary && scores[key] > maxScore * 0.3)
      .sort((a, b) => scores[b] - scores[a]);

    // Extract specific tokens and metrics
    const extractedTokens = this.extractTokenAddresses(query);
    const extractedMetrics = this.extractMetrics(normalizedQuery);

    // Calculate confidence and complexity
    const confidence = Math.min(maxScore, 1.0);
    const complexity = this.assessComplexity(normalizedQuery, extractedTokens, secondary);
    const urgency = this.detectUrgency(normalizedQuery);

    return {
      primary: primary || 'general',
      secondary: secondary.length > 0 ? secondary : undefined,
      confidence,
      extractedTokens,
      extractedMetrics,
      urgency,
      complexity
    };
  }

  /**
   * Score patterns against query text
   */
  private scorePatterns(query: string, patterns: RegExp[]): number {
    let score = 0;
    let matchCount = 0;
    
    patterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        matchCount++;
        // Weight by match length and position
        const matchWeight = matches[0].length / query.length;
        const positionWeight = 1 - (query.indexOf(matches[0]) / query.length) * 0.3;
        score += matchWeight * positionWeight;
      }
    });

    // Normalize by pattern count and add match density bonus
    const normalizedScore = score / patterns.length;
    const densityBonus = matchCount > 1 ? 0.2 * Math.log(matchCount) : 0;
    
    return Math.min(normalizedScore + densityBonus, 1.0);
  }

  /**
   * Extract token addresses from query
   */
  private extractTokenAddresses(query: string): string[] {
    const matches = query.match(this.tokenAddressPattern) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Extract metrics mentioned in query
   */
  private extractMetrics(query: string): string[] {
    const metricPatterns = [
      /volume/i, /price/i, /market.*cap/i, /liquidity/i, /holders?/i,
      /rsi/i, /macd/i, /support/i, /resistance/i, /trend/i
    ];
    
    return metricPatterns
      .filter(pattern => pattern.test(query))
      .map(pattern => pattern.source.replace(/[\/\\^$*+?.()|[\]{}]/g, '').toLowerCase());
  }

  /**
   * Detect urgency level
   */
  private detectUrgency(query: string): 'low' | 'medium' | 'high' | 'critical' {
    const normalizedQuery = query.toLowerCase();
    
    if (/urgent|asap|immediately|right.*now|emergency|critical/.test(normalizedQuery)) {
      return 'critical';
    }
    if (/soon|today|this.*hour|breaking|alert|warning|quick|fast/.test(normalizedQuery)) {
      return 'high';
    }
    if (/when.*convenient|later|sometime|eventually/.test(normalizedQuery)) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Assess query complexity
   */
  private assessComplexity(
    query: string, 
    extractedTokens: string[], 
    secondaryIntents?: string[]
  ): 'simple' | 'medium' | 'complex' {
    let complexityScore = 0;
    
    // Length contributes to complexity
    complexityScore += Math.min(query.length / 100, 0.3);
    
    // Multiple tokens increase complexity
    complexityScore += extractedTokens.length * 0.2;
    
    // Multiple intents increase complexity
    complexityScore += (secondaryIntents?.length || 0) * 0.2;
    
    // Complex phrases increase complexity
    const complexPhrases = [
      /compare|comparison|vs|versus/i,
      /correlation|relationship/i,
      /prediction|forecast|future/i,
      /optimization|strategy/i
    ];
    complexityScore += complexPhrases.filter(p => p.test(query)).length * 0.15;
    
    if (complexityScore > 0.7) return 'complex';
    if (complexityScore > 0.3) return 'medium';
    return 'simple';
  }

  /**
   * Determine which crawler services to use
   */
  private determineCrawlerServices(intent: QueryIntent): string[] {
    const services: string[] = [];
    
    // Primary service mapping
    const serviceMap = {
      behavioral: ['heliusAnalyzer', 'volumePrioritizer'],
      volume: ['volumePrioritizer', 'jupiterCrawler'],
      launchpad: ['launchpadMonitor', 'volumePrioritizer'],
      technical: ['jupiterCrawler', 'smartTokenCrawler'],
      ai_recommendations: ['aiWatchlistAnalyzer'],
      general: ['smartTokenCrawler', 'volumePrioritizer']
    };

    // Add primary services
    services.push(...(serviceMap[intent.primary] || serviceMap.general));

    // Add secondary services based on secondary intents
    if (intent.secondary) {
      intent.secondary.forEach(secondaryIntent => {
        const secondaryServices = serviceMap[secondaryIntent] || [];
        secondaryServices.forEach(service => {
          if (!services.includes(service)) {
            services.push(service);
          }
        });
      });
    }

    // For complex queries, add AI analysis
    if (intent.complexity === 'complex' && !services.includes('aiWatchlistAnalyzer')) {
      services.push('aiWatchlistAnalyzer');
    }

    return services;
  }

  /**
   * Determine response strategy
   */
  private determineResponseStrategy(
    intent: QueryIntent, 
    urgency: string, 
    extractedTokens: string[]
  ): 'immediate' | 'progressive' | 'comprehensive' {
    // Immediate for urgent, simple queries
    if (urgency === 'critical' || (urgency === 'high' && intent.complexity === 'simple')) {
      return 'immediate';
    }
    
    // Progressive for medium complexity or multiple tokens
    if (intent.complexity === 'medium' || extractedTokens.length > 1) {
      return 'progressive';
    }
    
    // Comprehensive for complex analysis
    if (intent.complexity === 'complex' || intent.secondary?.length > 1) {
      return 'comprehensive';
    }
    
    return 'immediate';
  }

  /**
   * Calculate data requirements
   */
  private calculateDataRequirements(
    intent: QueryIntent, 
    extractedTokens: string[], 
    context?: QueryContext
  ): any {
    const requirements: any = {
      limit: 50,
      filters: {},
      freshness: 'recent'
    };

    // Adjust limit based on query type
    if (intent.primary === 'launchpad') {
      requirements.limit = 20; // Fewer new launches
    } else if (intent.primary === 'ai_recommendations') {
      requirements.limit = 25; // Curated recommendations
    } else if (extractedTokens.length > 0) {
      requirements.limit = Math.min(extractedTokens.length * 5, 100);
    }

    // Set freshness requirements
    if (intent.urgency === 'critical' || intent.primary === 'launchpad') {
      requirements.freshness = 'real-time';
    } else if (intent.primary === 'ai_recommendations') {
      requirements.freshness = 'cached';
    }

    // Add specific token filters
    if (extractedTokens.length > 0) {
      requirements.filters.tokenAddresses = extractedTokens;
    }

    // Add user preference filters
    if (context?.userPreferences?.riskTolerance === 'low') {
      requirements.filters.minVolume = 100000; // Higher volume for safety
    }

    return requirements;
  }

  /**
   * Calculate query priority
   */
  private calculatePriority(intent: QueryIntent, urgency: string): number {
    const urgencyScores = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.2
    };

    const intentScores = {
      launchpad: 0.9,  // Time-sensitive
      behavioral: 0.8, // Market-moving
      volume: 0.7,
      ai_recommendations: 0.6,
      technical: 0.5,
      general: 0.4
    };

    return (urgencyScores[urgency] * 0.6) + (intentScores[intent.primary] * 0.4);
  }

  /**
   * Estimate response time
   */
  private estimateResponseTime(services: string[], strategy: string): number {
    const serviceTimings = {
      volumePrioritizer: 500,
      launchpadMonitor: 1000,
      heliusAnalyzer: 1500,
      jupiterCrawler: 800,
      smartTokenCrawler: 600,
      aiWatchlistAnalyzer: 3000
    };

    const baseTime = services.reduce((total, service) => {
      return total + (serviceTimings[service] || 1000);
    }, 0);

    const strategyMultipliers = {
      immediate: 0.6,
      progressive: 1.0,
      comprehensive: 1.4
    };

    return baseTime * (strategyMultipliers[strategy] || 1.0);
  }

  /**
   * Determine if response is cacheable
   */
  private isCacheable(intent: QueryIntent, urgency: string): boolean {
    // Don't cache critical/high urgency queries
    if (urgency === 'critical' || urgency === 'high') return false;
    
    // Don't cache launchpad queries (time-sensitive)
    if (intent.primary === 'launchpad') return false;
    
    // Cache AI recommendations and technical analysis
    return intent.primary === 'ai_recommendations' || intent.primary === 'technical';
  }

  /**
   * Determine if real-time data is required
   */
  private requiresRealTime(intent: QueryIntent, urgency: string): boolean {
    // Always real-time for critical/high urgency
    if (urgency === 'critical' || urgency === 'high') return true;
    
    // Real-time for launchpad and behavioral analysis
    return intent.primary === 'launchpad' || intent.primary === 'behavioral';
  }

  /**
   * Analyze query patterns for debugging/optimization
   */
  async analyzeQuery(query: string): Promise<any> {
    const scores: any = {};
    const normalizedQuery = query.toLowerCase();
    
    scores.behavioral = this.scorePatterns(normalizedQuery, this.behavioralPatterns);
    scores.volume = this.scorePatterns(normalizedQuery, this.volumePatterns);
    scores.launchpad = this.scorePatterns(normalizedQuery, this.launchpadPatterns);
    scores.technical = this.scorePatterns(normalizedQuery, this.technicalPatterns);
    scores.ai_recommendations = this.scorePatterns(normalizedQuery, this.aiRecommendationPatterns);

    return {
      query,
      scores,
      extractedTokens: this.extractTokenAddresses(query),
      extractedMetrics: this.extractMetrics(normalizedQuery),
      urgency: this.detectUrgency(normalizedQuery),
      patterns: {
        behavioral: this.behavioralPatterns.filter(p => p.test(normalizedQuery)),
        volume: this.volumePatterns.filter(p => p.test(normalizedQuery)),
        launchpad: this.launchpadPatterns.filter(p => p.test(normalizedQuery)),
        technical: this.technicalPatterns.filter(p => p.test(normalizedQuery)),
        ai_recommendations: this.aiRecommendationPatterns.filter(p => p.test(normalizedQuery))
      }
    };
  }
}

export default QueryRouter;