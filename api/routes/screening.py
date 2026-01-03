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

        # Convert to response model
        return ScreeningResponse(
            stocks=result['stocks'],
            total_scanned=result['total_scanned'],
            total_returned=result['total_returned'],
            execution_time_seconds=result['execution_time_seconds'],
            timestamp=result['created_at']
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


def run_orchestrator_task():
    """Background task to run the screening orchestrator"""
    try:
        print("[INFO] Starting orchestrator in background...")
        # Run orchestrator as subprocess
        result = subprocess.run(
            [sys.executable, "-m", "lib.trading.screening.screening_orchestrator"],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode == 0:
            print("[SUCCESS] ✅ Orchestrator completed successfully")
            print(result.stdout)
        else:
            print(f"[ERROR] ❌ Orchestrator failed with code {result.returncode}")
            print(result.stderr)
    except subprocess.TimeoutExpired:
        print("[ERROR] ❌ Orchestrator timeout (>5 minutes)")
    except Exception as e:
        print(f"[ERROR] ❌ Orchestrator error: {e}")


@router.post("/screening/run")
async def run_screening(background_tasks: BackgroundTasks):
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
    - TWS Desktop or IB Gateway must be running
    - API enabled in TWS (port 7496 for paper, 4001 for live)

    **Response**: Returns immediately, orchestrator runs in background (~10-30 seconds)

    **After clicking**: Wait 10-30 seconds, then click "Refresh" to see new results
    """
    # Add task to background
    background_tasks.add_task(run_orchestrator_task)

    return {
        "status": "started",
        "message": "Screening orchestrator started in background",
        "estimated_time_seconds": 15,
        "note": "Results will appear after refresh in ~15-30 seconds"
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
