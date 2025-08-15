/**
 * Data Fusion Engine - Advanced multi-source data aggregation and validation
 * Combines data from all crawler services with intelligent conflict resolution
 */

export interface DataSource {
  name: string;
  reliability: number; // 0-1 score
  latency: number; // ms
  coverage: string[]; // data types covered
  lastUpdate: Date;
}

export interface DataPoint {
  source: string;
  timestamp: Date;
  confidence: number;
  value: any;
  metadata?: any;
}

export interface FusedData {
  value: any;
  confidence: number;
  sources: string[];
  conflicts?: ConflictInfo[];
  staleness: number; // hours since oldest data
  completeness: number; // 0-1, how complete the data is
}

export interface ConflictInfo {
  field: string;
  values: { source: string; value: any; confidence: number }[];
  resolution: 'consensus' | 'highest_confidence' | 'most_recent' | 'weighted_average';
  resolvedValue: any;
}

export interface FusionConfig {
  conflictResolution: 'strict' | 'permissive' | 'adaptive';
  maxStaleness: number; // hours
  minConfidence: number; // 0-1
  sourceWeights: { [source: string]: number };
  fieldPriorities: { [field: string]: string[] }; // ordered source preferences per field
}

export class DataFusionEngine {
  private config: FusionConfig;
  private sourceReliability: Map<string, number> = new Map();
  private sourceLatency: Map<string, number> = new Map();
  
  constructor(config?: Partial<FusionConfig>) {
    this.config = {
      conflictResolution: 'adaptive',
      maxStaleness: 24,
      minConfidence: 0.3,
      sourceWeights: {
        'birdeye': 0.9,
        'dexscreener': 0.8,
        'helius': 0.95,
        'jupiter': 0.85,
        'raydium': 0.7,
        'database': 0.6,
        'ai_analysis': 0.8
      },
      fieldPriorities: {
        'price': ['birdeye', 'dexscreener', 'jupiter'],
        'volume24h': ['birdeye', 'dexscreener', 'jupiter'],
        'liquidity': ['birdeye', 'jupiter', 'raydium'],
        'holders': ['helius', 'birdeye'],
        'behavioralMetrics': ['helius', 'database'],
        'aiAnalysis': ['ai_analysis', 'database']
      },
      ...config
    };

    console.log('⚡ Data Fusion Engine initialized');
    this.initializeSourceMetrics();
  }

  /**
   * Main fusion method - combines data from multiple sources
   */
  async fuseTokenData(tokenAddress: string, dataSources: { [source: string]: any }): Promise<FusedData> {
    console.log(`🔀 Fusing data for ${tokenAddress} from ${Object.keys(dataSources).length} sources`);

    const dataPoints = this.extractDataPoints(dataSources);
    const conflicts = this.detectConflicts(dataPoints);
    const resolvedData = this.resolveConflicts(conflicts, dataPoints);
    const fusedValue = this.buildFusedValue(resolvedData, dataPoints);
    
    const fusion: FusedData = {
      value: fusedValue,
      confidence: this.calculateOverallConfidence(dataPoints, conflicts),
      sources: Object.keys(dataSources),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      staleness: this.calculateStaleness(dataPoints),
      completeness: this.calculateCompleteness(fusedValue)
    };

    console.log(`✅ Data fusion complete: ${fusion.confidence.toFixed(2)} confidence, ${fusion.sources.length} sources`);
    return fusion;
  }

