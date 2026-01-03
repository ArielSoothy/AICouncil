#!/bin/bash
#
# TWS API Screening Setup Script
# Sets up Python environment and dependencies for TWS API migration
#
# Usage: bash scripts/setup-tws-screening.sh
#

set -e  # Exit on error

echo "======================================================================="
echo "TWS API Screening - Setup Script"
echo "======================================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "[ERROR] ❌ Please run this script from the AICouncil root directory"
    exit 1
fi

# Check Python version
echo "[1/5] Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] ❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "  ✅ Found Python $PYTHON_VERSION"

# Create virtual environment
echo ""
echo "[2/5] Creating Python virtual environment..."
if [ -d "venv" ]; then
    echo "  ℹ️  Virtual environment already exists"
else
    python3 -m venv venv
    echo "  ✅ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "[3/5] Activating virtual environment..."
source venv/bin/activate
echo "  ✅ Virtual environment activated"

# Install dependencies
echo ""
echo "[4/5] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "  ✅ Dependencies installed"

# Test TWS connection
echo ""
echo "[5/5] Testing TWS Scanner..."
echo "  Note: This requires TWS Desktop running on port 7496"
echo "  Press Ctrl+C to skip test if TWS not running"
echo ""

# Give user a chance to cancel
sleep 2

# Run test
python3 -m lib.trading.screening.tws_scanner

echo ""
echo "======================================================================="
echo "Setup Complete!"
echo "======================================================================="
echo ""
echo "Next steps:"
echo "  1. Make sure TWS Desktop is running on port 7496"
echo "  2. Enable API in TWS settings"
echo "  3. Run test: python3 -m lib.trading.screening.tws_scanner"
echo ""
echo "To activate the virtual environment in future sessions:"
echo "  source venv/bin/activate"
echo ""
