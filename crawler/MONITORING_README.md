# 🚀 TA Worker Monitoring & Observability System

## Overview

The TA Worker Monitoring & Observability System provides comprehensive system visibility, health monitoring, alerting, and performance profiling for the Technical Analysis worker. This system enables operators to monitor system health, detect issues early, and optimize performance based on real-time metrics.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monitoring Manager                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐  │
│  │   Metrics   │ │    Health   │ │   Alerts    │ │ Logger  │  │
│  │ Collector   │ │  Checker    │ │  Manager    │ │         │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │Performance  │ │   System    │ │Monitoring   │              │
│  │ Profiler    │ │  Metrics    │ │Dashboard    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 🧩 Components

### 1. **Metrics Collector** (`lib/metrics-collector.ts`)
- **Purpose**: Collects and stores application and system metrics
- **Features**:
  - Counter, gauge, histogram, and summary metric types
  - Automatic metric retention management
  - Event emission for metric changes
  - Built-in default metrics for TA worker operations

**Default Metrics**:
- `ta_worker_tasks_total` - Total TA computation tasks
- `ta_worker_tasks_successful` - Successful tasks
- `ta_worker_tasks_failed` - Failed tasks
- `ta_worker_processing_time` - Processing time histogram
- `system_cpu_usage` - CPU usage percentage
- `system_memory_usage` - Memory usage percentage
- `database_queries_total` - Database query count
- `worker_threads_active` - Active worker threads

### 2. **Health Checker** (`lib/health-checker.ts`)
- **Purpose**: Monitors system health and component status
- **Features**:
  - Configurable health check intervals
  - Built-in system health checks (CPU, memory, disk)
  - Application-specific health checks
  - Automatic health status updates

**Default Health Checks**:
- `system_memory` - Memory usage monitoring
- `system_cpu` - CPU usage monitoring
- `ta_worker_status` - Worker process status
- `database_connection` - Database connectivity
- `worker_threads` - Worker thread status

### 3. **Alert Manager** (`lib/alert-manager.ts`)
- **Purpose**: Manages alerts and notifications for critical issues
- **Features**:
  - Configurable alert rules
  - Multiple severity levels (info, warning, error, critical)
  - Alert acknowledgment system
  - Automatic alert rule evaluation

**Default Alert Rules**:
- High memory usage (>80%)
- High CPU usage (>80%)
- High error rate (>10 errors in 10 measurements)
- High task failure rate (>5 failures in 10 measurements)

### 4. **Logger** (`lib/logger.ts`)
- **Purpose**: Structured logging with configurable levels
- **Features**:
  - Multiple log levels (debug, info, warn, error, fatal)
  - Context-aware logging
  - Trace ID and span ID support
  - Automatic log rotation and retention

### 5. **Performance Profiler** (`lib/performance-profiler.ts`)
- **Purpose**: Profiles operation performance and identifies bottlenecks
- **Features**:
  - Operation timing measurement
  - Memory and CPU usage tracking
  - Performance statistics aggregation
  - Automatic profiling for async operations

### 6. **System Metrics Collector** (`lib/system-metrics.ts`)
- **Purpose**: Collects system-level metrics and resource usage
- **Features**:
  - CPU usage and load monitoring
  - Memory usage tracking
  - Process uptime monitoring
  - Configurable collection intervals

### 7. **Monitoring Manager** (`lib/monitoring-manager.ts`)
- **Purpose**: Orchestrates all monitoring components
- **Features**:
  - Component lifecycle management
  - Event coordination between components
  - System status aggregation
  - Graceful shutdown handling

### 8. **Monitoring Dashboard** (`lib/monitoring-dashboard.ts`)
- **Purpose**: Interactive CLI dashboard for system visibility
- **Features**:
  - Real-time system overview
  - Metrics visualization
  - Health status display
  - Alert management interface
  - Performance profile analysis

## 🚀 Quick Start

### 1. **Run Monitoring-Enabled TA Worker**
```bash
npm run ta-monitored
```

This runs the TA worker with full monitoring integration, automatically collecting metrics, performing health checks, and generating alerts.

