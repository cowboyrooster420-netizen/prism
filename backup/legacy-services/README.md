# Legacy Services Backup

This folder contains services that were built but later replaced with better implementations. They are kept here as reference material in case you need to:

1. **Reference the original implementation approach**
2. **Extract specific functionality** for reuse
3. **Understand the evolution** of your system architecture

## Services Moved to Backup

### 1. `smart-token-crawler.ts`
- **Original Purpose**: Smart token crawling with AI analysis
- **Replaced By**: Birdeye crawler + Jupiter crawler integration
- **Reason for Replacement**: Birdeye provided more reliable data, Jupiter added behavioral analysis
- **Date Moved**: $(date)

### 2. `ai-watchlist-analyzer.ts`
- **Original Purpose**: AI-powered watchlist analysis
- **Replaced By**: Unified AI chat system (`src/pages/api/unified-ai-chat.ts`)
- **Reason for Replacement**: Unified system provided better integration and more flexible AI interactions
- **Date Moved**: $(date)

### 3. `technical-analysis-service.ts`
- **Original Purpose**: Technical analysis calculations and signals
- **Replaced By**: Edge pipeline system (`src/components/EdgePipeline.tsx`)
- **Reason for Replacement**: Edge pipeline provided more comprehensive analysis and better UI integration
- **Date Moved**: $(date)

## Current Working Architecture

Your current system uses:
- **Birdeye Crawler**: Primary data source for top tokens and trending
- **Jupiter Smart Crawler**: Secondary data source and behavioral analysis
- **Helius Behavioral Analysis**: On-chain behavioral metrics
- **Volume Prioritizer**: Volume-based token filtering
- **Unified AI Chat**: AI-powered analysis and recommendations
- **Edge Pipeline**: Technical analysis and scoring

## How to Restore (If Needed)

To restore any of these services:
1. Copy the file back to its original location
2. Update imports in `src/services/unified-crawler-manager.ts`
3. Set the service status to `true` in the manager
4. Test the integration

## Notes

- These services may have dependencies that are no longer available
- They may need updates to work with current data structures
- Consider them as "reference implementations" rather than "drop-in replacements"
