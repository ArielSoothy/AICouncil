#!/usr/bin/env python3
"""
Screening Orchestrator - Complete Pre-Market Screening Pipeline

Combines all TWS API clients + Finnhub into single screening workflow:
1. Scanner → Find pre-market gappers
2. Fundamentals → Get P/E, EPS, Market Cap
3. Short Data → Get shortable shares (CRITICAL!)
4. Ratios → Get 60+ fundamental ratios
5. Bars → Get pre-market gap %
6. Sentiment → Get social sentiment (optional)

Performance Target: Screen 20 stocks in <30 seconds

Run: python -m lib.trading.screening.screening_orchestrator
"""

from ib_insync import *
import asyncio
import time
import os
import argparse
from typing import Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv

# ✅ Load environment variables (Supabase, API keys, etc.)
load_dotenv('.env.local')
load_dotenv()

from lib.trading.screening.tws_scanner import TWSScannerClient
from lib.trading.screening.tws_fundamentals import TWSFundamentalsClient
from lib.trading.screening.tws_short_data import TWSShortDataClient
from lib.trading.screening.tws_ratios import TWSRatiosClient
from lib.trading.screening.tws_bars import TWSBarsClient
from lib.trading.screening.finnhub_sentiment import FinnhubClient

# Supabase for database-backed architecture
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("[WARNING] Supabase not installed. Install with: pip install supabase")
    print("[WARNING] Database writes will be skipped.")


