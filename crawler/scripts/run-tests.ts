#!/usr/bin/env tsx

/**
 * Test Runner Script for TA Worker
 * 
 * Usage:
 *   npx tsx scripts/run-tests.ts                    # Run all tests
 *   npx tsx scripts/run-tests.ts --unit             # Run unit tests only
 *   npx tsx scripts/run-tests.ts --integration      # Run integration tests only
 *   npx tsx scripts/run-tests.ts --performance      # Run performance tests only
 *   npx tsx scripts/run-tests.ts --coverage         # Run with coverage report
 *   npx tsx scripts/run-tests.ts --watch            # Run in watch mode
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestOptions {
  unit: boolean;
  integration: boolean;
  performance: boolean;
  coverage: boolean;
  watch: boolean;
  verbose: boolean;
}

function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  
  return {
    unit: args.includes('--unit'),
    integration: args.includes('--integration'),
    performance: args.includes('--performance'),
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch'),
    verbose: args.includes('--verbose')
  };
}

function runCommand(command: string, options: TestOptions): void {
  try {
    console.log(`\n🚀 Running: ${command}`);
    console.log('='.repeat(50));
    
    const result = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    console.log('\n✅ Command completed successfully');
  } catch (error) {
    console.error('\n❌ Command failed:', error);
    process.exit(1);
  }
}

function runTests(options: TestOptions): void {
  console.log('🧪 TA Worker Test Runner');
  console.log('========================\n');
  
  // Check if Jest is installed
  if (!existsSync(join(__dirname, '../node_modules/.bin/jest'))) {
    console.error('❌ Jest not found. Please run: npm install');
    process.exit(1);
  }
  
  // Build Jest command
  let jestCommand = 'npx jest';
  
  if (options.unit) {
    jestCommand += ' --testPathPattern=__tests__/.*\\.test\\.ts';
    console.log('📋 Running unit tests only');
  } else if (options.integration) {
    jestCommand += ' --testPathPattern=__tests__/integration\\.test\\.ts';
    console.log('📋 Running integration tests only');
  } else if (options.performance) {
    jestCommand += ' --testPathPattern=__tests__/performance\\.test\\.ts';
    console.log('📋 Running performance tests only');
  } else {
    console.log('📋 Running all tests');
  }
  
  if (options.coverage) {
    jestCommand += ' --coverage';
    console.log('📊 Coverage report will be generated');
  }
  
  if (options.watch) {
    jestCommand += ' --watch';
    console.log('👀 Running in watch mode');
  }
  
  if (options.verbose) {
    jestCommand += ' --verbose';
    console.log('🔍 Verbose output enabled');
  }
  
  // Run tests
  runCommand(jestCommand, options);
  
  // Show coverage summary if requested
  if (options.coverage) {
    console.log('\n📊 Coverage Summary:');
    console.log('Coverage report generated in ./coverage/');
    console.log('Open ./coverage/lcov-report/index.html to view detailed report');
  }
}

function showHelp(): void {
  console.log(`
🧪 TA Worker Test Runner

Usage:
  npx tsx scripts/run-tests.ts [options]

Options:
  --unit              Run unit tests only
  --integration       Run integration tests only  
  --performance       Run performance tests only
  --coverage          Generate coverage report
  --watch             Run in watch mode
  --verbose           Enable verbose output
  --help              Show this help message

Examples:
  npx tsx scripts/run-tests.ts                    # Run all tests
  npx tsx scripts/run-tests.ts --unit            # Run unit tests only
  npx tsx scripts/run-tests.ts --coverage        # Run with coverage
  npx tsx scripts/run-tests.ts --watch           # Run in watch mode

Test Categories:
  📋 Unit Tests: Math utilities, technical indicators, error handling
  🔗 Integration Tests: Module interactions, end-to-end workflows
  ⚡ Performance Tests: Speed, memory usage, concurrent operations
  ⚙️  Configuration Tests: Configuration management system
`);
}

function main(): void {
  const options = parseArgs();
  
  if (process.argv.includes('--help')) {
    showHelp();
    return;
  }
  
  console.log('🔍 Test Options:', options);
  
  // Validate options
  const testTypes = [options.unit, options.integration, options.performance];
  if (testTypes.filter(Boolean).length > 1) {
    console.error('❌ Only one test type can be specified at a time');
    process.exit(1);
  }
  
  runTests(options);
}

if (require.main === module) {
  main();
}