### 2. **Launch Monitoring Dashboard**
```bash
npm run monitoring-dashboard
```

This launches an interactive CLI dashboard showing:
- System overview and health status
- Real-time metrics and performance data
- Active alerts and notifications
- Recent logs and error reports

### 3. **Programmatic Usage**
```typescript
import { createMonitoringManager } from './lib/monitoring';

// Create monitoring manager
const monitoring = createMonitoringManager({
  logLevel: 'info',
  healthCheckInterval: 30000,
  systemMetricsInterval: 5000
});

// Access components
const { metrics, logger, alerts, health } = monitoring;

// Record metrics
metrics.incrementCounter('custom_metric');

// Log events
logger.info('Application event', { context: 'data' });

// Check system health
const healthStatus = await health.runAllHealthChecks();

// Get system status
const status = await monitoring.getSystemStatus();
```

## 📊 Dashboard Features

### **Main Menu Options**
1. **System Overview** - High-level system status and metrics
2. **Metrics Dashboard** - Detailed metrics with statistics
3. **Health Status** - Component health check results
4. **Active Alerts** - Current alerts and notifications
5. **Performance Profiles** - Operation performance analysis
6. **Recent Logs** - Latest log entries and errors
7. **System Metrics** - System resource usage
8. **Refresh Display** - Update dashboard data
9. **Exit** - Close dashboard

### **Real-Time Updates**
- Dashboard refreshes automatically every 5 seconds
- Health checks run every 30 seconds
- System metrics collected every 5 seconds
- Metrics and alerts update in real-time

## 🔧 Configuration

### **Monitoring Manager Options**
```typescript
interface MonitoringOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  healthCheckInterval?: number;  // milliseconds
  systemMetricsInterval?: number; // milliseconds
}
```

### **Environment Variables**
```bash
# Logging level
NODE_ENV=development  # Enables console logging

# Health check intervals (optional)
HEALTH_CHECK_INTERVAL=30000
SYSTEM_METRICS_INTERVAL=5000
```

## 📈 Metrics and Alerts

### **Key Performance Indicators (KPIs)**
- **Task Success Rate**: Percentage of successful TA computations
- **Processing Time**: Average time per task/batch
- **Resource Utilization**: CPU and memory usage
- **Error Rate**: Frequency of failures and errors
- **Worker Thread Efficiency**: Active vs. total worker threads

### **Alert Thresholds**
- **Memory Usage**: >80% triggers warning, >90% triggers critical
- **CPU Usage**: >80% triggers warning
- **Error Rate**: >10 errors in 10 measurements triggers warning
- **Task Failures**: >5 failures in 10 measurements triggers warning

### **Custom Alert Rules**
```typescript
// Add custom alert rule
monitoring.alerts.addAlertRule('custom_rule', (metric) => {
  if (metric.name === 'custom_metric') {
    const latest = metric.values[metric.values.length - 1];
    return latest && latest.value > 100;
  }
  return false;
});
```

## 🧪 Testing and Development

### **Test Monitoring Components**
```bash
# Run monitoring tests
npm test -- --testPathPattern=monitoring

# Test specific components
npm test -- --testPathPattern=metrics-collector
npm test -- --testPathPattern=health-checker
npm test -- --testPathPattern=alert-manager
```

### **Development Mode**
- Set `NODE_ENV=development` for enhanced console logging
- Use `logLevel: 'debug'` for verbose monitoring output
- Monitor dashboard updates in real-time

## 🔍 Troubleshooting

### **Common Issues**

1. **High Memory Usage**
   - Check for memory leaks in worker threads
   - Monitor metric retention settings
   - Review log and profile storage limits

2. **Frequent Health Check Failures**
   - Verify database connectivity
   - Check system resource availability
   - Review health check thresholds

3. **Alert Spam**
   - Adjust alert rule thresholds
   - Implement alert cooldown periods
   - Review metric collection frequency

### **Debug Commands**
```bash
# Check monitoring system status
npm run monitoring-dashboard

# View system metrics
curl http://localhost:3000/metrics  # If HTTP endpoint available

# Check logs
tail -f logs/ta-worker.log  # If file logging enabled
```

