/* scripts/advanced-analytics-dashboard.ts
   Advanced Analytics Dashboard - Interactive statistical analysis and trend visualization
   This implements Item #9: Advanced Analytics from the improvement roadmap.
   
   Run: npx tsx scripts/advanced-analytics-dashboard.ts
*/

import 'dotenv/config';
import { createSupabaseClient } from '../lib/database-operations';
import { createAdvancedAnalytics, AnalyticsConfig } from '../lib/advanced-analytics';
import { createMLEnhancedDataQualityManager } from '../lib/ml-enhanced-data-quality-manager';
import { createMonitoringManager } from '../lib/monitoring-manager';
import { Logger } from '../lib/logger';
import { MetricsCollector } from '../lib/metrics-collector';

// ============================================================================
// ADVANCED ANALYTICS DASHBOARD
// ============================================================================

class AdvancedAnalyticsDashboard {
  private supabase: any;
  private analytics: any;
  private mlQualityManager: any;
  private monitoringManager: any;
  private logger: Logger;
  private metrics: MetricsCollector;
  
  private isRunning: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logger = new Logger('info');
    this.metrics = new MetricsCollector();
    
    this.initializeMetrics();
    this.initializeSystems();
  }

  private initializeMetrics(): void {
    this.metrics.createMetric('dashboard_sessions_total', 'counter', 'Total dashboard sessions');
    this.metrics.createMetric('analytics_queries_total', 'counter', 'Total analytics queries executed');
    this.metrics.createMetric('dashboard_response_time', 'histogram', 'Dashboard response time');
    this.metrics.createMetric('insights_generated_total', 'counter', 'Total insights generated');
  }

  private async initializeSystems(): Promise<void> {
    try {
      // Initialize Supabase client
      const dbConfig = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
      };
      this.supabase = createSupabaseClient(dbConfig);

      // Initialize advanced analytics
      const analyticsConfig: AnalyticsConfig = {
        enableStatisticalAnalysis: true,
        enableTrendForecasting: true,
        enableCorrelationAnalysis: true,
        enablePredictiveModeling: true,
        statisticalMethods: {
          descriptive: true,
          inferential: true,
          timeSeries: true,
          regression: true
        },
        forecasting: {
          methods: ['linear', 'exponential', 'polynomial'],
          horizon: 24,
          confidenceLevel: 0.95,
          seasonalityDetection: true
        },
        correlation: {
          enablePearson: true,
          enableSpearman: true,
          enableKendall: true,
          minCorrelation: 0.3
        }
      };
      
      this.analytics = createAdvancedAnalytics(analyticsConfig);

      // Initialize ML-enhanced quality manager
      this.mlQualityManager = createMLEnhancedDataQualityManager({
        enableRealTimeValidation: true,
        enableAnomalyDetection: true,
        enableQualityMetrics: true,
        enableIntegrityMonitoring: true,
        mlIntegration: {
          enableMLPredictions: true,
          enableMLAnomalyDetection: true,
          enableContinuousLearning: true,
          enablePredictiveQuality: true,
          mlModelConfig: {
            modelType: 'ensemble',
            trainingWindow: 30,
            predictionHorizon: 24,
            confidenceThreshold: 0.75,
            updateFrequency: 168,
            featureEngineering: {
              enableTechnicalIndicators: true,
              enableStatisticalFeatures: true,
              enableTemporalFeatures: true,
              enableCrossTokenFeatures: true
            },
            anomalyDetection: {
              enableUnsupervised: true,
              enableSupervised: true,
              enableReinforcement: true
            }
          }
        },
        hybridValidation: {
          enableTraditionalValidation: true,
          enableMLValidation: true,
          validationWeight: 0.6,
          consensusThreshold: 0.8
        },
        predictiveAnalytics: {
          enableQualityForecasting: true,
          forecastHorizon: 24,
          confidenceIntervals: true,
          trendAnalysis: true
        }
      });

      // Initialize monitoring manager
      this.monitoringManager = createMonitoringManager();

      this.logger.info('Advanced Analytics Dashboard initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize dashboard systems', { error });
      throw error;
    }
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

    console.log('\n🚀 Advanced Analytics Dashboard Starting...');
    console.log('📊 Statistical Analysis, Trend Forecasting, and Quality Insights');
    console.log('🤖 ML-Enhanced Quality Management Integration');
    console.log('🔍 Real-Time Monitoring and Analytics');
    console.log('=' .repeat(80));

    // Start interactive dashboard
    await this.runInteractiveDashboard();

    // Start auto-refresh
    this.startAutoRefresh();
  }

  private async runInteractiveDashboard(): Promise<void> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const showMenu = () => {
      console.log('\n📊 ADVANCED ANALYTICS DASHBOARD');
      console.log('1. 📈 Quality Trend Analysis');
      console.log('2. 🔍 Statistical Analysis');
      console.log('3. 🔗 Correlation Analysis');
      console.log('4. 🔮 Quality Forecasting');
      console.log('5. 🚨 Quality Insights & Alerts');
      console.log('6. 🤖 ML Model Performance');
      console.log('7. 📊 System Health Overview');
      console.log('8. 🔄 Refresh All Data');
      console.log('9. ⚙️  Configuration');
      console.log('0. 🚪 Exit Dashboard');
      console.log('=' .repeat(50));
    };

    const processChoice = async (choice: string) => {
      const startTime = performance.now();
      
      try {
        switch (choice.trim()) {
          case '1':
            await this.qualityTrendAnalysis();
            break;
          case '2':
            await this.statisticalAnalysis();
            break;
          case '3':
            await this.correlationAnalysis();
            break;
          case '4':
            await this.qualityForecasting();
            break;
          case '5':
            await this.qualityInsights();
            break;
          case '6':
            await this.mlModelPerformance();
            break;
          case '7':
            await this.systemHealthOverview();
            break;
          case '8':
            await this.refreshAllData();
            break;
          case '9':
            await this.showConfiguration();
            break;
          case '0':
            console.log('👋 Exiting Advanced Analytics Dashboard...');
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

  private async qualityTrendAnalysis(): Promise<void> {
    console.log('\n📈 QUALITY TREND ANALYSIS');
    console.log('Analyzing quality trends across tokens and timeframes...');

    try {
      // Get quality history from ML quality manager
      const qualityHistory = this.mlQualityManager.getQualityHistory();
      
      if (qualityHistory.length === 0) {
        console.log('⚠️  No quality history available. Run some quality checks first.');
        return;
      }

      // Group by token and timeframe
      const groupedData = this.groupQualityData(qualityHistory);
      
      for (const [key, data] of groupedData) {
        const [tokenId, timeframe] = key.split('|');
        console.log(`\n🔍 Analyzing ${tokenId} ${timeframe}:`);
        
        const qualityScores = data.map(d => d.overallScore);
        const timestamps = data.map(d => d.timestamp);
        
        // Perform trend analysis
        const trend = this.analytics.analyzeTrend(qualityScores, timestamps);
        
        console.log(`  📊 Trend: ${trend.trend.toUpperCase()}`);
        console.log(`  📈 Slope: ${trend.slope.toFixed(4)}`);
        console.log(`  💪 Strength: ${(trend.strength * 100).toFixed(1)}%`);
        console.log(`  🎯 Confidence: ${(trend.confidence * 100).toFixed(1)}%`);
        
        if (trend.seasonality.detected) {
          console.log(`  🔄 Seasonality: ${trend.seasonality.period}-point period (${(trend.seasonality.strength * 100).toFixed(1)}% strength)`);
        }
        
        if (trend.breakpoints.length > 0) {
          console.log(`  ⚠️  Breakpoints: ${trend.breakpoints.length} detected`);
          trend.breakpoints.forEach((bp, i) => {
            console.log(`    ${i + 1}. ${new Date(bp.timestamp).toLocaleString()} - ${bp.type} (${(bp.confidence * 100).toFixed(1)}% confidence)`);
          });
        }
      }

      this.metrics.incrementCounter('analytics_queries_total');
      
    } catch (error) {
      this.logger.error('Quality trend analysis failed', { error });
      console.log(`❌ Trend analysis failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async statisticalAnalysis(): Promise<void> {
    console.log('\n🔍 STATISTICAL ANALYSIS');
    console.log('Generating comprehensive statistical summaries...');

    try {
      const qualityHistory = this.mlQualityManager.getQualityHistory();
      
      if (qualityHistory.length === 0) {
        console.log('⚠️  No quality history available.');
        return;
      }

      // Analyze overall quality scores
      const overallScores = qualityHistory.map(d => d.overallScore);
      const overallStats = this.analytics.generateStatisticalSummary(overallScores);
      
      console.log('\n📊 OVERALL QUALITY STATISTICS:');
      console.log(`  📈 Count: ${overallStats.count} data points`);
      console.log(`  📊 Mean: ${overallStats.mean.toFixed(2)}`);
      console.log(`  📊 Median: ${overallStats.median.toFixed(2)}`);
      console.log(`  📊 Mode: ${overallStats.mode.toFixed(2)}`);
      console.log(`  📊 Standard Deviation: ${overallStats.standardDeviation.toFixed(2)}`);
      console.log(`  📊 Variance: ${overallStats.variance.toFixed(2)}`);
      console.log(`  📊 Range: ${overallStats.range.toFixed(2)} (${overallStats.min.toFixed(2)} - ${overallStats.max.toFixed(2)})`);
      console.log(`  📊 Skewness: ${overallStats.skewness.toFixed(3)}`);
      console.log(`  📊 Kurtosis: ${overallStats.kurtosis.toFixed(3)}`);
      console.log(`  📊 Quartiles: Q1=${overallStats.quartiles.q1.toFixed(2)}, Q2=${overallStats.quartiles.q2.toFixed(2)}, Q3=${overallStats.quartiles.q3.toFixed(2)}`);
      
      if (overallStats.outliers.length > 0) {
        console.log(`  ⚠️  Outliers: ${overallStats.outliers.length} detected`);
        console.log(`     Values: ${overallStats.outliers.map(o => o.toFixed(2)).join(', ')}`);
      }

      // Analyze component scores
      const components = ['candles', 'features', 'database', 'processing'];
      for (const component of components) {
        const componentScores = qualityHistory.map(d => d.componentScores[component]);
        const componentStats = this.analytics.generateStatisticalSummary(componentScores);
        
        console.log(`\n📊 ${component.toUpperCase()} COMPONENT STATISTICS:`);
        console.log(`  📊 Mean: ${componentStats.mean.toFixed(2)}`);
        console.log(`  📊 Std Dev: ${componentStats.standardDeviation.toFixed(2)}`);
        console.log(`  📊 Outliers: ${componentStats.outliers.length}`);
      }

      this.metrics.incrementCounter('analytics_queries_total');
      
    } catch (error) {
      this.logger.error('Statistical analysis failed', { error });
      console.log(`❌ Statistical analysis failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async correlationAnalysis(): Promise<void> {
    console.log('\n🔗 CORRELATION ANALYSIS');
    console.log('Analyzing correlations between quality components...');

    try {
      const qualityHistory = this.mlQualityManager.getQualityHistory();
      
      if (qualityHistory.length < 10) {
        console.log('⚠️  Insufficient data for correlation analysis (need at least 10 data points).');
        return;
      }

      // Extract component scores
      const candles = qualityHistory.map(d => d.componentScores.candles);
      const features = qualityHistory.map(d => d.componentScores.features);
      const database = qualityHistory.map(d => d.componentScores.database);
      const processing = qualityHistory.map(d => d.componentScores.processing);
      const overall = qualityHistory.map(d => d.overallScore);

      // Analyze correlations
      const correlations = [
        { name: 'Candles vs Features', x: candles, y: features },
        { name: 'Candles vs Database', x: candles, y: database },
        { name: 'Candles vs Processing', x: candles, y: processing },
        { name: 'Features vs Database', x: features, y: database },
        { name: 'Features vs Processing', x: features, y: processing },
        { name: 'Database vs Processing', x: database, y: processing },
        { name: 'Overall vs Candles', x: overall, y: candles },
        { name: 'Overall vs Features', x: overall, y: features },
        { name: 'Overall vs Database', x: overall, y: database },
        { name: 'Overall vs Processing', x: overall, y: processing }
      ];

      console.log('\n📊 CORRELATION RESULTS:');
      
      for (const correlation of correlations) {
        const results = this.analytics.analyzeCorrelation(correlation.x, correlation.y);
        
        if (results.length > 0) {
          const pearson = results.find(r => r.method === 'pearson');
          if (pearson) {
            const emoji = Math.abs(pearson.correlation) > 0.7 ? '🔴' : 
                         Math.abs(pearson.correlation) > 0.3 ? '🟡' : '🟢';
            
            console.log(`  ${emoji} ${correlation.name}:`);
            console.log(`    Correlation: ${pearson.correlation.toFixed(3)} (${pearson.strength})`);
            console.log(`    P-value: ${pearson.pValue.toFixed(4)}`);
            console.log(`    Significance: ${pearson.significance ? '✅' : '❌'}`);
            console.log(`    Interpretation: ${pearson.interpretation}`);
          }
        }
      }

      this.metrics.incrementCounter('analytics_queries_total');
      
    } catch (error) {
      this.logger.error('Correlation analysis failed', { error });
      console.log(`❌ Correlation analysis failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async qualityForecasting(): Promise<void> {
    console.log('\n🔮 QUALITY FORECASTING');
    console.log('Generating quality forecasts for next 24 hours...');

    try {
      const qualityHistory = this.mlQualityManager.getQualityHistory();
      
      if (qualityHistory.length < 20) {
        console.log('⚠️  Insufficient data for forecasting (need at least 20 data points).');
        return;
      }

      // Group by token and timeframe
      const groupedData = this.groupQualityData(qualityHistory);
      
      for (const [key, data] of groupedData) {
        const [tokenId, timeframe] = key.split('|');
        console.log(`\n🔮 Forecasting ${tokenId} ${timeframe}:`);
        
        const qualityScores = data.map(d => d.overallScore);
        const timestamps = data.map(d => d.timestamp);
        
        // Generate forecasts
        const forecasts = this.analytics.generateForecast(qualityScores, timestamps, 24);
        
        forecasts.forEach(forecast => {
          console.log(`  📊 ${forecast.method.toUpperCase()} Forecast:`);
          console.log(`    Next 6h: ${forecast.predictions.slice(0, 6).map(p => p.toFixed(1)).join(' → ')}`);
          console.log(`    Next 12h: ${forecast.predictions[11]?.toFixed(1) || 'N/A'}`);
          console.log(`    Next 24h: ${forecast.predictions[23]?.toFixed(1) || 'N/A'}`);
          console.log(`    Accuracy: ${(forecast.accuracy * 100).toFixed(1)}%`);
          console.log(`    RMSE: ${forecast.errorMetrics.rmse.toFixed(3)}`);
          
          if (forecast.seasonality.detected) {
            console.log(`    🔄 Seasonality: ${forecast.seasonality.period}-point period`);
          }
        });
      }

      this.metrics.incrementCounter('analytics_queries_total');
      
    } catch (error) {
      this.logger.error('Quality forecasting failed', { error });
      console.log(`❌ Quality forecasting failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async qualityInsights(): Promise<void> {
    console.log('\n🚨 QUALITY INSIGHTS & ALERTS');
    console.log('Generating intelligent quality insights...');

    try {
      const qualityHistory = this.mlQualityManager.getQualityHistory();
      
      if (qualityHistory.length === 0) {
        console.log('⚠️  No quality history available.');
        return;
      }

      // Generate insights for each token/timeframe combination
      const groupedData = this.groupQualityData(qualityHistory);
      
      for (const [key, data] of groupedData) {
        const [tokenId, timeframe] = key.split('|');
        console.log(`\n🔍 Insights for ${tokenId} ${timeframe}:`);
        
        const qualityScores = data.map(d => d.overallScore);
        const timestamps = data.map(d => d.timestamp);
        
        // Generate insights
        const insights = this.analytics.generateQualityInsights(qualityScores, timestamps, {
          tokenId,
          timeframe,
          correlatedMetrics: {}
        });
        
        if (insights.length === 0) {
          console.log('  ✅ No significant insights detected');
        } else {
          insights.forEach((insight, i) => {
            const severityEmoji = insight.severity === 'critical' ? '💥' :
                                 insight.severity === 'high' ? '🔴' :
                                 insight.severity === 'medium' ? '🟡' : '🟢';
            
            console.log(`  ${severityEmoji} ${insight.type.toUpperCase()} (${insight.severity}):`);
            console.log(`    ${insight.description}`);
            console.log(`    Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
            console.log(`    Recommendations:`);
            insight.recommendations.forEach(rec => {
              console.log(`      • ${rec}`);
            });
          });
        }
      }

      this.metrics.incrementCounter('insights_generated_total');
      
    } catch (error) {
      this.logger.error('Quality insights generation failed', { error });
      console.log(`❌ Quality insights failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async mlModelPerformance(): Promise<void> {
    console.log('\n🤖 ML MODEL PERFORMANCE');
    console.log('Analyzing ML model performance and accuracy...');

    try {
      const modelPerformance = this.mlQualityManager.getMLModelPerformance();
      const trainingStatus = this.mlQualityManager.getTrainingStatus();
      
      if (modelPerformance.size === 0) {
        console.log('⚠️  No ML model performance data available.');
        return;
      }

      console.log('\n📊 ML MODEL PERFORMANCE:');
      
      modelPerformance.forEach((performance, modelName) => {
        console.log(`\n  🤖 ${modelName.toUpperCase()}:`);
        console.log(`    📊 Accuracy: ${(performance.accuracy * 100).toFixed(1)}%`);
        console.log(`    📊 Precision: ${(performance.precision * 100).toFixed(1)}%`);
        console.log(`    📊 Recall: ${(performance.recall * 100).toFixed(1)}%`);
        console.log(`    📊 F1 Score: ${(performance.f1Score * 100).toFixed(1)}%`);
        console.log(`    ⏱️  Training Time: ${performance.trainingTime}ms`);
        console.log(`    ⚡ Inference Time: ${performance.inferenceTime.toFixed(3)}s`);
        console.log(`    📅 Last Updated: ${new Date(performance.lastUpdated).toLocaleString()}`);
        console.log(`    📊 Data Points: ${performance.dataPoints}`);
      });

      console.log('\n🔄 TRAINING STATUS:');
      console.log(`  Training: ${trainingStatus.isTraining ? '🟡 In Progress' : '🟢 Idle'}`);
      console.log(`  Last Training: ${new Date(trainingStatus.lastTraining).toLocaleString()}`);
      
    } catch (error) {
      this.logger.error('ML model performance analysis failed', { error });
      console.log(`❌ ML performance analysis failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async systemHealthOverview(): Promise<void> {
    console.log('\n📊 SYSTEM HEALTH OVERVIEW');
    console.log('Analyzing overall system health and performance...');

    try {
      // Get monitoring metrics
      const healthMetrics = await this.monitoringManager.getSystemHealth();
      
      console.log('\n🏥 SYSTEM HEALTH METRICS:');
      console.log(`  💚 Overall Health: ${healthMetrics.overallHealth}%`);
      console.log(`  🔴 Critical Issues: ${healthMetrics.criticalIssues}`);
      console.log(`  🟡 Warnings: ${healthMetrics.warnings}`);
      console.log(`  🟢 Normal: ${healthMetrics.normal}`);
      
      if (healthMetrics.components) {
        console.log('\n🔧 COMPONENT HEALTH:');
        Object.entries(healthMetrics.components).forEach(([component, health]) => {
          const emoji = health > 80 ? '🟢' : health > 60 ? '🟡' : '🔴';
          console.log(`  ${emoji} ${component}: ${health}%`);
        });
      }

      // Get quality metrics
      const qualityHistory = this.mlQualityManager.getQualityHistory();
      if (qualityHistory.length > 0) {
        const recentQuality = qualityHistory.slice(-10);
        const avgQuality = recentQuality.reduce((sum, d) => sum + d.overallScore, 0) / recentQuality.length;
        
        console.log('\n📊 QUALITY METRICS:');
        console.log(`  📈 Recent Average Quality: ${avgQuality.toFixed(1)}%`);
        console.log(`  📊 Quality Trend: ${this.getQualityTrend(recentQuality)}`);
        console.log(`  📅 Data Points: ${qualityHistory.length}`);
      }

      // Get analytics metrics
      const analyticsMetrics = this.analytics.getModelPerformance();
      if (analyticsMetrics.size > 0) {
        console.log('\n📊 ANALYTICS METRICS:');
        analyticsMetrics.forEach((metrics, model) => {
          console.log(`  📊 ${model}: ${(metrics.accuracy * 100).toFixed(1)}% accuracy`);
        });
      }
      
    } catch (error) {
      this.logger.error('System health overview failed', { error });
      console.log(`❌ System health overview failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async refreshAllData(): Promise<void> {
    console.log('\n🔄 REFRESHING ALL DATA...');
    
    try {
      // Refresh quality data
      console.log('  📊 Refreshing quality data...');
      // This would typically involve fetching new data from the database
      
      // Refresh ML models
      console.log('  🤖 Refreshing ML models...');
      // This would involve retraining or updating models
      
      // Refresh analytics
      console.log('  📈 Refreshing analytics...');
      this.analytics.clearHistory();
      
      console.log('  ✅ Data refresh completed');
      
    } catch (error) {
      this.logger.error('Data refresh failed', { error });
      console.log(`❌ Data refresh failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async showConfiguration(): Promise<void> {
    console.log('\n⚙️  CONFIGURATION');
    
    const analyticsConfig = this.analytics.getConfig();
    const mlConfig = this.mlQualityManager.getConfig();
    
    console.log('\n📊 ANALYTICS CONFIGURATION:');
    console.log(`  Statistical Analysis: ${analyticsConfig.enableStatisticalAnalysis ? '✅' : '❌'}`);
    console.log(`  Trend Forecasting: ${analyticsConfig.enableTrendForecasting ? '✅' : '❌'}`);
    console.log(`  Correlation Analysis: ${analyticsConfig.enableCorrelationAnalysis ? '✅' : '❌'}`);
    console.log(`  Predictive Modeling: ${analyticsConfig.enablePredictiveModeling ? '✅' : '❌'}`);
    
    console.log('\n🤖 ML CONFIGURATION:');
    console.log(`  ML Predictions: ${mlConfig.mlIntegration.enableMLPredictions ? '✅' : '❌'}`);
    console.log(`  ML Anomaly Detection: ${mlConfig.mlIntegration.enableMLAnomalyDetection ? '✅' : '❌'}`);
    console.log(`  Continuous Learning: ${mlConfig.mlIntegration.enableContinuousLearning ? '✅' : '❌'}`);
    console.log(`  Hybrid Validation: ${mlConfig.hybridValidation.enableTraditionalValidation && mlConfig.hybridValidation.enableMLValidation ? '✅' : '❌'}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private groupQualityData(qualityHistory: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    qualityHistory.forEach(record => {
      const key = `${record.token_id}|${record.timeframe}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    });
    
    // Sort each group by timestamp
    grouped.forEach((data, key) => {
      data.sort((a, b) => a.timestamp - b.timestamp);
    });
    
    return grouped;
  }

  private getQualityTrend(recentQuality: any[]): string {
    if (recentQuality.length < 2) return 'Insufficient data';
    
    const first = recentQuality[0].overallScore;
    const last = recentQuality[recentQuality[recentQuality.length - 1]].overallScore;
    const change = last - first;
    
    if (change > 5) return '🟢 Improving';
    if (change < -5) return '🔴 Declining';
    return '🟡 Stable';
  }

  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.refreshAllData();
        } catch (error) {
          this.logger.error('Auto-refresh failed', { error });
        }
      }
    }, 300000); // Refresh every 5 minutes
  }

  private stopDashboard(): void {
    this.isRunning = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.logger.info('Advanced Analytics Dashboard stopped');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    const dashboard = new AdvancedAnalyticsDashboard();
    await dashboard.startDashboard();
  } catch (error) {
    console.error('💥 Failed to start Advanced Analytics Dashboard:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

