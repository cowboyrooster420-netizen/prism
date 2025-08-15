/* lib/performance-profiler.ts
   Performance profiling system for TA worker monitoring
*/

import { EventEmitter } from 'events';
import { PerformanceProfile } from './monitoring-types';

export class PerformanceProfiler extends EventEmitter {
  private profiles: Map<string, PerformanceProfile[]> = new Map();
  private readonly maxProfilesPerOperation = 1000;

  startProfile(operation: string): string {
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store start time and initial metrics
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();
    
    // Return profile ID for stopping
    return profileId;
  }

  stopProfile(profileId: string, operation: string, metadata?: Record<string, any>): PerformanceProfile | null {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage();
    
    // Calculate duration in milliseconds
    const duration = Number(endTime - process.hrtime.bigint()) / 1000000;
    
    const profile: PerformanceProfile = {
      operation,
      duration,
      memoryUsage: endMemory,
      cpuUsage: endCpu,
      timestamp: Date.now(),
      metadata
    };

    // Store profile
    if (!this.profiles.has(operation)) {
      this.profiles.set(operation, []);
    }
    
    const operationProfiles = this.profiles.get(operation)!;
    operationProfiles.push(profile);

    // Keep only the latest profiles
    if (operationProfiles.length > this.maxProfilesPerOperation) {
      operationProfiles.splice(0, operationProfiles.length - this.maxProfilesPerOperation);
    }

    this.emit('profileCompleted', operation, profile);
    return profile;
  }

  profileOperation<T>(operation: string, fn: () => T | Promise<T>, metadata?: Record<string, any>): T | Promise<T> {
    const profileId = this.startProfile(operation);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.stopProfile(profileId, operation, metadata);
        });
      } else {
        this.stopProfile(profileId, operation, metadata);
        return result;
      }
    } catch (error) {
      this.stopProfile(profileId, operation, { ...metadata, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  getProfiles(operation?: string): PerformanceProfile[] {
    if (operation) {
      return this.profiles.get(operation) || [];
    }
    
    return Array.from(this.profiles.values()).flat();
  }

  getProfileStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
  } {
    const profiles = this.getProfiles(operation);
    
    if (profiles.length === 0) {
      return { count: 0, avgDuration: 0, minDuration: 0, maxDuration: 0, totalDuration: 0 };
    }

    const durations = profiles.map(p => p.duration);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    
    return {
      count: profiles.length,
      avgDuration: totalDuration / profiles.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration
    };
  }

  clearProfiles(): void {
    this.profiles.clear();
    this.emit('profilesCleared');
  }
}

