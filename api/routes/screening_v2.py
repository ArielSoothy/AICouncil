#!/usr/bin/env python3
"""
Screening API V2 - Production-Ready Background Task Architecture

Uses background tasks with proper job tracking, status updates, and error handling.
Synchronous TWS scanner that actually works.

Improvements (Jan 2025):
- Thread-safe job storage with Lock
- Atomic client ID counter (no collisions)
- Auto-cleanup of old jobs (1 hour TTL)
- nest_asyncio applied once at module level
- Real-time flow_log for observability
- Data enrichment with actual price/volume/gap from TWS
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from lib.trading.screening.tws_scanner_sync import TWSScannerSync
from ib_insync import IB, Stock as IBStock
from concurrent.futures import ThreadPoolExecutor
import asyncio
import uuid
import traceback
import threading
import nest_asyncio

# ============================================================================
# POST-SCAN FILTERING
# Apply Winners Strategy criteria after TWS scanner returns results
# ============================================================================

def apply_supernova_filters(
    stocks: List[Dict],
    min_gap_percent: float = 10.0,
    gap_direction: str = 'up',  # 'up', 'down', or 'both'
    exclude_etfs: bool = False
) -> List[Dict]:
    """
    Apply Winners Strategy filters after TWS scan

    Args:
        stocks: Raw scanner results
        min_gap_percent: Minimum absolute gap % (default 10% for supernovas)
        gap_direction: 'up' for momentum, 'down' for shorts, 'both' for any
        exclude_etfs: Whether to exclude known ETFs (default False - user wants profit)

    Returns:
        Filtered stocks matching criteria
    """
    filtered = []

    # ETF symbols (optional exclusion)
    ETF_SYMBOLS = {
        'SOXS', 'SOXL', 'TQQQ', 'SQQQ', 'SPXU', 'SPXL', 'UPRO',
        'TNA', 'TZA', 'LABU', 'LABD', 'NUGT', 'DUST', 'UVXY', 'SVXY',
        'VXX', 'ZSL', 'AGQ', 'UCO', 'SCO', 'SPY', 'QQQ', 'IWM', 'DIA',
        'GLD', 'SLV', 'ARKK', 'ARKG', 'TMF', 'TMV', 'TECL', 'TECS',
    }

    for stock in stocks:
        symbol = stock.get('symbol', '')
        gap = stock.get('gap_percent', 0.0)
        gap_dir = stock.get('gap_direction', 'up')

        # Skip ETFs if exclusion is enabled
        if exclude_etfs and symbol.upper() in ETF_SYMBOLS:
            continue

        # Filter by gap direction
        if gap_direction == 'up' and gap_dir != 'up':
            continue
        if gap_direction == 'down' and gap_dir != 'down':
            continue

        # Filter by minimum gap
        if abs(gap) < min_gap_percent:
            continue

        filtered.append(stock)

    return filtered

# Apply nest_asyncio once at module load (not per-request)
nest_asyncio.apply()

router = APIRouter()

# Thread-safe job storage
jobs: Dict[str, Dict] = {}
jobs_lock = threading.Lock()

# Atomic client ID counter (avoids collisions)
_client_id_counter = threading.Lock()
_next_client_id = 10
_next_enrich_client_id = 100  # Separate range for enrichment

# Thread pool for running synchronous scanner
executor = ThreadPoolExecutor(max_workers=5)

# Job TTL for auto-cleanup (1 hour)
JOB_TTL_HOURS = 1


def get_next_client_id() -> int:
    """Get next client ID atomically to avoid TWS collisions"""
    global _next_client_id
    with _client_id_counter:
        client_id = _next_client_id
        _next_client_id += 1
        if _next_client_id > 90:  # Reset to avoid overlapping with enrichment range
            _next_client_id = 10
        return client_id


def get_next_enrich_client_id() -> int:
    """Get next enrichment client ID (separate range 100-199)"""
    global _next_enrich_client_id
    with _client_id_counter:
        client_id = _next_enrich_client_id
        _next_enrich_client_id += 1
        if _next_enrich_client_id > 199:
            _next_enrich_client_id = 100
        return client_id


def log_step(job_id: str, message: str, status: str = "running"):
    """Add timestamped entry to flow log (real-time observability)"""
    entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": message,
        "status": status  # "running", "success", "error"
    }
    with jobs_lock:
        if job_id in jobs:
            if "flow_log" not in jobs[job_id]:
                jobs[job_id]["flow_log"] = []
            jobs[job_id]["flow_log"].append(entry)
    # Also print to server console
    icon = "✅" if status == "success" else "❌" if status == "error" else "⏳"
    print(f"[{entry['timestamp']}] {icon} {message}")


def cleanup_old_jobs():
    """Remove jobs older than TTL (called before creating new jobs)"""
    global jobs
    now = datetime.now()
    cutoff = now - timedelta(hours=JOB_TTL_HOURS)

    with jobs_lock:
        old_count = len(jobs)
        jobs = {
            job_id: job
            for job_id, job in jobs.items()
            if datetime.fromisoformat(job["created_at"]) > cutoff
            or job["status"] in ["queued", "running"]
        }
        removed = old_count - len(jobs)
        if removed > 0:
            print(f"[CLEANUP] Removed {removed} old jobs (TTL: {JOB_TTL_HOURS}h)")


class FlowLogEntry(BaseModel):
    """Flow log entry for real-time observability"""
    timestamp: str
    message: str
    status: str  # running, success, error


class Stock(BaseModel):
    """Stock model with enriched data"""
    symbol: str
    rank: int
    exchange: str
    conid: int
    # Enriched data from TWSBarsClient
    gap_percent: float = 0.0
    gap_direction: str = "up"
    pre_market_price: float = 0.0
    previous_close: float = 0.0
    pre_market_volume: int = 0
    momentum_score: float = 0.0
    score: int = 100  # Composite score


class ScanJob(BaseModel):
    """Scanner job model"""
    job_id: str
    status: str  # queued, running, completed, failed
    progress: int  # 0-100
    message: str
    stocks_found: int
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    stocks: Optional[List[Stock]] = None  # Results stored here
    flow_log: Optional[List[FlowLogEntry]] = None  # Real-time log
    warning: Optional[str] = None  # TWS warnings (e.g., restart needed)


def calculate_composite_score(rank: int, bars_data: Dict) -> int:
    """
    Calculate composite score (0-100) based on rank and market data

    Score Components:
    - Rank factor (40 points): Lower rank = higher score
    - Gap magnitude (30 points): Larger gap = more momentum
    - Volume (20 points): Higher volume = more interest
    - Momentum (10 points): From TWSBarsClient
    """
    score = 0

    # Rank factor (40 points) - rank 1 = 40 points, rank 20 = 2 points
    rank_score = max(0, 40 - (rank - 1) * 2)
    score += rank_score

    # Gap magnitude (30 points)
    gap = abs(bars_data.get('gap_percent', 0))
    if gap > 10:
        score += 30
    elif gap > 5:
        score += 25
    elif gap > 3:
        score += 20
    elif gap > 1:
        score += 10

    # Volume (20 points)
    volume = bars_data.get('pre_market_volume', 0)
    if volume > 5_000_000:
        score += 20
    elif volume > 1_000_000:
        score += 15
    elif volume > 500_000:
        score += 10
    elif volume > 100_000:
        score += 5

    # Momentum from TWSBarsClient (10 points)
    momentum = bars_data.get('momentum_score', 0)
    score += int(momentum / 10)  # 0-100 scaled to 0-10

    return min(100, score)


async def run_scanner_job(
    job_id: str,
    min_volume: int,
    min_price: float,
    max_price: float,
    max_results: int,
    min_gap_percent: float = 10.0,
    gap_direction: str = 'up',
    exclude_etfs: bool = False
):
    """
    Run scanner in background with real-time flow logging and data enrichment

    Steps:
    1. Connect to TWS and run scanner (sync in thread pool)
    2. Connect again for enrichment (async with TWSBarsClient)
    3. Get price/volume/gap data for each stock
    4. Calculate composite scores
    """
    loop = asyncio.get_event_loop()

    def sync_scan():
        """Synchronous scanning function to run in thread pool"""
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)

        try:
            client_id = get_next_client_id()
            scanner = TWSScannerSync(client_id=client_id)
            scanner.connect()
            scan_results = scanner.scan_most_active(
                min_volume=min_volume,
                min_price=min_price,
                max_price=max_price,
                max_results=max_results
            )
            scanner.disconnect()
            return scan_results
        finally:
            new_loop.close()

    try:
        # === PHASE 1: SCAN ===
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 5
        log_step(job_id, "Connecting to TWS Desktop...", "running")

        jobs[job_id]["progress"] = 10
        log_step(job_id, "Running MOST_ACTIVE scanner...", "running")

        # Run sync scanner in thread pool
        scan_results = await loop.run_in_executor(executor, sync_scan)

        if not scan_results:
            log_step(job_id, "No stocks found matching criteria", "error")
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["message"] = "No stocks found matching criteria"
            jobs[job_id]["stocks_found"] = 0
            jobs[job_id]["completed_at"] = datetime.now().isoformat()
            return

        log_step(job_id, f"Found {len(scan_results)} stocks", "success")
        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = f"Found {len(scan_results)} stocks, enriching data..."

        # === PHASE 2: USE ENRICHED DATA FROM TWS ===
        # Scanner now returns price/volume/gap data directly from TWS
        log_step(job_id, "Processing enriched scan results...", "running")

        enriched_stocks = []
        for i, stock in enumerate(scan_results):
            symbol = stock['symbol']
            gap = stock.get('gap_percent', 0.0)
            price = stock.get('last_price', 0.0)
            prev_close = stock.get('previous_close', 0.0)
            volume = stock.get('volume', 0)

            # Calculate score based on rank AND gap magnitude
            rank_score = max(0, 40 - stock['rank'] * 2)  # 40 points for rank
            gap_score = min(30, abs(gap) * 3)  # Up to 30 points for gap
            vol_score = min(30, (volume / 1_000_000) * 10)  # Up to 30 points for volume
            total_score = int(rank_score + gap_score + vol_score)

            enriched_stocks.append({
                'symbol': symbol,
                'rank': stock['rank'],
                'exchange': stock['exchange'],
                'conid': stock['conid'],
                'gap_percent': gap,
                'gap_direction': 'up' if gap >= 0 else 'down',
                'pre_market_price': price,
                'previous_close': prev_close,
                'pre_market_volume': volume,
                'momentum_score': abs(gap) * 10,
                'score': total_score
            })
            log_step(job_id, f"  {symbol}: ${price:.2f} | Gap: {gap:+.1f}% | Vol: {volume:,}", "success")

        log_step(job_id, "Enrichment complete", "success")

        # Check for TWS warnings (e.g., all timeouts = need restart)
        tws_warning = None
        stocks_with_no_data = sum(1 for s in enriched_stocks if s.get('pre_market_price', 0) == 0)
        if stocks_with_no_data == len(enriched_stocks) and len(enriched_stocks) > 0:
            tws_warning = "⚠️ All historical data requests failed. Try restarting TWS Desktop."
            log_step(job_id, "WARNING: TWS may need restart - no enrichment data", "error")

        # === PHASE 2.5: APPLY SUPERNOVA FILTERS ===
        pre_filter_count = len(enriched_stocks)
        log_step(job_id, f"Applying filters: Gap >={min_gap_percent}%, Direction={gap_direction}", "running")

        filtered_stocks = apply_supernova_filters(
            enriched_stocks,
            min_gap_percent=min_gap_percent,
            gap_direction=gap_direction,
            exclude_etfs=exclude_etfs
        )

        # Re-rank after filtering
        for i, stock in enumerate(filtered_stocks, 1):
            stock['rank'] = i

        if pre_filter_count > len(filtered_stocks):
            log_step(job_id, f"Filtered: {pre_filter_count} → {len(filtered_stocks)} stocks (gap/direction)", "success")
        else:
            log_step(job_id, f"All {len(filtered_stocks)} stocks passed filters", "success")

        # === PHASE 3: COMPLETE ===
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = f"Successfully found {len(filtered_stocks)} stocks"
        jobs[job_id]["stocks_found"] = len(filtered_stocks)
        jobs[job_id]["stocks"] = filtered_stocks
        jobs[job_id]["completed_at"] = datetime.now().isoformat()
        if tws_warning:
            jobs[job_id]["warning"] = tws_warning

        log_step(job_id, f"Complete! {len(filtered_stocks)} stocks match supernova criteria", "success")
        print(f"[SUCCESS] ✅ Job {job_id}: {len(filtered_stocks)} stocks found (filtered from {pre_filter_count})")

    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()

        log_step(job_id, f"Error: {error_msg[:50]}", "error")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["progress"] = 0
        jobs[job_id]["message"] = f"Error: {error_msg}"
        jobs[job_id]["error"] = error_trace
        jobs[job_id]["completed_at"] = datetime.now().isoformat()

        print(f"[ERROR] ❌ Job {job_id} failed: {error_msg}")
        print(error_trace)


@router.post("/screening/v2/run", response_model=ScanJob)
async def start_screening_v2(
    background_tasks: BackgroundTasks,
    min_volume: int = 100000,
    min_price: float = 1.0,
    max_price: float = 20.0,
    max_results: int = 20,
    min_gap_percent: float = 10.0,
    gap_direction: str = 'up',
    exclude_etfs: bool = False
):
    """
    Start screening job (V2 - Production Architecture)

    **Returns**: Job ID for tracking progress

    **Flow**:
    1. POST /screening/v2/run → get job_id
    2. Poll GET /screening/v2/status/{job_id} every 1-2 seconds
    3. When status=completed, get results from /screening/latest

    **Parameters**:
    - min_volume: 100K-5M (default: 100K)
    - min_price: $0.01-$100 (default: $1)
    - max_price: $0.01-$1000 (default: $20)
    - max_results: 5-50 (default: 20)
    - min_gap_percent: Minimum gap % (default: 10% for supernovas)
    - gap_direction: 'up' for momentum, 'down' for shorts, 'both' (default: 'up')
    - exclude_etfs: Filter out leveraged ETFs (default: False)
    """
    # Cleanup old jobs before creating new one
    cleanup_old_jobs()

    # Create job with thread-safe access
    job_id = str(uuid.uuid4())

    with jobs_lock:
        jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0,
            "message": "Job queued, waiting to start...",
            "stocks_found": 0,
            "created_at": datetime.now().isoformat(),
            "completed_at": None,
            "error": None,
            "stocks": None,
            "flow_log": [],  # Real-time observability
            "warning": None  # TWS warnings (e.g., restart needed)
        }

    # Add to background tasks
    background_tasks.add_task(
        run_scanner_job,
        job_id,
        min_volume,
        min_price,
        max_price,
        max_results,
        min_gap_percent,
        gap_direction,
        exclude_etfs
    )

    return ScanJob(**jobs[job_id])


@router.get("/screening/v2/status/{job_id}", response_model=ScanJob)
async def get_job_status(job_id: str):
    """
    Get job status

    Poll this endpoint every 1-2 seconds to track progress.

    **Status values**:
    - queued: Job is waiting to start
    - running: Scanner is running
    - completed: Job finished successfully
    - failed: Job encountered an error
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return ScanJob(**jobs[job_id])


@router.get("/screening/v2/jobs")
async def list_jobs():
    """
    List all jobs

    Useful for debugging and monitoring.
    """
    return {
        "total_jobs": len(jobs),
        "jobs": [ScanJob(**job) for job in jobs.values()]
    }


@router.delete("/screening/v2/jobs")
async def clear_jobs():
    """
    Clear all completed/failed jobs

    Keeps only running/queued jobs.
    """
    global jobs

    with jobs_lock:
        before_count = len(jobs)
        jobs = {
            job_id: job
            for job_id, job in jobs.items()
            if job["status"] in ["queued", "running"]
        }
        after_count = len(jobs)

    return {
        "message": f"Cleared {before_count - after_count} completed/failed jobs",
        "remaining_jobs": after_count
    }
