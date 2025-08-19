/**
 * Tier Management Service
 * Handles tier assignments and tier-specific configurations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface TierConfig {
  tier: number;
  name: string;
  timeframes: string[];
  updateIntervalSeconds: number;
  maxTokens: number;
  dataRetentionDays: number;
  priority: number; // 1 = highest priority
}

export interface TokenTierInfo {
  tokenAddress: string;
  tier: number;
  hotnessScore: number;
  lastTierChange: Date;
  consecutiveHighScores: number;
  consecutiveLowScores: number;
}

export interface CollectionSchedule {
  tier: number;
  timeframe: string;
  tokenAddresses: string[];
  nextRunAt: Date;
  intervalSeconds: number;
}

export class TierManager {
  private readonly TIER_CONFIGS: Map<number, TierConfig> = new Map([
    [1, {
      tier: 1,
      name: 'Hot Tokens',
      timeframes: ['1m'],
      updateIntervalSeconds: 60, // Every minute
      maxTokens: 150,
      dataRetentionDays: 7,
      priority: 1
    }],
    [2, {
      tier: 2,
      name: 'Active Tokens', 
      timeframes: ['5m'],
      updateIntervalSeconds: 300, // Every 5 minutes
      maxTokens: 350,
      dataRetentionDays: 3,
      priority: 2
    }],
    [3, {
      tier: 3,
      name: 'Established Tokens',
      timeframes: ['1h'],
      updateIntervalSeconds: 3600, // Every hour
      maxTokens: 1000,
      dataRetentionDays: 60,
      priority: 3
    }]
  ]);

  /**
   * Get tier configuration
   */
  public getTierConfig(tier: number): TierConfig | null {
    return this.TIER_CONFIGS.get(tier) || null;
  }

  /**
   * Get all tier configurations
   */
  public getAllTierConfigs(): TierConfig[] {
    return Array.from(this.TIER_CONFIGS.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get tokens for a specific tier (with proper batching)
   */
  public async getTokensByTier(tier: number): Promise<TokenTierInfo[]> {
    const config = this.getTierConfig(tier);
    if (!config) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    try {
      const { data, error } = await supabase
        .from('token_tiers')
        .select(`
          token_address,
          current_tier,
          hotness_score,
          last_tier_change,
          consecutive_high_scores,
          consecutive_low_scores
        `)
        .eq('current_tier', tier)
        .order('hotness_score', { ascending: false })
        .limit(config.maxTokens);

      if (error) {
        throw new Error(`Database error fetching tier ${tier} tokens: ${error.message}`);
      }

      return (data || []).map(row => ({
        tokenAddress: row.token_address,
        tier: row.current_tier,
        hotnessScore: row.hotness_score,
        lastTierChange: new Date(row.last_tier_change),
        consecutiveHighScores: row.consecutive_high_scores,
        consecutiveLowScores: row.consecutive_low_scores
      }));

    } catch (error) {
      console.error(`Error getting tokens for tier ${tier}:`, error);
      throw error;
    }
  }

  /**
   * Get tokens for multiple tiers efficiently
   */
  public async getTokensByTiers(tiers: number[]): Promise<Map<number, TokenTierInfo[]>> {
    if (tiers.length === 0) {
      return new Map();
    }

    try {
      const { data, error } = await supabase
        .from('token_tiers')
        .select(`
          token_address,
          current_tier,
          hotness_score,
          last_tier_change,
          consecutive_high_scores,
          consecutive_low_scores
        `)
        .in('current_tier', tiers)
        .order('current_tier, hotness_score', { ascending: [true, false] });

      if (error) {
        throw new Error(`Database error fetching multi-tier tokens: ${error.message}`);
      }

      // Group by tier
      const tierMap = new Map<number, TokenTierInfo[]>();
      
      for (const tier of tiers) {
        tierMap.set(tier, []);
      }

      for (const row of data || []) {
        const tier = row.current_tier;
        const config = this.getTierConfig(tier);
        
        if (config && tierMap.has(tier)) {
          const tierTokens = tierMap.get(tier)!;
          
          // Respect tier limits
          if (tierTokens.length < config.maxTokens) {
            tierTokens.push({
              tokenAddress: row.token_address,
              tier: row.current_tier,
              hotnessScore: row.hotness_score,
              lastTierChange: new Date(row.last_tier_change),
              consecutiveHighScores: row.consecutive_high_scores,
              consecutiveLowScores: row.consecutive_low_scores
            });
          }
        }
      }

      return tierMap;

    } catch (error) {
      console.error('Error getting multi-tier tokens:', error);
      throw error;
    }
  }

  /**
   * Generate collection schedules for all tiers
   */
  public async generateCollectionSchedules(): Promise<CollectionSchedule[]> {
    const allConfigs = this.getAllTierConfigs();
    const tierTokensMap = await this.getTokensByTiers(allConfigs.map(c => c.tier));
    
    const schedules: CollectionSchedule[] = [];
    const now = new Date();

    for (const config of allConfigs) {
      const tierTokens = tierTokensMap.get(config.tier) || [];
      const tokenAddresses = tierTokens.map(t => t.tokenAddress);

      if (tokenAddresses.length === 0) {
        continue;
      }

      for (const timeframe of config.timeframes) {
        schedules.push({
          tier: config.tier,
          timeframe,
          tokenAddresses,
          nextRunAt: this.calculateNextRunTime(now, config.updateIntervalSeconds),
          intervalSeconds: config.updateIntervalSeconds
        });
      }
    }

    return schedules.sort((a, b) => {
      // Sort by priority (tier 1 first), then by next run time
      const priorityA = this.getTierConfig(a.tier)?.priority || 999;
      const priorityB = this.getTierConfig(b.tier)?.priority || 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return a.nextRunAt.getTime() - b.nextRunAt.getTime();
    });
  }

  /**
   * Get schedules that are due for execution
   */
  public filterDueSchedules(schedules: CollectionSchedule[]): CollectionSchedule[] {
    const now = new Date();
    return schedules.filter(schedule => schedule.nextRunAt <= now);
  }

  /**
   * Update schedule after execution
   */
  public updateScheduleAfterExecution(schedule: CollectionSchedule): CollectionSchedule {
    return {
      ...schedule,
      nextRunAt: this.calculateNextRunTime(new Date(), schedule.intervalSeconds)
    };
  }

  /**
   * Calculate next run time based on interval
   */
  private calculateNextRunTime(from: Date, intervalSeconds: number): Date {
    const nextRun = new Date(from);
    nextRun.setSeconds(nextRun.getSeconds() + intervalSeconds);
    return nextRun;
  }

  /**
   * Get tier statistics
   */
  public async getTierStatistics(): Promise<Map<number, { tokenCount: number; avgHotnessScore: number }>> {
    try {
      const { data, error } = await supabase
        .from('token_tiers')
        .select('current_tier, hotness_score');

      if (error) {
        throw new Error(`Error getting tier statistics: ${error.message}`);
      }

      const stats = new Map<number, { tokenCount: number; avgHotnessScore: number }>();
      const tierGroups = new Map<number, number[]>();

      // Group by tier
      for (const row of data || []) {
        const tier = row.current_tier;
        if (!tierGroups.has(tier)) {
          tierGroups.set(tier, []);
        }
        tierGroups.get(tier)!.push(row.hotness_score);
      }

      // Calculate statistics
      for (const [tier, scores] of tierGroups.entries()) {
        const avgScore = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;

        stats.set(tier, {
          tokenCount: scores.length,
          avgHotnessScore: Math.round(avgScore * 100) / 100
        });
      }

      return stats;

    } catch (error) {
      console.error('Error getting tier statistics:', error);
      throw error;
    }
  }

  /**
   * Validate tier configuration integrity
   */
  public validateTierIntegrity(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const configs = this.getAllTierConfigs();

    // Check for duplicate priorities
    const priorities = configs.map(c => c.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      issues.push('Duplicate priorities detected in tier configurations');
    }

    // Check for overlapping timeframes that could cause conflicts
    const timeframeUsage = new Map<string, number[]>();
    for (const config of configs) {
      for (const timeframe of config.timeframes) {
        if (!timeframeUsage.has(timeframe)) {
          timeframeUsage.set(timeframe, []);
        }
        timeframeUsage.get(timeframe)!.push(config.tier);
      }
    }

    // Validate interval relationships
    for (let i = 0; i < configs.length - 1; i++) {
      const current = configs[i];
      const next = configs[i + 1];
      
      if (current.updateIntervalSeconds >= next.updateIntervalSeconds) {
        issues.push(`Tier ${current.tier} interval (${current.updateIntervalSeconds}s) should be less than Tier ${next.tier} (${next.updateIntervalSeconds}s)`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export const tierManager = new TierManager();