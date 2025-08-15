'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { behavioralDataService, BehavioralDataResponse } from '../services/behavioral-data-service'

// Behavioral data types
interface WhaleActivity {
  token_id: string
  token_symbol: string
  whale_buys_24h: number
  new_holders_24h: number
  volume_spike_ratio: number
  last_updated: string
}

interface NewLaunch {
  token_id: string
  token_symbol: string
  token_age_hours: number
  initial_holders: number
  launch_volume: number
  launch_price: number
  current_price: number
  price_change_24h: number
}

interface VolumeSpike {
  token_id: string
  token_symbol: string
  volume_spike_ratio: number
  previous_volume: number
  current_volume: number
  spike_timestamp: string
  market_cap: number
}

interface BehavioralData {
  whaleActivity: WhaleActivity[]
  newLaunches: NewLaunch[]
  volumeSpikes: VolumeSpike[]
  lastUpdated: string
  isLoading: boolean
  error: string | null
}

interface BehavioralDataContextType {
  data: BehavioralData
  refreshData: () => Promise<void>
  getTokenBehavioralInsights: (tokenId: string) => {
    whaleActivity?: WhaleActivity
    newLaunch?: NewLaunch
    volumeSpike?: VolumeSpike
  }
}

const BehavioralDataContext = createContext<BehavioralDataContextType | undefined>(undefined)

export function useBehavioralData() {
  const context = useContext(BehavioralDataContext)
  if (context === undefined) {
    throw new Error('useBehavioralData must be used within a BehavioralDataProvider')
  }
  return context
}

interface BehavioralDataProviderProps {
  children: ReactNode
}

export function BehavioralDataProvider({ children }: BehavioralDataProviderProps) {
  const [data, setData] = useState<BehavioralData>({
    whaleActivity: [],
    newLaunches: [],
    volumeSpikes: [],
    lastUpdated: '',
    isLoading: false,
    error: null
  })

  const fetchBehavioralData = async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Fetch real behavioral data from your crawler system
      const liveData = await behavioralDataService.getLiveBehavioralData()
      
      // Transform the service response to our context format
      const transformedData: BehavioralData = {
        whaleActivity: liveData.whaleActivity.map(w => ({
          token_id: w.token_id,
          token_symbol: w.token_symbol,
          whale_buys_24h: w.whale_buys_24h,
          new_holders_24h: w.new_holders_24h,
          volume_spike_ratio: w.volume_spike_ratio,
          last_updated: w.last_updated
        })),
        newLaunches: liveData.newLaunches.map(l => ({
          token_id: l.token_id,
          token_symbol: l.token_symbol,
          token_age_hours: l.token_age_hours,
          initial_holders: l.initial_holders,
          launch_volume: l.launch_volume,
          launch_price: l.launch_price,
          current_price: l.current_price,
          price_change_24h: l.price_change_24h,
          last_updated: l.last_updated
        })),
        volumeSpikes: liveData.volumeSpikes.map(s => ({
          token_id: s.token_id,
          token_symbol: s.token_symbol,
          volume_spike_ratio: s.volume_spike_ratio,
          previous_volume: s.previous_volume,
          current_volume: s.current_volume,
          spike_timestamp: s.spike_timestamp,
          market_cap: s.market_cap,
          last_updated: s.last_updated
        })),
        lastUpdated: liveData.lastUpdated,
        isLoading: false,
        error: null
      }

      setData(transformedData)
      console.log('🪄 Behavioral data updated:', {
        whaleActivity: transformedData.whaleActivity.length,
        newLaunches: transformedData.newLaunches.length,
        volumeSpikes: transformedData.volumeSpikes.length,
        totalTokens: liveData.totalTokens
      })
    } catch (error) {
      console.error('Failed to fetch behavioral data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch behavioral data'
      }))
    }
  }

  const refreshData = async () => {
    await fetchBehavioralData()
  }

  const getTokenBehavioralInsights = (tokenId: string) => {
    return {
      whaleActivity: data.whaleActivity.find(w => w.token_id === tokenId),
      newLaunch: data.newLaunches.find(l => l.token_id === tokenId),
      volumeSpike: data.volumeSpikes.find(s => s.token_id === tokenId)
    }
  }

  useEffect(() => {
    // Only fetch data on client side to prevent SSR issues
    if (typeof window !== 'undefined') {
      fetchBehavioralData()
      
      // Refresh data every 5 minutes
      const interval = setInterval(fetchBehavioralData, 5 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [])

  const value: BehavioralDataContextType = {
    data,
    refreshData,
    getTokenBehavioralInsights
  }

  return (
    <BehavioralDataContext.Provider value={value}>
      {children}
    </BehavioralDataContext.Provider>
  )
}