## 🚀 Production Deployment

### **Recommended Settings**
```typescript
const monitoring = createMonitoringManager({
  logLevel: 'warn',           // Reduce log volume
  healthCheckInterval: 60000,  // 1 minute health checks
  systemMetricsInterval: 10000 // 10 second metrics
});
```

### **Monitoring Integration**
- **Prometheus**: Export metrics for external monitoring
- **Grafana**: Create dashboards and visualizations
- **AlertManager**: Route alerts to appropriate channels
- **ELK Stack**: Centralized logging and analysis

### **Scaling Considerations**
- Monitor worker thread pool size
- Track database connection pool usage
- Monitor batch processing efficiency
- Alert on resource exhaustion

## 🔮 Future Enhancements

### **Planned Features**
1. **HTTP API Endpoints** - REST API for external monitoring
2. **WebSocket Support** - Real-time dashboard updates
3. **Export Formats** - Prometheus, StatsD, InfluxDB
4. **Custom Dashboards** - Configurable monitoring views
5. **Machine Learning** - Anomaly detection and prediction
6. **Integration Hooks** - Slack, PagerDuty, email alerts

### **Extensibility**
- Custom metric collectors
- Plugin-based health checks
- Configurable alert channels
- Metric aggregation and rollup

## 📚 API Reference

### **MonitoringManager**
```typescript
class MonitoringManager extends EventEmitter {
  readonly metrics: MetricsCollector;
  readonly health: HealthChecker;
  readonly alerts: AlertManager;
  readonly logger: Logger;
  readonly profiler: PerformanceProfiler;
  readonly systemMetrics: SystemMetricsCollector;
  
  constructor(options?: MonitoringOptions);
  getSystemStatus(): Promise<SystemStatus>;
  shutdown(): Promise<void>;
}
```

### **MetricsCollector**
```typescript
class MetricsCollector extends EventEmitter {
  createMetric(name: string, type: MetricType, description: string): Metric;
  recordValue(metricName: string, value: number, labels?: Record<string, string>): void;
  incrementCounter(metricName: string, increment?: number): void;
  setGauge(metricName: string, value: number): void;
  recordHistogram(metricName: string, value: number): void;
  getMetric(name: string): Metric | undefined;
  getAllMetrics(): Metric[];
  getMetricSummary(name: string): MetricSummary | null;
}
```

### **HealthChecker**
```typescript
class HealthChecker extends EventEmitter {
  registerHealthCheck(name: string, checkFn: HealthCheckFunction): void;
  runHealthCheck(name: string): Promise<HealthCheck>;
  runAllHealthChecks(): Promise<Map<string, HealthCheck>>;
  startPeriodicChecks(): void;
  stopPeriodicChecks(): void;
}
```

### **AlertManager**
```typescript
class AlertManager extends EventEmitter {
  addAlertRule(name: string, rule: AlertRuleFunction): void;
  createAlert(severity: AlertSeverity, title: string, message: string): Alert;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert | undefined;
  getAlerts(severity?: AlertSeverity, acknowledged?: boolean): Alert[];
  getActiveAlerts(): Alert[];
  checkAlertRules(metric: Metric): void;
}
```

## 🤝 Contributing

### **Adding New Metrics**
1. Define metric in `MetricsCollector.setupDefaultMetrics()`
2. Add metric recording calls in relevant code
3. Update dashboard display if needed
4. Add tests for new metric functionality

### **Adding New Health Checks**
1. Implement health check function
2. Register in `HealthChecker.setupDefaultHealthChecks()`
3. Add appropriate error handling
4. Test health check behavior

### **Adding New Alert Rules**
1. Define alert rule logic
2. Add to `AlertManager.setupDefaultAlertRules()`
3. Test rule triggering conditions
4. Update documentation

## 📄 License

This monitoring system is part of the TA Worker project and follows the same licensing terms.

---

**🎯 The TA Worker Monitoring & Observability System provides enterprise-grade monitoring capabilities, enabling operators to maintain system health, optimize performance, and respond quickly to issues in production environments.**

