#!/bin/bash
#
# Start TWS Screening API Server
#
# Runs FastAPI server on localhost:8000 with auto-reload.
# CORS enabled for Next.js (localhost:3000).
#
# Usage: bash scripts/start-screening-api.sh
#

echo "================================================================================"
echo "TWS SCREENING API - STARTING SERVER"
echo "================================================================================"
echo ""
echo "Server will run on: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "Health Check: http://localhost:8000/api/health"
echo ""
echo "Prerequisites:"
echo "  ✓ TWS Desktop running on port 7496"
echo "  ✓ API enabled in TWS settings"
echo "  ✓ Market data subscriptions active (\$14.50/mo)"
echo "  ✓ (Optional) FINNHUB_API_KEY environment variable"
echo ""
echo "================================================================================"
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "[INFO] Activating virtual environment..."
    source venv/bin/activate
fi

# Check if uvicorn is installed
if ! command -v uvicorn &> /dev/null; then
    echo "[ERROR] uvicorn not found!"
    echo "Install with: pip install fastapi uvicorn"
    exit 1
fi

# Check if TWS is running (basic port check)
if ! nc -z localhost 7496 2>/dev/null; then
    echo "[WARNING] ⚠️  TWS Desktop may not be running on port 7496"
    echo "Make sure TWS is running before making API calls."
    echo ""
fi

# Start FastAPI server
echo "[INFO] Starting FastAPI server..."
echo ""
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 --log-level info
