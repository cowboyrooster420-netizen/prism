#!/bin/bash

# Auto-generated wrapper script for token enrichment

SERVICE_DIR="/Users/aaronburke/prism/enrichment-service"
LOG_FILE="/Users/aaronburke/prism/enrichment-service/logs/enrichment.log"
ERROR_LOG="/Users/aaronburke/prism/enrichment-service/logs/enrichment-error.log"

# Function to log with timestamp

log_message() {
echo "[2025-08-05 20:22:05] " | tee -a "/Users/aaronburke/prism/enrichment-service/logs/enrichment.log"
}

# Function to log errors

log_error() {
echo "[2025-08-05 20:22:05] ERROR: " | tee -a "/Users/aaronburke/prism/enrichment-service/logs/enrichment-error.log"
}

# Change to service directory

cd "/Users/aaronburke/prism/enrichment-service" || {
log_error "Failed to change to service directory: /Users/aaronburke/prism/enrichment-service"
exit 1
}

# Load environment variables

if [ -f ".env" ]; then
set -a
source .env
set +a
fi

# Ensure Node.js is in PATH

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/bin:/usr/local/sbin:/Library/Frameworks/Python.framework/Versions/3.10/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin:/Library/Frameworks/Python.framework/Versions/3.10/bin"

# Run enrichment

log_message "Starting token enrichment..."

if npm run enrich 2>&1 | tee -a "/Users/aaronburke/prism/enrichment-service/logs/enrichment.log"; then
EXIT_CODE=${PIPESTATUS[0]}
else
EXIT_CODE=$?
fi

if [ $EXIT_CODE -eq 0 ]; then
log_message "Enrichment completed successfully"
else
log_error "Enrichment failed with exit code: $EXIT_CODE"
exit $EXIT_CODE
fi
