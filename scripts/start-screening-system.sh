#!/bin/bash

# Pre-Market Screening System - Quick Start Script
# This script launches all required services for testing

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/Users/user/AI-Counsil/AICouncil"

echo -e "${BLUE}"
echo "======================================================================="
echo "  Pre-Market Screening System - Quick Start"
echo "  Database-Backed Architecture (Gemini AI Recommended)"
echo "======================================================================="
echo -e "${NC}"

# Check if we're in the right directory
cd "$PROJECT_ROOT" || exit 1

# Function to check if process is running
check_process() {
    local port=$1
    local process_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Port $port already in use by $process_name${NC}"
        echo -e "${YELLOW}   Killing existing process...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Step 1: Check environment variables
echo -e "${BLUE}Step 1: Checking environment variables...${NC}"

if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    echo -e "${YELLOW}   Please create .env.local from .env.local.example${NC}"
    echo -e "${YELLOW}   cp .env.local.example .env.local${NC}"
    exit 1
fi

# Source environment variables
set -a
source .env.local
set +a

# Check required variables
REQUIRED_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "${RED}   - $var${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"

# Step 2: Check Python dependencies
echo -e "${BLUE}Step 2: Checking Python dependencies...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found!${NC}"
    exit 1
fi

# Check if ib_insync is installed
if ! python3 -c "import ib_insync" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  ib_insync not found. Installing...${NC}"
    pip3 install ib-insync
fi

# Check if supabase is installed
if ! python3 -c "import supabase" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  supabase not found. Installing...${NC}"
    pip3 install supabase
fi

# Check if fastapi is installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  fastapi not found. Installing...${NC}"
    pip3 install fastapi uvicorn
fi

echo -e "${GREEN}✅ Python dependencies installed${NC}"

# Step 3: Check TWS Desktop
echo -e "${BLUE}Step 3: Checking TWS Desktop connection...${NC}"
echo -e "${YELLOW}   Make sure TWS Desktop or IB Gateway is running!${NC}"
echo -e "${YELLOW}   - Paper trading: Port 7496${NC}"
echo -e "${YELLOW}   - Live trading: Port 4001${NC}"
read -p "   Press Enter when TWS is ready (or Ctrl+C to exit)..."

# Step 4: Start FastAPI server
echo -e "${BLUE}Step 4: Starting FastAPI server on port 8001...${NC}"

check_process 8001 "FastAPI"

# Start FastAPI in background
uvicorn api.main:app --host 127.0.0.1 --port 8001 --reload > logs/fastapi.log 2>&1 &
FASTAPI_PID=$!

# Wait for FastAPI to start
echo -e "${YELLOW}   Waiting for FastAPI to start...${NC}"
sleep 3

# Check if FastAPI is running
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ FastAPI started successfully (PID: $FASTAPI_PID)${NC}"
    echo -e "${GREEN}   http://localhost:8001/api/health${NC}"
else
    echo -e "${RED}❌ FastAPI failed to start. Check logs/fastapi.log${NC}"
    kill $FASTAPI_PID 2>/dev/null || true
    exit 1
fi

# Step 5: Run orchestrator to populate database
echo -e "${BLUE}Step 5: Running screening orchestrator...${NC}"

python3 -m lib.trading.screening.screening_orchestrator

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Orchestrator completed successfully${NC}"
else
    echo -e "${RED}❌ Orchestrator failed. Check output above.${NC}"
    echo -e "${YELLOW}   Common issues:${NC}"
    echo -e "${YELLOW}   - TWS Desktop not running or API not enabled${NC}"
    echo -e "${YELLOW}   - Client ID already in use (change in orchestrator.py)${NC}"
    echo -e "${YELLOW}   - No stocks found (market closed or no gappers)${NC}"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        kill $FASTAPI_PID 2>/dev/null || true
        exit 1
    fi
fi

# Step 6: Verify data in database
echo -e "${BLUE}Step 6: Verifying data in database...${NC}"

LATEST_DATA=$(curl -s http://localhost:8001/api/screening/latest)

if [ -z "$LATEST_DATA" ] || [ "$LATEST_DATA" == "null" ]; then
    echo -e "${YELLOW}⚠️  No screening data found in database${NC}"
    echo -e "${YELLOW}   Run test script to populate mock data:${NC}"
    echo -e "${YELLOW}   python scripts/test-database-flow.py${NC}"
else
    STOCK_COUNT=$(echo "$LATEST_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('total_returned', 0))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ Database contains screening data ($STOCK_COUNT stocks)${NC}"
fi

# Step 7: Start Next.js
echo -e "${BLUE}Step 7: Starting Next.js development server...${NC}"

check_process 3000 "Next.js"

# Start Next.js in background
npm run dev > logs/nextjs.log 2>&1 &
NEXTJS_PID=$!

echo -e "${YELLOW}   Waiting for Next.js to start...${NC}"
sleep 5

# Check if Next.js is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Next.js started successfully (PID: $NEXTJS_PID)${NC}"
    echo -e "${GREEN}   http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Next.js failed to start. Check logs/nextjs.log${NC}"
    kill $FASTAPI_PID 2>/dev/null || true
    kill $NEXTJS_PID 2>/dev/null || true
    exit 1
fi

# Step 8: Success summary
echo -e "${BLUE}"
echo "======================================================================="
echo "  ✅ All services started successfully!"
echo "======================================================================="
echo -e "${NC}"

echo -e "${GREEN}Services running:${NC}"
echo -e "  • FastAPI:  http://localhost:8001/api/health"
echo -e "  • Next.js:  http://localhost:3000/trading/screening"
echo ""
echo -e "${GREEN}Process IDs:${NC}"
echo -e "  • FastAPI PID: $FASTAPI_PID"
echo -e "  • Next.js PID: $NEXTJS_PID"
echo ""
echo -e "${GREEN}Logs:${NC}"
echo -e "  • FastAPI: logs/fastapi.log"
echo -e "  • Next.js: logs/nextjs.log"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Open browser: http://localhost:3000/trading/screening"
echo -e "  2. You should see pre-market screening results"
echo -e "  3. Enable auto-refresh to test live updates"
echo ""
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  kill $FASTAPI_PID $NEXTJS_PID"
echo ""
echo -e "${YELLOW}To run orchestrator again:${NC}"
echo -e "  python3 -m lib.trading.screening.screening_orchestrator"
echo ""

# Save PIDs to file for easy cleanup
echo "$FASTAPI_PID" > /tmp/screening-fastapi.pid
echo "$NEXTJS_PID" > /tmp/screening-nextjs.pid

echo -e "${GREEN}🎉 System ready for testing!${NC}"
echo ""
