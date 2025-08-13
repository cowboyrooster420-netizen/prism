/* scripts/distributed-analytics-dashboard.ts
   Distributed Analytics Dashboard - Interactive multi-instance analytics control
   This implements Item #11: Distributed Analytics from the improvement roadmap.
   
   Run: npx tsx scripts/distributed-analytics-dashboard.ts
*/

import 'dotenv/config';
import { createDistributedAnalytics, DistributedAnalyticsConfig } from '../lib/distributed-analytics';
import { Logger } from '../lib/logger';
import { MetricsCollector } from '../lib/metrics-collector';

// ============================================================================
// DISTRIBUTED ANALYTICS DASHBOARD
// ============================================================================

class DistributedAnalyticsDashboard {
  private distributedAnalytics: any;
  private logger: Logger;
  private metrics: MetricsCollector;
  
  private isRunning: boolean = false;
  private taskSimulationInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logger = new Logger('info');
    this.metrics = new MetricsCollector();
    
    this.initializeMetrics();
    this.initializeSystems();
  }

  private initializeMetrics(): void {
    this.metrics.createMetric('dashboard_sessions_total', 'counter', 'Total dashboard sessions');
    this.metrics.createMetric('simulated_tasks_total', 'counter', 'Total simulated distributed tasks');
    this.metrics.createMetric('dashboard_response_time', 'histogram', 'Dashboard response time');
    this.metrics.createMetric('distributed_monitoring_total', 'counter', 'Total distributed monitoring events');
  }

  private async initializeSystems(): Promise<void> {
    try {
      // Initialize distributed analytics
      const distributedAnalyticsConfig: DistributedAnalyticsConfig = {
        enableDistributedAnalytics: true,
        enableInstanceDiscovery: true,
        enableDataSynchronization: true,
        enableDistributedCaching: true,
        network: {
          discoveryPort: 8080,
          dataPort: 8081,
          heartbeatInterval: 30000,
          timeout: 90000,
          maxRetries: 3
        },
        coordination: {
          enableLoadBalancing: true,
          enableFailover: true,
          enableTaskDistribution: true,
          maxConcurrentTasks: 5,
          taskTimeout: 300000
        },
        analytics: {
          enableDistributedStats: true,
          enableCrossInstanceCorrelation: true,
          enableUnifiedTrends: true,
          enableGlobalInsights: true,
          syncInterval: 60000
        },
        caching: {
          enableDistributedCache: true,
          cacheExpiration: 300000,
          maxCacheSize: 1000,
          syncStrategy: 'hybrid'
        },
        monitoring: {
          enableHealthMonitoring: true,
          enablePerformanceTracking: true,
          enableResourceMonitoring: true,
          monitoringInterval: 30000
        }
      };
      
      this.distributedAnalytics = createDistributedAnalytics(distributedAnalyticsConfig);

      // Set up event listeners
      this.setupEventListeners();

      this.logger.info('Distributed Analytics Dashboard initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize distributed analytics dashboard', { error });
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.distributedAnalytics.on('instance_discovered', (instance: any) => {
      console.log(`🔍 New Instance Discovered: ${instance.id} (${instance.host})`);
    });

    this.distributedAnalytics.on('instance_offline', (instance: any) => {
      console.log(`❌ Instance Offline: ${instance.id} (${instance.host})`);
    });

    this.distributedAnalytics.on('instance_online', (instance: any) => {
      console.log(`✅ Instance Online: ${instance.id} (${instance.host})`);
    });

    this.distributedAnalytics.on('health_status', (status: any) => {
      console.log(`🏥 Health Status: System Health ${status.systemHealth.toFixed(1)}%`);
    });
  }

  // ============================================================================
  // DASHBOARD INTERFACE
  // ============================================================================

  async startDashboard(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Dashboard is already running');
      return;
    }

    this.isRunning = true;
    this.metrics.incrementCounter('dashboard_sessions_total');

    console.log('\n🚀 Distributed Analytics Dashboard Starting...');
    console.log('🌐 Multi-Instance Analytics Coordination');
    console.log('🔄 Distributed Task Distribution and Execution');
    console.log('📊 Cross-Instance Correlation and Global Insights');
    console.log('=' .repeat(80));

    // Start distributed analytics system
    await this.distributedAnalytics.startDistributedAnalytics();

    // Start interactive dashboard
    await this.runInteractiveDashboard();

    // Start monitoring and simulation
    this.startMonitoring();
    this.startTaskSimulation();
  }

  private async runInteractiveDashboard(): Promise<void> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const showMenu = () => {
      console.log('\n🌐 DISTRIBUTED ANALYTICS DASHBOARD');
      console.log('1. 🔍 View Instances');
      console.log('2. 📊 Distributed Tasks');
      console.log('3. 🧠 Cross-Instance Correlations');
      console.log('4. 💡 Global Insights');
      console.log('5. 💾 Distributed Cache');
      console.log('6. 🎯 Task Simulation');
      console.log('7. 📈 Performance Metrics');
      console.log('8. 🔄 Refresh Status');
      console.log('9. 🚪 Stop System');
      console.log('0. 🚪 Exit Dashboard');
      console.log('=' .repeat(50));
    };

    const processChoice = async (choice: string) => {
      const startTime = performance.now();
      
      try {
        switch (choice.trim()) {
          case '1':
            await this.viewInstances();
            break;
          case '2':
            await this.viewDistributedTasks();
            break;
          case '3':
            await this.viewCrossInstanceCorrelations();
            break;
          case '4':
            await this.viewGlobalInsights();
            break;
          case '5':
            await this.viewDistributedCache();
            break;
          case '6':
            await this.taskSimulation();
            break;
          case '7':
            await this.viewPerformanceMetrics();
            break;
          case '8':
            await this.refreshStatus();
            break;
          case '9':
            await this.stopSystem();
            break;
          case '0':
            console.log('👋 Exiting Distributed Analytics Dashboard...');
            this.stopDashboard();
            rl.close();
            return;
          default:
            console.log('❌ Invalid choice. Please select 0-9.');
        }
        
        const duration = (performance.now() - startTime) / 1000;
        this.metrics.recordHistogram('dashboard_response_time', duration);
        
      } catch (error) {
        this.logger.error('Dashboard operation failed', { choice, error });
        console.log(`❌ Operation failed: ${error instanceof Error ? error.message : error}`);
      }
    };

    showMenu();
    
    rl.on('line', async (input: string) => {
      await processChoice(input);
      if (this.isRunning) {
        showMenu();
      }
    });

    rl.on('close', () => {
      this.stopDashboard();
    });
  }

  // ============================================================================
  // DASHBOARD OPERATIONS
  // ============================================================================

  private async viewInstances(): Promise<void> {
    console.log('\n🔍 INSTANCES');
    
    const instances = this.distributedAnalytics.getInstances();
    
    if (instances.length === 0) {
      console.log('📊 No instances discovered yet');
      return;
    }

    instances.forEach((instance, index) => {
      const statusEmoji = instance.status === 'online' ? '🟢' :
                          instance.status === 'offline' ? '🔴' :
                          instance.status === 'busy' ? '🟡' : '⚪';
      
      const loadEmoji = instance.load < 30 ? '🟢' :
                       instance.load < 70 ? '🟡' : '🔴';
      
      console.log(`\n${index + 1}. ${statusEmoji} ${instance.id}`);
      console.log(`   Host: ${instance.host}:${instance.port}`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Capabilities: ${instance.capabilities.join(', ')}`);
      console.log(`   Load: ${loadEmoji} ${instance.load.toFixed(1)}%`);
      console.log(`   Memory: ${instance.memory.toFixed(1)}%`);
      console.log(`   CPU: ${instance.cpu.toFixed(1)}%`);
      console.log(`   Last Heartbeat: ${new Date(instance.lastHeartbeat).toLocaleTimeString()}`);
      
      if (instance.metadata) {
        console.log(`   Version: ${instance.metadata.version}`);
        console.log(`   Environment: ${instance.metadata.environment}`);
      }
    });

    // Summary statistics
    const onlineInstances = instances.filter(i => i.status === 'online');
    const offlineInstances = instances.filter(i => i.status === 'offline');
    const avgLoad = onlineInstances.length > 0 ? 
      onlineInstances.reduce((sum, i) => sum + i.load, 0) / onlineInstances.length : 0;
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total Instances: ${instances.length}`);
    console.log(`  Online: ${onlineInstances.length} 🟢`);
    console.log(`  Offline: ${offlineInstances.length} 🔴`);
    console.log(`  Average Load: ${avgLoad.toFixed(1)}%`);
  }

  private async viewDistributedTasks(): Promise<void> {
    console.log('\n📊 DISTRIBUTED TASKS');
    
    const tasks = this.distributedAnalytics.getTasks();
    
    if (tasks.length === 0) {
      console.log('📊 No distributed tasks available');
      return;
    }

    // Overall statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const runningTasks = tasks.filter(t => t.status === 'running').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    
    console.log(`📈 Task Statistics:`);
    console.log(`  Total Tasks: ${totalTasks}`);
    console.log(`  Completed: ${completedTasks} ✅`);
    console.log(`  Running: ${runningTasks} 🔄`);
    console.log(`  Failed: ${failedTasks} ❌`);
    console.log(`  Pending: ${pendingTasks} ⏳`);

    // Task breakdown by type
    const taskTypes = new Map<string, number>();
    tasks.forEach(task => {
      taskTypes.set(task.type, (taskTypes.get(task.type) || 0) + 1);
    });

    console.log('\n🎯 Tasks by Type:');
    taskTypes.forEach((count, type) => {
      console.log(`  ${type}: ${count}`);
    });

    // Task breakdown by priority
    const taskPriorities = new Map<string, number>();
    tasks.forEach(task => {
      taskPriorities.set(task.priority, (taskPriorities.get(task.priority) || 0) + 1);
    });

    console.log('\n⚡ Tasks by Priority:');
    taskPriorities.forEach((count, priority) => {
      const priorityEmoji = priority === 'critical' ? '🔴' :
                           priority === 'high' ? '🟠' :
                           priority === 'medium' ? '🟡' : '🟢';
      console.log(`  ${priorityEmoji} ${priority}: ${count}`);
    });

    // Recent tasks
    const recentTasks = tasks.slice(-5);
    console.log('\n🕒 Recent Tasks:');
    recentTasks.forEach((task, index) => {
      const statusEmoji = task.status === 'completed' ? '✅' :
                          task.status === 'running' ? '🔄' :
                          task.status === 'failed' ? '❌' : '⏳';
      
      const priorityEmoji = task.priority === 'critical' ? '🔴' :
                           task.priority === 'high' ? '🟠' :
                           task.priority === 'medium' ? '🟡' : '🟢';
      
      console.log(`  ${index + 1}. ${statusEmoji} ${priorityEmoji} ${task.type} (${task.status})`);
      console.log(`     ID: ${task.id}`);
      console.log(`     Target Instances: ${task.targetInstances.length}`);
      console.log(`     Created: ${new Date(task.createdAt).toLocaleTimeString()}`);
      
      if (task.completedAt) {
        const duration = (task.completedAt - (task.startedAt || task.createdAt)) / 1000;
        console.log(`     Duration: ${duration.toFixed(2)}s`);
      }
    });
  }

  private async viewCrossInstanceCorrelations(): Promise<void> {
    console.log('\n🧠 CROSS-INSTANCE CORRELATIONS');
    
    const correlations = this.distributedAnalytics.getCorrelations();
    
    if (correlations.length === 0) {
      console.log('📊 No cross-instance correlations available');
      return;
    }

    correlations.forEach((correlation, index) => {
      const typeEmoji = correlation.correlationType === 'quality' ? '📊' :
                       correlation.correlationType === 'performance' ? '⚡' :
                       correlation.correlationType === 'trends' ? '📈' : '🔍';
      
      const strengthEmoji = correlation.strength > 0.8 ? '🟢' :
                           correlation.strength > 0.6 ? '🟡' : '🔴';
      
      const confidenceEmoji = correlation.confidence > 0.8 ? '🟢' :
                             correlation.confidence > 0.6 ? '🟡' : '🔴';
      
      console.log(`\n${index + 1}. ${typeEmoji} ${correlation.correlationType.toUpperCase()} Correlation`);
      console.log(`   Instances: ${correlation.instances.join(', ')}`);
      console.log(`   Strength: ${strengthEmoji} ${(correlation.strength * 100).toFixed(1)}%`);
      console.log(`   Confidence: ${confidenceEmoji} ${(correlation.confidence * 100).toFixed(1)}%`);
      console.log(`   Timestamp: ${new Date(correlation.timestamp).toLocaleString()}`);
      
      if (correlation.data) {
        console.log(`   Data Points: ${Object.keys(correlation.data).length}`);
        
        // Show sample data
        if (correlation.data.qualityData) {
          console.log(`   Quality Data Sample:`);
          correlation.data.qualityData.slice(0, 3).forEach((data: any) => {
            console.log(`     ${data.instanceId}: Quality ${data.qualityScore.toFixed(1)}, Errors ${data.errorRate.toFixed(2)}`);
          });
        }
      }
    });

    // Correlation insights
    console.log('\n💡 Correlation Insights:');
    
    const strongCorrelations = correlations.filter(c => c.strength > 0.7);
    const weakCorrelations = correlations.filter(c => c.strength < 0.4);
    
    if (strongCorrelations.length > 0) {
      console.log(`  🟢 Strong correlations detected: ${strongCorrelations.length}`);
      strongCorrelations.forEach(c => {
        console.log(`     ${c.correlationType}: ${(c.strength * 100).toFixed(1)}% strength`);
      });
    }
    
    if (weakCorrelations.length > 0) {
      console.log(`  🔴 Weak correlations detected: ${weakCorrelations.length}`);
      weakCorrelations.forEach(c => {
        console.log(`     ${c.correlationType}: ${(c.strength * 100).toFixed(1)}% strength`);
      });
    }
    
    const avgStrength = correlations.reduce((sum, c) => sum + c.strength, 0) / correlations.length;
    console.log(`  📊 Average correlation strength: ${(avgStrength * 100).toFixed(1)}%`);
  }

  private async viewGlobalInsights(): Promise<void> {
    console.log('\n💡 GLOBAL INSIGHTS');
    
    const insights = this.distributedAnalytics.getInsights();
    
    if (insights.length === 0) {
      console.log('📊 No global insights available');
      return;
    }

    insights.forEach((insight, index) => {
      const typeEmoji = insight.type === 'trend' ? '📈' :
                       insight.type === 'anomaly' ? '🚨' :
                       insight.type === 'correlation' ? '🔗' : '💡';
      
      const severityEmoji = insight.severity === 'critical' ? '🔴' :
                           insight.severity === 'high' ? '🟠' :
                           insight.severity === 'medium' ? '🟡' : '🟢';
      
      console.log(`\n${index + 1}. ${typeEmoji} ${insight.type.toUpperCase()} (${severityEmoji} ${insight.severity})`);
      console.log(`   Description: ${insight.description}`);
      console.log(`   Affected Instances: ${insight.affectedInstances.length}`);
      console.log(`   Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
      console.log(`   Timestamp: ${new Date(insight.timestamp).toLocaleString()}`);
      
      if (insight.data) {
        console.log(`   Data: ${JSON.stringify(insight.data, null, 2)}`);
      }
    });

    // Insight summary
    console.log('\n📊 Insight Summary:');
    
    const insightTypes = new Map<string, number>();
    const insightSeverities = new Map<string, number>();
    
    insights.forEach(insight => {
      insightTypes.set(insight.type, (insightTypes.get(insight.type) || 0) + 1);
      insightSeverities.set(insight.severity, (insightSeverities.get(insight.severity) || 0) + 1);
    });

    console.log('  Types:');
    insightTypes.forEach((count, type) => {
      console.log(`    ${type}: ${count}`);
    });

    console.log('  Severities:');
    insightSeverities.forEach((count, severity) => {
      const severityEmoji = severity === 'critical' ? '🔴' :
                           severity === 'high' ? '🟠' :
                           severity === 'medium' ? '🟡' : '🟢';
      console.log(`    ${severityEmoji} ${severity}: ${count}`);
    });

    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    console.log(`  Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  }

  private async viewDistributedCache(): Promise<void> {
    console.log('\n💾 DISTRIBUTED CACHE');
    
    const cache = this.distributedAnalytics.getCache();
    
    if (cache.length === 0) {
      console.log('📊 No cache entries available');
      return;
    }

    // Cache statistics
    const totalEntries = cache.length;
    const expiredEntries = cache.filter(c => Date.now() - c.timestamp > c.ttl).length;
    const validEntries = totalEntries - expiredEntries;
    
    console.log(`📊 Cache Statistics:`);
    console.log(`  Total Entries: ${totalEntries}`);
    console.log(`  Valid Entries: ${validEntries} ✅`);
    console.log(`  Expired Entries: ${expiredEntries} ⏰`);

    // Cache by source instance
    const cacheByInstance = new Map<string, number>();
    cache.forEach(entry => {
      cacheByInstance.set(entry.sourceInstance, (cacheByInstance.get(entry.sourceInstance) || 0) + 1);
    });

    console.log('\n🏠 Cache by Source Instance:');
    cacheByInstance.forEach((count, instanceId) => {
      const isSelf = instanceId === this.distributedAnalytics.getInstanceInfo(instanceId)?.id;
      const instanceEmoji = isSelf ? '🏠' : '🌐';
      console.log(`  ${instanceEmoji} ${instanceId}: ${count} entries`);
    });

    // Recent cache entries
    const recentCache = cache
      .filter(entry => Date.now() - entry.timestamp <= entry.ttl)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    console.log('\n🕒 Recent Cache Entries:');
    recentCache.forEach((entry, index) => {
      const ttlRemaining = Math.max(0, (entry.timestamp + entry.ttl - Date.now()) / 1000);
      const ttlEmoji = ttlRemaining > 60 ? '🟢' : ttlRemaining > 10 ? '🟡' : '🔴';
      
      console.log(`  ${index + 1}. ${entry.key}`);
      console.log(`     Source: ${entry.sourceInstance}`);
      console.log(`     TTL Remaining: ${ttlEmoji} ${ttlRemaining.toFixed(0)}s`);
      console.log(`     Created: ${new Date(entry.timestamp).toLocaleTimeString()}`);
      console.log(`     Version: ${entry.version}`);
      
      if (typeof entry.value === 'object') {
        console.log(`     Value Type: ${entry.value.constructor.name}`);
        console.log(`     Value Keys: ${Object.keys(entry.value).join(', ')}`);
      } else {
        console.log(`     Value: ${String(entry.value).substring(0, 50)}${String(entry.value).length > 50 ? '...' : ''}`);
      }
    });

    // Cache performance
    const avgTTL = cache.reduce((sum, entry) => sum + entry.ttl, 0) / cache.length;
    console.log(`\n📈 Cache Performance:`);
    console.log(`  Average TTL: ${(avgTTL / 1000).toFixed(1)}s`);
    console.log(`  Cache Hit Rate: ${validEntries > 0 ? ((validEntries / totalEntries) * 100).toFixed(1) : 0}%`);
  }

  private async taskSimulation(): Promise<void> {
    console.log('\n🎯 TASK SIMULATION');
    console.log('Simulating various distributed tasks to test the system...');
    
    const simulations = [
      {
        type: 'analytics' as const,
        priority: 'medium' as const,
        data: { dataset: 'market_data', analysis: 'trend_analysis' },
        targetInstances: ['worker_1', 'worker_2']
      },
      {
        type: 'quality' as const,
        priority: 'high' as const,
        data: { tokenId: 'token123', timeframe: '5m' },
        targetInstances: ['worker_1', 'worker_3']
      },
      {
        type: 'ml' as const,
        priority: 'low' as const,
        data: { model: 'quality_predictor', training: true },
        targetInstances: ['worker_2']
      },
      {
        type: 'remediation' as const,
        priority: 'critical' as const,
        data: { issue: 'data_quality_degradation', severity: 'high' },
        targetInstances: ['worker_1', 'worker_2', 'worker_3']
      },
      {
        type: 'monitoring' as const,
        priority: 'medium' as const,
        data: { metrics: ['cpu', 'memory', 'quality'], interval: 30000 },
        targetInstances: ['worker_1', 'worker_2']
      }
    ];

    for (const simulation of simulations) {
      console.log(`\n🚀 Simulating ${simulation.type} task...`);
      
      try {
        const taskId = await this.distributedAnalytics.distributeTask(simulation);
        
        console.log(`  ✅ Task created: ${taskId}`);
        this.metrics.incrementCounter('simulated_tasks_total');
        
        // Wait a bit before next simulation
        await this.sleep(2000);
        
      } catch (error) {
        console.log(`  ❌ Failed to simulate task: ${error}`);
      }
    }
    
    console.log('\n🎭 Task simulation completed!');
    console.log('📊 Check the distributed tasks view to see the results.');
  }

  private async viewPerformanceMetrics(): Promise<void> {
    console.log('\n📈 PERFORMANCE METRICS');
    
    const instances = this.distributedAnalytics.getInstances();
    const tasks = this.distributedAnalytics.getTasks();
    
    if (instances.length === 0) {
      console.log('📊 No instances available for performance analysis');
      return;
    }

    // System-wide performance
    const onlineInstances = instances.filter(i => i.status === 'online');
    const avgLoad = onlineInstances.reduce((sum, i) => sum + i.load, 0) / onlineInstances.length;
    const avgMemory = onlineInstances.reduce((sum, i) => sum + i.memory, 0) / onlineInstances.length;
    const avgCpu = onlineInstances.reduce((sum, i) => sum + i.cpu, 0) / onlineInstances.length;
    
    console.log('🏥 System Performance:');
    console.log(`  Online Instances: ${onlineInstances.length}/${instances.length}`);
    console.log(`  Average Load: ${avgLoad.toFixed(1)}%`);
    console.log(`  Average Memory: ${avgMemory.toFixed(1)}%`);
    console.log(`  Average CPU: ${avgCpu.toFixed(1)}%`);

    // Task performance
    if (tasks.length > 0) {
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const avgTaskDuration = completedTasks.length > 0 ? 
        completedTasks.reduce((sum, t) => {
          const duration = (t.completedAt || 0) - (t.startedAt || t.createdAt);
          return sum + duration;
        }, 0) / completedTasks.length : 0;
      
      console.log('\n📊 Task Performance:');
      console.log(`  Total Tasks: ${tasks.length}`);
      console.log(`  Completed: ${completedTasks.length}`);
      console.log(`  Success Rate: ${completedTasks.length > 0 ? ((completedTasks.length / tasks.length) * 100).toFixed(1) : 0}%`);
      console.log(`  Average Duration: ${(avgTaskDuration / 1000).toFixed(2)}s`);
    }

    // Instance performance ranking
    console.log('\n🏆 Instance Performance Ranking:');
    const rankedInstances = onlineInstances
      .map(instance => ({
        ...instance,
        performanceScore: 100 - (instance.load * 0.4 + instance.memory * 0.3 + instance.cpu * 0.3)
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore);

    rankedInstances.forEach((instance, index) => {
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊';
      const performanceEmoji = instance.performanceScore > 80 ? '🟢' :
                              instance.performanceScore > 60 ? '🟡' : '🔴';
      
      console.log(`  ${rankEmoji} ${instance.id}: ${performanceEmoji} ${instance.performanceScore.toFixed(1)}%`);
      console.log(`     Load: ${instance.load.toFixed(1)}%, Memory: ${instance.memory.toFixed(1)}%, CPU: ${instance.cpu.toFixed(1)}%`);
    });

    // Performance insights
    console.log('\n💡 Performance Insights:');
    
    if (avgLoad > 80) {
      console.log('  🔴 High system load detected - consider scaling');
    } else if (avgLoad > 60) {
      console.log('  🟡 Moderate system load - monitor closely');
    } else {
      console.log('  🟢 System load is healthy');
    }
    
    if (avgMemory > 85) {
      console.log('  🔴 High memory usage - investigate memory leaks');
    } else if (avgMemory > 70) {
      console.log('  🟡 Moderate memory usage - monitor trends');
    } else {
      console.log('  🟢 Memory usage is healthy');
    }
    
    if (avgCpu > 90) {
      console.log('  🔴 High CPU usage - consider optimization');
    } else if (avgCpu > 75) {
      console.log('  🟡 Moderate CPU usage - monitor performance');
    } else {
      console.log('  🟢 CPU usage is healthy');
    }
  }

  private async refreshStatus(): Promise<void> {
    console.log('\n🔄 REFRESHING STATUS...');
    
    try {
      // Refresh all status information
      const instances = this.distributedAnalytics.getInstances();
      const tasks = this.distributedAnalytics.getTasks();
      const cache = this.distributedAnalytics.getCache();
      const correlations = this.distributedAnalytics.getCorrelations();
      const insights = this.distributedAnalytics.getInsights();
      
      console.log('📊 Current Status:');
      console.log(`  🏠 Instances: ${instances.length} total, ${instances.filter(i => i.status === 'online').length} online`);
      console.log(`  📊 Tasks: ${tasks.length} total, ${tasks.filter(t => t.status === 'running').length} running`);
      console.log(`  💾 Cache: ${cache.length} entries, ${cache.filter(c => Date.now() - c.timestamp <= c.ttl).length} valid`);
      console.log(`  🧠 Correlations: ${correlations.length} active`);
      console.log(`  💡 Insights: ${insights.length} generated`);
      
      // Check for any issues
      const offlineInstances = instances.filter(i => i.status === 'offline');
      const failedTasks = tasks.filter(t => t.status === 'failed');
      const criticalInsights = insights.filter(i => i.severity === 'critical');
      
      if (offlineInstances.length > 0) {
        console.log(`\n⚠️  Issues Detected:`);
        console.log(`  🔴 Offline Instances: ${offlineInstances.length}`);
        offlineInstances.forEach(instance => {
          console.log(`     ${instance.id} (${instance.host})`);
        });
      }
      
      if (failedTasks.length > 0) {
        console.log(`  ❌ Failed Tasks: ${failedTasks.length}`);
        failedTasks.slice(0, 3).forEach(task => {
          console.log(`     ${task.type} (${task.id}): ${task.error}`);
        });
      }
      
      if (criticalInsights.length > 0) {
        console.log(`  🚨 Critical Insights: ${criticalInsights.length}`);
        criticalInsights.forEach(insight => {
          console.log(`     ${insight.type}: ${insight.description}`);
        });
      }
      
      if (offlineInstances.length === 0 && failedTasks.length === 0 && criticalInsights.length === 0) {
        console.log('\n✅ No issues detected - system is healthy!');
      }
      
      console.log('  ✅ Status refresh completed');
      
    } catch (error) {
      console.log(`❌ Status refresh failed: ${error}`);
    }
  }

  private async stopSystem(): Promise<void> {
    console.log('\n🛑 STOPPING DISTRIBUTED ANALYTICS SYSTEM...');
    
    try {
      await this.distributedAnalytics.stopDistributedAnalytics();
      console.log('✅ Distributed analytics system stopped');
      
      // Ask if user wants to restart
      console.log('\n🔄 Would you like to restart the distributed analytics system? (y/n)');
      
    } catch (error) {
      console.log(`❌ Failed to stop distributed analytics: ${error}`);
    }
  }

  // ============================================================================
  // MONITORING AND SIMULATION
  // ============================================================================

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      if (this.isRunning) {
        try {
          const instances = this.distributedAnalytics.getInstances();
          const tasks = this.distributedAnalytics.getTasks();
          
          if (instances.length > 0 || tasks.length > 0) {
            this.metrics.incrementCounter('distributed_monitoring_total');
          }
        } catch (error) {
          this.logger.error('Monitoring failed', { error });
        }
      }
    }, 30000); // Monitor every 30 seconds
  }

  private startTaskSimulation(): void {
    this.taskSimulationInterval = setInterval(async () => {
      if (this.isRunning) {
        try {
          // Randomly simulate tasks (15% chance every interval)
          if (Math.random() < 0.15) {
            const taskTypes = ['analytics', 'quality', 'monitoring'];
            const randomType = taskTypes[Math.floor(Math.random() * taskTypes.length)] as any;
            const randomPriority = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any;
            
            const task = await this.distributedAnalytics.distributeTask({
              type: randomType,
              priority: randomPriority,
              data: { autoSimulation: true, timestamp: Date.now() },
              sourceInstance: 'dashboard',
              targetInstances: ['worker_1', 'worker_2']
            });
            
            this.logger.info('Auto-simulated task created', { 
              type: randomType, 
              priority: randomPriority,
              taskId: task 
            });
          }
        } catch (error) {
          this.logger.error('Auto-simulation failed', { error });
        }
      }
    }, 180000); // Simulate every 3 minutes
  }

  private stopDashboard(): void {
    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.taskSimulationInterval) {
      clearInterval(this.taskSimulationInterval);
      this.taskSimulationInterval = null;
    }
    
    this.logger.info('Distributed Analytics Dashboard stopped');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    const dashboard = new DistributedAnalyticsDashboard();
    await dashboard.startDashboard();
  } catch (error) {
    console.error('💥 Failed to start Distributed Analytics Dashboard:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
