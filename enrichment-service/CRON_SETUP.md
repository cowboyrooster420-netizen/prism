# Token Enrichment Service - Cron Setup Guide

## Quick Setup

1. **Make scripts executable:**
   ```bash
   chmod +x setup-cron.sh run-enrichment.sh
   ```

2. **Run the automated setup:**
   ```bash
   ./setup-cron.sh
   ```

3. **Follow the prompts** to choose your preferred schedule:
   - Every hour (recommended for active trading)
   - Every 2 hours (moderate activity)
   - Every 4 hours (lower activity)
   - Custom schedule

## Manual Setup (Alternative)

If you prefer to set up cron manually:

1. **Add to crontab:**
   ```bash
   crontab -e
   ```

2. **Add this line for hourly enrichment:**
   ```
   0 * * * * /Users/aaronburke/prism/enrichment-service/run-enrichment.sh
   ```

## Monitoring

- **View logs:** `tail -f logs/enrichment.log`
- **Check errors:** `tail -f logs/enrichment-error.log`
- **View crontab:** `crontab -l`
- **Test manually:** `npm run enrich`

## Cron Schedule Examples

- `0 * * * *` - Every hour
- `0 */2 * * *` - Every 2 hours
- `0 */4 * * *` - Every 4 hours
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight

## Troubleshooting

- **Check if cron is running:** `sudo launchctl list | grep cron`
- **View system logs:** `tail -f /var/log/system.log | grep cron`
- **Test wrapper script:** `./run-enrichment.sh`

## Files Created

- `run-enrichment.sh` - Production wrapper script
- `logs/enrichment.log` - Main log file
- `logs/enrichment-error.log` - Error log file
- Cron entry in your crontab 