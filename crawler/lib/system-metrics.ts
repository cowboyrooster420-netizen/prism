/* lib/system-metrics.ts
   System metrics collector for TA worker monitoring
*/

import { SystemMetrics } from './monitoring-types';
import * as os from 'os';

export class SystemMetricsCollector {
  private intervalId?: NodeJS.Timeout;

  constructor(collectionIntervalMs: number = 5000) {
    this.startCollection(collectionIntervalMs);
  }

  private startCollection(intervalMs: number): void {
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
  }

  stopCollection(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private collectSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const metrics: SystemMetrics = {
      cpu: {
        usage: this.calculateCPUUsage(),
        load: os.loadavg(),
        cores: cpus.length
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100
      },
      disk: {
        total: 0, // Would need additional libraries for disk monitoring
        used: 0,
        free: 0,
        percentage: 0
      },
      network: {
        bytesIn: 0, // Would need additional libraries for network monitoring
        bytesOut: 0,
        connections: 0
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    return metrics;
  }

  private calculateCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu: any) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (totalIdle / totalTick * 100);
  }

  getCurrentMetrics(): SystemMetrics {
    return this.collectSystemMetrics();
  }
}
