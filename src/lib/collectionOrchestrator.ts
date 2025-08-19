/**
 * Collection Orchestrator
 * Manages the execution of multi-tier OHLCV data collection
 */

import { createClient } from '@supabase/supabase-js';
import { tierManager, CollectionSchedule, TierConfig } from './tierManager';
import { ohlcvCollector } from './ohlcvCollector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CollectionJob {
  id: string;
  tier: number;
  timeframe: string;
  tokenAddress: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  candlesCollected: number;
  retryCount: number;
  errorMessage?: string;
  executionTimeMs?: number;
}

export interface CollectionBatch {
  id: string;
  tier: number;
  timeframe: string;
  tokenAddresses: string[];
  jobs: CollectionJob[];
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  totalCandles: number;
  successCount: number;
  failureCount: number;
}

export interface CollectionMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalCandles: number;
  averageExecutionTimeMs: number;
  successRate: number;
  tierBreakdown: Map<number, {
    jobs: number;
    candles: number;
    successRate: number;
    avgExecutionTimeMs: number;
  }>;
}

export class CollectionOrchestrator {
  private readonly MAX_CONCURRENT_JOBS = 10;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;
  private readonly API_RATE_LIMIT_MS = 150; // Conservative rate limiting
  
  private runningJobs = new Set<string>();
  private activeSchedules: CollectionSchedule[] = [];
  private lastScheduleUpdate = new Date(0);
  private readonly SCHEDULE_REFRESH_INTERVAL_MS = 60000; // 1 minute

  constructor() {}

  /**
   * Start the orchestrator with continuous scheduling
   */
  public async start(): Promise<void> {
    console.log('🚀 Starting Collection Orchestrator...');
    
    // Validate tier configuration
    const validation = tierManager.validateTierIntegrity();
    if (!validation.isValid) {
      console.error('❌ Tier configuration validation failed:');
      validation.issues.forEach(issue => console.error(`   - ${issue}`));
      throw new Error('Invalid tier configuration');
    }

    console.log('✅ Tier configuration validated');
    
    // Load initial schedules
    await this.refreshSchedules();
    
    // Start the main execution loop
    this.startExecutionLoop();
    
    console.log('🎯 Collection Orchestrator started successfully');
  }

  /**
   * Refresh collection schedules
   */
  private async refreshSchedules(): Promise<void> {
    try {
      this.activeSchedules = await tierManager.generateCollectionSchedules();
      this.lastScheduleUpdate = new Date();
      
      console.log(`📋 Loaded ${this.activeSchedules.length} collection schedules`);
      
      // Log schedule summary
      const tierCounts = new Map<number, number>();
      for (const schedule of this.activeSchedules) {
        tierCounts.set(schedule.tier, (tierCounts.get(schedule.tier) || 0) + 1);
      }
      
      for (const [tier, count] of tierCounts.entries()) {
        const config = tierManager.getTierConfig(tier);
        console.log(`   Tier ${tier} (${config?.name}): ${count} schedules`);
      }
      
    } catch (error) {
      console.error('❌ Error refreshing schedules:', error);
      throw error;
    }
  }

  /**
   * Main execution loop
   */
  private startExecutionLoop(): void {
    const executeLoop = async () => {
      try {
        // Refresh schedules periodically
        const now = new Date();
        if (now.getTime() - this.lastScheduleUpdate.getTime() > this.SCHEDULE_REFRESH_INTERVAL_MS) {
          await this.refreshSchedules();
        }

        // Execute due schedules
        await this.executeDueSchedules();
        
      } catch (error) {
        console.error('❌ Error in execution loop:', error);
      }
      
      // Schedule next execution (every 10 seconds)
      setTimeout(executeLoop, 10000);
    };

    executeLoop();
  }

