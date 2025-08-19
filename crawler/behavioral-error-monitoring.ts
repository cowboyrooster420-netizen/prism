/**
 * Behavioral Analysis Error Monitoring Dashboard
 * Real-time monitoring of error handling, circuit breakers, and system health
 */

import { HeliusBehavioralAnalyzer } from './services/helius-behavioral-analysis';
import { getBehavioralAnalysisQuality } from './services/supabase';

interface SystemHealthMetrics {
  timestamp: string;
  circuitBreakerStatus: { [key: string]: any };
  recentAnalysisQuality: any[];
  healthScore: number;
  recommendations: string[];
}

export class BehavioralErrorMonitoringDashboard {
  private analyzer: HeliusBehavioralAnalyzer;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.analyzer = new HeliusBehavioralAnalyzer();
  }

  /**
   * Get comprehensive system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const timestamp = new Date().toISOString();
    
    // Get circuit breaker status
    const systemStatus = this.analyzer.getSystemStatus();
    const circuitBreakerStatus = systemStatus.circuitBreakers;
    
    // Get recent analysis quality (requires database)
    let recentAnalysisQuality: any[] = [];
    try {
      recentAnalysisQuality = await getBehavioralAnalysisQuality();
    } catch (error) {
      console.warn('⚠️ Could not fetch analysis quality data:', error.message);
    }
    
    // Calculate health score
    const healthScore = this.calculateHealthScore(circuitBreakerStatus, recentAnalysisQuality);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(circuitBreakerStatus, recentAnalysisQuality, healthScore);
    
    return {
      timestamp,
      circuitBreakerStatus,
      recentAnalysisQuality,
      healthScore,
      recommendations
    };
  }

  /**
   * Calculate overall system health score (0-100)
   */
  private calculateHealthScore(circuitBreakers: { [key: string]: any }, analysisQuality: any[]): number {
    let score = 100;
    
    // Deduct points for open circuit breakers
    const openCircuitBreakers = Object.values(circuitBreakers).filter((cb: any) => cb.isOpen);
    score -= openCircuitBreakers.length * 20; // -20 points per open circuit breaker
    
    // Deduct points for high failure counts
    Object.values(circuitBreakers).forEach((cb: any) => {
      if (cb.failureCount > 3) {
        score -= (cb.failureCount - 3) * 5; // -5 points per failure above 3
      }
    });
    
    // Boost score for recent high-quality analyses
    if (analysisQuality.length > 0) {
      const avgConfidence = analysisQuality.reduce((sum, analysis) => 
        sum + (analysis.data_confidence || 0), 0) / analysisQuality.length;
      
      const realDataPercentage = analysisQuality.reduce((sum, analysis) => 
        sum + (analysis.real_data_percentage || 0), 0) / analysisQuality.length;
      
      // Boost for high confidence and real data
      if (avgConfidence > 0.6) score += 10;
      if (realDataPercentage > 50) score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate actionable recommendations based on system status
   */
  private generateRecommendations(
    circuitBreakers: { [key: string]: any }, 
    analysisQuality: any[],
    healthScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for open circuit breakers
    const openCircuitBreakers = Object.entries(circuitBreakers).filter(([_, cb]: [string, any]) => cb.isOpen);
    if (openCircuitBreakers.length > 0) {
      recommendations.push(`🚨 ${openCircuitBreakers.length} circuit breaker(s) open - investigate API connectivity issues`);
      openCircuitBreakers.forEach(([key, cb]) => {
        recommendations.push(`   - ${key}: Last failure at ${new Date(cb.lastFailure).toLocaleString()}`);
      });
    }
    
    // Check for high failure rates
    const highFailureCircuitBreakers = Object.entries(circuitBreakers).filter(([_, cb]: [string, any]) => cb.failureCount > 2);
    if (highFailureCircuitBreakers.length > 0) {
      recommendations.push(`⚠️ High failure rate detected on ${highFailureCircuitBreakers.length} endpoint(s) - monitor closely`);
    }
    
    // Check analysis quality
    if (analysisQuality.length > 0) {
      const lowConfidenceCount = analysisQuality.filter(analysis => (analysis.data_confidence || 0) < 0.4).length;
      const lowRealDataCount = analysisQuality.filter(analysis => (analysis.real_data_percentage || 0) < 30).length;
      
      if (lowConfidenceCount > analysisQuality.length * 0.5) {
        recommendations.push(`📉 ${lowConfidenceCount}/${analysisQuality.length} recent analyses have low confidence - check Helius API health`);
      }
      
      if (lowRealDataCount > analysisQuality.length * 0.7) {
        recommendations.push(`📊 ${lowRealDataCount}/${analysisQuality.length} recent analyses using mathematical fallback - verify API connectivity`);
      }
    }
    
    // Overall health recommendations
    if (healthScore < 50) {
      recommendations.push(`🚨 System health critical (${healthScore}/100) - immediate attention required`);
    } else if (healthScore < 80) {
      recommendations.push(`⚠️ System health degraded (${healthScore}/100) - monitor and investigate issues`);
    } else {
      recommendations.push(`✅ System health good (${healthScore}/100) - continue normal operations`);
    }
    
    return recommendations;
  }

  /**
   * Print comprehensive system status to console
   */
  async printSystemStatus(): Promise<void> {
    console.log('\n🔍 BEHAVIORAL ANALYSIS ERROR MONITORING DASHBOARD');
    console.log('='.repeat(60));
    
    const metrics = await this.getSystemHealthMetrics();
    
    // System Health Overview
    console.log(`\n📊 SYSTEM HEALTH: ${metrics.healthScore}/100`);
    const healthEmoji = metrics.healthScore >= 80 ? '🟢' : metrics.healthScore >= 50 ? '🟡' : '🔴';
    console.log(`${healthEmoji} Status: ${metrics.healthScore >= 80 ? 'HEALTHY' : metrics.healthScore >= 50 ? 'DEGRADED' : 'CRITICAL'}`);
    console.log(`⏰ Timestamp: ${metrics.timestamp}`);
    
    // Circuit Breaker Status
    console.log('\n🔌 CIRCUIT BREAKER STATUS:');
    if (Object.keys(metrics.circuitBreakerStatus).length === 0) {
      console.log('   No circuit breakers active (system just started)');
    } else {
      Object.entries(metrics.circuitBreakerStatus).forEach(([key, state]: [string, any]) => {
        const statusEmoji = state.isOpen ? '🔴' : '🟢';
        const statusText = state.isOpen ? 'OPEN' : 'CLOSED';
        const nextAttempt = state.nextAttempt ? ` (retry at ${new Date(state.nextAttempt).toLocaleTimeString()})` : '';
        console.log(`   ${statusEmoji} ${key}: ${statusText} - ${state.failureCount} failures${nextAttempt}`);
      });
    }
    
    // Recent Analysis Quality
    console.log('\n📈 RECENT ANALYSIS QUALITY:');
    if (metrics.recentAnalysisQuality.length === 0) {
      console.log('   No recent analysis data available (database not connected or empty)');
    } else {
      const recentAnalyses = metrics.recentAnalysisQuality.slice(0, 5);
      recentAnalyses.forEach((analysis, index) => {
        const confidenceEmoji = (analysis.data_confidence || 0) >= 0.6 ? '🟢' : (analysis.data_confidence || 0) >= 0.4 ? '🟡' : '🔴';
        const sourceEmoji = analysis.analysis_source === 'real_only' || analysis.analysis_source === 'real_primary' ? '🎯' : 
                           analysis.analysis_source === 'hybrid' ? '⚖️' : '🔢';
        console.log(`   ${index + 1}. ${confidenceEmoji} ${sourceEmoji} ${analysis.token_address?.slice(0, 8) || 'unknown'}: ${((analysis.data_confidence || 0) * 100).toFixed(1)}% confidence, ${(analysis.real_data_percentage || 0).toFixed(1)}% real data`);
      });
      
      // Summary stats
      const avgConfidence = metrics.recentAnalysisQuality.reduce((sum, a) => sum + (a.data_confidence || 0), 0) / metrics.recentAnalysisQuality.length;
      const avgRealData = metrics.recentAnalysisQuality.reduce((sum, a) => sum + (a.real_data_percentage || 0), 0) / metrics.recentAnalysisQuality.length;
      console.log(`   📊 Average: ${(avgConfidence * 100).toFixed(1)}% confidence, ${avgRealData.toFixed(1)}% real data (${metrics.recentAnalysisQuality.length} analyses)`);
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    metrics.recommendations.forEach(rec => console.log(`   ${rec}`));
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Start continuous monitoring (prints status every interval)
   */
  startMonitoring(intervalMinutes: number = 5): void {
    console.log(`🔄 Starting behavioral analysis monitoring (every ${intervalMinutes} minutes)...`);
    
    // Initial status
    this.printSystemStatus();
    
    // Set up interval
    this.monitoringInterval = setInterval(async () => {
      await this.printSystemStatus();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Monitoring stopped');
    }
  }
}

// CLI usage
if (require.main === module) {
  const dashboard = new BehavioralErrorMonitoringDashboard();
  
  // Print current status
  dashboard.printSystemStatus().then(() => {
    console.log('\n🔄 Use dashboard.startMonitoring(intervalMinutes) for continuous monitoring');
  });
}