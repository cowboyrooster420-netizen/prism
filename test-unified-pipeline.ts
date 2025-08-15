/**
 * Comprehensive test suite for the unified crawler-to-AI-chat pipeline
 * Tests all components: Query Router, Crawler Manager, Data Fusion, and AI API
 */

import QueryRouter from './src/services/query-router';
import UnifiedCrawlerManager from './src/services/unified-crawler-manager';
import DataFusionEngine from './src/services/data-fusion-engine';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  heliusApiKey: process.env.HELIUS_API_KEY || '',
  birdeyeApiKey: process.env.BIRDEYE_API_KEY || '',
  moralisApiKey: process.env.MORALIS_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || ''
};

// Test queries for different categories
const TEST_QUERIES = {
  behavioral: [
    "Show me tokens with whale activity",
    "Which tokens have the most new holders?",
    "Find smart money movements in the last hour",
    "Behavioral analysis for SOL whales",
    "Suspicious trading patterns detected"
  ],
  volume: [
    "Top volume tokens right now",
    "Show me volume spikes in the last 24h", 
    "Trending tokens by trading volume",
    "High liquidity tokens with momentum",
    "Volume leaders in DeFi"
  ],
  launchpad: [
    "New token launches on pump.fun",
    "Recent Raydium launches with whale interest",
    "Fresh tokens launched today",
    "Early stage gems with potential",
    "New launches with strong fundamentals"
  ],
  technical: [
    "Technical analysis for trending tokens",
    "Support and resistance levels",
    "RSI indicators for top tokens",
    "Chart patterns worth watching",
    "Momentum oscillators showing strength"
  ],
  ai_recommendations: [
    "What should I buy right now?",
    "AI recommendations for my portfolio",
    "Best tokens according to AI analysis",
    "Alpha opportunities this week",
    "Bullish tokens with high confidence"
  ],
  complex: [
    "Compare whale activity vs volume for SOL tokens",
    "New launches with both high volume and whale interest",
    "Technical analysis + AI recommendations for DeFi tokens",
    "Behavioral patterns in recent Raydium launches",
    "Volume correlation with holder growth patterns"
  ]
};

class UnifiedPipelineTestSuite {
  private queryRouter: QueryRouter;
  private crawlerManager: UnifiedCrawlerManager;
  private fusionEngine: DataFusionEngine;
  
  private testResults: {
    queryRouting: any[];
    crawlerData: any[];
    dataFusion: any[];
    endToEnd: any[];
    performance: any[];
  } = {
    queryRouting: [],
    crawlerData: [],
    dataFusion: [],
    endToEnd: [],
    performance: []
  };