  /**
   * Execute schedules that are due
   */
  private async executeDueSchedules(): Promise<void> {
    const dueSchedules = tierManager.filterDueSchedules(this.activeSchedules);
    
    if (dueSchedules.length === 0) {
      return;
    }

    console.log(`⏰ ${dueSchedules.length} schedules due for execution`);

    // Execute schedules in priority order
    for (const schedule of dueSchedules) {
      try {
        // Check if we have capacity for more jobs
        if (this.runningJobs.size >= this.MAX_CONCURRENT_JOBS) {
          console.log(`⏸️ Max concurrent jobs reached (${this.MAX_CONCURRENT_JOBS}), skipping schedule`);
          break;
        }

        await this.executeSchedule(schedule);
        
        // Update the schedule for next execution
        const updatedSchedule = tierManager.updateScheduleAfterExecution(schedule);
        const scheduleIndex = this.activeSchedules.findIndex(s => 
          s.tier === schedule.tier && s.timeframe === schedule.timeframe
        );
        
        if (scheduleIndex >= 0) {
          this.activeSchedules[scheduleIndex] = updatedSchedule;
        }
        
      } catch (error) {
        console.error(`❌ Error executing schedule for tier ${schedule.tier} ${schedule.timeframe}:`, error);
      }
    }
  }

