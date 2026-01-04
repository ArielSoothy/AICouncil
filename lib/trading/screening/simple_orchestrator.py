#!/usr/bin/env python3
"""
Simple Screening Orchestrator - REBUILT FROM SCRATCH

No async complexity, no test mode, just works.
Uses synchronous TWS scanner that actually returns real data.
"""

from lib.trading.screening.tws_scanner_sync import TWSScannerSync
from lib.trading.screening.tws_fundamentals import TWSFundamentalsClient
from lib.trading.screening.tws_short_data import TWSShortDataClient
from lib.trading.screening.tws_ratios import TWSRatiosClient
from lib.trading.screening.tws_bars import TWSBarsClient
from datetime import datetime
import time
import json


class SimpleOrchestrator:
    """Simple orchestrator - no async, no test mode, just works"""

    def __init__(self):
        self.scanner = TWSScannerSync()

    def run(
        self,
        min_gap_percent: float = 5.0,
        min_volume: int = 250000,
        max_float_shares: float = 30_000_000,
        min_relative_volume: float = 5.0,
        min_price: float = 1.0,
        max_price: float = 20.0,
        max_results: int = 20
    ):
        """
        Run screening pipeline

        Step 1: Connect to TWS
        Step 2: Scan for stocks
        Step 3: Enrich with fundamentals
        Step 4: Filter by criteria
        Step 5: Return results
        """
        start_time = time.time()

        print("=" * 70)
        print("SIMPLE SCREENING ORCHESTRATOR - REAL DATA ONLY")
        print("=" * 70)
        print(f"Min Gap: {min_gap_percent}%")
        print(f"Min Volume: {min_volume:,}")
        print(f"Max Float: {max_float_shares/1_000_000:.0f}M shares")
        print(f"Min Relative Volume: {min_relative_volume}x")
        print(f"Price Range: ${min_price} - ${max_price}")
        print(f"Max Results: {max_results}")
        print()

        # Step 1: Connect to TWS
        print("[STEP 1] Connecting to TWS...")
        self.scanner.connect()

        # Initialize clients
        fundamentals = TWSFundamentalsClient(self.scanner.ib)
        short_data = TWSShortDataClient(self.scanner.ib)
        ratios = TWSRatiosClient(self.scanner.ib)
        bars = TWSBarsClient(self.scanner.ib)
        print()

        # Step 2: Scan for stocks
        print("[STEP 2] Scanning for stocks...")
        scan_results = self.scanner.scan_most_active(
            min_volume=min_volume,
            min_price=min_price,
            max_price=max_price,
            max_results=max_results * 2  # Get extra, filter later
        )

        if not scan_results:
            print("[WARNING] ⚠️ No stocks found")
            self.scanner.disconnect()
            return {
                'stocks': [],
                'total_scanned': 0,
                'total_returned': 0,
                'execution_time_seconds': time.time() - start_time,
                'timestamp': datetime.now().isoformat()
            }

        print()

        # Step 3: Enrich with fundamentals
        print(f"[STEP 3] Enriching {len(scan_results)} stocks...")
        enriched_stocks = []

        for i, stock in enumerate(scan_results, 1):
            symbol = stock['symbol']
            contract = stock['contract']

            print(f"\n  [{i}/{len(scan_results)}] {symbol}")

            # Get fundamentals
            print(f"    → Fetching fundamentals...")
            fundamentals_data = fundamentals.get_fundamentals(contract)

            # Get gap %
            print(f"    → Calculating gap %...")
            bars_data = bars.get_gap_percent(contract)
            gap_percent = bars_data.get('gap_percent', 0) if bars_data else 0

            # Get short data
            print(f"    → Fetching short interest...")
            short_interest = short_data.get_short_interest(contract)

            # Get ratios
            print(f"    → Fetching ratios...")
            ratios_data = ratios.get_ratios(contract)

            # Extract key metrics
            float_shares = fundamentals_data.get('shares_outstanding', 999_999_999) if fundamentals_data else 999_999_999
            current_price = fundamentals_data.get('last_price', 0) if fundamentals_data else 0
            volume = fundamentals_data.get('volume', 0) if fundamentals_data else 0
            avg_volume = fundamentals_data.get('avg_volume_20d', 1) if fundamentals_data else 1
            relative_volume = volume / avg_volume if avg_volume > 0 else 0

            print(f"    ✅ Data: Price=${current_price:.2f}, Gap={gap_percent:.1f}%, Float={float_shares/1_000_000:.1f}M, RVol={relative_volume:.1f}x")

            # Step 4: Apply filters
            # Filter 1: Gap
            if gap_percent < min_gap_percent:
                print(f"    ❌ FILTERED: Gap {gap_percent:.1f}% < {min_gap_percent}%")
                continue

            # Filter 2: Float
            if float_shares > max_float_shares:
                print(f"    ❌ FILTERED: Float {float_shares/1_000_000:.1f}M > {max_float_shares/1_000_000:.0f}M")
                continue

            # Filter 3: Relative Volume
            if relative_volume < min_relative_volume:
                print(f"    ❌ FILTERED: RVol {relative_volume:.1f}x < {min_relative_volume}x")
                continue

            print(f"    ✅ PASSED ALL FILTERS!")

            # Build result
            enriched_stocks.append({
                'symbol': symbol,
                'price': current_price,
                'gap_percent': gap_percent,
                'volume': volume,
                'relative_volume': relative_volume,
                'float_shares': float_shares,
                'market_cap': fundamentals_data.get('market_cap', 0) if fundamentals_data else 0,
                'short_interest': short_interest,
                'ratios': ratios_data,
                'rank': stock['rank']
            })

            # Stop if we have enough
            if len(enriched_stocks) >= max_results:
                print(f"\n  ✅ Reached max results ({max_results}), stopping enrichment")
                break

        # Disconnect
        self.scanner.disconnect()

        # Step 5: Return results
        execution_time = time.time() - start_time

        print()
        print("=" * 70)
        print(f"[COMPLETE] Found {len(enriched_stocks)} stocks in {execution_time:.1f}s")
        print("=" * 70)

        if enriched_stocks:
            print("\nTop results:")
            for i, stock in enumerate(enriched_stocks[:5], 1):
                print(f"  {i}. {stock['symbol']}: ${stock['price']:.2f}, Gap={stock['gap_percent']:.1f}%, RVol={stock['relative_volume']:.1f}x")

        return {
            'stocks': enriched_stocks,
            'total_scanned': len(scan_results),
            'total_returned': len(enriched_stocks),
            'execution_time_seconds': execution_time,
            'timestamp': datetime.now().isoformat()
        }


def main():
    """Test the simple orchestrator"""
    orchestrator = SimpleOrchestrator()

    results = orchestrator.run(
        min_gap_percent=3.0,
        min_volume=100000,
        max_float_shares=50_000_000,
        min_relative_volume=2.0,
        min_price=1.0,
        max_price=20.0,
        max_results=10
    )

    print("\n" + "=" * 70)
    print("FINAL RESULTS")
    print("=" * 70)
    print(json.dumps(results, indent=2, default=str))


if __name__ == '__main__':
    main()
