#!/usr/bin/env tsx
/**
 * Simple TA Dashboard
 * Shows the current status of TA features and provides basic monitoring
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

async function getTAStatus() {
  try {
    // Get TA features count by token and timeframe
    const { data: taFeatures, error: taError } = await supabase
      .from('ta_features')
      .select('token_id, timeframe')
      .order('ts', { ascending: false });
    
    if (taError) throw taError;

    // Get candles count
    const { data: candles, error: candlesError } = await supabase
      .from('candles')
      .select('token_id, timeframe')
      .order('ts', { ascending: false });
    
    if (candlesError) throw candlesError;

    // Get latest TA data
    const { data: latestTA, error: latestError } = await supabase
      .from('ta_latest')
      .select('*')
      .order('ts', { ascending: false })
      .limit(10);
    
    if (latestError) throw latestError;

    return {
      taFeatures: taFeatures || [],
      candles: candles || [],
      latestTA: latestTA || []
    };
  } catch (error) {
    console.error('Error fetching TA status:', error);
    return null;
  }
}

function formatTokenId(tokenId: string): string {
  // Map known token IDs to symbols
  const tokenMap: Record<string, string> = {
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC'
  };
  
  return tokenMap[tokenId] || `${tokenId.slice(0, 8)}...`;
}

function displayTAStats(data: any) {
  console.clear();
  
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}                    🎯 TA WORKER DASHBOARD                     ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log();

  if (!data) {
    console.log(`${colors.red}❌ Failed to fetch data from database${colors.reset}`);
    return;
  }

  // TA Features Summary
  const taByTokenTimeframe = data.taFeatures.reduce((acc: any, item: any) => {
    const key = `${item.token_id}-${item.timeframe}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Candles Summary
  const candlesByTokenTimeframe = data.candles.reduce((acc: any, item: any) => {
    const key = `${item.token_id}-${item.timeframe}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log(`${colors.bold}${colors.blue}📊 DATA SUMMARY${colors.reset}`);
  console.log(`${colors.dim}────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.white}TA Features: ${colors.green}${data.taFeatures.length} total${colors.reset}`);
  console.log(`${colors.white}Candle Data: ${colors.green}${data.candles.length} total${colors.reset}`);
  console.log(`${colors.white}Latest TA:   ${colors.green}${data.latestTA.length} entries${colors.reset}`);
  console.log();

  console.log(`${colors.bold}${colors.blue}🎯 TA FEATURES BY TOKEN/TIMEFRAME${colors.reset}`);
  console.log(`${colors.dim}────────────────────────────────────────────────────────────────${colors.reset}`);
  
  const tokens = [...new Set(data.taFeatures.map((f: any) => f.token_id))];
  const timeframes = [...new Set(data.taFeatures.map((f: any) => f.timeframe))];
  
  // Header
  let header = `${colors.white}Token     `;
  timeframes.forEach(tf => {
    header += `${tf.padEnd(8)}`;
  });
  header += 'Total';
  console.log(header + colors.reset);
  
  tokens.forEach(token => {
    let row = `${colors.cyan}${formatTokenId(token).padEnd(8)}${colors.white}  `;
    let total = 0;
    
    timeframes.forEach(tf => {
      const count = taByTokenTimeframe[`${token}-${tf}`] || 0;
      total += count;
      const color = count > 0 ? colors.green : colors.red;
      row += `${color}${count.toString().padEnd(8)}${colors.white}`;
    });
    
    row += `${colors.bold}${total}${colors.reset}`;
    console.log(row);
  });
  
  console.log();

  console.log(`${colors.bold}${colors.blue}📈 LATEST TA FEATURES${colors.reset}`);
  console.log(`${colors.dim}────────────────────────────────────────────────────────────────${colors.reset}`);
  
  if (data.latestTA.length > 0) {
    data.latestTA.slice(0, 5).forEach((ta: any, i: number) => {
      const timestamp = new Date(ta.ts).toLocaleString();
      const rsi = ta.rsi14 ? ta.rsi14.toFixed(1) : 'N/A';
      const ema7 = ta.ema7 ? ta.ema7.toFixed(4) : 'N/A';
      const volume = ta.vol_z60 ? ta.vol_z60.toFixed(2) : 'N/A';
      
      console.log(`${colors.white}${i + 1}. ${colors.cyan}${formatTokenId(ta.token_id)} ${colors.yellow}${ta.timeframe}${colors.reset}`);
      console.log(`   ${colors.dim}${timestamp} | RSI: ${rsi} | EMA7: ${ema7} | Vol Z: ${volume}${colors.reset}`);
    });
  } else {
    console.log(`${colors.yellow}No TA data available${colors.reset}`);
  }

  console.log();
  console.log(`${colors.dim}Last updated: ${new Date().toLocaleString()}${colors.reset}`);
  console.log(`${colors.dim}Press Ctrl+C to exit, any other key to refresh...${colors.reset}`);
}

async function main() {
  while (true) {
    const data = await getTAStatus();
    displayTAStats(data);
    
    // Wait for user input or auto-refresh after 30 seconds
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 30000);
      
      process.stdin.once('data', () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}👋 Exiting TA Dashboard...${colors.reset}`);
  process.exit(0);
});

// Enable stdin if in TTY mode
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});