  /**
   * Execute a single collection schedule
   */
  private async executeSchedule(schedule: CollectionSchedule): Promise<CollectionBatch> {
    const batch: CollectionBatch = {
      id: this.generateBatchId(schedule),
      tier: schedule.tier,
      timeframe: schedule.timeframe,
      tokenAddresses: schedule.tokenAddresses,
      jobs: [],
      startedAt: new Date(),
      status: 'running',
      totalCandles: 0,
      successCount: 0,
      failureCount: 0
    };

    const tierConfig = tierManager.getTierConfig(schedule.tier);
    console.log(`🔄 Executing batch ${batch.id}: Tier ${schedule.tier} ${schedule.timeframe} (${schedule.tokenAddresses.length} tokens)`);

    try {
      // Create jobs for each token
      for (const tokenAddress of schedule.tokenAddresses) {
        const job: CollectionJob = {
          id: this.generateJobId(schedule, tokenAddress),
          tier: schedule.tier,
          timeframe: schedule.timeframe,
          tokenAddress,
          scheduledAt: new Date(),
          status: 'pending',
          candlesCollected: 0,
          retryCount: 0
        };
        
        batch.jobs.push(job);
      }

      // Execute jobs with controlled concurrency
      await this.executeJobsWithConcurrency(batch.jobs, tierConfig);

      // Calculate batch results
      batch.completedAt = new Date();
      batch.status = batch.failureCount === 0 ? 'completed' : (batch.successCount > 0 ? 'completed' : 'failed');
      batch.totalCandles = batch.jobs.reduce((sum, job) => sum + job.candlesCollected, 0);
      batch.successCount = batch.jobs.filter(job => job.status === 'completed').length;
      batch.failureCount = batch.jobs.filter(job => job.status === 'failed').length;

      const duration = batch.completedAt.getTime() - batch.startedAt.getTime();
      console.log(`✅ Batch ${batch.id} completed in ${duration}ms: ${batch.successCount}/${batch.jobs.length} successful, ${batch.totalCandles} candles`);

      return batch;

    } catch (error) {
      batch.completedAt = new Date();
      batch.status = 'failed';
      console.error(`❌ Batch ${batch.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Execute jobs with controlled concurrency and rate limiting
   */
  private async executeJobsWithConcurrency(jobs: CollectionJob[], tierConfig: TierConfig | null): Promise<void> {
    const batchSize = Math.min(5, this.MAX_CONCURRENT_JOBS); // Smaller batches for better control
    
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      
      // Execute batch in parallel
      const promises = batch.map(job => this.executeJob(job));
      await Promise.all(promises);
      
      // Rate limiting between batches
      if (i + batchSize < jobs.length) {
        await this.delay(this.API_RATE_LIMIT_MS);
      }
    }
  }

  /**
   * Execute a single collection job with retry logic
   */
  private async executeJob(job: CollectionJob): Promise<void> {
    const jobKey = job.id;
    this.runningJobs.add(jobKey);
    
    try {
      for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          job.status = 'running';
          job.startedAt = new Date();
          job.retryCount = attempt;

          const startTime = Date.now();
          
          // Use existing OHLCV collector with tier information
          const success = await ohlcvCollector.collectTokenOHLCV(
            job.tokenAddress,
            job.timeframe,
            tierConfig?.dataRetentionDays || 30
          );

          job.executionTimeMs = Date.now() - startTime;

          if (success) {
            // Get the number of candles collected (approximate)
            job.candlesCollected = await this.getCandlesCollectedCount(job);
            job.status = 'completed';
            job.completedAt = new Date();
            return;
          } else {
            throw new Error('Collection failed');
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          job.errorMessage = errorMessage;

          if (attempt < this.MAX_RETRIES) {
            job.status = 'retrying';
            console.warn(`⚠️ Job ${job.id} attempt ${attempt + 1} failed: ${errorMessage}. Retrying...`);
            await this.delay(this.RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
          } else {
            job.status = 'failed';
            job.completedAt = new Date();
            console.error(`❌ Job ${job.id} failed after ${this.MAX_RETRIES} attempts: ${errorMessage}`);
          }
        }
      }

    } finally {
      this.runningJobs.delete(jobKey);
    }
  }

  /**
   * Get approximate count of candles collected for a job
   */
  private async getCandlesCollectedCount(job: CollectionJob): Promise<number> {
    try {
      // Get recent candles count for this token/timeframe
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const { count, error } = await supabase
        .from('token_ohlcv_history')
        .select('*', { count: 'exact', head: true })
        .eq('token_address', job.tokenAddress)
        .eq('timeframe', job.timeframe)
        .gte('timestamp_utc', oneHourAgo.toISOString());

      return count || 0;
    } catch (error) {
      return 0; // Fallback to 0 if count fails
    }
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(schedule: CollectionSchedule): string {
    const timestamp = Date.now();
    return `batch_t${schedule.tier}_${schedule.timeframe}_${timestamp}`;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(schedule: CollectionSchedule, tokenAddress: string): string {
    const timestamp = Date.now();
    const tokenShort = tokenAddress.slice(0, 8);
    return `job_t${schedule.tier}_${schedule.timeframe}_${tokenShort}_${timestamp}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get collection metrics
   */
  public async getCollectionMetrics(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): Promise<CollectionMetrics> {
    // This would typically query a jobs/metrics table
    // For now, return basic metrics from the database
    
    const metrics: CollectionMetrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalCandles: 0,
      averageExecutionTimeMs: 0,
      successRate: 0,
      tierBreakdown: new Map()
    };

    try {
      // Get tier statistics
      const tierStats = await tierManager.getTierStatistics();
      
      for (const [tier, stats] of tierStats.entries()) {
        metrics.tierBreakdown.set(tier, {
          jobs: stats.tokenCount,
          candles: 0, // Would need to query actual candle counts
          successRate: 0.95, // Placeholder
          avgExecutionTimeMs: 1500 // Placeholder
        });
      }

      return metrics;
    } catch (error) {
      console.error('Error getting collection metrics:', error);
      return metrics;
    }
  }

  /**
   * Force execution of a specific tier (for testing/manual triggers)
   */
  public async executeImmediately(tier: number, timeframe?: string): Promise<CollectionBatch[]> {
    const tierConfig = tierManager.getTierConfig(tier);
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const timeframes = timeframe ? [timeframe] : tierConfig.timeframes;
    const tokens = await tierManager.getTokensByTier(tier);
    const tokenAddresses = tokens.map(t => t.tokenAddress);

    const batches: CollectionBatch[] = [];

    for (const tf of timeframes) {
      const schedule: CollectionSchedule = {
        tier,
        timeframe: tf,
        tokenAddresses,
        nextRunAt: new Date(),
        intervalSeconds: tierConfig.updateIntervalSeconds
      };

      const batch = await this.executeSchedule(schedule);
      batches.push(batch);
    }

    return batches;
  }
}

// Export singleton instance
export const collectionOrchestrator = new CollectionOrchestrator();