/* scripts/monitoring-dashboard.ts
   Standalone monitoring dashboard for TA worker system visibility
*/

import { createMonitoringManager } from '../lib/monitoring-manager';
import { createMonitoringDashboard } from '../lib/monitoring-dashboard';

async function main(): Promise<void> {
  console.log('🚀 Starting TA Worker Monitoring Dashboard...\n');

  try {
    // Create monitoring manager
    const monitoringManager = createMonitoringManager({
      logLevel: 'info',
      healthCheckInterval: 30000, // 30 seconds
      systemMetricsInterval: 5000  // 5 seconds
    });

    // Create and start dashboard
    const dashboard = createMonitoringDashboard(monitoringManager);
    
    console.log('✅ Monitoring system initialized successfully');
    console.log('📊 Dashboard starting...\n');

    // Start the dashboard
    await dashboard.start();

  } catch (error) {
    console.error('❌ Failed to start monitoring dashboard:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down monitoring dashboard...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down monitoring dashboard...');
  process.exit(0);
});

// Start the dashboard
main().catch((error) => {
  console.error('Failed to run monitoring dashboard:', error);
  process.exit(1);
});
