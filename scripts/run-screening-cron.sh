#!/bin/bash
#
# Pre-Market Screening Cron Job
#
# Runs TWS screening orchestrator and saves results to Supabase database.
# Designed to run on schedule during pre-market hours (4:00 AM - 9:30 AM ET).
#
# Crontab example (runs every 15 minutes during pre-market, Mon-Fri):
# */15 4-9 * * 1-5 cd /path/to/AICouncil && bash scripts/run-screening-cron.sh
#
# GitHub Actions example:
# schedule:
#   - cron: '*/15 8-13 * * 1-5'  # UTC time (4-9am ET = 8am-1pm UTC in winter)
#

set -e  # Exit on error

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/screening-$(date +%Y%m%d).log"
PYTHON_CMD="python3"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================================================"
log "PRE-MARKET SCREENING CRON JOB STARTING"
log "========================================================================"

# Change to project directory
cd "$PROJECT_DIR"
log "Working directory: $PROJECT_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    log "Activating virtual environment..."
    source venv/bin/activate
fi

# Check if TWS is running
if ! nc -z localhost 7496 2>/dev/null; then
    log "[ERROR] TWS Desktop not running on port 7496"
    log "[ERROR] Screening aborted - start TWS Desktop first"
    exit 1
fi

log "✅ TWS Desktop detected on port 7496"

# Check environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    log "[ERROR] Supabase credentials not found in environment"
    log "[ERROR] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

log "✅ Supabase credentials found"

# Run screening orchestrator
log "Running screening orchestrator..."
log "Parameters: Gap ≥3%, Volume ≥500k, Max 20 stocks"

$PYTHON_CMD -m lib.trading.screening.screening_orchestrator 2>&1 | tee -a "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -eq 0 ]; then
    log "✅ Screening completed successfully"
    log "Results saved to Supabase database"
else
    log "❌ Screening failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
fi

log "========================================================================"
log "PRE-MARKET SCREENING CRON JOB COMPLETED"
log "========================================================================"
log ""

# Clean up old logs (keep last 30 days)
find "$LOG_DIR" -name "screening-*.log" -mtime +30 -delete 2>/dev/null || true

exit 0
