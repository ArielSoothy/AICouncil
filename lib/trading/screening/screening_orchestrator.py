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
from typing import Dict, List, Optional
from datetime import datetime

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
        client_id: int = 99,  # Use unique client ID (99 confirmed working in connection test)
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
            data = {
                'execution_time_seconds': results['execution_time_seconds'],
                'total_scanned': results['total_scanned'],
                'total_returned': results['total_returned'],
                'min_gap_percent': params['min_gap_percent'],
                'min_volume': params['min_volume'],
                'max_results': params['max_results'],
                'scan_code': params.get('scan_code', 'TOP_PERC_GAIN'),
                'include_sentiment': params.get('include_sentiment', False),
                'stocks': results['stocks']
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
        min_gap_percent: float = 3.0,
        min_volume: int = 500000,
        max_results: int = 20,
        include_sentiment: bool = True,
        scan_code: str = 'TOP_PERC_GAIN'
    ) -> Dict:
        """
        Complete pre-market screening pipeline

        Args:
            min_gap_percent: Minimum gap % (default: 3.0)
            min_volume: Minimum volume (default: 500,000)
            max_results: Maximum results to return (default: 20)
            include_sentiment: Include Finnhub sentiment (default: True)
            scan_code: Scanner code (default: 'TOP_PERC_GAIN')

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

        print(f"\n{'='*70}")
        print(f"PRE-MARKET SCREENING PIPELINE")
        print(f"{'='*70}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Criteria: Gap ≥{min_gap_percent}%, Volume ≥{min_volume:,}")
        print(f"Max Results: {max_results}")
        print(f"Include Sentiment: {include_sentiment}")
        print()

        # Step 1: Connect to TWS
        print("[STEP 1] Connecting to TWS Desktop...")
        await self.scanner.connect()

        # Initialize clients with scanner's IB connection
        self.fundamentals = TWSFundamentalsClient(self.scanner.ib)
        self.short_data = TWSShortDataClient(self.scanner.ib)
        self.ratios = TWSRatiosClient(self.scanner.ib)
        self.bars = TWSBarsClient(self.scanner.ib)

        print(f"[SUCCESS] ✅ Connected to TWS\n")

        # Step 2: Run scanner
        print(f"[STEP 2] Running scanner ({scan_code})...")
        scan_results = await self.scanner.scan_pre_market_gaps(
            min_gap_percent=min_gap_percent,
            min_volume=min_volume,
            max_results=max_results,
            scan_code=scan_code
        )

        if not scan_results:
            print("[WARNING] ⚠️ No stocks found matching criteria")
            self.scanner.disconnect()
            return {
                'stocks': [],
                'total_scanned': 0,
                'total_returned': 0,
                'execution_time_seconds': time.time() - start_time,
                'timestamp': datetime.now().isoformat()
            }

        print(f"[SUCCESS] ✅ Found {len(scan_results)} stocks\n")

        # Step 3: Enrich each stock with data
        print(f"[STEP 3] Enriching stocks with data...")
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

        # Step 4: Disconnect from TWS
        print("[STEP 4] Disconnecting from TWS...")
        self.scanner.disconnect()
        print("[SUCCESS] ✅ Disconnected\n")

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
            'timestamp': datetime.now().isoformat()
        }

        # Step 6: Save to database (database-backed architecture)
        print("[STEP 5] Saving to database...")
        params = {
            'min_gap_percent': min_gap_percent,
            'min_volume': min_volume,
            'max_results': max_results,
            'scan_code': scan_code,
            'include_sentiment': include_sentiment
        }
        self.save_to_database(results, params)
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
        Calculate composite screening score (0-100)

        Args:
            fundamentals: Fundamental data dict
            short_data: Short selling data dict
            ratios: Fundamental ratios dict
            bars: Pre-market bars data dict
            sentiment: Social sentiment dict (optional)

        Returns:
            Score from 0 to 100

        Scoring Factors:
            - Gap magnitude (30 points) - Larger gaps = more momentum
            - Volume (20 points) - Higher volume = more interest
            - Short squeeze potential (20 points) - Low shares = higher squeeze risk
            - Fundamentals (15 points) - Reasonable P/E = quality stock
            - Sentiment (15 points) - Bullish sentiment = retail interest
        """
        score = 0.0

        # Factor 1: Gap magnitude (30 points)
        # Larger absolute gap = more momentum
        gap_percent = abs(bars.get('gap_percent', 0))
        if gap_percent > 10:
            score += 30
        elif gap_percent > 7:
            score += 25
        elif gap_percent > 5:
            score += 20
        elif gap_percent > 3:
            score += 15
        elif gap_percent > 1:
            score += 10

        # Factor 2: Volume (20 points)
        # Higher pre-market volume = more interest
        volume = bars.get('pre_market_volume', 0)
        if volume > 5_000_000:
            score += 20
        elif volume > 2_000_000:
            score += 15
        elif volume > 1_000_000:
            score += 10
        elif volume > 500_000:
            score += 5

        # Factor 3: Short squeeze potential (20 points)
        # Lower shortable shares = higher squeeze potential
        shortable_shares = short_data.get('shortable_shares', float('inf'))
        if shortable_shares and shortable_shares < 10_000_000:
            score += 20  # Very Hard to Borrow
        elif shortable_shares and shortable_shares < 50_000_000:
            score += 15  # Hard to Borrow
        elif shortable_shares and shortable_shares < 100_000_000:
            score += 10  # Moderate
        elif shortable_shares:
            score += 5   # Easy to Borrow

        # Factor 4: Fundamentals (15 points)
        # Reasonable P/E = quality stock (not just speculation)
        pe_ratio = ratios.get('pe_ratio', 0)
        if pe_ratio > 0 and pe_ratio < 30:
            score += 15  # Reasonable valuation
        elif pe_ratio > 0 and pe_ratio < 50:
            score += 10  # Moderate valuation
        elif pe_ratio > 0:
            score += 5   # High valuation

        # Factor 5: Sentiment (15 points)
        # Bullish social sentiment = retail interest
        if sentiment:
            sentiment_score = sentiment.get('score', 0)  # -1 to 1
            sentiment_ratio = sentiment.get('sentiment_ratio', 0.5)  # 0 to 1

            # Convert -1 to 1 range to 0 to 15 points
            score += (sentiment_score + 1) * 7.5  # -1→0, 0→7.5, 1→15

            # Bonus for high positive ratio
            if sentiment_ratio > 0.7:
                score += 3

        return min(100, round(score, 1))


async def main():
    """Test the Screening Orchestrator"""
    print("=" * 70)
    print("Screening Orchestrator - Test Run")
    print("=" * 70)

    # Initialize orchestrator
    orchestrator = ScreeningOrchestrator()

    # Run complete screening pipeline
    results = await orchestrator.screen_pre_market(
        min_gap_percent=1.0,  # Lower for testing
        min_volume=100000,     # Lower for testing
        max_results=5,         # Fewer for testing
        include_sentiment=True
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
    print("Starting Screening Orchestrator test...")
    print("Make sure TWS Desktop is running on port 7496!\n")
    asyncio.run(main())
