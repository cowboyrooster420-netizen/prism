#!/usr/bin/env tsx
/**
 * Simple TA Worker Runner with Basic Monitoring
 * Runs the TA worker and provides simple status feedback
 */
import 'dotenv/config';
import { execSync } from 'child_process';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}${timestamp} - ${message}${colors.reset}`);
}

function runTAWorker() {
  try {
    log('🚀 Starting TA Worker...', colors.blue + colors.bold);
    
    const startTime = Date.now();
    const result = execSync('npm run ta', { 
      encoding: 'utf8',
      cwd: '/Users/aaronburke/prism/crawler'
    });
    const duration = Date.now() - startTime;
    
    log(`✅ TA Worker completed successfully in ${duration}ms`, colors.green + colors.bold);
    log('📊 Output:', colors.cyan);
    console.log(result);
    
    return true;
  } catch (error: any) {
    log(`❌ TA Worker failed: ${error.message}`, colors.red + colors.bold);
    if (error.stdout) {
      log('📄 stdout:', colors.yellow);
      console.log(error.stdout);
    }
    if (error.stderr) {
      log('📄 stderr:', colors.yellow);
      console.log(error.stderr);
    }
    return false;
  }
}

function showStatus() {
  const tokens = process.env.TA_TOKEN_IDS?.split(',') || [];
  const timeframes = process.env.TA_TIMEFRAMES?.split(',') || [];
  
  log('📈 TA Worker Configuration:', colors.magenta + colors.bold);
  log(`   Tokens: ${tokens.length} (${tokens.join(', ')})`, colors.cyan);
  log(`   Timeframes: ${timeframes.length} (${timeframes.join(', ')})`, colors.cyan);
  log(`   Total combinations: ${tokens.length * timeframes.length}`, colors.cyan);
}

async function main() {
  console.clear();
  log('🎯 TA Worker Runner Starting...', colors.bold);
  
  showStatus();
  
  if (process.argv.includes('--continuous')) {
    log('🔄 Running in continuous mode (every 5 minutes)...', colors.yellow);
    
    while (true) {
      const success = runTAWorker();
      
      if (success) {
        log('😴 Sleeping for 5 minutes...', colors.blue);
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      } else {
        log('⚠️  Error detected, waiting 1 minute before retry...', colors.yellow);
        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
      }
    }
  } else {
    runTAWorker();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('👋 Shutting down TA Worker Runner...', colors.yellow);
  process.exit(0);
});

main().catch(error => {
  log(`💥 Fatal error: ${error.message}`, colors.red + colors.bold);
  process.exit(1);
});