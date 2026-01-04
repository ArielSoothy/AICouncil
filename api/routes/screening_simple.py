#!/usr/bin/env python3
"""
Simple Screening API - Uses synchronous scanner that WORKS

No async complexity, no test mode, just real TWS data.
"""

from fastapi import APIRouter, BackgroundTasks, Query
from lib.trading.screening.tws_scanner_sync import TWSScannerSync
from datetime import datetime
import json
import os

router = APIRouter()

# Global status for frontend polling
screening_status = {
    "running": False,
    "step": "Idle",
    "progress": 0,
    "message": "Ready to scan",
    "stocks_found": 0
}


def run_simple_screening(
    min_volume: int,
    min_price: float,
    max_price: float,
    max_results: int
):
    """
    Run simple screening in background

    Step 1: Connect to TWS
    Step 2: Scan for stocks
    Step 3: Save to Supabase
    """
    try:
        screening_status["running"] = True
        screening_status["step"] = "Connecting to TWS"
        screening_status["progress"] = 10
        screening_status["message"] = "Connecting to TWS Desktop..."
        screening_status["stocks_found"] = 0

        # Step 1: Connect to TWS
        scanner = TWSScannerSync()
        scanner.connect()

        # Step 2: Scan for stocks
        screening_status["step"] = "Scanning"
        screening_status["progress"] = 30
        screening_status["message"] = "Scanning for stocks..."

        scan_results = scanner.scan_most_active(
            min_volume=min_volume,
            min_price=min_price,
            max_price=max_price,
            max_results=max_results
        )

        if not scan_results:
            screening_status["running"] = False
            screening_status["step"] = "Complete"
            screening_status["progress"] = 100
            screening_status["message"] = "No stocks found matching criteria"
            screening_status["stocks_found"] = 0
            scanner.disconnect()
            return

        # Step 3: Save to Supabase
        screening_status["step"] = "Saving"
        screening_status["progress"] = 70
        screening_status["message"] = f"Saving {len(scan_results)} stocks to database..."

        # Build results for database
        stocks = []
        for stock in scan_results:
            stocks.append({
                'symbol': stock['symbol'],
                'rank': stock['rank'],
                'exchange': stock['exchange'],
                'conid': stock['conid'],
                'price': 0.0,  # Will be enriched later
                'gap_percent': 0.0,  # Will be enriched later
                'volume': 0,  # Will be enriched later
                'relative_volume': 0.0,  # Will be enriched later
                'float_shares': 0,  # Will be enriched later
                'market_cap': 0,  # Will be enriched later
                'short_interest': 0.0,  # Will be enriched later
            })

        # Save to Supabase
        from lib.database.supabase_client import SupabaseClient

        supabase = SupabaseClient()
        result_data = {
            'stocks': stocks,
            'total_scanned': len(scan_results),
            'total_returned': len(stocks),
            'timestamp': datetime.now().isoformat(),
            'scan_parameters': {
                'min_volume': min_volume,
                'min_price': min_price,
                'max_price': max_price,
                'max_results': max_results
            }
        }

        saved_id = supabase.save_screening_result(result_data)

        # Complete
        screening_status["running"] = False
        screening_status["step"] = "Complete"
        screening_status["progress"] = 100
        screening_status["message"] = f"Found {len(stocks)} stocks!"
        screening_status["stocks_found"] = len(stocks)

        scanner.disconnect()

        print(f"[SUCCESS] ✅ Screening complete - {len(stocks)} stocks saved (ID: {saved_id})")

    except Exception as e:
        print(f"[ERROR] ❌ Screening failed: {e}")
        screening_status["running"] = False
        screening_status["step"] = "Error"
        screening_status["progress"] = 0
        screening_status["message"] = f"Error: {str(e)}"
        screening_status["stocks_found"] = 0


@router.post("/screening/run-simple")
async def run_screening_simple(
    background_tasks: BackgroundTasks,
    min_volume: int = Query(100000, description="Minimum volume (100K-5M)", ge=100000, le=5000000),
    min_price: float = Query(1.0, description="Minimum price ($0.01-$100)", ge=0.01, le=100.0),
    max_price: float = Query(20.0, description="Maximum price ($0.01-$1000)", ge=0.01, le=1000.0),
    max_results: int = Query(20, description="Maximum results (5-50)", ge=5, le=50)
):
    """
    Simple screening - scanner only, no enrichment

    **What it does**:
    1. Connects to TWS Desktop (port 7496)
    2. Runs MOST_ACTIVE scanner (works 24/7 with cached data)
    3. Saves results to Supabase database
    4. Results appear on frontend automatically

    **Filter Parameters**:
    - min_volume: 100K-5M (default: 100K)
    - min_price: $0.01-$100 (default: $1)
    - max_price: $0.01-$1000 (default: $20)
    - max_results: 5-50 (default: 20)

    **Response**: Returns immediately, scanner runs in background (~1-5 seconds)
    """
    # Add task to background
    background_tasks.add_task(
        run_simple_screening,
        min_volume,
        min_price,
        max_price,
        max_results
    )

    return {
        "status": "started",
        "message": f"Simple screening started (volume ≥{min_volume:,}, price ${min_price}-${max_price})",
        "estimated_time_seconds": 3,
        "note": "Results will appear after refresh in ~3-5 seconds"
    }


@router.get("/screening/status-simple")
async def get_screening_status_simple():
    """
    Get current screening status (for real-time progress updates)

    Poll this endpoint every 1-2 seconds to track progress.
    """
    return screening_status
