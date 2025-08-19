# 🔥 Hot Token Detection & Multi-Tier Data Collection System

## 🎯 **System Overview**

A dynamic, multi-tier system that:
1. **Keeps existing hourly data** for established tokens
2. **Adds 1-minute data** for the hottest 150 tokens  
3. **Automatically promotes/demotes** tokens based on real-time hotness
4. **Manages data retention** to prevent storage bloat

---

## 📊 **Tier Structure**

### **Tier 1: Hot Tokens (Top 150)**
- **Data Frequency**: 1-minute candles
- **Retention**: 7 days of 1m data, then compress to 1h
- **Update Frequency**: Every 1 minute
- **Criteria**: Dynamic hotness score

### **Tier 2: Active Tokens (151-500)**
- **Data Frequency**: 5-minute candles
- **Retention**: 3 days of 5m data, then compress to 1h
- **Update Frequency**: Every 5 minutes
- **Criteria**: Moderate activity

### **Tier 3: Established Tokens (500+)**
- **Data Frequency**: 1-hour candles (existing system)
- **Retention**: 60+ days
- **Update Frequency**: Every hour
- **Criteria**: Long-term tracking

---

## 🔥 **Hotness Scoring Algorithm**

```typescript
interface HotnessMetrics {
  volume_24h: number;
  volume_1h: number;
  price_change_24h: number;
  price_change_1h: number;
  holders_change_24h: number;
  mentions_count?: number; // Social signals
  transaction_count_1h: number;
  unique_wallets_1h: number;
  age_hours: number; // How new the token is
}

function calculateHotnessScore(metrics: HotnessMetrics): number {
  let score = 0;
  
  // Volume momentum (40% weight)
  const volumeRatio = metrics.volume_1h / (metrics.volume_24h / 24);
  score += Math.min(volumeRatio * 40, 40);
  
  // Price volatility (30% weight)
  const volatility = Math.abs(metrics.price_change_1h) + Math.abs(metrics.price_change_24h);
  score += Math.min(volatility * 0.3, 30);
  
  // Activity surge (20% weight)
  const activityScore = (metrics.transaction_count_1h / 100) + (metrics.unique_wallets_1h / 50);
  score += Math.min(activityScore, 20);
  
  // Newness bonus (10% weight) - favor newer tokens
  const ageBonus = metrics.age_hours < 48 ? (48 - metrics.age_hours) / 48 * 10 : 0;
  score += ageBonus;
  
  return Math.min(score, 100);
}
```

---

## 🗃️ **Database Schema Extensions**

### **Token Tiers Table**
```sql
CREATE TABLE token_tiers (
    id BIGSERIAL PRIMARY KEY,
    token_address VARCHAR(50) NOT NULL,
    current_tier INTEGER NOT NULL CHECK (current_tier IN (1, 2, 3)),
    hotness_score NUMERIC(5, 2) NOT NULL,
    last_tier_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tier_1_promoted_at TIMESTAMP WITH TIME ZONE,
    tier_1_demoted_at TIMESTAMP WITH TIME ZONE,
    consecutive_updates INTEGER DEFAULT 0,
    data_retention_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(token_address)
);

CREATE INDEX idx_token_tiers_tier ON token_tiers(current_tier);
CREATE INDEX idx_token_tiers_hotness ON token_tiers(hotness_score DESC);
CREATE INDEX idx_token_tiers_updated ON token_tiers(updated_at DESC);
```

### **Hotness Metrics Table**
```sql
CREATE TABLE hotness_metrics (
    id BIGSERIAL PRIMARY KEY,
    token_address VARCHAR(50) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    volume_24h NUMERIC(20, 2) NOT NULL,
    volume_1h NUMERIC(20, 2) NOT NULL,
    price_change_24h NUMERIC(10, 4) NOT NULL,
    price_change_1h NUMERIC(10, 4) NOT NULL,
    holders_change_24h INTEGER DEFAULT 0,
    transaction_count_1h INTEGER DEFAULT 0,
    unique_wallets_1h INTEGER DEFAULT 0,
    age_hours NUMERIC(10, 2) NOT NULL,
    hotness_score NUMERIC(5, 2) NOT NULL,
    
    INDEX idx_hotness_token_time (token_address, calculated_at DESC),
    INDEX idx_hotness_score (hotness_score DESC),
    INDEX idx_hotness_calculated (calculated_at DESC)
);
```