  /**
   * Batch fusion for multiple tokens
   */
  async fuseBatchTokenData(tokenDataMap: { [tokenAddress: string]: { [source: string]: any } }): Promise<{ [tokenAddress: string]: FusedData }> {
    console.log(`🔄 Batch fusing data for ${Object.keys(tokenDataMap).length} tokens`);

    const results: { [tokenAddress: string]: FusedData } = {};
    
    const fusionPromises = Object.entries(tokenDataMap).map(async ([address, sources]) => {
      try {
        const fused = await this.fuseTokenData(address, sources);
        return [address, fused];
      } catch (error) {
        console.warn(`⚠️ Fusion failed for ${address}:`, error);
        return [address, this.createFallbackFusion(sources)];
      }
    });

    const fusedResults = await Promise.allSettled(fusionPromises);
    
    fusedResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const [address, fusion] = result.value;
        results[address] = fusion;
      }
    });

    return results;
  }

  /**
   * Extract standardized data points from various source formats
   */
  private extractDataPoints(dataSources: { [source: string]: any }): { [field: string]: DataPoint[] } {
    const dataPoints: { [field: string]: DataPoint[] } = {};

    Object.entries(dataSources).forEach(([sourceName, sourceData]) => {
      if (!sourceData) return;

      const standardizedData = this.standardizeSourceData(sourceName, sourceData);
      const sourceReliability = this.sourceReliability.get(sourceName) || 0.5;

      Object.entries(standardizedData).forEach(([field, value]) => {
        if (value !== null && value !== undefined) {
          if (!dataPoints[field]) dataPoints[field] = [];
          
          dataPoints[field].push({
            source: sourceName,
            timestamp: sourceData.timestamp || new Date(),
            confidence: sourceReliability,
            value,
            metadata: sourceData.metadata
          });
        }
      });
    });

    return dataPoints;
  }

  /**
   * Standardize data from different source formats
   */
  private standardizeSourceData(sourceName: string, sourceData: any): any {
    const standardized: any = {};

    // Handle different source formats
    switch (sourceName) {
      case 'birdeye':
        standardized.price = sourceData.price;
        standardized.volume24h = sourceData.v24hUSD || sourceData.volume24h;
        standardized.priceChange24h = sourceData.priceChange24h;
        standardized.liquidity = sourceData.liquidity;
        standardized.holders = sourceData.holder || sourceData.holders;
        standardized.marketCap = sourceData.mc || sourceData.marketCap;
        break;

      case 'dexscreener':
        standardized.price = parseFloat(sourceData.priceUsd) || sourceData.price;
        standardized.volume24h = parseFloat(sourceData.volume?.h24) || sourceData.volume24h;
        standardized.priceChange24h = parseFloat(sourceData.priceChange?.h24) || sourceData.priceChange24h;
        standardized.liquidity = parseFloat(sourceData.liquidity?.usd) || sourceData.liquidity;
        standardized.marketCap = parseFloat(sourceData.marketCap) || sourceData.marketCap;
        break;

      case 'helius':
        standardized.holders = sourceData.holderCount || sourceData.holders;
        standardized.behavioralMetrics = {
          whaleTransactions24h: sourceData.whaleTransactions || 0,
          newHolders24h: sourceData.newHolders || 0,
          volumeSpike: sourceData.volumeSpike || false,
          suspiciousActivity: sourceData.suspiciousActivity || false
        };
        break;

      case 'jupiter':
        standardized.price = sourceData.price;
        standardized.liquidity = sourceData.liquidityUsd;
        standardized.priceImpact = sourceData.priceImpact;
        break;

      case 'database':
        standardized.price = sourceData.price;
        standardized.volume24h = sourceData.volume_24h;
        standardized.priceChange24h = sourceData.price_change_24h;
        standardized.liquidity = sourceData.liquidity;
        standardized.holders = sourceData.holders;
        standardized.marketCap = sourceData.market_cap;
        standardized.tier = sourceData.tier;
        break;

      case 'ai_analysis':
        standardized.aiAnalysis = {
          bullishScore: sourceData.bullish_score,
          bearishScore: sourceData.bearish_score,
          confidence: sourceData.confidence_score,
          recommendation: sourceData.recommendation,
          reasoning: sourceData.reasoning
        };
        break;

      default:
        // Generic standardization
        Object.keys(sourceData).forEach(key => {
          if (typeof sourceData[key] !== 'object' || sourceData[key] === null) {
            standardized[key] = sourceData[key];
          }
        });
    }

    return standardized;
  }

  /**
   * Detect conflicts between data sources
   */
  private detectConflicts(dataPoints: { [field: string]: DataPoint[] }): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    Object.entries(dataPoints).forEach(([field, points]) => {
      if (points.length < 2) return; // No conflict with single source

      const values = points.map(p => ({ source: p.source, value: p.value, confidence: p.confidence }));
      
      // Detect numerical conflicts
      if (this.isNumericalField(field)) {
        const numericalConflict = this.detectNumericalConflict(field, values);
        if (numericalConflict) conflicts.push(numericalConflict);
      } 
      // Detect categorical conflicts
      else {
        const categoricalConflict = this.detectCategoricalConflict(field, values);
        if (categoricalConflict) conflicts.push(categoricalConflict);
      }
    });

    return conflicts;
  }

  /**
   * Detect numerical value conflicts (prices, volumes, etc.)
   */
  private detectNumericalConflict(field: string, values: any[]): ConflictInfo | null {
    const numericalValues = values
      .map(v => ({ ...v, value: parseFloat(v.value) }))
      .filter(v => !isNaN(v.value) && v.value > 0);

    if (numericalValues.length < 2) return null;

    const sortedValues = numericalValues.sort((a, b) => a.value - b.value);
    const median = sortedValues[Math.floor(sortedValues.length / 2)].value;
    const threshold = this.getConflictThreshold(field);

    // Check if any value deviates significantly from median
    const hasConflict = numericalValues.some(v => 
      Math.abs(v.value - median) / median > threshold
    );

    if (hasConflict) {
      const resolution = this.selectResolutionStrategy(field, numericalValues);
      return {
        field,
        values: numericalValues,
        resolution,
        resolvedValue: this.resolveNumericalConflict(numericalValues, resolution)
      };
    }

    return null;
  }

  /**
   * Detect categorical value conflicts (strings, booleans, etc.)
   */
  private detectCategoricalConflict(field: string, values: any[]): ConflictInfo | null {
    const uniqueValues = [...new Set(values.map(v => JSON.stringify(v.value)))];
    
    if (uniqueValues.length > 1) {
      const resolution = this.selectResolutionStrategy(field, values);
      return {
        field,
        values,
        resolution,
        resolvedValue: this.resolveCategoricalConflict(values, resolution)
      };
    }

    return null;
  }

  /**
   * Resolve conflicts based on selected strategy
   */
  private resolveConflicts(conflicts: ConflictInfo[], dataPoints: { [field: string]: DataPoint[] }): { [field: string]: any } {
    const resolved: { [field: string]: any } = {};

    // Resolve conflicts
    conflicts.forEach(conflict => {
      resolved[conflict.field] = conflict.resolvedValue;
    });

    // Add non-conflicted fields
    Object.entries(dataPoints).forEach(([field, points]) => {
      if (!resolved[field] && points.length > 0) {
        // Use highest confidence source for non-conflicted fields
        const bestPoint = points.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        resolved[field] = bestPoint.value;
      }
    });

    return resolved;
  }

  /**
   * Build final fused value object
   */
  private buildFusedValue(resolvedData: { [field: string]: any }, dataPoints: { [field: string]: DataPoint[] }): any {
    const fusedValue: any = { ...resolvedData };

    // Add metadata about data sources per field
    fusedValue._metadata = {
      sources: {},
      lastUpdated: new Date(),
      fusionVersion: '1.0'
    };

    Object.entries(dataPoints).forEach(([field, points]) => {
      fusedValue._metadata.sources[field] = points.map(p => ({
        source: p.source,
        confidence: p.confidence,
        timestamp: p.timestamp
      }));
    });

    return fusedValue;
  }

  /**
   * Calculate overall confidence of fused data
   */
  private calculateOverallConfidence(dataPoints: { [field: string]: DataPoint[] }, conflicts: ConflictInfo[]): number {
    let totalConfidence = 0;
    let fieldCount = 0;

    Object.values(dataPoints).forEach(points => {
      if (points.length > 0) {
        const avgConfidence = points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
        totalConfidence += avgConfidence;
        fieldCount++;
      }
    });

    const baseConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;
    
    // Reduce confidence based on conflicts
    const conflictPenalty = conflicts.length * 0.05;
    
    return Math.max(0.1, Math.min(1.0, baseConfidence - conflictPenalty));
  }

  /**
   * Calculate data staleness in hours
   */
  private calculateStaleness(dataPoints: { [field: string]: DataPoint[] }): number {
    let oldestTimestamp = new Date();
    
    Object.values(dataPoints).forEach(points => {
      points.forEach(point => {
        if (point.timestamp < oldestTimestamp) {
          oldestTimestamp = point.timestamp;
        }
      });
    });

    return (Date.now() - oldestTimestamp.getTime()) / (1000 * 60 * 60); // hours
  }

  /**
   * Calculate data completeness (0-1)
   */
  private calculateCompleteness(fusedValue: any): number {
    const expectedFields = [
      'price', 'volume24h', 'priceChange24h', 'liquidity', 
      'holders', 'marketCap', 'name', 'symbol'
    ];
    
    const presentFields = expectedFields.filter(field => 
      fusedValue[field] !== null && fusedValue[field] !== undefined
    );

    return presentFields.length / expectedFields.length;
  }

  /**
   * Helper methods for conflict resolution
   */
  private isNumericalField(field: string): boolean {
    const numericalFields = [
      'price', 'volume24h', 'priceChange24h', 'liquidity', 
      'holders', 'marketCap', 'tier'
    ];
    return numericalFields.includes(field);
  }

  private getConflictThreshold(field: string): number {
    const thresholds = {
      'price': 0.05,        // 5% deviation
      'volume24h': 0.15,    // 15% deviation  
      'liquidity': 0.10,    // 10% deviation
      'holders': 0.20,      // 20% deviation
      'marketCap': 0.10,    // 10% deviation
      'priceChange24h': 0.30 // 30% deviation (more volatile)
    };
    return thresholds[field] || 0.10;
  }

  private selectResolutionStrategy(field: string, values: any[]): string {
    // Use field priorities if available
    const priorities = this.config.fieldPriorities[field];
    if (priorities) {
      const prioritySource = values.find(v => priorities.includes(v.source));
      if (prioritySource) return 'highest_confidence';
    }

    // Default resolution strategies by conflict mode
    switch (this.config.conflictResolution) {
      case 'strict':
        return 'highest_confidence';
      case 'permissive':
        return 'consensus';
      case 'adaptive':
      default:
        return this.isNumericalField(field) ? 'weighted_average' : 'highest_confidence';
    }
  }

  private resolveNumericalConflict(values: any[], strategy: string): number {
    switch (strategy) {
      case 'weighted_average':
        const totalWeight = values.reduce((sum, v) => sum + v.confidence, 0);
        return values.reduce((sum, v) => sum + (v.value * v.confidence), 0) / totalWeight;
        
      case 'highest_confidence':
        return values.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        ).value;
        
      case 'most_recent':
        return values.sort((a, b) => b.timestamp - a.timestamp)[0].value;
        
      case 'consensus':
      default:
        // Use median for consensus
        const sortedValues = values.map(v => v.value).sort((a, b) => a - b);
        return sortedValues[Math.floor(sortedValues.length / 2)];
    }
  }

  private resolveCategoricalConflict(values: any[], strategy: string): any {
    switch (strategy) {
      case 'highest_confidence':
        return values.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        ).value;
        
      case 'most_recent':
        return values.sort((a, b) => b.timestamp - a.timestamp)[0].value;
        
      case 'consensus':
      default:
        // Use most common value
        const valueCounts = new Map();
        values.forEach(v => {
          const key = JSON.stringify(v.value);
          valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
        });
        
        const mostCommon = [...valueCounts.entries()]
          .sort((a, b) => b[1] - a[1])[0];
        
        return JSON.parse(mostCommon[0]);
    }
  }

  /**
   * Create fallback fusion when primary fusion fails
   */
  private createFallbackFusion(sources: { [source: string]: any }): FusedData {
    // Use the source with highest priority
    const prioritySources = ['birdeye', 'dexscreener', 'database', 'jupiter'];
    const fallbackSource = prioritySources.find(source => sources[source]) || Object.keys(sources)[0];
    
    return {
      value: sources[fallbackSource],
      confidence: 0.3,
      sources: [fallbackSource],
      staleness: 0,
      completeness: this.calculateCompleteness(sources[fallbackSource])
    };
  }

  /**
   * Initialize source reliability metrics
   */
  private initializeSourceMetrics(): void {
    const defaultReliability = {
      'birdeye': 0.9,
      'dexscreener': 0.8,
      'helius': 0.95,
      'jupiter': 0.85,
      'raydium': 0.7,
      'database': 0.6,
      'ai_analysis': 0.8
    };

    Object.entries(defaultReliability).forEach(([source, reliability]) => {
      this.sourceReliability.set(source, reliability);
    });
  }

  /**
   * Update source reliability based on performance
   */
  updateSourceReliability(source: string, success: boolean, latency: number): void {
    const currentReliability = this.sourceReliability.get(source) || 0.5;
    const adjustment = success ? 0.01 : -0.02;
    const newReliability = Math.max(0.1, Math.min(1.0, currentReliability + adjustment));
    
    this.sourceReliability.set(source, newReliability);
    this.sourceLatency.set(source, latency);
  }

  /**
   * Get fusion statistics
   */
  getFusionStats(): any {
    return {
      sourceReliability: Object.fromEntries(this.sourceReliability),
      sourceLatency: Object.fromEntries(this.sourceLatency),
      config: this.config
    };
  }
}

export default DataFusionEngine;