class ScreeningOrchestrator:
    """
    Pre-Market Screening Orchestrator

    Combines all data sources into single screening pipeline.
    """

    def __init__(
        self,
        host: str = '127.0.0.1',
        port: int = 7496,
        client_id: int = 500,  # Use high unique client ID to avoid conflicts
        finnhub_api_key: Optional[str] = None
    ):
        """
        Initialize Screening Orchestrator

        Args:
            host: TWS API host
            port: TWS API port
            client_id: Client ID for TWS connection (default: 3)
            finnhub_api_key: Finnhub API key (optional, for sentiment)
        """
        # Initialize TWS clients
        self.scanner = TWSScannerClient(host, port, client_id)

        # Initialize other clients (will use scanner's IB connection)
        self.fundamentals = None
        self.short_data = None
        self.ratios = None
        self.bars = None

        # Initialize Finnhub client (optional)
        self.sentiment = FinnhubClient(finnhub_api_key)

        # Initialize Supabase client (optional, for database-backed architecture)
        self.supabase = None
        if SUPABASE_AVAILABLE:
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
            if supabase_url and supabase_key:
                self.supabase = create_client(supabase_url, supabase_key)
                print("[INFO] Supabase client initialized for database writes")
            else:
                print("[WARNING] Supabase credentials not found in environment")
                print("[WARNING] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")

    def save_to_database(self, results: Dict, params: Dict) -> bool:
        """
        Save screening results to Supabase database

        Args:
            results: Screening results dict from screen_pre_market()
            params: Screening parameters (min_gap_percent, min_volume, etc.)

        Returns:
            True if saved successfully, False otherwise
        """
        if not self.supabase:
            print("[SKIP] Database write skipped - Supabase not configured")
            return False

        try:
            # ✅ Only save CORE columns that exist in database schema
            data = {
                'execution_time_seconds': results['execution_time_seconds'],
                'total_scanned': results['total_scanned'],
                'total_returned': results['total_returned'],
                'min_gap_percent': params['min_gap_percent'],
                'min_volume': params['min_volume'],
                'max_results': params['max_results'],
                'scan_code': params.get('scan_code', 'TOP_PERC_GAIN'),
                'stocks': results['stocks']
                # Note: test_mode, min_price, max_price, max_market_cap, include_sentiment not in DB
            }

            response = self.supabase.table('screening_results').insert(data).execute()

            if response.data:
                print(f"[SUCCESS] ✅ Saved to database (ID: {response.data[0]['id']})")
                return True
            else:
                print(f"[FAIL] ❌ Database write failed: No data returned")
                return False

        except Exception as e:
            print(f"[FAIL] ❌ Database write failed: {e}")
            return False

    async def screen_pre_market(
        self,
        min_gap_percent: float = 10.0,  # ✅ CHANGED: 10% minimum for momentum (was 3.0)
        min_volume: int = 500000,
        max_results: int = 20,
        include_sentiment: bool = True,
        scan_code: str = 'TOP_PERC_GAIN',
        test_mode: bool = False,
        min_price: float = 1.0,
        max_price: float = 20.0,
        max_market_cap: float = 3_000_000_000,  # $3B
        max_float_shares: float = 30_000_000,  # ✅ NEW: Low-float filter (30M shares)
        min_relative_volume: float = 5.0       # ✅ NEW: 5x average volume minimum
    ) -> Dict:
        """
        Complete pre-market screening pipeline

        Args:
            min_gap_percent: Minimum gap % (default: 3.0)
            min_volume: Minimum volume (default: 500,000)
            max_results: Maximum results to return (default: 20)
            include_sentiment: Include Finnhub sentiment (default: True)
            scan_code: Scanner code (default: 'TOP_PERC_GAIN')
            test_mode: Use hardcoded symbols (TSLA, AAPL, NVDA) to test pipeline (default: False)

        Returns:
            Dict with screening results:
            {
                'stocks': [
                    {
                        'symbol': 'AAPL',
                        'rank': 0,
                        'gap_percent': 3.45,
                        'pre_market_volume': 1234567,
                        'fundamentals': {...},
                        'short_data': {...},
                        'ratios': {...},
                        'bars': {...},
                        'sentiment': {...},
                        'score': 85.5
                    },
                    ...
                ],
                'total_scanned': 50,
                'total_returned': 20,
                'execution_time_seconds': 25.3,
                'timestamp': '2026-01-03T21:30:00'
            }
        """
        start_time = time.time()

        # Store scan parameters for transparency
        scan_parameters = {
            'min_gap_percent': min_gap_percent,
            'min_volume': min_volume,
            'min_price': min_price,
            'max_price': max_price,
            'max_market_cap': max_market_cap,
            'max_float_shares': max_float_shares,  # ✅ NEW
            'min_relative_volume': min_relative_volume,  # ✅ NEW
            'max_results': max_results,
            'scan_code': scan_code,
            'include_sentiment': include_sentiment,
            'test_mode': test_mode
        }

        print(f"\n{'='*70}")
        print(f"PRE-MARKET SCREENING PIPELINE - LOW-FLOAT RUNNER OPTIMIZATION")
        print(f"{'='*70}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Criteria: Gap ≥{min_gap_percent}%, Volume ≥{min_volume:,}")
        print(f"Price Range: ${min_price} - ${max_price}")
        print(f"Market Cap: < ${max_market_cap/1_000_000_000:.1f}B")
        print(f"Float: < {max_float_shares/1_000_000:.0f}M shares (LOW-FLOAT)")  # ✅ NEW
        print(f"Relative Volume: ≥ {min_relative_volume}x average")  # ✅ NEW
        print(f"Max Results: {max_results}")
        print(f"Include Sentiment: {include_sentiment}")
        print()

        # Step 1: Connect to TWS (skip if test mode)
        if not test_mode:
            print("[STEP 1] Connecting to TWS Desktop...")
            await self.scanner.connect()

            # Initialize clients with scanner's IB connection
            self.fundamentals = TWSFundamentalsClient(self.scanner.ib)
            self.short_data = TWSShortDataClient(self.scanner.ib)
            self.ratios = TWSRatiosClient(self.scanner.ib)
            self.bars = TWSBarsClient(self.scanner.ib)

            print(f"[SUCCESS] ✅ Connected to TWS\n")

        # Step 2: Run scanner OR use test symbols
        if test_mode:
            print(f"[STEP 2] TEST MODE - Using hardcoded symbols (NO TWS REQUIRED)...")
            # Return mock data without any TWS connection
            test_symbols = ['TSLA', 'AAPL', 'NVDA', 'MSFT', 'GOOGL'][:max_results]
            scan_results = []
            for i, symbol in enumerate(test_symbols):
                # Create mock contract (no TWS qualification needed)
                contract = Stock(symbol, 'SMART', 'USD')
                scan_results.append({
                    'rank': i,
                    'symbol': symbol,
                    'exchange': 'SMART',
                    'currency': 'USD',
                    'conid': 0,
                    'contract': contract,
                    'contract_details': None
                })
            print(f"[TEST MODE] ✅ Using {len(scan_results)} test symbols: {', '.join(test_symbols)}\n")
        else:
            # 🚀 DUAL SCANNER STRATEGY (Sunday-proof):
            # 1. Try HOT_BY_VOLUME first (works 24/7)
            # 2. If 0 results, fallback to historical TOP_PERC_GAIN (24-48h ago)
            print(f"[STEP 2] Running dual scanner strategy...")

            # Try HOT_BY_VOLUME first (real-time, works anytime)
            print(f"  → Trying HOT_BY_VOLUME scanner (works 24/7)...")
            scan_results = await self.scanner.scan_hot_by_volume(
                min_volume=min_volume,
                max_results=max_results
            )

            # If HOT_BY_VOLUME returns 0 results, try MOST_ACTIVE (cached data)
            if not scan_results:
                print(f"  → HOT_BY_VOLUME returned 0 results, trying MOST_ACTIVE (cached data)...")
                scan_results = await self.scanner.scan_historical_top_gains(
                    min_volume=min_volume,
                    min_price=min_price,
                    max_price=50.0,  # Relaxed for cached data
                    max_market_cap=None,  # No cap limit for cached data
                    max_results=max_results,
                    lookback_hours=48  # Last 48 hours
                )

            if not scan_results:
                print("[WARNING] ⚠️ No stocks found matching criteria (both scanners returned 0)")
                self.scanner.disconnect()
                return {
                    'stocks': [],
                    'total_scanned': 0,
                    'total_returned': 0,
                    'execution_time_seconds': time.time() - start_time,
                    'timestamp': datetime.now().isoformat(),
                    'scan_parameters': scan_parameters
                }

            # Check which scanner succeeded
            is_historical = scan_results[0].get('historical', False) if scan_results else False
            scanner_used = 'MOST_ACTIVE (cached data)' if is_historical else 'HOT_BY_VOLUME (real-time)'
            print(f"[SUCCESS] ✅ Found {len(scan_results)} stocks using {scanner_used}\n")

        # Step 3: Enrich each stock with data (or use mock data in test mode)
        if test_mode:
            # TEST MODE: Return mock data without TWS
            print(f"[STEP 3] TEST MODE - Using mock enrichment data (NO TWS REQUIRED)...")
            enriched_results = []

            # ✅ REALISTIC LOW-FLOAT RUNNER MOCK DATA for filter testing
            # Prices: $2-$15 (typical penny stock range)
            # Gaps: Mix of passing/failing 10% threshold
            # Volume: 950K-3.2M (mix of passing/failing 500K threshold)
            mock_data_templates = {
                'TSLA': {'price': 12.45, 'gap': 15.2, 'volume': 2500000, 'pe': 18.5, 'cap': 150000000},  # PASS gap+volume+price
                'AAPL': {'price': 8.92, 'gap': 12.8, 'volume': 1800000, 'pe': 22.2, 'cap': 280000000},  # PASS gap+volume+price
                'NVDA': {'price': 14.22, 'gap': 8.1, 'volume': 3200000, 'pe': 32.8, 'cap': 420000000},   # FAIL gap (8% < 10%)
                'MSFT': {'price': 6.91, 'gap': 18.3, 'volume': 1500000, 'pe': 25.6, 'cap': 210000000},  # PASS gap+volume+price
                'GOOGL': {'price': 3.67, 'gap': 6.5, 'volume': 950000, 'pe': 14.1, 'cap': 95000000}    # FAIL gap (6.5% < 10%)
            }

            for i, stock in enumerate(scan_results[:max_results], 1):
                symbol = stock['symbol']
                template = mock_data_templates.get(symbol, mock_data_templates['TSLA'])

                # ✅ APPLY FILTERS TO MOCK DATA (same logic as real mode)
                # Gap filter
                if template['gap'] < min_gap_percent:
                    print(f"  ❌ FILTERED: {symbol} gap {template['gap']:.1f}% < {min_gap_percent}%")
                    continue

                # Volume filter
                if template['volume'] < min_volume:
                    print(f"  ❌ FILTERED: {symbol} volume {template['volume']:,} < {min_volume:,}")
                    continue

                # Mock float data (assume 20M for test stocks to test filter)
                mock_float = 20_000_000  # 20M float for test stocks
                if max_float_shares and mock_float > max_float_shares:
                    print(f"  ❌ FILTERED: {symbol} float {mock_float/1_000_000:.0f}M > {max_float_shares/1_000_000:.0f}M")
                    continue

                # Mock relative volume (assume 8x for test stocks)
                mock_rel_vol = 8.0  # 8x average for test stocks
                if min_relative_volume and mock_rel_vol < min_relative_volume:
                    print(f"  ❌ FILTERED: {symbol} rel vol {mock_rel_vol:.1f}x < {min_relative_volume}x")
                    continue

                # Price filter
                if template['price'] < min_price or template['price'] > max_price:
                    print(f"  ❌ FILTERED: {symbol} price ${template['price']:.2f} outside ${min_price}-${max_price}")
                    continue

                prev_close = template['price'] / (1 + template['gap']/100)

                enriched_results.append({
                    'symbol': symbol,
                    'rank': len(enriched_results),  # Rank by order added
                    'gap_percent': template['gap'],
                    'gap_direction': 'up',
                    'pre_market_volume': template['volume'],
                    'pre_market_price': template['price'],
                    'previous_close': prev_close,
                    'fundamentals': {'pe_ratio': template['pe'], 'market_cap': template['cap']},
                    'short_data': {'shortable_shares': 5000000, 'borrow_difficulty': 'Easy'},
                    'ratios': {'roe': 28.5, 'debt_to_equity': 0.85, 'float_shares': mock_float, 'average_volume': template['volume'] / mock_rel_vol},
                    'bars': {},
                    'sentiment': {'score': 0.72, 'mentions': 1250},
                    'score': 75.0 + (5 - len(enriched_results)) * 3  # Descending scores
                })
                print(f"  ✅ PASSED: {symbol} - Mock score: {enriched_results[-1]['score']:.1f}/100")

            print(f"\n[TEST MODE] ✅ Created {len(enriched_results)} mock results (no TWS needed)\n")
        else:
            # REAL MODE: Use TWS data
            print(f"[STEP 3] Enriching stocks with real TWS data...")
            enriched_results = []

            for i, stock in enumerate(scan_results[:max_results], 1):
                symbol = stock['symbol']
                contract = stock['contract']
                rank = stock['rank']

                print(f"  [{i}/{min(max_results, len(scan_results))}] Processing {symbol}...", end=" ")

                try:
                    # Parallel data fetching for speed
                    fundamentals, short_data, ratios, bars = await asyncio.gather(
                        self.fundamentals.get_fundamentals(contract),
                        self.short_data.get_short_data(contract),
                        self.ratios.get_ratios(contract),
                        self.bars.get_pre_market_bars(contract)
                    )

                    # Optional: Get sentiment (sequential to avoid rate limit)
                    sentiment = None
                    if include_sentiment and self.sentiment.api_key:
                        sentiment = await self.sentiment.get_sentiment(symbol)
                        await asyncio.sleep(1.0)  # Rate limit: 1 call/sec

                    # ✅ NEW: Low-Float Filter (skip mega-caps like TSLA, NVDA)
                    float_shares = ratios.get('float_shares', None)
                    if max_float_shares and float_shares and float_shares > max_float_shares:
                        print(f"❌ FILTERED: Float too high ({float_shares/1_000_000:.1f}M > {max_float_shares/1_000_000:.0f}M)")
                        continue  # Skip large floats (not low-float runners)

                    # ✅ NEW: Relative Volume Filter (skip stocks without volume spike)
                    average_volume = ratios.get('average_volume', 1)  # 20-day avg
                    if average_volume > 0:
                        pre_market_volume = bars.get('pre_market_volume', 0)
                        relative_volume = pre_market_volume / average_volume
                        if min_relative_volume and relative_volume < min_relative_volume:
                            print(f"❌ FILTERED: Rel vol too low ({relative_volume:.1f}x < {min_relative_volume}x)")
                            continue  # Skip stocks without volume spike
                    else:
                        relative_volume = 0.0  # Unknown average volume

                    # ✅ NEW: Gap Percentage Filter (TWS scanner can't filter by gap, so we do it here)
                    gap_percent = abs(bars.get('gap_percent', 0))
                    if gap_percent < min_gap_percent:
                        print(f"❌ FILTERED: Gap too low ({gap_percent:.1f}% < {min_gap_percent}%)")
                        continue  # Skip weak gaps

                    # Calculate composite screening score
                    score = self._calculate_score(
                        fundamentals, short_data, ratios, bars, sentiment
                    )

                    enriched_results.append({
                        'symbol': symbol,
                        'rank': rank,
                        'gap_percent': bars.get('gap_percent', 0),
                        'gap_direction': bars.get('gap_direction', 'unknown'),
                        'pre_market_volume': bars.get('pre_market_volume', 0),
                        'pre_market_price': bars.get('pre_market_price', 0),
                        'previous_close': bars.get('previous_close', 0),
                        'fundamentals': fundamentals,
                        'short_data': short_data,
                        'ratios': ratios,
                        'bars': bars,
                        'sentiment': sentiment,
                        'score': score
                    })

                    print(f"✅ Score: {score:.1f}/100")

                except Exception as e:
                    print(f"❌ Error: {e}")
                    continue

            print(f"\n[SUCCESS] ✅ Processed {len(enriched_results)} stocks\n")

        # Step 4: Disconnect from TWS (skip if test mode)
        if not test_mode:
            print("[STEP 4] Disconnecting from TWS...")
            self.scanner.disconnect()
            print("[SUCCESS] ✅ Disconnected\n")
        else:
            print("[STEP 4] TEST MODE - No disconnect needed\n")

        # Step 5: Sort by score
        enriched_results.sort(key=lambda x: x['score'], reverse=True)

        execution_time = time.time() - start_time

        print(f"{'='*70}")
        print(f"SCREENING COMPLETE")
        print(f"{'='*70}")
        print(f"Total Scanned: {len(scan_results)}")
        print(f"Total Returned: {len(enriched_results)}")
        print(f"Execution Time: {execution_time:.1f} seconds")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        if enriched_results:
            print(f"\nTop 3 Stocks:")
            for i, stock in enumerate(enriched_results[:3], 1):
                print(f"  {i}. {stock['symbol']}: Score {stock['score']:.1f}, Gap {stock['gap_percent']}%")

        print()

        # Prepare results dict
        results = {
            'stocks': enriched_results,
            'total_scanned': len(scan_results),
            'total_returned': len(enriched_results),
            'execution_time_seconds': round(execution_time, 1),
            'timestamp': datetime.now().isoformat(),
            'scan_parameters': scan_parameters  # Show user what filters were used
        }

        # Step 6: Save to database (database-backed architecture)
        print("[STEP 5] Saving to database...")
        # Use scan_parameters directly (includes all filters)
        self.save_to_database(results, scan_parameters)
        print()

        return results

    def _calculate_score(
        self,
        fundamentals: Dict,
        short_data: Dict,
        ratios: Dict,
        bars: Dict,
        sentiment: Optional[Dict]
    ) -> float:
        """
        ✅ LOW-FLOAT RUNNER SCORING (0-100 points)

        Optimized for momentum day trading - prioritizes:
        1. Low float (< 30M shares) - HIGHEST PRIORITY (35 pts)
        2. Relative volume spike (5x-20x+) - CRITICAL (30 pts)
        3. Gap magnitude (10-50%+) - MOMENTUM (20 pts)
        4. Short squeeze potential - CATALYST (15 pts)

        Args:
            fundamentals: Fundamental data dict
            short_data: Short selling data dict
            ratios: Fundamental ratios dict (includes float_shares, average_volume)
            bars: Pre-market bars data dict
            sentiment: Social sentiment dict (optional)

        Returns:
            Score from 0 to 100 (higher = better low-float runner)
        """
        score = 0.0

        # ✅ FACTOR 1: LOW FLOAT (35 points) - HIGHEST PRIORITY
        # Low float = easier to move price with volume
        float_shares = ratios.get('float_shares', None)
        if float_shares:
            if float_shares < 10_000_000:      score += 35  # < 10M = jackpot
            elif float_shares < 15_000_000:    score += 28  # < 15M = great
            elif float_shares < 20_000_000:    score += 20  # < 20M = good
            elif float_shares < 30_000_000:    score += 10  # < 30M = acceptable
        # If float unknown, give neutral score (not penalize)

        # ✅ FACTOR 2: RELATIVE VOLUME (30 points) - CRITICAL FOR MOMENTUM
        # 5x-20x+ volume spike = institutional/retail interest
        average_volume = ratios.get('average_volume', 1)  # 20-day avg
        pre_market_volume = bars.get('pre_market_volume', 0)
        if average_volume > 0:
            relative_volume = pre_market_volume / average_volume
            if relative_volume >= 20:       score += 30  # 20x+ = extreme interest
            elif relative_volume >= 15:     score += 25  # 15x = very high
            elif relative_volume >= 10:     score += 20  # 10x = high
            elif relative_volume >= 5:      score += 12  # 5x = acceptable
        # If no avg volume data, give 0 (conservative)

        # ✅ FACTOR 3: GAP MAGNITUDE (20 points) - MOMENTUM INDICATOR
        # 10%+ gaps are tradeable, 50%+ are explosive
        gap_percent = abs(bars.get('gap_percent', 0))
        if gap_percent >= 50:       score += 20  # 50%+ = massive move
        elif gap_percent >= 30:     score += 18  # 30%+ = strong
        elif gap_percent >= 20:     score += 15  # 20%+ = good
        elif gap_percent >= 10:     score += 10  # 10%+ = acceptable
        # Below 10% = 0 points (filtered out anyway)

        # ✅ FACTOR 4: SHORT SQUEEZE POTENTIAL (15 points) - CATALYST
        # High short interest on low float = squeeze potential
        short_interest = ratios.get('short_interest', 0)  # Number of shares short
        borrow_fee = short_data.get('borrow_fee_rate', 0) if short_data else 0

        if float_shares and float_shares > 0:
            short_pct_float = (short_interest / float_shares * 100)

            if short_pct_float > 25 and borrow_fee > 15:  score += 15  # High short + expensive borrow = squeeze
            elif short_pct_float > 20 and borrow_fee > 10: score += 12  # Moderate squeeze potential
            elif short_pct_float > 15:                     score += 8   # Some squeeze potential
            elif short_pct_float > 10:                     score += 5   # Light squeeze potential

        return min(100.0, round(score, 1))


