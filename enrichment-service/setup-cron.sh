#!/bin/bash

# setup-cron.sh - Automated setup for token enrichment cron jobs

# Run this script from your enrichment-service directory

set -e  # Exit on any error

# Colors for output

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output

print_status() {
echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
echo -e "${BLUE}=== $1 ===${NC}"
}

# Get current directory

CURRENT_DIR=$(pwd)
SERVICE_DIR="$CURRENT_DIR"

print_header "Token Enrichment Cron Setup"
echo "Service directory: $SERVICE_DIR"

# Verify we're in the right directory

if [ ! -f "package.json" ] || [ ! -f "enrichment-service.js" ]; then
print_error "This doesn't appear to be the enrichment service directory."
print_error "Please run this script from the enrichment-service directory."
exit 1
fi

# Test the service first

print_header "Testing Service"
print_status "Running service test..."

if npm run test; then
print_status "✅ Service test passed!"
else
print_error "❌ Service test failed. Please fix issues before setting up cron."
exit 1
fi

# Create log directory if it doesn't exist

print_header "Setting up Logging"

LOG_DIR="/var/log"
if [ ! -w "$LOG_DIR" ]; then
print_warning "Cannot write to $LOG_DIR, using local logs directory"
LOG_DIR="$SERVICE_DIR/logs"
mkdir -p "$LOG_DIR"
fi

LOG_FILE="$LOG_DIR/enrichment.log"
ERROR_LOG="$LOG_DIR/enrichment-error.log"

# Create log files with proper permissions

touch "$LOG_FILE" "$ERROR_LOG" 2>/dev/null || {
print_warning "Cannot create logs in $LOG_DIR, using local directory"
LOG_DIR="$SERVICE_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/enrichment.log"
ERROR_LOG="$LOG_DIR/enrichment-error.log"
touch "$LOG_FILE" "$ERROR_LOG"
}

print_status "Log files created:"
print_status "  Main log: $LOG_FILE"
print_status "  Error log: $ERROR_LOG"

# Create wrapper script

print_header "Creating Wrapper Script"

WRAPPER_SCRIPT="$SERVICE_DIR/run-enrichment.sh"

cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash

# Auto-generated wrapper script for token enrichment

SERVICE_DIR="$SERVICE_DIR"
LOG_FILE="$LOG_FILE"
ERROR_LOG="$ERROR_LOG"

# Function to log with timestamp

log_message() {
echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to log errors

log_error() {
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG"
}

# Change to service directory

cd "$SERVICE_DIR" || {
log_error "Failed to change to service directory: $SERVICE_DIR"
exit 1
}

# Load environment variables

if [ -f ".env" ]; then
set -a
source .env
set +a
fi

# Ensure Node.js is in PATH

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Run enrichment

log_message "Starting token enrichment..."

if npm run enrich 2>&1 | tee -a "$LOG_FILE"; then
EXIT_CODE=\${PIPESTATUS[0]}
else
EXIT_CODE=\$?
fi

if [ \$EXIT_CODE -eq 0 ]; then
log_message "Enrichment completed successfully"
else
log_error "Enrichment failed with exit code: \$EXIT_CODE"
exit \$EXIT_CODE
fi
EOF

chmod +x "$WRAPPER_SCRIPT"
print_status "Created wrapper script: $WRAPPER_SCRIPT"

# Present cron options

print_header "Cron Schedule Options"

echo "Choose your preferred schedule:"
echo "1) Every hour (recommended for active trading)"
echo "2) Every 2 hours (moderate activity)"
echo "3) Every 4 hours (lower activity)"
echo "4) Custom schedule"
echo "5) Skip cron setup"

read -p "Enter your choice (1-5): " choice

case $choice in
1)
CRON_SCHEDULE="0 * * * *"
DESCRIPTION="every hour"
;;
2)
CRON_SCHEDULE="0 */2 * * *"
DESCRIPTION="every 2 hours"
;;
3)
CRON_SCHEDULE="0 */4 * * *"
DESCRIPTION="every 4 hours"
;;
4)
read -p "Enter custom cron schedule (e.g., '0 */6 * * *'): " CRON_SCHEDULE
DESCRIPTION="custom schedule"
;;
5)
print_status "Skipping cron setup. You can manually add this to your crontab:"
echo "0 * * * * $WRAPPER_SCRIPT"
exit 0
;;
*)
print_error "Invalid choice. Exiting."
exit 1
;;
esac

# Add to crontab

print_header "Installing Cron Job"

CRON_ENTRY="$CRON_SCHEDULE $WRAPPER_SCRIPT"

# Check if cron entry already exists

if crontab -l 2>/dev/null | grep -q "$WRAPPER_SCRIPT"; then
print_warning "Cron entry already exists. Updating..."
# Remove existing entry and add new one
(crontab -l 2>/dev/null | grep -v "$WRAPPER_SCRIPT"; echo "$CRON_ENTRY") | crontab -
else
# Add new entry
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
fi

print_status "✅ Cron job installed successfully!"
print_status "Schedule: $DESCRIPTION ($CRON_SCHEDULE)"
print_status "Command: $WRAPPER_SCRIPT"

# Verify crontab

print_header "Verification"
print_status "Current crontab entries:"
crontab -l | grep -E "(enrichment|$WRAPPER_SCRIPT)" || print_warning "No enrichment entries found in crontab"

# Final instructions

print_header "Setup Complete!"
echo
print_status "Your token enrichment service is now scheduled to run $DESCRIPTION"
print_status "Monitor logs with: tail -f $LOG_FILE"
print_status "Check errors with: tail -f $ERROR_LOG"
print_status "View crontab with: crontab -l"
print_status "Test manually with: $WRAPPER_SCRIPT"
echo
print_warning "Note: The first enrichment will run at the next scheduled time."
print_warning "To run immediately: npm run enrich" 