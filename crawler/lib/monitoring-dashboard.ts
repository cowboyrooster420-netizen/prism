/* lib/monitoring-dashboard.ts
   Monitoring dashboard CLI for real-time system visibility
*/

import * as readline from 'readline';
import { MonitoringManager } from './monitoring-manager';
import { SystemMetrics } from './monitoring-types';

export class MonitoringDashboard {
  private rl: readline.Interface;
  private monitoringManager: MonitoringManager;
  private refreshInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(monitoringManager: MonitoringManager) {
    this.monitoringManager = monitoringManager;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.clear();
    console.log('🚀 TA Worker Monitoring Dashboard');
    console.log('=====================================');
    console.log('Press Ctrl+C to exit\n');

    this.setupEventHandlers();
    await this.showMainMenu();
  }

  private setupEventHandlers(): void {
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down monitoring dashboard...');
      this.stop();
      await this.monitoringManager.shutdown();
      process.exit(0);
    });

    // Setup periodic refresh
    this.refreshInterval = setInterval(() => {
      if (this.isRunning) {
        this.refreshDisplay();
      }
    }, 5000); // Refresh every 5 seconds
  }

  private async showMainMenu(): Promise<void> {
    while (this.isRunning) {
      console.log('\n📊 Monitoring Dashboard Menu:');
      console.log('1. System Overview');
      console.log('2. Metrics Dashboard');
      console.log('3. Health Status');
      console.log('4. Active Alerts');
      console.log('5. Performance Profiles');
      console.log('6. Recent Logs');
      console.log('7. System Metrics');
      console.log('8. Refresh Display');
      console.log('9. Exit');

      const choice = await this.prompt('Select an option (1-9): ');
      
      switch (choice) {
        case '1':
          await this.showSystemOverview();
          break;
        case '2':
          await this.showMetricsDashboard();
          break;
        case '3':
          await this.showHealthStatus();
          break;
        case '4':
          await this.showActiveAlerts();
          break;
        case '5':
          await this.showPerformanceProfiles();
          break;
        case '6':
          await this.showRecentLogs();
          break;
        case '7':
          await this.showSystemMetrics();
          break;
        case '8':
          this.refreshDisplay();
          break;
        case '9':
          this.isRunning = false;
          break;
        default:
          console.log('❌ Invalid option. Please try again.');
      }
    }
  }

  private async showSystemOverview(): Promise<void> {
    console.clear();
    console.log('🌐 System Overview');
    console.log('==================\n');

    try {
      const status = await this.monitoringManager.getSystemStatus();
      
      // System health summary
      const healthCounts = { healthy: 0, degraded: 0, unhealthy: 0 };
      status.health.forEach(check => {
        healthCounts[check.status as keyof typeof healthCounts]++;
      });

      console.log(`🏥 Health Status: ${healthCounts.healthy} healthy, ${healthCounts.degraded} degraded, ${healthCounts.unhealthy} unhealthy`);
      console.log(`🚨 Active Alerts: ${status.alerts.length}`);
      console.log(`📈 Metrics Collected: ${status.metrics.length}`);
      console.log(`📝 Recent Logs: ${status.logs.length}`);
      console.log(`⚡ Performance Profiles: ${status.profiles.length}`);

      // System metrics summary
      const sysMetrics = status.systemMetrics;
      console.log(`\n💻 CPU Usage: ${sysMetrics.cpu.usage.toFixed(1)}%`);
      console.log(`🧠 Memory Usage: ${sysMetrics.memory.percentage.toFixed(1)}%`);
      console.log(`⏱️  Uptime: ${(sysMetrics.process.uptime / 3600).toFixed(1)} hours`);

      await this.prompt('\nPress Enter to continue...');
    } catch (error) {
      console.error('❌ Error getting system overview:', error);
      await this.prompt('\nPress Enter to continue...');
    }
  }

  private async showMetricsDashboard(): Promise<void> {
    console.clear();
    console.log('📊 Metrics Dashboard');
    console.log('===================\n');

    try {
      const metrics = this.monitoringManager.metrics.getAllMetrics();
      
      metrics.forEach(metric => {
        const latest = metric.values[metric.values.length - 1];
        if (latest) {
          const summary = this.monitoringManager.metrics.getMetricSummary(metric.name);
          if (summary) {
            console.log(`${metric.name}:`);
            console.log(`  Current: ${latest.value.toFixed(2)}`);
            console.log(`  Min: ${summary.min.toFixed(2)}, Max: ${summary.max.toFixed(2)}, Avg: ${summary.avg.toFixed(2)}`);
            console.log(`  Count: ${summary.count}`);
            console.log('');
          }
        }
      });

      await this.prompt('\nPress Enter to continue...');
    } catch (error) {
      console.error('❌ Error getting metrics:', error);
      await this.prompt('\nPress Enter to continue...');
    }
  }

  private async showHealthStatus(): Promise<void> {
    console.clear();
    console.log('🏥 Health Status');
    console.log('================\n');

    try {
      const healthChecks = await this.monitoringManager.health.runAllHealthChecks();
      
      healthChecks.forEach((check, name) => {
        const statusIcon = check.status === 'healthy' ? '✅' : check.status === 'degraded' ? '⚠️' : '❌';
        console.log(`${statusIcon} ${name}: ${check.status.toUpperCase()}`);
        console.log(`   Message: ${check.message}`);
        if (check.details) {
          console.log(`   Details: ${JSON.stringify(check.details, null, 2)}`);
        }
        console.log('');
      });

      await this.prompt('\nPress Enter to continue...');
    } catch (error) {
      console.error('❌ Error getting health status:', error);
      await this.prompt('\nPress Enter to continue...');
    }
  }

  private async showActiveAlerts(): Promise<void> {
    console.clear();
    console.log('🚨 Active Alerts');
    console.log('================\n');

    try {
      const alerts = this.monitoringManager.alerts.getActiveAlerts();
      
      if (alerts.length === 0) {
        console.log('✅ No active alerts');
      } else {
        alerts.forEach(alert => {
          const severityIcon = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            critical: '🚨'
          }[alert.severity];

          console.log(`${severityIcon} ${alert.title} [${alert.severity.toUpperCase()}]`);
          console.log(`   Message: ${alert.message}`);
          console.log(`   Time: ${new Date(alert.timestamp).toLocaleString()}`);
          if (alert.metadata) {
            console.log(`   Metadata: ${JSON.stringify(alert.metadata, null, 2)}`);
          }
          console.log('');
        });
      }

      await this.prompt('\nPress Enter to continue...');
    } catch (error) {
      console.error('❌ Error getting alerts:', error);
      await this.prompt('\nPress Enter to continue...');
    }
  }

  private async showPerformanceProfiles(): Promise<void> {
    console.clear();
    console.log('⚡ Performance Profiles');
    console.log('========================\n');

    try {
      const profiles = this.monitoringManager.profiler.getProfiles();
      
      if (profiles.length === 0) {
        console.log('📊 No performance profiles available');
      } else {
        // Group by operation
        const operationStats = new Map<string, any>();
        
        profiles.forEach(profile => {
          if (!operationStats.has(profile.operation)) {
            operationStats.set(profile.operation, []);
          }
          operationStats.get(profile.operation)!.push(profile);
        });

        operationStats.forEach((profiles, operation) => {
          const stats = this.monitoringManager.profiler.getProfileStats(operation);
          console.log(`${operation}:`);
          console.log(`  Count: ${stats.count}`);
          console.log(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
          console.log(`  Min Duration: ${stats.minDuration.toFixed(2)}ms`);
          console.log(`  Max Duration: ${stats.maxDuration.toFixed(2)}ms`);
          console.log('');
        });
      }

      await this.prompt('\nPress Enter to continue...');
    } catch (error) {
      console.error('❌ Error getting performance profiles:', error);
      await this.prompt('\nPress Enter to continue...');
    }
  }

  private async showRecentLogs(): Promise<void> {
    console.clear();
    console.log('📝 Recent Logs');
    console.log('==============\n');

    try {
      const logs = this.monitoringManager.logger.getLogs(undefined, 20);
      
      if (logs.length === 0) {
        console.log('📄 No logs available');
      } else {
        logs.forEach(log => {
          const levelIcon = {
            debug: '🔍',
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            fatal: '💀'
          }[log.level];

          const timestamp = new Date(log.timestamp).toLocaleString();
          console.log(`${levelIcon} [${timestamp}] [${log.level.toUpperCase()}] ${log.message}`);
          if (log.context && Object.keys(log.context).length > 0) {
            console.log(`   Context: ${JSON.stringify(log.context, null, 2)}`);
          }
        });
      }

      await this.prompt('\nPress Enter to continue...');
    } catch (error) {
      console.error('❌ Error getting logs:', error);
      await this.prompt('\nPress Enter to continue...');
    }
  }

  private async showSystemMetrics(): Promise<void> {
    console.clear();
    console.log('💻 System Metrics');
    console.log('=================\n');

    try {
      const metrics = this.monitoringManager.systemMetrics.getCurrentMetrics();
      
      console.log('CPU:');
      console.log(`  Usage: ${metrics.cpu.usage.toFixed(1)}%`);
      console.log(`  Load: ${metrics.cpu.load.map(l => l.toFixed(2)).join(', ')}`);
      console.log(`  Cores: ${metrics.cpu.cores}`);
      
      console.log('\nMemory:');
      console.log(`  Total: ${(metrics.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`  Used: ${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`  Free: ${(metrics.memory.free / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`  Usage: ${metrics.memory.percentage.toFixed(1)}%`);
      
      console.log('\nProcess:');
      console.log(`  Uptime: ${(metrics.process.uptime / 3600).toFixed(1)} hours`);
      console.log(`  Memory: ${(metrics.process.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      
      await this.prompt('\nPress Enter to continue...');
    } catch (error) {
      console.error('❌ Error getting system metrics:', error);
      await this.prompt('\nPress Enter to continue...');
    }
  }

  private refreshDisplay(): void {
    // This would refresh the current view if we're in a specific section
    // For now, just update the timestamp
    process.stdout.write(`\r🔄 Last updated: ${new Date().toLocaleString()}`);
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  stop(): void {
    this.isRunning = false;
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.rl.close();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createMonitoringDashboard(monitoringManager: MonitoringManager): MonitoringDashboard {
  return new MonitoringDashboard(monitoringManager);
}
