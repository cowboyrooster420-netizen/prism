/* lib/alert-manager.ts
   Alerting system for TA worker monitoring
*/

import { EventEmitter } from 'events';
import { Alert, Metric } from './monitoring-types';

export class AlertManager extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private readonly maxAlerts = 1000;
  private alertRules: Map<string, (metric: Metric) => boolean> = new Map();

  constructor() {
    super();
    this.setupDefaultAlertRules();
  }

  private setupDefaultAlertRules(): void {
    // Memory usage alerts
    this.addAlertRule('high_memory_usage', (metric) => {
      if (metric.name === 'system_memory_usage') {
        const latest = metric.values[metric.values.length - 1];
        return latest && latest.value > 80;
      }
      return false;
    });

    // CPU usage alerts
    this.addAlertRule('high_cpu_usage', (metric) => {
      if (metric.name === 'system_cpu_usage') {
        const latest = metric.values[metric.values.length - 1];
        return latest && latest.value > 80;
      }
      return false;
    });

    // Error rate alerts
    this.addAlertRule('high_error_rate', (metric) => {
      if (metric.name === 'errors_total') {
        const recent = metric.values.slice(-10);
        if (recent.length >= 10) {
          const errorRate = recent[recent.length - 1].value - recent[0].value;
          return errorRate > 10; // More than 10 errors in last 10 measurements
        }
      }
      return false;
    });

    // Task failure alerts
    this.addAlertRule('task_failure_rate', (metric) => {
      if (metric.name === 'ta_worker_tasks_failed') {
        const recent = metric.values.slice(-10);
        if (recent.length >= 10) {
          const failureRate = recent[recent.length - 1].value - recent[0].value;
          return failureRate > 5; // More than 5 failures in last 10 measurements
        }
      }
      return false;
    });
  }

  addAlertRule(name: string, rule: (metric: Metric) => boolean): void {
    this.alertRules.set(name, rule);
  }

  createAlert(severity: Alert['severity'], title: string, message: string, metadata?: Record<string, any>): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      title,
      message,
      timestamp: Date.now(),
      acknowledged: false,
      metadata
    };

    this.alerts.set(alert.id, alert);

    // Remove old alerts if we exceed the limit
    if (this.alerts.size > this.maxAlerts) {
      const oldestAlert = Array.from(this.alerts.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldestAlert) {
        this.alerts.delete(oldestAlert.id);
      }
    }

    this.emit('alertCreated', alert);
    return alert;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert | undefined {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      this.emit('alertAcknowledged', alert);
    }
    return alert;
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  getAlerts(severity?: Alert['severity'], acknowledged?: boolean): Alert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    if (acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === acknowledged);
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  getActiveAlerts(): Alert[] {
    return this.getAlerts(undefined, false);
  }

  checkAlertRules(metric: Metric): void {
    for (const [ruleName, rule] of this.alertRules) {
      if (rule(metric)) {
        const alert = this.createAlert(
          'warning',
          `Alert Rule Triggered: ${ruleName}`,
          `Metric '${metric.name}' triggered alert rule '${ruleName}'`,
          { metricName: metric.name, ruleName, latestValue: metric.values[metric.values.length - 1] }
        );
        this.emit('alertRuleTriggered', ruleName, alert, metric);
      }
    }
  }

  clearAlerts(): void {
    this.alerts.clear();
    this.emit('alertsCleared');
  }
}
