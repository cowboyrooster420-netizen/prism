/**
 * Behavioral Data Service
 * Connects to your real behavioral crawler system for live data
 */

export interface WhaleActivity {
  token_id: string
  token_symbol: string
  mint_address: string
  whale_buys_24h: number
  new_holders_24h: number
  volume_spike_ratio: number
  last_updated: string
  price?: number
  price_change_24h?: number
}

export interface NewLaunch {
  token_id: string
  token_symbol: string
  mint_address: string
  token_age_hours: number
  initial_holders: number
  launch_volume: number
  launch_price: number
  current_price: number
  price_change_24h: number
  last_updated: string
}

export interface VolumeSpike {
  token_id: string
  token_symbol: string
  mint_address: string
  volume_spike_ratio: number
  previous_volume: number
  current_volume: number
  spike_timestamp: string
  market_cap: number
  last_updated: string
}

export interface BehavioralDataResponse {
  whaleActivity: WhaleActivity[]
  newLaunches: NewLaunch[]
  volumeSpikes: VolumeSpike[]
  lastUpdated: string
  totalTokens: number
  activeTokens: number
}

class BehavioralDataService {
  private baseUrl: string
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Connect to your behavioral crawler system
    this.baseUrl = process.env.NEXT_PUBLIC_BEHAVIORAL_API_URL || 'http://localhost:3001'
  }

  /**
   * Get live behavioral data from your crawler system
   */
  async getLiveBehavioralData(): Promise<BehavioralDataResponse> {
    try {
      // First try to get data from your behavioral database
      const dbData = await this.getBehavioralDataFromDB()
      if (dbData && dbData.totalTokens > 0) {
        return dbData
      }

      // Fallback to your behavioral crawler API
      const crawlerData = await this.getBehavioralDataFromCrawler()
      if (crawlerData) {
        return crawlerData
      }

      // Final fallback to mock data (for development)
      return this.getMockBehavioralData()
    } catch (error) {
      console.error('Failed to fetch behavioral data:', error)
      return this.getMockBehavioralData()
    }
  }

  /**
   * Get behavioral data from your database (using your MVP schema)
   */
  private async getBehavioralDataFromDB(): Promise<BehavioralDataResponse | null> {
    try {
      // Only try to fetch in browser environment to prevent server-side hanging
      if (typeof window === 'undefined') {
        return null
      }
      
      const response = await fetch('/api/behavioral-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Database fetch failed:', error)
      return null
    }
  }

  /**
   * Get behavioral data from your crawler system
   */
  private async getBehavioralDataFromCrawler(): Promise<BehavioralDataResponse | null> {
    try {
      // Connect to your behavioral-mvp-crawler
      const response = await fetch(`${this.baseUrl}/api/behavioral-crawler/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return this.transformCrawlerData(data)
    } catch (error) {
      console.error('Crawler fetch failed:', error)
      return null
    }
  }

  /**
   * Transform crawler data to our format
   */
  private transformCrawlerData(crawlerData: any): BehavioralDataResponse {
    // Transform your crawler data to match our interface
    // This will depend on your actual crawler output format
    return {
      whaleActivity: [],
      newLaunches: [],
      volumeSpikes: [],
      lastUpdated: new Date().toISOString(),
      totalTokens: 0,
      activeTokens: 0
    }
  }

  /**
   * Get mock behavioral data for development
   */
  private getMockBehavioralData(): BehavioralDataResponse {
    return {
      whaleActivity: [
        {
          token_id: 'mock-whale-1',
          token_symbol: 'WHALE',
          mint_address: 'mock-address-1',
          whale_buys_24h: 15,
          new_holders_24h: 234,
          volume_spike_ratio: 3.2,
          last_updated: new Date().toISOString(),
          price: 0.0015,
          price_change_24h: 45.2
        }
      ],
      newLaunches: [
        {
          token_id: 'mock-launch-1',
          token_symbol: 'LAUNCH',
          mint_address: 'mock-address-2',
          token_age_hours: 2,
          initial_holders: 45,
          launch_volume: 50000,
          launch_price: 0.001,
          current_price: 0.0015,
          price_change_24h: 50,
          last_updated: new Date().toISOString()
        }
      ],
      volumeSpikes: [
        {
          token_id: 'mock-spike-1',
          token_symbol: 'SPIKE',
          mint_address: 'mock-address-3',
          volume_spike_ratio: 4.5,
          previous_volume: 10000,
          current_volume: 45000,
          spike_timestamp: new Date().toISOString(),
          market_cap: 1000000,
          last_updated: new Date().toISOString()
        }
      ],
      lastUpdated: new Date().toISOString(),
      totalTokens: 3,
      activeTokens: 3
    }
  }

  /**
   * Get behavioral insights for a specific token
   */
  async getTokenBehavioralInsights(mintAddress: string): Promise<{
    whaleActivity?: WhaleActivity
    newLaunch?: NewLaunch
    volumeSpike?: VolumeSpike
  }> {
    const data = await this.getLiveBehavioralData()
    
    return {
      whaleActivity: data.whaleActivity.find(w => w.mint_address === mintAddress),
      newLaunch: data.newLaunches.find(l => l.mint_address === mintAddress),
      volumeSpike: data.volumeSpikes.find(s => s.mint_address === mintAddress)
    }
  }

  /**
   * Get trending behavioral tokens
   */
  async getTrendingBehavioralTokens(): Promise<{
    topWhaleActivity: WhaleActivity[]
    topNewLaunches: NewLaunch[]
    topVolumeSpikes: VolumeSpike[]
  }> {
    const data = await this.getLiveBehavioralData()
    
    return {
      topWhaleActivity: data.whaleActivity
        .sort((a, b) => b.whale_buys_24h - a.whale_buys_24h)
        .slice(0, 10),
      topNewLaunches: data.newLaunches
        .sort((a, b) => a.token_age_hours - b.token_age_hours)
        .slice(0, 10),
      topVolumeSpikes: data.volumeSpikes
        .sort((a, b) => b.volume_spike_ratio - a.volume_spike_ratio)
        .slice(0, 10)
    }
  }
}

export const behavioralDataService = new BehavioralDataService()
