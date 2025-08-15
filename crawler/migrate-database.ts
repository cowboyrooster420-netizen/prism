#!/usr/bin/env tsx
/**
 * Database Migration Script for Elite TA Features
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

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
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function runMigration() {
  console.log(`${colors.bold}${colors.blue}🚀 Running Elite TA Database Migration${colors.reset}`);
  
  try {
    // Read the SQL migration file
    const sqlContent = readFileSync('/Users/aaronburke/prism/crawler/add-elite-ta-columns.sql', 'utf8');
    
    console.log(`${colors.cyan}📄 Executing SQL migration...${colors.reset}`);
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      // If rpc doesn't work, try direct SQL execution
      console.log(`${colors.yellow}⚠️  RPC failed, trying direct execution...${colors.reset}`);
      
      // Split SQL into individual statements and execute them
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        if (statement.toLowerCase().includes('alter table') || 
            statement.toLowerCase().includes('create index') ||
            statement.toLowerCase().includes('create view') ||
            statement.toLowerCase().includes('drop view')) {
          
          console.log(`${colors.cyan}🔧 Executing: ${statement.substring(0, 50)}...${colors.reset}`);
          
          // For Supabase, we need to use the REST API or run these manually
          console.log(`${colors.yellow}⚠️  Please run this SQL manually in Supabase SQL Editor:${colors.reset}`);
          console.log(`${colors.cyan}${statement};${colors.reset}`);
        }
      }
      
      console.log(`${colors.yellow}📝 Migration SQL has been displayed above.${colors.reset}`);
      console.log(`${colors.yellow}Please copy and paste it into your Supabase SQL Editor.${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✅ Migration completed successfully!${colors.reset}`);
    
  } catch (error: any) {
    console.error(`${colors.red}❌ Migration failed: ${error.message}${colors.reset}`);
    
    // Fallback: Show the SQL for manual execution
    try {
      const sqlContent = readFileSync('/Users/aaronburke/prism/crawler/add-elite-ta-columns.sql', 'utf8');
      console.log(`${colors.yellow}📝 Please run this SQL manually in Supabase:${colors.reset}`);
      console.log(`${colors.cyan}${sqlContent}${colors.reset}`);
    } catch (readError) {
      console.error(`${colors.red}❌ Could not read migration file${colors.reset}`);
    }
  }
}

async function testNewColumns() {
  console.log(`${colors.blue}🔍 Testing new columns...${colors.reset}`);
  
  try {
    const { data, error } = await supabase
      .from('ta_features')
      .select('vwap, smart_money_index, trend_alignment_score')
      .limit(1);
    
    if (error) {
      console.log(`${colors.red}❌ New columns not yet available: ${error.message}${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}✅ New columns are available!${colors.reset}`);
    return true;
  } catch (error: any) {
    console.log(`${colors.red}❌ Test failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  await runMigration();
  await testNewColumns();
  
  console.log();
  console.log(`${colors.bold}${colors.green}🎯 Next Steps:${colors.reset}`);
  console.log(`${colors.cyan}1. Run: npm run ta-elite${colors.reset}`);
  console.log(`${colors.cyan}2. Check: npm run ta-status${colors.reset}`);
  console.log(`${colors.cyan}3. Enjoy elite TA features! 🚀${colors.reset}`);
}

main();