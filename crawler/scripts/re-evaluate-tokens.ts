// scripts/re-evaluate-tokens.ts
// Script to re-evaluate existing tokens with updated quality criteria

import { createClient } from '@supabase/supabase-js';

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  holders: number;
  marketCap: number;
  lastTradeTime: number;
}

// Updated quality thresholds (same as above)
const UPDATED_QUALITY_THRESHOLDS = {
  minVolume24h: 1000,
  minLiquidity: 10000,
  minHolders: 50,
  minPrice: 0.000001,
  maxDaysInactive: 7,
  maxPriceChange24h: 10000,    // 10,000% instead of 100%
  minPriceChange24h: -99.9,    // -99.9% instead of -100%
  maxVolumeToLiquidityRatio: 20,
  minTokenAge: 60 * 60 * 1000,
  maxNameLength: 50,
  maxSymbolLength: 10
};

class TokenReEvaluator {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Re-evaluate all tokens with updated criteria
  async reEvaluateAllTokens(): Promise<void> {
    console.log('🔄 Starting re-evaluation of existing tokens with updated criteria…');

    try {
      // Get all tokens (both active and inactive)
      const { data: allTokens, error } = await this.supabase
        .from('tokens')
        .select('*');

      if (error) {
        throw error;
      }

      console.log(`Found ${allTokens.length} total tokens to re-evaluate`);

      let reactivatedCount = 0;
      let totalEvaluated = 0;
      let tierChanges = 0;

      // Process tokens in batches
      const batchSize = 100;
      for (let i = 0; i < allTokens.length; i += batchSize) {
        const batch = allTokens.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allTokens.length / batchSize)}`);

        for (const token of batch) {
          const result = await this.reEvaluateToken(token);
          totalEvaluated++;

          if (result.statusChanged) {
            reactivatedCount++;
          }
          if (result.tierChanged) {
            tierChanges++;
          }

          // Progress logging
          if (totalEvaluated % 500 === 0) {
            console.log(`Progress: ${totalEvaluated}/${allTokens.length} tokens evaluated`);
            console.log(`Reactivated: ${reactivatedCount}, Tier changes: ${tierChanges}`);
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Re-evaluation completed!');
      console.log(`📊 Summary:`);
      console.log(`  - Total tokens evaluated: ${totalEvaluated}`);
      console.log(`  - Tokens reactivated: ${reactivatedCount}`);
      console.log(`  - Tier changes: ${tierChanges}`);

    } catch (error) {
      console.error('❌ Error during re-evaluation:', error);
    }
  }

  // Re-evaluate a single token
  private async reEvaluateToken(token: any): Promise<{ statusChanged: boolean; tierChanged: boolean }> {
    const tokenData: TokenData = {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      price: token.price,
      volume24h: token.volume_24h,
      priceChange24h: token.price_change_24h,
      liquidity: token.liquidity,
      holders: token.holders,
      marketCap: token.market_cap,
      lastTradeTime: Date.now() // Assume recent for this evaluation
    };

    // Apply updated quality checks
    const shouldBeActive = this.isQualityTokenUpdated(tokenData);
    const newTier = shouldBeActive ? this.assignTierUpdated(tokenData) : token.tier;

    const statusChanged = token.is_active !== shouldBeActive;
    const tierChanged = token.tier !== newTier;

    // Update token if needed
    if (statusChanged || tierChanged) {
      const updateData: any = {};
      
      if (statusChanged) {
        updateData.is_active = shouldBeActive;
        console.log(`${shouldBeActive ? '🟢 Reactivating' : '🔴 Deactivating'} ${token.symbol} (${token.address})`);
        
        if (shouldBeActive) {
          console.log(`  Reason: Price change ${token.price_change_24h}% is now acceptable`);
        }
      }
      
      if (tierChanged) {
        updateData.tier = newTier;
        console.log(`🔄 ${token.symbol}: Tier ${token.tier} → ${newTier}`);
      }

      // Update the database
      const { error } = await this.supabase
        .from('tokens')
        .update(updateData)
        .eq('address', token.address);

      if (error) {
        console.error(`Error updating token ${token.symbol}:`, error);
      }
    }

    return { statusChanged, tierChanged };
  }

  // Updated quality check function
  private isQualityTokenUpdated(tokenData: TokenData): boolean {
    const now = Date.now();
    const maxInactiveTime = UPDATED_QUALITY_THRESHOLDS.maxDaysInactive * 24 * 60 * 60 * 1000;

    // Basic checks
    const passesBasicChecks = (
      tokenData.volume24h >= UPDATED_QUALITY_THRESHOLDS.minVolume24h &&
      tokenData.liquidity >= UPDATED_QUALITY_THRESHOLDS.minLiquidity &&
      tokenData.holders >= UPDATED_QUALITY_THRESHOLDS.minHolders &&
      tokenData.price >= UPDATED_QUALITY_THRESHOLDS.minPrice
    );

    if (!passesBasicChecks) return false;

    // Updated price change validation
    const priceChangeValid = (
      tokenData.priceChange24h !== null &&
      tokenData.priceChange24h >= UPDATED_QUALITY_THRESHOLDS.minPriceChange24h &&
      tokenData.priceChange24h <= UPDATED_QUALITY_THRESHOLDS.maxPriceChange24h
    );

    if (!priceChangeValid) return false;

    // Volume/liquidity ratio check
    const volumeToLiquidityRatio = tokenData.liquidity > 0 ? tokenData.volume24h / tokenData.liquidity : 0;
    if (volumeToLiquidityRatio > UPDATED_QUALITY_THRESHOLDS.maxVolumeToLiquidityRatio) {
      return false;
    }

    // Scam detection
    if (this.isObviousScamUpdated(tokenData)) {
      return false;
    }

    return true;
  }

  // Updated tier assignment
  private assignTierUpdated(tokenData: TokenData): number {
    if (
      tokenData.volume24h >= 50000 &&
      tokenData.holders >= 500 &&
      tokenData.liquidity >= 100000
    ) {
      return 1;
    }

    if (
      tokenData.volume24h >= 10000 &&
      tokenData.holders >= 100 &&
      tokenData.liquidity >= 25000
    ) {
      return 2;
    }

    return 3;
  }

  // Updated scam detection
  private isObviousScamUpdated(tokenData: TokenData): boolean {
    const suspiciousNamePatterns = [
      'test', 'fake', 'scam', 'rug', 'honeypot'
    ];

    const nameContainsSuspicious = suspiciousNamePatterns.some(pattern => 
      tokenData.name?.toLowerCase().includes(pattern) || 
      tokenData.symbol?.toLowerCase().includes(pattern)
    );

    return (
      nameContainsSuspicious ||
      tokenData.holders < 10 ||
      !tokenData.name ||
      !tokenData.symbol ||
      tokenData.name === tokenData.symbol ||
      tokenData.name.length > UPDATED_QUALITY_THRESHOLDS.maxNameLength ||
      tokenData.symbol.length > UPDATED_QUALITY_THRESHOLDS.maxSymbolLength
    );
  }

  // Get statistics on what would change
  async getReEvaluationPreview(): Promise<void> {
    console.log('📊 Generating re-evaluation preview…');

    const { data: allTokens, error } = await this.supabase
      .from('tokens')
      .select('*');

    if (error || !allTokens) {
      console.error('Error fetching tokens for preview:', error);
      return;
    }

    let wouldReactivate = 0;
    let wouldDeactivate = 0;
    let tierUpgrades = 0;
    let tierDowngrades = 0;
    const extremePriceChanges: any[] = [];

    for (const token of allTokens) {
      const tokenData: TokenData = {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        price: token.price,
        volume24h: token.volume_24h,
        priceChange24h: token.price_change_24h,
        liquidity: token.liquidity,
        holders: token.holders,
        marketCap: token.market_cap,
        lastTradeTime: Date.now()
      };

      const shouldBeActive = this.isQualityTokenUpdated(tokenData);
      const newTier = shouldBeActive ? this.assignTierUpdated(tokenData) : token.tier;

      // Track changes
      if (token.is_active !== shouldBeActive) {
        if (shouldBeActive) {
          wouldReactivate++;
          // Log tokens with extreme price changes that would be reactivated
          if (Math.abs(token.price_change_24h) > 200) {
            extremePriceChanges.push({
              symbol: token.symbol,
              priceChange: token.price_change_24h,
              volume: token.volume_24h
            });
          }
        } else {
          wouldDeactivate++;
        }
      }

      if (token.tier !== newTier) {
        if (newTier < token.tier) {
          tierUpgrades++;
        } else {
          tierDowngrades++;
        }
      }
    }

    console.log('\n📊 Re-evaluation Preview:');
    console.log(`  Total tokens: ${allTokens.length}`);
    console.log(`  Would reactivate: ${wouldReactivate}`);
    console.log(`  Would deactivate: ${wouldDeactivate}`);
    console.log(`  Tier upgrades: ${tierUpgrades}`);
    console.log(`  Tier downgrades: ${tierDowngrades}`);

    console.log('\n🚀 Extreme price changes that would be reactivated:');
    extremePriceChanges.slice(0, 10).forEach(token => {
      console.log(`  ${token.symbol}: ${token.priceChange.toFixed(1)}% (Vol: $${token.volume.toLocaleString()})`);
    });
  }
}

// Main execution
async function main() {
  const reEvaluator = new TokenReEvaluator(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Show preview first
  await reEvaluator.getReEvaluationPreview();

  // Ask for confirmation
  console.log('\n⚠️  Do you want to proceed with re-evaluation? (y/N)');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Continue? ', async (answer: string) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await reEvaluator.reEvaluateAllTokens();
    } else {
      console.log('❌ Re-evaluation cancelled');
    }
    readline.close();
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

export { TokenReEvaluator }; 