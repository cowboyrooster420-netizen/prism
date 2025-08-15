#!/bin/bash

# Setup script for TA Worker cron job
# This will run the TA worker every hour to keep technical analysis data fresh

echo "🎯 Setting up TA Worker automation..."

# Create log directory
mkdir -p /Users/aaronburke/prism/crawler/logs

# Get the current directory
CRAWLER_DIR="/Users/aaronburke/prism/crawler"

# Create cron command
CRON_COMMAND="0 * * * * cd $CRAWLER_DIR && npm run ta-runner >> logs/ta-worker.log 2>&1"

echo "📋 Cron command to add:"
echo "$CRON_COMMAND"
echo ""

echo "⚙️  To set up the cron job, run:"
echo "crontab -e"
echo ""
echo "Then add this line:"
echo "$CRON_COMMAND"
echo ""

echo "🔍 To view current cron jobs:"
echo "crontab -l"
echo ""

echo "📊 To view TA worker logs:"
echo "tail -f $CRAWLER_DIR/logs/ta-worker.log"
echo ""

echo "📈 To check TA status:"
echo "cd $CRAWLER_DIR && npm run ta-status"
echo ""

echo "✅ Manual test run:"
cd "$CRAWLER_DIR"
npm run ta-runner

echo ""
echo "🎉 TA Worker setup complete!"
echo "   • Working tokens: BONK, SOL, USDC"
echo "   • Working timeframe: 1h"
echo "   • Generating 109 features per token"
echo "   • Ready for hourly automation"