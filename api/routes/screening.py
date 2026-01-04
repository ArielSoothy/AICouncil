"""
Screening API Routes - Database-Backed Architecture

REST endpoints for pre-market stock screening.
Reads screening results from Supabase database (populated by scheduled orchestrator).

Architecture:
- Orchestrator runs on schedule (cron/GitHub Actions) during pre-market hours
- Writes results to Supabase database
- FastAPI reads from database (no ib_insync, no event loop conflicts!)
- Results may be 5-15min old, but acceptable for pre-market screening
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from api.models.screening import ScreeningResponse, HealthResponse
from datetime import datetime
from typing import Optional
import os
import subprocess
import sys

# Supabase for reading screening results
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


router = APIRouter(tags=["screening"])

# Global status tracking for orchestrator progress
orchestrator_status = {
    "running": False,
    "step": "",
    "progress": 0,  # 0-100
    "message": ""
}


def get_supabase_client() -> Optional[Client]:
    """Get Supabase client for database access"""
    if not SUPABASE_AVAILABLE:
        return None

    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if supabase_url and supabase_key:
        return create_client(supabase_url, supabase_key)
    return None


@router.get("/screening/latest", response_model=ScreeningResponse)
async def get_latest_screening(
    min_gap_percent: Optional[float] = Query(None, description="Filter by minimum gap %"),
    scan_code: Optional[str] = Query(None, description="Filter by scan code (TOP_PERC_GAIN, etc)")
):
    """
    Get latest pre-market screening results from database

    **Database-Backed Architecture**:
    - Orchestrator runs on schedule during pre-market hours (4am-9:30am ET)
    - Writes results to Supabase database
    - This endpoint reads latest results (fast, no TWS connection needed!)
    - Results may be 5-15min old depending on schedule

    **Response Example**:
    ```json
    {
        "stocks": [...],
        "total_scanned": 50,
        "total_returned": 20,
        "execution_time_seconds": 25.3,
        "timestamp": "2026-01-03T08:15:00"
    }
    ```

    **Query Parameters**:
    - `min_gap_percent`: Optional filter by minimum gap %
    - `scan_code`: Optional filter by scan code

    **Benefits**:
    - ⚡ Fast response (<100ms vs 20-30s for live screening)
    - ✅ No TWS connection required
    - ✅ No event loop conflicts
    - ✅ Scalable to unlimited concurrent users
    - 📊 Historical data available

    **Trade-off**:
    - Data may be 5-15min old (acceptable for pre-market screening)
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(
                status_code=503,
                detail="Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
            )

        # Build query
        query = supabase.table('screening_results').select('*')

        # Apply filters if provided
        if min_gap_percent is not None:
            query = query.gte('min_gap_percent', min_gap_percent)
        if scan_code:
            query = query.eq('scan_code', scan_code)

        # Get latest result
        response = query.order('created_at', desc=True).limit(1).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="No screening results found. Orchestrator may not have run yet."
            )

        # Extract result
        result = response.data[0]

        # Build scan_parameters from database record
        scan_parameters = {
            'min_gap_percent': result.get('min_gap_percent', 3.0),
            'min_volume': result.get('min_volume', 500000),
            'min_price': result.get('min_price', 1.0),
            'max_price': result.get('max_price', 20.0),
            'max_market_cap': result.get('max_market_cap', 3_000_000_000),
            'max_results': result.get('max_results', 20),
            'scan_code': result.get('scan_code', 'TOP_PERC_GAIN'),
            'include_sentiment': result.get('include_sentiment', False),
            'test_mode': result.get('test_mode', False)
        }

        # Convert to response model
        return ScreeningResponse(
            stocks=result['stocks'],
            total_scanned=result['total_scanned'],
            total_returned=result['total_returned'],
            execution_time_seconds=result['execution_time_seconds'],
            timestamp=result['created_at'],
            scan_parameters=scan_parameters
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Database query failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve screening results: {str(e)}"
        )


