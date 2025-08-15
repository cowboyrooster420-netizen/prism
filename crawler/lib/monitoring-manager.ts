/* lib/monitoring-manager.ts
   Main monitoring manager that integrates all monitoring components
*/

import { EventEmitter } from 'events';
import { MetricsCollector } from './metrics-collector';
import { HealthChecker } from './health-checker';
import { AlertManager } from './alert-manager';
import { Logger } from './logger';
import { PerformanceProfiler } from './performance-profiler';
import { SystemMetricsCollector } from './system-metrics';
import { SystemMetrics } from './monitoring-types';

export class MonitoringManager extends EventEmitter {
  public readonly metrics: MetricsCollector;
  public readonly health: HealthChecker;
  public readonly alerts: AlertManager;
  public readonly logger: Logger;
  public readonly profiler: PerformanceProfiler;
  public readonly systemMetrics: SystemMetricsCollector;

  constructor(options: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    healthCheckInterval?: number;
    systemMetricsInterval?: number;
  } = {}) {
    super();
    
    this.metrics = new MetricsCollector();
    this.health = new HealthChecker(options.healthCheckInterval);
    this.alerts = new AlertManager();
    this.logger = new Logger(options.logLevel);
    this.profiler = new PerformanceProfiler();
    this.systemMetrics = new SystemMetricsCollector(options.systemMetricsInterval);

    this.setupEventHandlers();
    this.startPeriodicTasks();
  }

  private setupEventHandlers(): void {
    // Connect metrics to alerts
    this.metrics.on('metricRecorded', (metricName: string, metricValue: any) => {
      const metric = this.metrics.getMetric(metricName);
      if (metric) {
        this.alerts.checkAlertRules(metric);
      }
    });

    // Connect health checks to alerts
    this.health.on('healthCheckFailed', (name: string, check: any) => {
      this.alerts.createAlert(
        'error',
        `Health Check Failed: ${name}`,
        check.message,
        { healthCheck: check }
      );
    });

    // Log all events
    this.metrics.on('metricRecorded', (metricName: string, metricValue: any) => {
      this.logger.debug(`Metric recorded: ${metricName} = ${metricValue.value}`, { metricName, metricValue });
    });

    this.alerts.on('alertCreated', (alert: any) => {
      this.logger.warn(`Alert created: ${alert.title}`, { alert });
    });

    this.health.on('healthCheckCompleted', (name: string, check: any) => {
      this.logger.debug(`Health check completed: ${name} - ${check.status}`, { healthCheck: check });
    });
  }

  private startPeriodicTasks(): void {
    // Start health checks
    this.health.startPeriodicChecks();

    // Start system metrics collection
    this.systemMetrics.stopCollection(); // Stop the auto-start
    this.systemMetrics.startCollection(5000);

    // Periodic metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);
  }

  private collectSystemMetrics(): void {
    const metrics = this.systemMetrics.getCurrentMetrics();
    
    this.metrics.setGauge('system_cpu_usage', metrics.cpu.usage);
    this.metrics.setGauge('system_memory_usage', metrics.memory.percentage);
    this.metrics.setGauge('system_disk_usage', metrics.disk.percentage);
    
    // Update process metrics
    this.metrics.setGauge('ta_worker_memory_usage', 
      (metrics.process.memoryUsage.heapUsed / metrics.process.memoryUsage.heapTotal) * 100);
  }

  async getSystemStatus(): Promise<{
    metrics: any[];
    health: Map<string, any>;
    alerts: any[];
    logs: any[];
    profiles: any[];
    systemMetrics: SystemMetrics;
  }> {
    const [healthChecks, activeAlerts, recentLogs, systemMetrics] = await Promise.all([
      this.health.runAllHealthChecks(),
      Promise.resolve(this.alerts.getActiveAlerts()),
      Promise.resolve(this.logger.getLogs(undefined, 100)),
      Promise.resolve(this.systemMetrics.getCurrentMetrics())
    ]);

    return {
      metrics: this.metrics.getAllMetrics(),
      health: healthChecks,
      alerts: activeAlerts,
      logs: recentLogs,
      profiles: this.profiler.getProfiles(),
      systemMetrics
    };
  }

  async shutdown(): Promise<void> {
    this.health.stopPeriodicChecks();
    this.systemMetrics.stopCollection();
    this.logger.info('Monitoring manager shutdown complete');
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createMonitoringManager(options?: {
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  healthCheckInterval?: number;
  systemMetricsInterval?: number;
}): MonitoringManager {
  return new MonitoringManager(options);
}

export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}

export function createHealthChecker(intervalMs?: number): HealthChecker {
  return new HealthChecker(intervalMs);
}

export function createAlertManager(): AlertManager {
  return new AlertManager();
}

export function createLogger(level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal'): Logger {
  return new Logger(level);
}

export function createPerformanceProfiler(): PerformanceProfiler {
  return new PerformanceProfiler();
}

