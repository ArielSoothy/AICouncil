#!/bin/bash

# Pre-Market Screening System - Stop Script
# Stops all running services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "======================================================================="
echo "  Stopping Pre-Market Screening System"
echo "======================================================================="
echo -e "${NC}"

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping $service_name (PID: $PID)...${NC}"
            kill $PID 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID 2>/dev/null || true
            fi
            echo -e "${GREEN}✅ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  $service_name already stopped${NC}"
        fi
        rm "$pid_file"
    else
        echo -e "${YELLOW}⚠️  No PID file for $service_name${NC}"
    fi
}

# Function to kill process by port
kill_by_port() {
    local port=$1
    local service_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $service_name on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  No process running on port $port${NC}"
    fi
}

# Stop services by PID files first
kill_by_pid_file "/tmp/screening-fastapi.pid" "FastAPI"
kill_by_pid_file "/tmp/screening-nextjs.pid" "Next.js"

# Fallback: Stop by port (in case PID files don't exist)
kill_by_port 8001 "FastAPI"
kill_by_port 3000 "Next.js"

echo -e "${BLUE}"
echo "======================================================================="
echo "  ✅ All services stopped"
echo "======================================================================="
echo -e "${NC}"

echo -e "${GREEN}System is shut down.${NC}"
echo ""
echo -e "${YELLOW}To start again, run:${NC}"
echo -e "  ./scripts/start-screening-system.sh"
echo ""
