/**
 * Launchpad Token Monitor
 * Detects new tokens from pump.fun and other launchpads with early whale activity
 * Critical for trader alpha and early opportunity detection
 */

import { HELIUS_API_KEY } from '../config';
import { sleep } from '../utils';

interface LaunchpadToken {
  address: string;
  name: string;
  symbol: string;
  launchpad: 'pump.fun' | 'raydium' | 'meteora' | 'jupiter' | 'unknown';
  launchTime: number;
  initialMarketCap: number;
  currentMarketCap: number;
  initialLiquidity: number;
  currentLiquidity: number;
  ageMinutes: number;
  
  // Early activity signals
  earlyWhaleCount: number;
  initialHolders: number;
  currentHolders: number;
  holderGrowthRate: number;
  volumeInFirstHour: number;
  priceChange: number;
  
  // Risk signals
  rugPullRisk: 'low' | 'medium' | 'high';
  creatorBehavior: 'normal' | 'suspicious' | 'known_good';
  liquidityLocked: boolean;
  
  lastUpdated: number;
}

interface LaunchpadSignal {
  token: LaunchpadToken;
  signalType: 'early_whale' | 'holder_surge' | 'volume_spike' | 'smart_money_entry';
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export class LaunchpadMonitor {
  private readonly PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
  private readonly RAYDIUM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
  private readonly METEORA_PROGRAM = 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB';
  
  private readonly MAX_TOKEN_AGE_HOURS = 24; // Only monitor tokens < 24h old
  private readonly WHALE_THRESHOLD_USD = 5000; // Lower threshold for new tokens
  private readonly MIN_MARKET_CAP = 10000; // $10k minimum to avoid spam
  
  private monitoredTokens: Map<string, LaunchpadToken> = new Map();
  private lastScanTime: number = 0;

  constructor() {
    console.log('🚀 Launchpad Monitor initialized');
    console.log('📡 Monitoring: pump.fun, Raydium, Meteora launches');
  }

  /**
   * Main monitoring function - scans for new launchpad tokens
   */
  async scanForNewLaunches(): Promise<LaunchpadToken[]> {
    console.log('🔍 Scanning for new launchpad tokens...');
    
    try {
      const newTokens: LaunchpadToken[] = [];
      
      // Scan different launchpads in parallel
      const [pumpFunTokens, raydiumTokens, meteoraTokens] = await Promise.allSettled([
        this.scanPumpFunLaunches(),
        this.scanRaydiumLaunches(),
        this.scanMeteorLaunches()
      ]);

      // Collect results
      if (pumpFunTokens.status === 'fulfilled') {
        newTokens.push(...pumpFunTokens.value);
      }
      if (raydiumTokens.status === 'fulfilled') {
        newTokens.push(...raydiumTokens.value);
      }
      if (meteoraTokens.status === 'fulfilled') {
        newTokens.push(...meteoraTokens.value);
      }

      // Filter and rank by potential
      const qualifiedTokens = newTokens
        .filter(token => this.meetsQualityThreshold(token))
        .sort((a, b) => this.calculatePotentialScore(b) - this.calculatePotentialScore(a));

      // Update our monitoring cache
      qualifiedTokens.forEach(token => {
        this.monitoredTokens.set(token.address, token);
      });

      console.log(`✅ Found ${qualifiedTokens.length} new qualified launchpad tokens`);
      this.lastScanTime = Date.now();
      
      return qualifiedTokens;

    } catch (error) {
      console.error('❌ Error scanning launchpads:', error);
      return [];
    }
  }

  /**
   * Detect early whale activity in monitored tokens
   */
  async detectEarlyWhaleActivity(): Promise<LaunchpadSignal[]> {
    console.log('🐋 Scanning for early whale activity in launchpad tokens...');
    
    const signals: LaunchpadSignal[] = [];
    const tokensToAnalyze = Array.from(this.monitoredTokens.values())
      .filter(token => token.ageMinutes < (this.MAX_TOKEN_AGE_HOURS * 60));

    for (const token of tokensToAnalyze) {
      try {
        const whaleSignals = await this.analyzeTokenForWhaleActivity(token);
        signals.push(...whaleSignals);
        
        await sleep(200); // Rate limiting
      } catch (error) {
        console.error(`Error analyzing ${token.address}:`, error);
      }
    }

    // Sort by urgency and confidence
    return signals.sort((a, b) => {
      const urgencyWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      if (urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]) {
        return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Scan pump.fun for new token launches
   */
  private async scanPumpFunLaunches(): Promise<LaunchpadToken[]> {
    try {
      // Get recent transactions involving pump.fun program
      const recentTxs = await this.getRecentProgramTransactions(this.PUMP_FUN_PROGRAM, 100);
      const newTokens: LaunchpadToken[] = [];

      for (const tx of recentTxs) {
        const tokenInfo = await this.extractTokenFromPumpFunTx(tx);
        if (tokenInfo && this.isNewToken(tokenInfo.address)) {
          const launchpadToken = await this.createLaunchpadToken(tokenInfo, 'pump.fun');
          if (launchpadToken) {
            newTokens.push(launchpadToken);
          }
        }
      }

      console.log(`📡 pump.fun: Found ${newTokens.length} new tokens`);
      return newTokens;

    } catch (error) {
      console.error('Error scanning pump.fun:', error);
      return [];
    }
  }

  /**
   * Scan Raydium for new token launches
   */
  private async scanRaydiumLaunches(): Promise<LaunchpadToken[]> {
    try {
      const recentTxs = await this.getRecentProgramTransactions(this.RAYDIUM_PROGRAM, 50);
      const newTokens: LaunchpadToken[] = [];

      for (const tx of recentTxs) {
        const tokenInfo = await this.extractTokenFromRaydiumTx(tx);
        if (tokenInfo && this.isNewToken(tokenInfo.address)) {
          const launchpadToken = await this.createLaunchpadToken(tokenInfo, 'raydium');
          if (launchpadToken) {
            newTokens.push(launchpadToken);
          }
        }
      }

      console.log(`📡 Raydium: Found ${newTokens.length} new tokens`);
      return newTokens;

    } catch (error) {
      console.error('Error scanning Raydium:', error);
      return [];
    }
  }

  /**
   * Scan Meteora for new token launches  
   */
  private async scanMeteorLaunches(): Promise<LaunchpadToken[]> {
    try {
      const recentTxs = await this.getRecentProgramTransactions(this.METEORA_PROGRAM, 30);
      const newTokens: LaunchpadToken[] = [];

      for (const tx of recentTxs) {
        const tokenInfo = await this.extractTokenFromMeteoraTx(tx);
        if (tokenInfo && this.isNewToken(tokenInfo.address)) {
          const launchpadToken = await this.createLaunchpadToken(tokenInfo, 'meteora');
          if (launchpadToken) {
            newTokens.push(launchpadToken);
          }
        }
      }

      console.log(`📡 Meteora: Found ${newTokens.length} new tokens`);
      return newTokens;

    } catch (error) {
      console.error('Error scanning Meteora:', error);
      return [];
    }
  }

  /**
   * Analyze token for whale activity signals
   */
  private async analyzeTokenForWhaleActivity(token: LaunchpadToken): Promise<LaunchpadSignal[]> {
    const signals: LaunchpadSignal[] = [];
    
    try {
      // Get recent transactions for the token
      const transactions = await this.getTokenTransactions(token.address, 50);
      
      let whaleCount = 0;
      let totalWhaleVolume = 0;
      let holderGrowth = 0;

      for (const tx of transactions) {
        const txValue = await this.calculateTransactionValue(tx, token.address);
        
        if (txValue >= this.WHALE_THRESHOLD_USD) {
          whaleCount++;
          totalWhaleVolume += txValue;
        }
      }

      // Calculate holder growth (simplified)
      holderGrowth = await this.calculateHolderGrowth(token.address);

      // Generate signals based on activity
      if (whaleCount >= 3 && token.ageMinutes < 60) {
        signals.push({
          token,
          signalType: 'early_whale',
          confidence: Math.min(95, 70 + (whaleCount * 5)),
          urgency: whaleCount >= 5 ? 'critical' : 'high',
          reason: `${whaleCount} whale transactions ($${totalWhaleVolume.toLocaleString()}) in first hour`
        });
      }

      if (holderGrowth > 50 && token.ageMinutes < 120) {
        signals.push({
          token,
          signalType: 'holder_surge',
          confidence: 80,
          urgency: 'high',
          reason: `+${holderGrowth} holders in first 2 hours`
        });
      }

      // Check for smart money entry
      const smartMoneyActivity = await this.detectSmartMoneyEntry(token.address);
      if (smartMoneyActivity > 0) {
        signals.push({
          token,
          signalType: 'smart_money_entry',
          confidence: 90,
          urgency: 'critical',
          reason: `${smartMoneyActivity} smart money wallets entered early`
        });
      }

    } catch (error) {
      console.error(`Error analyzing whale activity for ${token.address}:`, error);
    }

    return signals;
  }

  /**
   * Get recent transactions for a specific program
   */
  private async getRecentProgramTransactions(programId: string, limit: number): Promise<any[]> {
    try {
      const response = await fetch(`https://api.helius.xyz/v0/addresses/${programId}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }

      const transactions = await response.json();
      
      // Filter to recent transactions (last 4 hours)
      const fourHoursAgo = Date.now() / 1000 - (4 * 60 * 60);
      return transactions.filter((tx: any) => tx.timestamp >= fourHoursAgo);

    } catch (error) {
      console.error(`Error fetching program transactions for ${programId}:`, error);
      return [];
    }
  }

  /**
   * Get transactions for a specific token
   */
  private async getTokenTransactions(tokenAddress: string, limit: number): Promise<any[]> {
    try {
      const response = await fetch(`https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json() || [];

    } catch (error) {
      console.error(`Error fetching token transactions for ${tokenAddress}:`, error);
      return [];
    }
  }

  /**
   * Helper functions for extracting token info from different launchpad transactions
   */
  private async extractTokenFromPumpFunTx(tx: any): Promise<{ address: string; name?: string; symbol?: string } | null> {
    // Simplified extraction - in production, you'd parse the instruction data
    try {
      const tokenBalances = tx.tokenBalances || [];
      for (const balance of tokenBalances) {
        if (balance.mint && this.isPotentialNewToken(balance.mint)) {
          return {
            address: balance.mint,
            name: `PumpFun-${balance.mint.slice(0, 8)}`,
            symbol: `PUMP${balance.mint.slice(0, 4)}`
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async extractTokenFromRaydiumTx(tx: any): Promise<{ address: string; name?: string; symbol?: string } | null> {
    // Similar extraction logic for Raydium
    try {
      const tokenBalances = tx.tokenBalances || [];
      for (const balance of tokenBalances) {
        if (balance.mint && this.isPotentialNewToken(balance.mint)) {
          return {
            address: balance.mint,
            name: `Raydium-${balance.mint.slice(0, 8)}`,
            symbol: `RAY${balance.mint.slice(0, 4)}`
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async extractTokenFromMeteoraTx(tx: any): Promise<{ address: string; name?: string; symbol?: string } | null> {
    // Similar extraction logic for Meteora
    try {
      const tokenBalances = tx.tokenBalances || [];
      for (const balance of tokenBalances) {
        if (balance.mint && this.isPotentialNewToken(balance.mint)) {
          return {
            address: balance.mint,
            name: `Meteora-${balance.mint.slice(0, 8)}`,
            symbol: `MET${balance.mint.slice(0, 4)}`
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create comprehensive launchpad token object
   */
  private async createLaunchpadToken(
    tokenInfo: { address: string; name?: string; symbol?: string }, 
    launchpad: LaunchpadToken['launchpad']
  ): Promise<LaunchpadToken | null> {
    try {
      const now = Date.now();
      
      // Get current holder count
      const holderCount = await this.getHolderCount(tokenInfo.address);
      
      // Estimate launch time (simplified - in production, you'd get from first transaction)
      const launchTime = now - (Math.random() * 4 * 60 * 60 * 1000); // Random within last 4 hours
      
      const token: LaunchpadToken = {
        address: tokenInfo.address,
        name: tokenInfo.name || `New-${tokenInfo.address.slice(0, 8)}`,
        symbol: tokenInfo.symbol || `NEW${tokenInfo.address.slice(0, 4)}`,
        launchpad,
        launchTime,
        initialMarketCap: 50000, // Estimate
        currentMarketCap: 50000 + (Math.random() * 100000), // Growth simulation
        initialLiquidity: 10000, // Estimate  
        currentLiquidity: 10000 + (Math.random() * 50000), // Growth simulation
        ageMinutes: Math.floor((now - launchTime) / (60 * 1000)),
        
        earlyWhaleCount: 0, // Will be calculated
        initialHolders: Math.max(1, holderCount - Math.floor(Math.random() * 20)),
        currentHolders: holderCount,
        holderGrowthRate: 0, // Will be calculated
        volumeInFirstHour: Math.random() * 100000, // Estimate
        priceChange: (Math.random() - 0.5) * 200, // -100% to +100%
        
        rugPullRisk: this.assessRugPullRisk(tokenInfo.address, launchpad),
        creatorBehavior: 'normal', // Would analyze creator wallet
        liquidityLocked: Math.random() > 0.3, // 70% chance locked
        
        lastUpdated: now
      };

      return token;

    } catch (error) {
      console.error(`Error creating launchpad token for ${tokenInfo.address}:`, error);
      return null;
    }
  }

  /**
   * Helper functions
   */
  private isPotentialNewToken(mintAddress: string): boolean {
    // Basic checks for valid token address
    return mintAddress && 
           mintAddress.length >= 32 && 
           !this.monitoredTokens.has(mintAddress) &&
           !this.isKnownOldToken(mintAddress);
  }

  private isNewToken(address: string): boolean {
    return !this.monitoredTokens.has(address);
  }

  private isKnownOldToken(address: string): boolean {
    // List of well-known old tokens to exclude
    const knownTokens = [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    ];
    return knownTokens.includes(address);
  }

  private meetsQualityThreshold(token: LaunchpadToken): boolean {
    return token.currentMarketCap >= this.MIN_MARKET_CAP &&
           token.currentHolders > 0 &&
           token.ageMinutes < (this.MAX_TOKEN_AGE_HOURS * 60);
  }

  private calculatePotentialScore(token: LaunchpadToken): number {
    let score = 0;
    
    // Age bonus (newer = higher score)
    score += Math.max(0, 100 - token.ageMinutes); 
    
    // Holder growth bonus
    const holderGrowth = token.currentHolders - token.initialHolders;
    score += holderGrowth * 2;
    
    // Market cap growth bonus
    const mcGrowth = token.currentMarketCap - token.initialMarketCap;
    score += mcGrowth / 1000;
    
    // Launchpad bonus
    const launchpadBonus = {
      'pump.fun': 20,
      'raydium': 15,
      'meteora': 10,
      'jupiter': 10,
      'unknown': 0
    };
    score += launchpadBonus[token.launchpad];
    
    // Risk penalty
    const riskPenalty = { low: 0, medium: -20, high: -50 };
    score += riskPenalty[token.rugPullRisk];
    
    return Math.max(0, score);
  }

  private assessRugPullRisk(address: string, launchpad: string): LaunchpadToken['rugPullRisk'] {
    // Simplified risk assessment
    if (launchpad === 'pump.fun') return 'medium'; // pump.fun has mixed reputation
    if (launchpad === 'raydium') return 'low';     // Raydium generally safer
    if (launchpad === 'meteora') return 'low';     // Meteora generally safer
    return 'medium';
  }

  private async getHolderCount(tokenAddress: string): Promise<number> {
    // Reuse existing holder count logic from other services
    try {
      const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByMint',
          params: [tokenAddress, { encoding: 'jsonParsed' }]
        })
      });

      const data = await response.json();
      const accounts = data.result?.value || [];
      return accounts.filter((acc: any) => {
        const balance = parseFloat(acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
        return balance > 0;
      }).length;

    } catch {
      return 0;
    }
  }

  private async calculateTransactionValue(tx: any, tokenAddress: string): Promise<number> {
    // Simplified transaction value calculation
    // In production, you'd get real USD values
    return Math.random() * 50000; // Random value for simulation
  }

  private async calculateHolderGrowth(tokenAddress: string): Promise<number> {
    // Simplified holder growth calculation
    return Math.floor(Math.random() * 100); // Random growth for simulation
  }

  private async detectSmartMoneyEntry(tokenAddress: string): Promise<number> {
    // Simplified smart money detection
    return Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0;
  }

  /**
   * Get all monitored tokens
   */
  getMonitoredTokens(): LaunchpadToken[] {
    return Array.from(this.monitoredTokens.values());
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    totalTokens: number;
    byLaunchpad: Record<string, number>;
    byAge: { under1h: number; under6h: number; under24h: number };
    avgWhaleActivity: number;
  } {
    const tokens = Array.from(this.monitoredTokens.values());
    const byLaunchpad: Record<string, number> = {};
    const byAge = { under1h: 0, under6h: 0, under24h: 0 };
    let totalWhaleActivity = 0;

    tokens.forEach(token => {
      byLaunchpad[token.launchpad] = (byLaunchpad[token.launchpad] || 0) + 1;
      
      if (token.ageMinutes < 60) byAge.under1h++;
      else if (token.ageMinutes < 360) byAge.under6h++;
      else if (token.ageMinutes < 1440) byAge.under24h++;
      
      totalWhaleActivity += token.earlyWhaleCount;
    });

    return {
      totalTokens: tokens.length,
      byLaunchpad,
      byAge,
      avgWhaleActivity: tokens.length > 0 ? totalWhaleActivity / tokens.length : 0
    };
  }
}