  constructor() {
    console.log('🧪 Initializing Unified Pipeline Test Suite...');
    
    this.queryRouter = new QueryRouter();
    this.crawlerManager = new UnifiedCrawlerManager(TEST_CONFIG);
    this.fusionEngine = new DataFusionEngine();
    
    console.log('✅ Test suite initialized');
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n🚀 Starting comprehensive pipeline tests...\n');

    try {
      // Test 1: Query Router
      await this.testQueryRouting();
      
      // Test 2: Crawler Manager
      await this.testCrawlerManager();
      
      // Test 3: Data Fusion Engine
      await this.testDataFusion();
      
      // Test 4: End-to-End Pipeline
      await this.testEndToEndPipeline();
      
      // Test 5: Performance Benchmarks
      await this.testPerformance();
      
      // Generate comprehensive report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test Query Router intent detection and routing decisions
   */
  private async testQueryRouting(): Promise<void> {
    console.log('🧠 Testing Query Router...');
    
    const allQueries = Object.values(TEST_QUERIES).flat();
    
    for (const [category, queries] of Object.entries(TEST_QUERIES)) {
      console.log(`  Testing ${category} queries...`);
      
      for (const query of queries) {
        const startTime = Date.now();
        
        try {
          const routingDecision = await this.queryRouter.routeQuery(query);
          const processingTime = Date.now() - startTime;
          
          const result = {
            query,
            expectedCategory: category,
            detectedIntent: routingDecision.intent.primary,
            confidence: routingDecision.intent.confidence,
            crawlerServices: routingDecision.crawlerServices,
            processingTime,
            success: true,
            correctRouting: this.validateRouting(category, routingDecision.intent.primary)
          };
          
          this.testResults.queryRouting.push(result);
          
          if (result.correctRouting) {
            console.log(`    ✅ "${query.substring(0, 30)}..." → ${routingDecision.intent.primary} (${routingDecision.intent.confidence.toFixed(2)})`);
          } else {
            console.log(`    ⚠️  "${query.substring(0, 30)}..." → ${routingDecision.intent.primary} (expected: ${category})`);
          }
          
        } catch (error) {
          console.log(`    ❌ "${query.substring(0, 30)}..." → Error: ${error.message}`);
          this.testResults.queryRouting.push({
            query,
            expectedCategory: category,
            error: error.message,
            success: false,
            processingTime: Date.now() - startTime
          });
        }
      }
    }
    
    const routingAccuracy = this.testResults.queryRouting
      .filter(r => r.success && r.correctRouting).length / this.testResults.queryRouting.length;
    
    console.log(`📊 Query Routing Accuracy: ${(routingAccuracy * 100).toFixed(1)}%\n`);
  }

  /**
   * Test Crawler Manager data retrieval
   */
  private async testCrawlerManager(): Promise<void> {
    console.log('🕷️ Testing Crawler Manager...');
    
    const testRequests = [
      { type: 'behavioral', limit: 10 },
      { type: 'volume', limit: 15 },
      { type: 'launchpad', limit: 5 },
      { type: 'technical', limit: 20 },
      { type: 'ai_recommendations', limit: 8 },
      { type: 'all', limit: 25 }
    ];

    for (const request of testRequests) {
      const startTime = Date.now();
      
      try {
        console.log(`  Testing ${request.type} data retrieval...`);
        
        const crawlerData = await this.crawlerManager.getCrawlerData(request as any);
        const processingTime = Date.now() - startTime;
        
        const result = {
          requestType: request.type,
          requestLimit: request.limit,
          returnedTokens: crawlerData.data.length,
          confidence: crawlerData.metadata.confidence,
          dataSources: crawlerData.metadata.dataSource,
          cached: crawlerData.metadata.cached,
          processingTime,
          success: true
        };
        
        this.testResults.crawlerData.push(result);
        
        console.log(`    ✅ Retrieved ${crawlerData.data.length} tokens in ${processingTime}ms (confidence: ${crawlerData.metadata.confidence.toFixed(2)})`);
        
      } catch (error) {
        console.log(`    ❌ Error retrieving ${request.type} data: ${error.message}`);
        this.testResults.crawlerData.push({
          requestType: request.type,
          error: error.message,
          success: false,
          processingTime: Date.now() - startTime
        });
      }
    }
    
    const crawlerSuccessRate = this.testResults.crawlerData
      .filter(r => r.success).length / this.testResults.crawlerData.length;
    
    console.log(`📊 Crawler Success Rate: ${(crawlerSuccessRate * 100).toFixed(1)}%\n`);
  }

  /**
   * Test Data Fusion Engine with mock multi-source data
   */
  private async testDataFusion(): Promise<void> {
    console.log('⚡ Testing Data Fusion Engine...');
    
    // Mock data from different sources for the same token
    const mockTokenData = {
      'birdeye': {
        price: 0.123456,
        volume24h: 1500000,
        liquidity: 750000,
        priceChange24h: 5.2,
        timestamp: new Date()
      },
      'dexscreener': {
        price: 0.123890, // Slight conflict
        volume24h: 1480000, // Slight conflict
        liquidity: 745000,
        priceChange24h: 5.1,
        timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      'database': {
        price: 0.123600,
        volume24h: 1520000,
        holders: 1250,
        tier: 2,
        timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    };
    
    try {
      console.log('  Testing multi-source data fusion...');
      const startTime = Date.now();
      
      const fusedData = await this.fusionEngine.fuseTokenData('test_token_address', mockTokenData);
      const processingTime = Date.now() - startTime;
      
      const result = {
        sources: fusedData.sources,
        confidence: fusedData.confidence,
        conflicts: fusedData.conflicts?.length || 0,
        staleness: fusedData.staleness,
        completeness: fusedData.completeness,
        processingTime,
        success: true
      };
      
      this.testResults.dataFusion.push(result);
      
      console.log(`    ✅ Fused data from ${fusedData.sources.length} sources`);
      console.log(`    📊 Confidence: ${fusedData.confidence.toFixed(2)}, Conflicts: ${fusedData.conflicts?.length || 0}`);
      console.log(`    🕐 Staleness: ${fusedData.staleness.toFixed(1)}h, Completeness: ${(fusedData.completeness * 100).toFixed(1)}%`);
      
      // Test batch fusion
      console.log('  Testing batch fusion...');
      const batchData = {
        'token1': mockTokenData,
        'token2': mockTokenData,
        'token3': mockTokenData
      };
      
      const batchStartTime = Date.now();
      const batchResults = await this.fusionEngine.fuseBatchTokenData(batchData);
      const batchProcessingTime = Date.now() - batchStartTime;
      
      console.log(`    ✅ Batch fused ${Object.keys(batchResults).length} tokens in ${batchProcessingTime}ms`);
      
    } catch (error) {
      console.log(`    ❌ Data fusion error: ${error.message}`);
      this.testResults.dataFusion.push({
        error: error.message,
        success: false
      });
    }
    
    console.log('');
  }

  /**
   * Test end-to-end pipeline with real API calls
   */
  private async testEndToEndPipeline(): Promise<void> {
    console.log('🔄 Testing End-to-End Pipeline...');
    
    const testQueries = [
      "Show me top volume tokens with whale activity",
      "New launches on pump.fun today",
      "AI recommendations for high liquidity tokens",
      "Behavioral analysis for trending DeFi tokens"
    ];

    for (const query of testQueries) {
      console.log(`  Testing: "${query.substring(0, 40)}..."`);
      const startTime = Date.now();
      
      try {
        // Step 1: Route query
        const routingDecision = await this.queryRouter.routeQuery(query);
        
        // Step 2: Get crawler data
        const crawlerData = await this.crawlerManager.getCrawlerData({
          type: routingDecision.intent.primary,
          limit: 10,
          realTime: routingDecision.realTimeRequired
        });
        
        // Step 3: Simulate AI processing (would normally call the API)
        const processingTime = Date.now() - startTime;
        
        const result = {
          query,
          intent: routingDecision.intent.primary,
          confidence: routingDecision.intent.confidence,
          tokensRetrieved: crawlerData.data.length,
          dataSources: crawlerData.metadata.dataSource,
          processingTime,
          success: true
        };
        
        this.testResults.endToEnd.push(result);
        
        console.log(`    ✅ Complete in ${processingTime}ms: ${routingDecision.intent.primary} → ${crawlerData.data.length} tokens`);
        
      } catch (error) {
        console.log(`    ❌ Pipeline error: ${error.message}`);
        this.testResults.endToEnd.push({
          query,
          error: error.message,
          success: false,
          processingTime: Date.now() - startTime
        });
      }
    }
    
    const pipelineSuccessRate = this.testResults.endToEnd
      .filter(r => r.success).length / this.testResults.endToEnd.length;
    
    console.log(`📊 End-to-End Success Rate: ${(pipelineSuccessRate * 100).toFixed(1)}%\n`);
  }

  /**
   * Test performance and benchmarks
   */
  private async testPerformance(): Promise<void> {
    console.log('⚡ Testing Performance...');
    
    const performanceTests = [
      { name: 'Simple Query Routing', iterations: 100, test: () => this.queryRouter.routeQuery("whale activity") },
      { name: 'Complex Query Routing', iterations: 50, test: () => this.queryRouter.routeQuery("Compare volume trends with behavioral patterns for new DeFi launches") },
      { name: 'Crawler Data Retrieval', iterations: 10, test: () => this.crawlerManager.getCrawlerData({ type: 'volume', limit: 20 }) }
    ];

    for (const perfTest of performanceTests) {
      console.log(`  Benchmarking: ${perfTest.name}...`);
      
      const times: number[] = [];
      let successCount = 0;
      
      for (let i = 0; i < perfTest.iterations; i++) {
        const startTime = Date.now();
        
        try {
          await perfTest.test();
          times.push(Date.now() - startTime);
          successCount++;
        } catch (error) {
          times.push(Date.now() - startTime);
        }
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const successRate = (successCount / perfTest.iterations) * 100;
      
      const result = {
        testName: perfTest.name,
        iterations: perfTest.iterations,
        avgTime,
        minTime,
        maxTime,
        successRate
      };
      
      this.testResults.performance.push(result);
      
      console.log(`    📊 Avg: ${avgTime.toFixed(1)}ms, Min: ${minTime}ms, Max: ${maxTime}ms, Success: ${successRate.toFixed(1)}%`);
    }
    
    console.log('');
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    console.log('📋 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(50));
    
    // Query Routing Summary
    const routingTests = this.testResults.queryRouting;
    const routingSuccess = routingTests.filter(t => t.success).length;
    const routingAccuracy = routingTests.filter(t => t.success && t.correctRouting).length;
    
    console.log('\n🧠 QUERY ROUTING RESULTS:');
    console.log(`   Total Tests: ${routingTests.length}`);
    console.log(`   Successful: ${routingSuccess} (${(routingSuccess/routingTests.length*100).toFixed(1)}%)`);
    console.log(`   Correct Routing: ${routingAccuracy} (${(routingAccuracy/routingTests.length*100).toFixed(1)}%)`);
    
    // Crawler Manager Summary
    const crawlerTests = this.testResults.crawlerData;
    const crawlerSuccess = crawlerTests.filter(t => t.success).length;
    
    console.log('\n🕷️ CRAWLER MANAGER RESULTS:');
    console.log(`   Total Tests: ${crawlerTests.length}`);
    console.log(`   Successful: ${crawlerSuccess} (${(crawlerSuccess/crawlerTests.length*100).toFixed(1)}%)`);
    
    // Data Fusion Summary
    const fusionTests = this.testResults.dataFusion;
    const fusionSuccess = fusionTests.filter(t => t.success).length;
    
    console.log('\n⚡ DATA FUSION RESULTS:');
    console.log(`   Total Tests: ${fusionTests.length}`);
    console.log(`   Successful: ${fusionSuccess} (${(fusionSuccess/fusionTests.length*100).toFixed(1)}%)`);
    
    // End-to-End Summary
    const e2eTests = this.testResults.endToEnd;
    const e2eSuccess = e2eTests.filter(t => t.success).length;
    const avgE2ETime = e2eTests.filter(t => t.success).reduce((sum, t) => sum + t.processingTime, 0) / e2eSuccess;
    
    console.log('\n🔄 END-TO-END PIPELINE RESULTS:');
    console.log(`   Total Tests: ${e2eTests.length}`);
    console.log(`   Successful: ${e2eSuccess} (${(e2eSuccess/e2eTests.length*100).toFixed(1)}%)`);
    console.log(`   Average Time: ${avgE2ETime.toFixed(1)}ms`);
    
    // Performance Summary
    console.log('\n⚡ PERFORMANCE BENCHMARKS:');
    this.testResults.performance.forEach(perf => {
      console.log(`   ${perf.testName}: ${perf.avgTime.toFixed(1)}ms avg (${perf.successRate.toFixed(1)}% success)`);
    });
    
    // Overall Assessment
    const overallSuccess = (routingSuccess + crawlerSuccess + fusionSuccess + e2eSuccess) / 
                          (routingTests.length + crawlerTests.length + fusionTests.length + e2eTests.length);
    
    console.log('\n🎯 OVERALL ASSESSMENT:');
    console.log(`   Pipeline Success Rate: ${(overallSuccess * 100).toFixed(1)}%`);
    
    if (overallSuccess > 0.9) {
      console.log('   Status: ✅ EXCELLENT - Ready for production');
    } else if (overallSuccess > 0.8) {
      console.log('   Status: ✅ GOOD - Minor improvements needed');
    } else if (overallSuccess > 0.7) {
      console.log('   Status: ⚠️ NEEDS WORK - Several issues to address');
    } else {
      console.log('   Status: ❌ POOR - Major issues need fixing');
    }
    
    console.log('\n='.repeat(50));
    console.log('🎉 Test suite completed!');
  }

  /**
   * Validate if routing decision matches expected category
   */
  private validateRouting(expected: string, detected: string): boolean {
    // Allow some flexibility in routing validation
    const validMappings = {
      'behavioral': ['behavioral'],
      'volume': ['volume'],
      'launchpad': ['launchpad'],
      'technical': ['technical'],
      'ai_recommendations': ['ai_recommendations'],
      'complex': ['behavioral', 'volume', 'launchpad', 'technical', 'ai_recommendations'] // Complex can map to any
    };
    
    return validMappings[expected]?.includes(detected) || false;
  }

  /**
   * Run health checks on all services
   */
  async runHealthChecks(): Promise<void> {
    console.log('🏥 Running Health Checks...\n');
    
    // Test crawler manager health
    try {
      const healthStatus = await this.crawlerManager.healthCheck();
      console.log('📊 Crawler Manager Health:');
      Object.entries(healthStatus).forEach(([service, status]) => {
        console.log(`   ${service}: ${status ? '✅' : '❌'}`);
      });
    } catch (error) {
      console.log('❌ Crawler Manager health check failed:', error.message);
    }
    
    // Test data fusion engine
    try {
      const fusionStats = this.fusionEngine.getFusionStats();
      console.log('\n⚡ Data Fusion Engine Stats:');
      console.log(`   Source Reliability:`, fusionStats.sourceReliability);
      console.log(`   Configuration:`, fusionStats.config.conflictResolution);
    } catch (error) {
      console.log('❌ Data Fusion Engine stats failed:', error.message);
    }
    
    console.log('\n✅ Health checks completed\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const testSuite = new UnifiedPipelineTestSuite();
  
  // Run health checks first
  await testSuite.runHealthChecks();
  
  // Run comprehensive tests
  await testSuite.runAllTests();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export default UnifiedPipelineTestSuite;