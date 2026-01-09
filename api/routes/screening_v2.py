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
from lib.trading.screening.tws_short_data import TWSShortDataClient
from lib.trading.screening.tws_ratios import TWSRatiosClient
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
    max_gap_percent: float = 100.0,  # NEW: Max gap filter
    gap_direction: str = 'up',  # 'up', 'down', or 'both'
    max_volume: int = 0,  # NEW: Max volume filter (0 = no limit)
    exclude_etfs: bool = False
) -> List[Dict]:
    """
    Apply Winners Strategy filters after TWS scan

    Args:
        stocks: Raw scanner results
        min_gap_percent: Minimum absolute gap % (default 10% for supernovas)
        max_gap_percent: Maximum absolute gap % (default 100% = no limit)
        gap_direction: 'up' for momentum, 'down' for shorts, 'both' for any
        max_volume: Maximum pre-market volume (0 = no limit)
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
        volume = stock.get('pre_market_volume', 0)

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

        # Filter by maximum gap (NEW)
        if max_gap_percent > 0 and abs(gap) > max_gap_percent:
            continue

        # Filter by maximum volume (NEW)
        if max_volume > 0 and volume > max_volume:
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
    # Phase 3: Short data from TWSShortDataClient
    shortable_shares: Optional[int] = None
    borrow_difficulty: Optional[str] = None  # Easy/Moderate/Hard/Very Hard
    short_fee_rate: Optional[float] = None
    # Phase 3: Float approximation from TWSRatiosClient
    shares_outstanding: Optional[int] = None
    float_shares: Optional[int] = None  # Estimated: shares_outstanding * 0.8 (typical)
    # Phase 3: Relative Volume (20-day average comparison)
    avg_volume_20d: Optional[int] = None
    relative_volume: Optional[float] = None  # PM Volume / Avg Daily Volume
    # Phase 4: Reddit Sentiment (FREE)
    reddit_mentions: Optional[int] = None      # Mentions in last 24h
    reddit_sentiment: Optional[float] = None   # -1 to +1
    reddit_sentiment_label: Optional[str] = None  # VERY_BULLISH, BULLISH, NEUTRAL, BEARISH, VERY_BEARISH
    # Phase 5: News/Catalyst (FREE via Alpaca)
    news: Optional[List[dict]] = None  # Top 3 news articles [{headline, source, timestamp, url}]
    catalyst: Optional[str] = None     # Auto-detected catalyst type (earnings, FDA, etc.)


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
    max_volume: int,  # NEW
    min_price: float,
    max_price: float,
    max_results: int,
    min_gap_percent: float = 10.0,
    max_gap_percent: float = 100.0,  # NEW
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
        log_step(job_id, "Running TOP_PERC_GAIN scanner (gappers)...", "running")

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
        max_vol_str = f", MaxVol={max_volume/1_000_000:.1f}M" if max_volume > 0 else ""
        max_gap_str = f", MaxGap={max_gap_percent}%" if max_gap_percent < 100 else ""
        log_step(job_id, f"Applying filters: Gap >={min_gap_percent}%{max_gap_str}, Direction={gap_direction}{max_vol_str}", "running")

        filtered_stocks = apply_supernova_filters(
            enriched_stocks,
            min_gap_percent=min_gap_percent,
            max_gap_percent=max_gap_percent,
            gap_direction=gap_direction,
            max_volume=max_volume,
            exclude_etfs=exclude_etfs
        )

        # Re-rank after filtering
        for i, stock in enumerate(filtered_stocks, 1):
            stock['rank'] = i

        if pre_filter_count > len(filtered_stocks):
            log_step(job_id, f"Filtered: {pre_filter_count} → {len(filtered_stocks)} stocks (gap/direction)", "success")
        else:
            log_step(job_id, f"All {len(filtered_stocks)} stocks passed filters", "success")

        # === PHASE 3: SHORT DATA & FLOAT ENRICHMENT ===
        # Run synchronously in thread pool to avoid event loop conflicts
        if len(filtered_stocks) > 0:
            log_step(job_id, f"Phase 3: Getting short data for {len(filtered_stocks)} stocks...", "running")
            jobs[job_id]["progress"] = 70
            jobs[job_id]["message"] = f"Getting short data for {len(filtered_stocks)} stocks..."

            def fetch_short_data_sync():
                """Synchronous short data fetch with dedicated event loop"""
                import time
                import asyncio

                # Create a new event loop for this thread (ib_insync needs one)
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                try:
                    ib_short = IB()
                    short_client_id = get_next_enrich_client_id()
                    ib_short.connect('127.0.0.1', 7496, clientId=short_client_id)

                    for stock in filtered_stocks:
                        try:
                            contract = IBStock(stock['symbol'], 'SMART', 'USD')
                            ib_short.qualifyContracts(contract)

                            # Request market data with tick 236 (shortable shares), 258 (fundamentals), 586 (fee rate)
                            # Tick 586 = Shortable fee rate (borrow cost as percentage)
                            ticker = ib_short.reqMktData(contract, '236,258,586', False, False)
                            time.sleep(2.5)  # Wait longer for data to stream in
                            ib_short.sleep(0.5)  # Allow IB to process

                            # Debug: Log what data is available
                            shortable_val = getattr(ticker, 'shortableShares', 'N/A')
                            fee_val = getattr(ticker, 'shortFee', None) or getattr(ticker, 'feeRate', None)
                            log_step(job_id, f"  {stock['symbol']} ticker data: shortableShares={shortable_val}, "
                                           f"shortFee={fee_val}", "info")

                            # Extract short data
                            shortable = getattr(ticker, 'shortableShares', None)
                            if shortable and shortable > 0:
                                stock['shortable_shares'] = int(shortable)
                                # Determine borrow difficulty
                                if shortable < 100_000:
                                    stock['borrow_difficulty'] = 'Very Hard'
                                elif shortable < 1_000_000:
                                    stock['borrow_difficulty'] = 'Hard'
                                elif shortable < 10_000_000:
                                    stock['borrow_difficulty'] = 'Moderate'
                                else:
                                    stock['borrow_difficulty'] = 'Easy'

                            # Extract borrow fee rate from ticks list (tick type 46 = shortable)
                            # Note: TWS doesn't populate 'shortFee' attribute directly
                            # Fee rate may come through different channels depending on subscription
                            if ticker.ticks:
                                for tick in ticker.ticks:
                                    # Tick type 46 can contain shortable info
                                    if tick.tickType == 46 and tick.price > 0:
                                        # This is rebate rate, fee = -rebate when negative
                                        stock['short_fee_rate'] = abs(tick.price)
                                        break

                            # Extract fundamental ratios (tick 258) - FLOAT & SHARES
                            ratios = getattr(ticker, 'fundamentalRatios', None)
                            if ratios:
                                mktcap = getattr(ratios, 'MKTCAP', None)  # In millions
                                nprice = getattr(ratios, 'NPRICE', None)  # Current price

                                if mktcap and mktcap > 0:
                                    # Use NPRICE from ratios if available (more accurate)
                                    price = nprice if nprice and nprice > 0 else stock.get('pre_market_price', 1)
                                    if price > 0:
                                        # MKTCAP is in millions, so multiply by 1M
                                        est_shares = int((mktcap * 1_000_000) / price)
                                        stock['shares_outstanding'] = est_shares
                                        # Float is typically 70-90% of outstanding
                                        # Use 80% as reasonable estimate
                                        stock['float_shares'] = int(est_shares * 0.80)

                                        float_m = stock['float_shares'] / 1_000_000
                                        log_step(job_id, f"    Float: {float_m:.1f}M shares (est from MKTCAP)", "success")

                            ib_short.cancelMktData(contract)

                            # Calculate Relative Volume (20-day average)
                            try:
                                bars = ib_short.reqHistoricalData(
                                    contract,
                                    endDateTime='',
                                    durationStr='20 D',
                                    barSizeSetting='1 day',
                                    whatToShow='TRADES',
                                    useRTH=True,
                                    formatDate=1,
                                    timeout=10  # 10 second timeout
                                )
                                if bars and len(bars) > 0:
                                    volumes = [bar.volume for bar in bars if bar.volume > 0]
                                    if len(volumes) >= 5:  # Need at least 5 days of data
                                        avg_vol = sum(volumes) / len(volumes)
                                        stock['avg_volume_20d'] = int(avg_vol)
                                        pm_vol = stock.get('pre_market_volume', 0)
                                        if avg_vol > 0:
                                            stock['relative_volume'] = round(pm_vol / avg_vol, 2)
                                            log_step(job_id, f"    RelVol: {stock['relative_volume']:.1f}x (PM {pm_vol:,} / Avg {int(avg_vol):,})", "success")
                                else:
                                    log_step(job_id, f"    RelVol: No historical bars returned", "error")
                            except Exception as hist_err:
                                log_step(job_id, f"    RelVol: {str(hist_err)[:30]}", "error")

                            borrow = stock.get('borrow_difficulty', 'N/A')
                            shortable_m = (stock.get('shortable_shares', 0) / 1_000_000)
                            fee_rate = stock.get('short_fee_rate', 0)
                            rel_vol = stock.get('relative_volume', 0)
                            fee_str = f", Fee={fee_rate:.1f}%" if fee_rate > 0 else ""
                            rel_str = f", RV={rel_vol:.1f}x" if rel_vol > 0 else ""
                            log_step(job_id, f"  {stock['symbol']}: Borrow={borrow}, Shortable={shortable_m:.2f}M{fee_str}{rel_str}", "success")

                        except Exception as e:
                            log_step(job_id, f"  {stock['symbol']}: {str(e)[:40]}", "error")

                    ib_short.disconnect()
                    log_step(job_id, "Phase 3 enrichment complete", "success")

                except Exception as e:
                    log_step(job_id, f"Phase 3 connection error: {str(e)[:50]}", "error")
                finally:
                    # Clean up the event loop
                    try:
                        loop.close()
                    except:
                        pass

            # Run in thread pool
            try:
                future = executor.submit(fetch_short_data_sync)
                future.result(timeout=60)  # Wait up to 60s for short data
            except Exception as e:
                log_step(job_id, f"Phase 3 thread error: {str(e)[:50]}", "error")

        # === PHASE 4: REDDIT SENTIMENT (FREE) ===
        if len(filtered_stocks) > 0:
            log_step(job_id, f"Phase 4: Getting Reddit sentiment for {min(5, len(filtered_stocks))} stocks...", "running")
            jobs[job_id]["progress"] = 90
            jobs[job_id]["message"] = f"Fetching Reddit sentiment..."

            try:
                from lib.trading.screening.reddit_sentiment import RedditSentimentClient

                async def fetch_reddit_sentiment():
                    client = RedditSentimentClient()
                    try:
                        # Only check top 5 stocks to avoid rate limits
                        for stock in filtered_stocks[:5]:
                            sentiment = await client.get_sentiment(stock['symbol'])
                            stock['reddit_mentions'] = sentiment.get('mentions_24h', 0)
                            stock['reddit_sentiment'] = sentiment.get('sentiment_score', 0)
                            stock['reddit_sentiment_label'] = sentiment.get('sentiment_label', 'NEUTRAL')

                            label = stock.get('reddit_sentiment_label', 'N/A')
                            mentions = stock.get('reddit_mentions', 0)
                            log_step(job_id, f"  {stock['symbol']}: {mentions} mentions, {label}", "success")
                    finally:
                        await client.close()

                # Run async sentiment fetch (asyncio already imported at module level)
                try:
                    asyncio.run(fetch_reddit_sentiment())
                except RuntimeError:
                    # Event loop already running - use nest_asyncio
                    loop = asyncio.get_event_loop()
                    loop.run_until_complete(fetch_reddit_sentiment())

                log_step(job_id, "Phase 4 Reddit sentiment complete", "success")

            except Exception as e:
                log_step(job_id, f"Phase 4 Reddit error: {str(e)[:50]}", "error")

        # === PHASE 5: NEWS/CATALYST (FREE via Alpaca) ===
        if len(filtered_stocks) > 0:
            log_step(job_id, f"Phase 5: Getting news for {min(5, len(filtered_stocks))} stocks...", "running")
            jobs[job_id]["progress"] = 95
            jobs[job_id]["message"] = f"Fetching news catalysts..."

            try:
                import os
                import requests

                alpaca_key = os.environ.get('ALPACA_API_KEY')
                alpaca_secret = os.environ.get('ALPACA_SECRET_KEY')

                if alpaca_key and alpaca_secret:
                    headers = {
                        'APCA-API-KEY-ID': alpaca_key,
                        'APCA-API-SECRET-KEY': alpaca_secret
                    }

                    # Catalyst keywords for detection
                    CATALYST_KEYWORDS = {
                        'earnings': ['earnings', 'eps', 'revenue', 'quarterly', 'q1', 'q2', 'q3', 'q4', 'guidance', 'beat', 'miss'],
                        'fda': ['fda', 'approval', 'drug', 'trial', 'phase', 'clinical'],
                        'merger': ['merger', 'acquisition', 'acquire', 'buyout', 'deal', 'takeover'],
                        'contract': ['contract', 'awarded', 'deal', 'partnership', 'agreement'],
                        'offering': ['offering', 'dilution', 'shares', 'secondary', 'shelf'],
                        'analyst': ['upgrade', 'downgrade', 'price target', 'rating', 'analyst'],
                        'short_squeeze': ['short', 'squeeze', 'gamma', 'wsb', 'reddit', 'meme'],
                    }

                    def detect_catalyst(headlines: list) -> str:
                        """Detect catalyst type from news headlines"""
                        text = ' '.join(headlines).lower()
                        for catalyst_type, keywords in CATALYST_KEYWORDS.items():
                            if any(kw in text for kw in keywords):
                                return catalyst_type.upper()
                        return 'UNKNOWN'

                    for stock in filtered_stocks[:5]:
                        try:
                            # Alpaca News API
                            url = f"https://data.alpaca.markets/v1beta1/news?symbols={stock['symbol']}&limit=3&sort=desc"
                            resp = requests.get(url, headers=headers, timeout=10)

                            if resp.status_code == 200:
                                news_data = resp.json()
                                articles = news_data.get('news', [])

                                if articles:
                                    # Format news for storage
                                    formatted_news = []
                                    headlines = []
                                    for article in articles[:3]:
                                        formatted_news.append({
                                            'headline': article.get('headline', '')[:100],
                                            'source': article.get('source', 'Unknown'),
                                            'timestamp': article.get('created_at', ''),
                                            'url': article.get('url', '')
                                        })
                                        headlines.append(article.get('headline', ''))

                                    stock['news'] = formatted_news
                                    stock['catalyst'] = detect_catalyst(headlines)

                                    log_step(job_id, f"  {stock['symbol']}: {len(articles)} articles, catalyst={stock['catalyst']}", "success")
                                else:
                                    stock['news'] = []
                                    stock['catalyst'] = 'NO_NEWS'
                                    log_step(job_id, f"  {stock['symbol']}: No recent news", "info")
                            else:
                                log_step(job_id, f"  {stock['symbol']}: News API error {resp.status_code}", "error")

                        except Exception as e:
                            log_step(job_id, f"  {stock['symbol']}: News error - {str(e)[:30]}", "error")

                    log_step(job_id, "Phase 5 News complete", "success")
                else:
                    log_step(job_id, "Phase 5 skipped: No Alpaca API keys", "info")

            except Exception as e:
                log_step(job_id, f"Phase 5 News error: {str(e)[:50]}", "error")

        # === COMPLETE ===
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
    max_volume: int = 0,  # NEW: 0 = no limit
    min_price: float = 1.0,
    max_price: float = 20.0,
    max_results: int = 20,
    min_gap_percent: float = 10.0,
    max_gap_percent: float = 100.0,  # NEW: 100 = no limit
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
        max_volume,  # NEW
        min_price,
        max_price,
        max_results,
        min_gap_percent,
        max_gap_percent,  # NEW
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


@router.get("/screening/latest")
async def get_latest_screening():
    """
    Get the most recent completed screening job.

    Used by frontend for initial page load.
    Returns the latest completed job or 404 if no completed jobs exist.
    """
    # Find the most recent completed job
    completed_jobs = [
        job for job in jobs.values()
        if job["status"] == "completed" and job.get("stocks")
    ]

    if not completed_jobs:
        # Return empty result instead of 404 so frontend can show "Run Screening"
        return {
            "status": "no_data",
            "message": "No screening results yet. Click 'Run Screening Now' to start.",
            "stocks": []
        }

    # Sort by completed_at and return most recent
    latest = max(completed_jobs, key=lambda x: x.get("completed_at", ""))
    return ScanJob(**latest)


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
