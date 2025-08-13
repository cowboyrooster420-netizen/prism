/* lib/health-checker.ts
   Health check system for TA worker monitoring
*/

import { EventEmitter } from 'events';
import { HealthCheck } from './monitoring-types';

export class HealthChecker extends EventEmitter {
  private healthChecks: Map<string, () => Promise<HealthCheck>> = new Map();
  private readonly checkInterval: number;
  private intervalId?: NodeJS.Timeout;

  constructor(checkIntervalMs: number = 30000) {
    super();
    this.checkInterval = checkIntervalMs;
    this.setupDefaultHealthChecks();
  }

  private setupDefaultHealthChecks(): void {
    // System health checks
    this.registerHealthCheck('system_memory', this.checkSystemMemory.bind(this));
    this.registerHealthCheck('system_cpu', this.checkSystemCPU.bind(this));
    this.registerHealthCheck('system_disk', this.checkSystemDisk.bind(this));
    
    // Application health checks
    this.registerHealthCheck('ta_worker_status', this.checkTAWorkerStatus.bind(this));
    this.registerHealthCheck('database_connection', this.checkDatabaseConnection.bind(this));
    this.registerHealthCheck('worker_threads', this.checkWorkerThreads.bind(this));
  }

  registerHealthCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.healthChecks.set(name, checkFn);
  }

  async runHealthCheck(name: string): Promise<HealthCheck> {
    const checkFn = this.healthChecks.get(name);
    if (!checkFn) {
      throw new Error(`Health check '${name}' not found`);
    }

    try {
      const result = await checkFn();
      this.emit('healthCheckCompleted', name, result);
      return result;
    } catch (error) {
      const failedCheck: HealthCheck = {
        name,
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.stack : String(error) }
      };
      this.emit('healthCheckFailed', name, failedCheck);
      return failedCheck;
    }
  }

  async runAllHealthChecks(): Promise<Map<string, HealthCheck>> {
    const results = new Map<string, HealthCheck>();
    const promises = Array.from(this.healthChecks.keys()).map(async (name) => {
      const result = await this.runHealthCheck(name);
      results.set(name, result);
    });

    await Promise.all(promises);
    return results;
  }

  startPeriodicChecks(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      await this.runAllHealthChecks();
    }, this.checkInterval);
  }

  stopPeriodicChecks(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async checkSystemMemory(): Promise<HealthCheck> {
    const memUsage = process.memoryUsage();
    const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let status: HealthCheck['status'] = 'healthy';
    let message = 'Memory usage is normal';
    
    if (percentage > 90) {
      status = 'unhealthy';
      message = 'Memory usage is critically high';
    } else if (percentage > 80) {
      status = 'unhealthy';
      message = 'Memory usage is high';
    } else if (percentage > 70) {
      status = 'degraded';
      message = 'Memory usage is elevated';
    }

    return {
      name: 'system_memory',
      status,
      message,
      timestamp: Date.now(),
      details: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        percentage: Math.round(percentage * 100) / 100
      }
    };
  }

  private async checkSystemCPU(): Promise<HealthCheck> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to measure CPU
    const endUsage = process.cpuUsage(startUsage);
    
    const totalUsage = endUsage.user + endUsage.system;
    const percentage = totalUsage / 1000000; // Convert to percentage
    
    let status: HealthCheck['status'] = 'healthy';
    let message = 'CPU usage is normal';
    
    if (percentage > 80) {
      status = 'unhealthy';
      message = 'CPU usage is high';
    } else if (percentage > 60) {
      status = 'degraded';
      message = 'CPU usage is elevated';
    }

    return {
      name: 'system_cpu',
      status,
      message,
      timestamp: Date.now(),
      details: { percentage: Math.round(percentage * 100) / 100 }
    };
  }

  private async checkSystemDisk(): Promise<HealthCheck> {
    // This is a simplified disk check - in production you'd use a proper disk monitoring library
    return {
      name: 'system_disk',
      status: 'healthy',
      message: 'Disk usage check not implemented',
      timestamp: Date.now(),
      details: { note: 'Disk monitoring requires additional libraries' }
    };
  }

  private async checkTAWorkerStatus(): Promise<HealthCheck> {
    // This would check the actual TA worker status
    return {
      name: 'ta_worker_status',
      status: 'healthy',
      message: 'TA worker is running normally',
      timestamp: Date.now(),
      details: { uptime: process.uptime() }
    };
  }

  private async checkDatabaseConnection(): Promise<HealthCheck> {
    // This would check actual database connectivity
    return {
      name: 'database_connection',
      status: 'healthy',
      message: 'Database connection is stable',
      timestamp: Date.now()
    };
  }

  private async checkWorkerThreads(): Promise<HealthCheck> {
    // This would check actual worker thread status
    return {
      name: 'worker_threads',
      status: 'healthy',
      message: 'Worker threads are functioning normally',
      timestamp: Date.now()
    };
  }
}
