/* lib/metrics-collector.ts
   Metrics collection system for TA worker monitoring
*/

import { EventEmitter } from 'events';
import { Metric, MetricValue } from './monitoring-types';

export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, Metric> = new Map();
  private readonly maxValuesPerMetric = 1000;

  constructor() {
    super();
    this.setupDefaultMetrics();
  }

  private setupDefaultMetrics(): void {
    // System metrics
    this.createMetric('system_cpu_usage', 'gauge', 'CPU usage percentage');
    this.createMetric('system_memory_usage', 'gauge', 'Memory usage percentage');
    this.createMetric('system_disk_usage', 'gauge', 'Disk usage percentage');
    
    // Application metrics
    this.createMetric('ta_worker_tasks_total', 'counter', 'Total TA computation tasks');
    this.createMetric('ta_worker_tasks_successful', 'counter', 'Successful TA computation tasks');
    this.createMetric('ta_worker_tasks_failed', 'counter', 'Failed TA computation tasks');
    this.createMetric('ta_worker_processing_time', 'histogram', 'TA computation processing time');
    this.createMetric('ta_worker_memory_usage', 'gauge', 'TA worker memory usage');
    
    // Database metrics
    this.createMetric('database_queries_total', 'counter', 'Total database queries');
    this.createMetric('database_queries_duration', 'histogram', 'Database query duration');
    this.createMetric('database_connections_active', 'gauge', 'Active database connections');
    
    // Error metrics
    this.createMetric('errors_total', 'counter', 'Total errors');
    this.createMetric('errors_by_type', 'counter', 'Errors by type');
    
    // Performance metrics
    this.createMetric('worker_threads_active', 'gauge', 'Active worker threads');
    this.createMetric('worker_threads_total', 'counter', 'Total worker threads created');
    this.createMetric('batch_processing_time', 'histogram', 'Batch processing time');
  }

  createMetric(name: string, type: Metric['type'], description: string, labels?: Record<string, string>): Metric {
    const metric: Metric = {
      name,
      type,
      description,
      values: [],
      labels
    };
    this.metrics.set(name, metric);
    return metric;
  }

  recordValue(metricName: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(metricName);
    if (!metric) {
      throw new Error(`Metric '${metricName}' not found`);
    }

    const metricValue: MetricValue = {
      value,
      timestamp: Date.now(),
      labels
    };

    metric.values.push(metricValue);

    // Keep only the latest values
    if (metric.values.length > this.maxValuesPerMetric) {
      metric.values = metric.values.slice(-this.maxValuesPerMetric);
    }

    this.emit('metricRecorded', metricName, metricValue);
  }

  incrementCounter(metricName: string, increment: number = 1, labels?: Record<string, string>): void {
    const metric = this.metrics.get(metricName);
    if (!metric || metric.type !== 'counter') {
      throw new Error(`Counter metric '${metricName}' not found`);
    }

    const lastValue = metric.values[metric.values.length - 1];
    const newValue = (lastValue?.value || 0) + increment;
    this.recordValue(metricName, newValue, labels);
  }

  setGauge(metricName: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(metricName);
    if (!metric || metric.type !== 'gauge') {
      throw new Error(`Gauge metric '${metricName}' not found`);
    }

    this.recordValue(metricName, value, labels);
  }

  recordHistogram(metricName: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(metricName);
    if (!metric || metric.type !== 'histogram') {
      throw new Error(`Histogram metric '${metricName}' not found`);
    }

    this.recordValue(metricName, value, labels);
  }

  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  getMetricSummary(name: string): { min: number; max: number; avg: number; count: number } | null {
    const metric = this.metrics.get(name);
    if (!metric || metric.values.length === 0) return null;

    const values = metric.values.map(v => v.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    };
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.setupDefaultMetrics();
  }
}

