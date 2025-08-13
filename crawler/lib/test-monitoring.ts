/* lib/test-monitoring.ts
   Simple test to verify monitoring system functionality
*/

import { createMonitoringManager } from './monitoring-manager';

async function testMonitoring(): Promise<void> {
  console.log('🧪 Testing Monitoring System...\n');

  try {
    // Create monitoring manager
    const monitoring = createMonitoringManager({
      logLevel: 'info',
      healthCheckInterval: 10000, // 10 seconds for testing
      systemMetricsInterval: 2000  // 2 seconds for testing
    });

    const { metrics, logger, alerts, health, profiler } = monitoring;

    console.log('✅ Monitoring manager created successfully');

    // Test metrics collection
    console.log('\n📊 Testing Metrics Collection...');
    metrics.incrementCounter('ta_worker_tasks_total');
    metrics.setGauge('system_memory_usage', 42.5);
    metrics.recordHistogram('ta_worker_processing_time', 100);
    
    console.log('✅ Metrics recorded successfully');

    // Test logging
    console.log('\n📝 Testing Logging...');
    logger.info('Test info message', { test: true, timestamp: Date.now() });
    logger.warn('Test warning message', { severity: 'medium' });
    logger.error('Test error message', { errorCode: 'TEST_001' });
    
    console.log('✅ Logging working correctly');

    // Test alerting
    console.log('\n🚨 Testing Alerting...');
    const alert = alerts.createAlert('info', 'Test Alert', 'This is a test alert');
    console.log(`✅ Alert created: ${alert.id}`);

    // Test health checks
    console.log('\n🏥 Testing Health Checks...');
    const healthChecks = await health.runAllHealthChecks();
    console.log(`✅ Health checks completed: ${healthChecks.size} checks`);

    // Test performance profiling
    console.log('\n⚡ Testing Performance Profiling...');
    const result = await profiler.profileOperation('test_operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
      return 'test result';
    });
    console.log(`✅ Performance profiling completed: ${result}`);

    // Test system status
    console.log('\n🌐 Testing System Status...');
    const status = await monitoring.getSystemStatus();
    console.log(`✅ System status retrieved:`);
    console.log(`   - Metrics: ${status.metrics.length}`);
    console.log(`   - Health Checks: ${status.health.size}`);
    console.log(`   - Alerts: ${status.alerts.length}`);
    console.log(`   - Logs: ${status.logs.length}`);
    console.log(`   - Profiles: ${status.profiles.length}`);

    // Test metrics summary
    console.log('\n📈 Testing Metrics Summary...');
    const summary = metrics.getMetricSummary('ta_worker_processing_time');
    if (summary) {
      console.log(`✅ Histogram summary: count=${summary.count}, avg=${summary.avg.toFixed(2)}`);
    }

    // Test log stats
    console.log('\n📊 Testing Log Statistics...');
    const logStats = logger.getLogStats();
    console.log(`✅ Log statistics:`, logStats);

    // Test alert management
    console.log('\n🔧 Testing Alert Management...');
    const activeAlerts = alerts.getActiveAlerts();
    console.log(`✅ Active alerts: ${activeAlerts.length}`);

    // Test performance stats
    console.log('\n📊 Testing Performance Statistics...');
    const perfStats = profiler.getProfileStats('test_operation');
    console.log(`✅ Performance stats: count=${perfStats.count}, avg=${perfStats.avgDuration.toFixed(2)}ms`);

    console.log('\n🎉 All monitoring tests passed successfully!');

    // Shutdown monitoring
    await monitoring.shutdown();
    console.log('✅ Monitoring system shutdown complete');

  } catch (error) {
    console.error('❌ Monitoring test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMonitoring().catch((error) => {
  console.error('Failed to run monitoring test:', error);
  process.exit(1);
});

export { testMonitoring };
