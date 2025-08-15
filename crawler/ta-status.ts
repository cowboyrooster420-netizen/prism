#!/usr/bin/env tsx
/**
 * Simple TA Status Checker
 * Shows the current status of TA features (one-shot, no interaction)
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
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

function formatTokenId(tokenId: string): string {
  const tokenMap: Record<string, string> = {
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC'
  };
  
  return tokenMap[tokenId] || `${tokenId.slice(0, 8)}...`;
}

async function main() {
  console.log(`${colors.bold}${colors.cyan}🎯 TA WORKER STATUS CHECK${colors.reset}`);
  console.log(`${colors.dim}═══════════════════════════════════════════════════════════════${colors.reset}`);
  
  try {
    // Get TA features count by token and timeframe
    const { data: taFeatures, error: taError } = await supabase
      .from('ta_features')
      .select('token_id, timeframe, ts')
      .order('ts', { ascending: false });
    
    if (taError) throw taError;

    // Get candles count
    const { data: candles, error: candlesError } = await supabase
      .from('candles')
      .select('token_id, timeframe, ts')
      .order('ts', { ascending: false });
    
    if (candlesError) throw candlesError;

    // Get latest TA data
    const { data: latestTA, error: latestError } = await supabase
      .from('ta_latest')
      .select('*')
      .order('ts', { ascending: false })
      .limit(3);
    
    if (latestError) throw latestError;

    console.log(`${colors.white}📊 Total TA Features: ${colors.green}${taFeatures?.length || 0}${colors.reset}`);
    console.log(`${colors.white}📈 Total Candles: ${colors.green}${candles?.length || 0}${colors.reset}`);
    console.log(`${colors.white}🕐 Latest TA Entries: ${colors.green}${latestTA?.length || 0}${colors.reset}`);
    console.log();

    if (taFeatures && taFeatures.length > 0) {
      // Group by token and timeframe
      const groupedTA = taFeatures.reduce((acc: any, item: any) => {
        const key = `${item.token_id}-${item.timeframe}`;
        if (!acc[key]) {
          acc[key] = { token_id: item.token_id, timeframe: item.timeframe, count: 0, latest: item.ts };
        }
        acc[key].count++;
        return acc;
      }, {});

      console.log(`${colors.bold}${colors.blue}📊 TA Features by Token/Timeframe:${colors.reset}`);
      Object.values(groupedTA).forEach((group: any) => {
        const latest = new Date(group.latest).toLocaleString();
        console.log(`${colors.cyan}  ${formatTokenId(group.token_id)} ${colors.yellow}${group.timeframe}${colors.white}: ${colors.green}${group.count} features${colors.dim} (latest: ${latest})${colors.reset}`);
      });
      console.log();
    }

    if (latestTA && latestTA.length > 0) {
      console.log(`${colors.bold}${colors.blue}🔍 Latest TA Features:${colors.reset}`);
      latestTA.forEach((ta: any, i: number) => {
        const timestamp = new Date(ta.ts).toLocaleString();
        const rsi = ta.rsi14 ? ta.rsi14.toFixed(1) : 'N/A';
        const ema7 = ta.ema7 ? ta.ema7.toFixed(6) : 'N/A';
        const volume = ta.vol_z60 ? ta.vol_z60.toFixed(2) : 'N/A';
        
        console.log(`${colors.white}  ${i + 1}. ${colors.cyan}${formatTokenId(ta.token_id)} ${colors.yellow}${ta.timeframe}${colors.reset}`);
        console.log(`${colors.dim}     ${timestamp} | RSI: ${rsi} | EMA7: ${ema7} | Vol Z: ${volume}${colors.reset}`);
      });
      console.log();
    }

    // Check configuration
    const tokens = process.env.TA_TOKEN_IDS?.split(',') || [];
    const timeframes = process.env.TA_TIMEFRAMES?.split(',') || [];
    
    console.log(`${colors.bold}${colors.blue}⚙️  Configuration:${colors.reset}`);
    console.log(`${colors.white}  Configured Tokens: ${colors.cyan}${tokens.length} (${tokens.map(formatTokenId).join(', ')})${colors.reset}`);
    console.log(`${colors.white}  Configured Timeframes: ${colors.cyan}${timeframes.join(', ')}${colors.reset}`);
    console.log(`${colors.white}  Expected Combinations: ${colors.cyan}${tokens.length * timeframes.length}${colors.reset}`);

    // Quick health check
    const healthyTokens = new Set();
    taFeatures?.forEach((ta: any) => {
      if (tokens.includes(ta.token_id) && timeframes.includes(ta.timeframe)) {
        healthyTokens.add(`${formatTokenId(ta.token_id)}-${ta.timeframe}`);
      }
    });

    console.log();
    if (healthyTokens.size === tokens.length * timeframes.length) {
      console.log(`${colors.green}✅ TA Worker is healthy - all token/timeframe combinations have data${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  TA Worker may need attention - ${healthyTokens.size}/${tokens.length * timeframes.length} combinations have data${colors.reset}`);
    }

  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.dim}Updated: ${new Date().toLocaleString()}${colors.reset}`);
}

main();