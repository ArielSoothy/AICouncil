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
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from lib.trading.screening.tws_scanner_sync import TWSScannerSync
from concurrent.futures import ThreadPoolExecutor
import asyncio
import uuid
import traceback
import threading
import nest_asyncio

# Apply nest_asyncio once at module load (not per-request)
nest_asyncio.apply()

router = APIRouter()

# Thread-safe job storage
jobs: Dict[str, Dict] = {}
jobs_lock = threading.Lock()

# Atomic client ID counter (avoids collisions)
_client_id_counter = threading.Lock()
_next_client_id = 10

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
        if _next_client_id > 100:  # Reset to avoid very high IDs
            _next_client_id = 10
        return client_id


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


class Stock(BaseModel):
    """Stock model"""
    symbol: str
    rank: int
    exchange: str
    conid: int


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


async def run_scanner_job(
    job_id: str,
    min_volume: int,
    min_price: float,
    max_price: float,
    max_results: int
):
    """
    Run scanner in background (async wrapper for sync scanner)

    Steps:
    1. Connect to TWS (in thread pool)
    2. Run scanner (in thread pool)
    3. Update job status
    """
    loop = asyncio.get_event_loop()

    def sync_scan():
        """Synchronous scanning function to run in thread pool"""
        # ib_insync needs an event loop even for "sync" operations
        # Create a new event loop for this thread
        # Note: nest_asyncio already applied at module level

        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)

        try:
            # Use atomic client ID to avoid collisions
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
        # Update: Starting
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 10
        jobs[job_id]["message"] = "Connecting to TWS Desktop..."

        # Update: Scanning
        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = "Scanning for stocks..."

        # Step 1 & 2: Run sync scanner in thread pool
        scan_results = await loop.run_in_executor(executor, sync_scan)

        if not scan_results:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["message"] = "No stocks found matching criteria"
            jobs[job_id]["stocks_found"] = 0
            jobs[job_id]["completed_at"] = datetime.now().isoformat()
            return

        # Update: Preparing results
        jobs[job_id]["progress"] = 90
        jobs[job_id]["message"] = f"Preparing {len(scan_results)} stocks..."

        # Step 3: Build results (stored in memory)
        stocks = []
        for stock in scan_results:
            stocks.append({
                'symbol': stock['symbol'],
                'rank': stock['rank'],
                'exchange': stock['exchange'],
                'conid': stock['conid']
            })

        # Update: Complete
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = f"Successfully found {len(stocks)} stocks"
        jobs[job_id]["stocks_found"] = len(stocks)
        jobs[job_id]["stocks"] = stocks  # Store results in job
        jobs[job_id]["completed_at"] = datetime.now().isoformat()

        print(f"[SUCCESS] ✅ Job {job_id}: {len(stocks)} stocks found")

    except Exception as e:
        # Update: Failed
        error_msg = str(e)
        error_trace = traceback.format_exc()

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
    max_results: int = 20
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
            "stocks": None
        }

    # Add to background tasks
    background_tasks.add_task(
        run_scanner_job,
        job_id,
        min_volume,
        min_price,
        max_price,
        max_results
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