async def main(
    test_mode: bool = False,
    min_gap_percent: float = 10.0,
    min_volume: int = 500000,
    max_float_shares: int = 30000000,
    min_relative_volume: float = 5.0,
    min_price: float = 1.0,
    max_price: float = 20.0,
    max_results: int = 20
):
    """Test the Screening Orchestrator

    Args:
        test_mode: If True, bypass scanner and use hardcoded symbols (TSLA, AAPL, NVDA, MSFT, GOOGL)
                   If False, use real TWS scanner (requires TWS Desktop running)
        min_gap_percent: Minimum gap percentage (default: 10.0)
        min_volume: Minimum volume (default: 500K)
        max_float_shares: Maximum float shares (default: 30M)
        min_relative_volume: Minimum relative volume (default: 5.0x)
        min_price: Minimum price (default: $1)
        max_price: Maximum price (default: $20)
        max_results: Maximum results (default: 20)
    """
    mode_msg = "TEST MODE" if test_mode else "REAL SCANNER MODE"
    print("=" * 70)
    print(f"Screening Orchestrator - {mode_msg}")
    print("=" * 70)

    # Initialize orchestrator
    orchestrator = ScreeningOrchestrator()

    # Run complete screening pipeline with all CLI parameters
    results = await orchestrator.screen_pre_market(
        min_gap_percent=min_gap_percent,
        min_volume=min_volume,
        max_results=max_results,
        include_sentiment=True,
        test_mode=test_mode,
        max_float_shares=max_float_shares,
        min_relative_volume=min_relative_volume,
        min_price=min_price,
        max_price=max_price
    )

    print("\n" + "=" * 70)
    print("DETAILED RESULTS")
    print("=" * 70)

    for i, stock in enumerate(results['stocks'], 1):
        print(f"\n[{i}] {stock['symbol']} - Score: {stock['score']}/100")
        print(f"  Gap: {stock['gap_percent']}% ({stock['gap_direction']})")
        print(f"  Volume: {stock['pre_market_volume']:,}")
        print(f"  Price: ${stock['pre_market_price']} (prev: ${stock['previous_close']})")

        if stock['fundamentals']:
            print(f"  Fundamentals: P/E={stock['fundamentals'].get('pe_ratio', 'N/A')}, Market Cap={stock['fundamentals'].get('market_cap', 'N/A')}")

        if stock['short_data'] and stock['short_data'].get('shortable_shares'):
            shares = stock['short_data'].get('shortable_shares', 0)
            difficulty = stock['short_data'].get('borrow_difficulty', 'N/A')
            print(f"  Short Data: {shares:,} shares, {difficulty}")

        if stock['sentiment']:
            print(f"  Sentiment: Score={stock['sentiment'].get('score', 'N/A')}, Mentions={stock['sentiment'].get('mentions', 'N/A')}")

    print("\n" + "=" * 70)
    print("[COMPLETE] Orchestrator test finished")
    print("=" * 70)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Pre-Market Screening Orchestrator - Find daily trade winners',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Test mode (no TWS required) - uses TSLA, AAPL, NVDA, MSFT, GOOGL
  python -m lib.trading.screening.screening_orchestrator --test-mode

  # Real scanner mode (requires TWS Desktop on port 7496)
  python -m lib.trading.screening.screening_orchestrator
        '''
    )
    parser.add_argument(
        '--test-mode',
        action='store_true',
        help='Use test symbols (TSLA, AAPL, NVDA, MSFT, GOOGL) instead of real scanner. No TWS Desktop required.'
    )
    parser.add_argument(
        '--min-gap-percent',
        type=float,
        default=10.0,
        help='Minimum gap percentage (default: 10.0). Range: 5-50.'
    )
    parser.add_argument(
        '--min-volume',
        type=int,
        default=500000,
        help='Minimum volume (default: 500000). Range: 100K-5M.'
    )
    parser.add_argument(
        '--max-float-shares',
        type=int,
        default=30000000,
        help='Maximum float shares (default: 30M). Range: 5M-50M. Lower = easier to move.'
    )
    parser.add_argument(
        '--min-relative-volume',
        type=float,
        default=5.0,
        help='Minimum relative volume (default: 5.0x). Range: 1x-20x. Volume vs 20-day avg.'
    )
    parser.add_argument(
        '--min-price',
        type=float,
        default=1.0,
        help='Minimum price (default: $1). Range: $0.01-$100.'
    )
    parser.add_argument(
        '--max-price',
        type=float,
        default=20.0,
        help='Maximum price (default: $20). Range: $0.01-$1000.'
    )
    parser.add_argument(
        '--max-results',
        type=int,
        default=20,
        help='Maximum results (default: 20). Range: 5-50.'
    )

    args = parser.parse_args()

    if args.test_mode:
        print("Starting Screening Orchestrator in TEST MODE...")
        print("Using hardcoded symbols: TSLA, AAPL, NVDA, MSFT, GOOGL\n")
    else:
        print("Starting Screening Orchestrator in REAL SCANNER MODE...")
        print("Make sure TWS Desktop is running on port 7496!\n")

    print(f"Min Gap Percent: {args.min_gap_percent}%")
    print(f"Min Volume: {args.min_volume:,}")
    print(f"Max Float Shares: {args.max_float_shares/1_000_000:.0f}M")
    print(f"Min Relative Volume: {args.min_relative_volume}x")
    print(f"Price Range: ${args.min_price} - ${args.max_price}")
    print(f"Max Results: {args.max_results}\n")

    asyncio.run(main(
        test_mode=args.test_mode,
        min_gap_percent=args.min_gap_percent,
        min_volume=args.min_volume,
        max_float_shares=args.max_float_shares,
        min_relative_volume=args.min_relative_volume,
        min_price=args.min_price,
        max_price=args.max_price,
        max_results=args.max_results
    ))