@router.get("/screening/history")
async def get_screening_history(
    limit: int = Query(10, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """
    Get historical screening results

    **Use Cases**:
    - View past pre-market screenings
    - Analyze screening trends over time
    - Debug orchestrator issues

    **Query Parameters**:
    - `limit`: Number of results (1-100, default: 10)
    - `offset`: Pagination offset (default: 0)

    **Response**: Array of screening results ordered by timestamp (newest first)
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(
                status_code=503,
                detail="Database not configured"
            )

        response = supabase.table('screening_results')\
            .select('id, created_at, total_scanned, total_returned, execution_time_seconds, min_gap_percent, scan_code')\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        return {
            "results": response.data,
            "count": len(response.data),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        print(f"[ERROR] History query failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve history: {str(e)}"
        )


def run_orchestrator_task(
    test_mode: bool = False,
    min_gap_percent: float = 10.0,
    min_volume: int = 500000,
    max_float_shares: int = 30000000,
    min_relative_volume: float = 5.0,
    min_price: float = 1.0,
    max_price: float = 20.0,
    max_results: int = 20
):
    """Background task to run the screening orchestrator with REAL-TIME logging

    Args:
        test_mode: Use test symbols instead of scanner
        min_gap_percent: Minimum gap percentage (5-50%)
        min_volume: Minimum volume (100K-5M)
        max_float_shares: Maximum float shares (5M-50M)
        min_relative_volume: Minimum relative volume (1x-20x)
        min_price: Minimum price ($0.01-$100)
        max_price: Maximum price ($0.01-$1000)
        max_results: Maximum results (5-50)
    """
    import threading
    global orchestrator_status

    def stream_output(pipe, prefix):
        """Stream output from subprocess in real-time AND update status"""
        try:
            for line in iter(pipe.readline, ''):
                if line:
                    print(f"{prefix} {line.rstrip()}", flush=True)

                    # Parse progress from orchestrator output
                    line_lower = line.lower()
                    if "test mode" in line_lower or "using test symbols" in line_lower:
                        orchestrator_status["step"] = "Test Mode: Using hardcoded symbols..."
                        orchestrator_status["progress"] = 5
                        orchestrator_status["message"] = "Bypassing scanner, using TSLA, AAPL, NVDA, MSFT, GOOGL"
                    elif "connecting to tws" in line_lower:
                        orchestrator_status["step"] = "Connecting to TWS Desktop..."
                        orchestrator_status["progress"] = 10
                        orchestrator_status["message"] = "Establishing connection to Interactive Brokers"
                    elif "running scanner" in line_lower or "scanning" in line_lower:
                        orchestrator_status["step"] = "Scanning for stocks..."
                        orchestrator_status["progress"] = 30
                        orchestrator_status["message"] = "Looking for pre-market gappers and momentum plays"
                    elif "fetching fundamentals" in line_lower:
                        orchestrator_status["step"] = "Fetching fundamentals..."
                        orchestrator_status["progress"] = 50
                        orchestrator_status["message"] = "Getting P/E ratios, market cap, and financial data"
                    elif "fetching short" in line_lower:
                        orchestrator_status["step"] = "Fetching short data..."
                        orchestrator_status["progress"] = 60
                        orchestrator_status["message"] = "Checking shortable shares and borrow difficulty"
                    elif "fetching ratios" in line_lower:
                        orchestrator_status["step"] = "Calculating ratios..."
                        orchestrator_status["progress"] = 70
                        orchestrator_status["message"] = "Computing ROE, debt-to-equity, and other metrics"
                    elif "fetching bars" in line_lower:
                        orchestrator_status["step"] = "Fetching price bars..."
                        orchestrator_status["progress"] = 80
                        orchestrator_status["message"] = "Getting VWAP and price data"
                    elif "sentiment" in line_lower and "fetching" in line_lower:
                        orchestrator_status["step"] = "Analyzing sentiment..."
                        orchestrator_status["progress"] = 85
                        orchestrator_status["message"] = "Checking social media and news sentiment"
                    elif "saving" in line_lower or "database" in line_lower:
                        orchestrator_status["step"] = "Saving to database..."
                        orchestrator_status["progress"] = 95
                        orchestrator_status["message"] = "Storing results in Supabase"
                    elif "complete" in line_lower or "finished" in line_lower:
                        orchestrator_status["step"] = "Complete"
                        orchestrator_status["progress"] = 100
                        orchestrator_status["message"] = "Screening complete!"
        except Exception as e:
            print(f"{prefix} [Stream error: {e}]", flush=True)
        finally:
            pipe.close()

    try:
        mode_msg = "test mode" if test_mode else "real scanner mode"
        print(f"[INFO] Starting orchestrator in background ({mode_msg})...", flush=True)

        # Initialize status
        orchestrator_status["running"] = True
        orchestrator_status["step"] = "Starting orchestrator..."
        orchestrator_status["progress"] = 0
        orchestrator_status["message"] = f"Initializing screening pipeline ({mode_msg})"

        # Pass environment variables to subprocess
        env = os.environ.copy()

        # Build command with all filter parameters
        cmd = [sys.executable, "-u", "-m", "lib.trading.screening.screening_orchestrator"]
        if test_mode:
            cmd.append("--test-mode")
        cmd.extend(["--min-gap-percent", str(min_gap_percent)])
        cmd.extend(["--min-volume", str(min_volume)])
        cmd.extend(["--max-float-shares", str(max_float_shares)])
        cmd.extend(["--min-relative-volume", str(min_relative_volume)])
        cmd.extend(["--min-price", str(min_price)])
        cmd.extend(["--max-price", str(max_price)])
        cmd.extend(["--max-results", str(max_results)])

        # Use Popen for real-time streaming (not subprocess.run)
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line buffered
            env=env
        )

        # Stream stdout and stderr in separate threads
        stdout_thread = threading.Thread(
            target=stream_output,
            args=(process.stdout, "[ORCHESTRATOR]"),
            daemon=True
        )
        stderr_thread = threading.Thread(
            target=stream_output,
            args=(process.stderr, "[ORCHESTRATOR ERR]"),
            daemon=True
        )

        stdout_thread.start()
        stderr_thread.start()

        # Wait for process to complete (with timeout)
        try:
            returncode = process.wait(timeout=300)  # 5 minute timeout

            if returncode == 0:
                print("[SUCCESS] ✅ Orchestrator completed successfully", flush=True)
                orchestrator_status["running"] = False
                orchestrator_status["step"] = "Complete"
                orchestrator_status["progress"] = 100
                orchestrator_status["message"] = "Screening complete! Results ready."
            else:
                print(f"[ERROR] ❌ Orchestrator failed with code {returncode}", flush=True)
                orchestrator_status["running"] = False
                orchestrator_status["step"] = "Error"
                orchestrator_status["progress"] = 0
                orchestrator_status["message"] = f"Orchestrator failed with code {returncode}"

        except subprocess.TimeoutExpired:
            print("[ERROR] ❌ Orchestrator timeout (>5 minutes)", flush=True)
            process.kill()
            orchestrator_status["running"] = False
            orchestrator_status["step"] = "Error"
            orchestrator_status["progress"] = 0
            orchestrator_status["message"] = "Orchestrator timeout (>5 minutes)"

    except Exception as e:
        print(f"[ERROR] ❌ Orchestrator error: {e}", flush=True)
        orchestrator_status["running"] = False
        orchestrator_status["step"] = "Error"
        orchestrator_status["progress"] = 0
        orchestrator_status["message"] = f"Error: {str(e)}"


@router.post("/screening/run")
async def run_screening(
    background_tasks: BackgroundTasks,
    test_mode: bool = Query(False, description="Use test symbols (TSLA, AAPL, NVDA, MSFT, GOOGL) instead of scanner"),
    min_gap_percent: float = Query(10.0, description="Minimum gap percentage (5-50%)", ge=5.0, le=50.0),
    min_volume: int = Query(500000, description="Minimum volume (100K-5M)", ge=100000, le=5000000),
    max_float_shares: int = Query(30000000, description="Maximum float shares (5M-50M)", ge=5000000, le=50000000),
    min_relative_volume: float = Query(5.0, description="Minimum relative volume (1x-20x)", ge=1.0, le=20.0),
    min_price: float = Query(1.0, description="Minimum price ($0.01-$100)", ge=0.01, le=100.0),
    max_price: float = Query(20.0, description="Maximum price ($0.01-$1000)", ge=0.01, le=1000.0),
    max_results: int = Query(20, description="Maximum results (5-50)", ge=5, le=50)
):
    """
    Trigger screening orchestrator to run now

    **USE THIS BUTTON** instead of running Python commands manually!

    **What it does**:
    1. Connects to TWS Desktop (port 7496)
    2. Runs all 6 data sources (Scanner, Fundamentals, Short Data, Ratios, Bars, Sentiment)
    3. Calculates composite scores
    4. Saves results to Supabase database
    5. Results appear on frontend automatically

    **Requirements**:
    - TWS Desktop or IB Gateway must be running (unless test_mode=true)
    - API enabled in TWS (port 7496 for paper, 4001 for live)

    **Test Mode** (test_mode=true):
    - Uses hardcoded symbols: TSLA, AAPL, NVDA, MSFT, GOOGL
    - No TWS Desktop required
    - Useful for testing without market connection

    **Filter Parameters** (all adjustable in UI):
    - min_gap_percent: 5-50% (default: 10%) - Higher gaps = stronger momentum
    - min_volume: 100K-5M (default: 500K) - Absolute volume threshold
    - max_float_shares: 5M-50M (default: 30M) - Lower float = easier to move
    - min_relative_volume: 1x-20x (default: 5x) - Volume vs 20-day average
    - min_price: $0.01-$100 (default: $1) - Minimum stock price
    - max_price: $0.01-$1000 (default: $20) - Maximum stock price
    - max_results: 5-50 (default: 20) - Number of stocks to return

    **Response**: Returns immediately, orchestrator runs in background (~10-30 seconds)

    **After clicking**: Wait 10-30 seconds, then click "Refresh" to see new results
    """
    # Add task to background with all filter parameters
    background_tasks.add_task(
        run_orchestrator_task,
        test_mode,
        min_gap_percent,
        min_volume,
        max_float_shares,
        min_relative_volume,
        min_price,
        max_price,
        max_results
    )

    mode_msg = "test mode (TSLA, AAPL, etc.)" if test_mode else "real scanner mode"
    return {
        "status": "started",
        "message": f"Screening orchestrator started in background ({mode_msg}, gap ≥{min_gap_percent}%)",
        "test_mode": test_mode,
        "min_gap_percent": min_gap_percent,
        "estimated_time_seconds": 15,
        "note": "Results will appear after refresh in ~15-30 seconds"
    }


@router.get("/screening/status")
async def get_screening_status():
    """
    Get current orchestrator status (for real-time progress updates)

    **Frontend polling**: Poll this endpoint every 1-2 seconds while orchestrator is running

    **Response Example**:
    ```json
    {
        "running": true,
        "step": "Scanning for stocks...",
        "progress": 30,
        "message": "Looking for pre-market gappers and momentum plays"
    }
    ```

    **Progress values**:
    - 0: Not started
    - 10: Connecting to TWS
    - 30: Running scanner
    - 50: Fetching fundamentals
    - 60: Fetching short data
    - 70: Calculating ratios
    - 80: Fetching price bars
    - 85: Analyzing sentiment
    - 95: Saving to database
    - 100: Complete
    """
    global orchestrator_status
    return orchestrator_status


@router.get("/test")
async def test_tws_connection(symbol: str = Query("TSLA", description="Stock symbol to test")):
    """
    TEST endpoint - Verify TWS connection works

    Simple test to prove we can:
    1. Connect to TWS Desktop
    2. Fetch stock data
    3. Return it immediately

    No database, no scanning - just connection test.
    """
    try:
        # Run test as subprocess (simple and isolated)
        env = os.environ.copy()
        result = subprocess.run(
            [sys.executable, "-u", "-c", f"""
import asyncio
from ib_insync import *

async def test():
    ib = IB()
    try:
        await ib.connectAsync('127.0.0.1', 7496, clientId=600, timeout=10)
        print(f"✅ Connected to TWS")

        # Get stock quote
        stock = Stock('{symbol}', 'SMART', 'USD')
        await ib.qualifyContractsAsync(stock)
        ticker = ib.reqMktData(stock)
        await asyncio.sleep(2)  # Wait for data

        # Extract data
        price = ticker.last if ticker.last and ticker.last > 0 else ticker.close
        result = {{
            'symbol': '{symbol}',
            'price': float(price) if price else None,
            'bid': float(ticker.bid) if ticker.bid and ticker.bid > 0 else None,
            'ask': float(ticker.ask) if ticker.ask and ticker.ask > 0 else None,
            'volume': int(ticker.volume) if ticker.volume else None
        }}

        ib.disconnect()
        print(f"✅ Got data: {{result}}")
        return result
    except Exception as e:
        print(f"❌ Error: {{e}}")
        raise

asyncio.run(test())
"""],
            capture_output=True,
            text=True,
            timeout=15,
            env=env
        )

        if result.returncode == 0:
            # Parse the result from stdout (simple string parsing)
            lines = result.stdout.strip().split('\n')
            print(f"[TEST] {result.stdout}")

            return {
                "status": "success",
                "message": "TWS connection works!",
                "symbol": symbol,
                "raw_output": result.stdout,
                "connection_test": "PASSED ✅"
            }
        else:
            print(f"[TEST ERROR] {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Test failed: {result.stderr}"
            )

    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=408,
            detail="Test timeout - TWS may not be running"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Test error: {str(e)}"
        )


@router.get("/screening/database-check")
async def database_check():
    """
    Check if Supabase database has screening data

    **Purpose**: Verify orchestrator is writing to database

    **Response Example**:
    ```json
    {
        "database_connected": true,
        "table_exists": true,
        "total_records": 15,
        "latest_entry": {
            "id": "abc-123",
            "created_at": "2026-01-04T00:35:24",
            "total_scanned": 50,
            "total_returned": 5,
            "execution_time_seconds": 28.3
        }
    }
    ```

    **Use this to debug**:
    - If `database_connected` = false → Check SUPABASE env vars
    - If `table_exists` = false → Run SQL schema creation
    - If `total_records` = 0 → Orchestrator hasn't written yet (run screening)
    - If `latest_entry` is old → Orchestrator may not be running on schedule
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            return {
                "database_connected": False,
                "table_exists": False,
                "total_records": 0,
                "latest_entry": None,
                "error": "Database not configured (missing SUPABASE env vars)"
            }

        # Check table exists and get count
        try:
            count_response = supabase.table('screening_results').select('id', count='exact').limit(1).execute()
            total_records = count_response.count or 0
            table_exists = True
        except Exception as table_err:
            return {
                "database_connected": True,
                "table_exists": False,
                "total_records": 0,
                "latest_entry": None,
                "error": f"Table 'screening_results' does not exist: {str(table_err)}"
            }

        # Get latest entry
        latest_entry = None
        if total_records > 0:
            try:
                latest_response = supabase.table('screening_results')\
                    .select('id, created_at, total_scanned, total_returned, execution_time_seconds, min_gap_percent, scan_code')\
                    .order('created_at', desc=True)\
                    .limit(1)\
                    .execute()

                if latest_response.data and len(latest_response.data) > 0:
                    latest_entry = latest_response.data[0]
            except Exception as latest_err:
                print(f"[WARN] Could not fetch latest entry: {latest_err}")

        return {
            "database_connected": True,
            "table_exists": table_exists,
            "total_records": total_records,
            "latest_entry": latest_entry,
            "message": f"Database healthy - {total_records} screening records found"
        }

    except Exception as e:
        print(f"[ERROR] Database check failed: {e}")
        return {
            "database_connected": False,
            "table_exists": False,
            "total_records": 0,
            "latest_entry": None,
            "error": f"Database check error: {str(e)}"
        }


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint

    Returns service status and database connection status.

    **Response Example**:
    ```json
    {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": "2026-01-03T21:30:00",
        "database_connected": true
    }
    ```

    **Note**: TWS connection check removed (no longer needed for database-backed architecture)
    """
    # Check database connection
    database_connected = False
    try:
        supabase = get_supabase_client()
        if supabase:
            # Test query
            response = supabase.table('screening_results').select('id').limit(1).execute()
            database_connected = True
    except:
        database_connected = False

    return HealthResponse(
        status="healthy",
        version="2.0.0",
        timestamp=datetime.now().isoformat(),
        tws_connected=database_connected  # Reuse field for database status
    )
