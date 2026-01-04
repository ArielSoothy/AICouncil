#!/usr/bin/env python3
"""
Minimal screening test - scanner only, NO enrichment

Proves the scanner works and returns real stocks.
"""

from lib.trading.screening.tws_scanner_sync import TWSScannerSync
from datetime import datetime
import time
import json


def run_minimal_screening(
    min_volume: int = 100000,
    min_price: float = 1.0,
    max_price: float = 20.0,
    max_results: int = 20
):
    """
    Minimal screening - scanner results only

    Step 1: Connect to TWS
    Step 2: Scan for stocks
    Step 3: Return results (no enrichment)
    """
    start_time = time.time()

    print("=" * 70)
    print("MINIMAL SCREENING TEST - SCANNER ONLY")
    print("=" * 70)
    print(f"Min Volume: {min_volume:,}")
    print(f"Price Range: ${min_price} - ${max_price}")
    print(f"Max Results: {max_results}")
    print()

    # Step 1: Connect to TWS
    print("[STEP 1] Connecting to TWS...")
    scanner = TWSScannerSync()
    scanner.connect()
    print()

    # Step 2: Scan for stocks
    print("[STEP 2] Scanning for stocks...")
    scan_results = scanner.scan_most_active(
        min_volume=min_volume,
        min_price=min_price,
        max_price=max_price,
        max_results=max_results
    )

    if not scan_results:
        print("[WARNING] ⚠️ No stocks found")
        scanner.disconnect()
        return {'stocks': [], 'total': 0}

    print()

    # Step 3: Return results
    scanner.disconnect()

    # Build simple result list
    stocks = []
    for stock in scan_results:
        stocks.append({
            'symbol': stock['symbol'],
            'rank': stock['rank'],
            'exchange': stock['exchange'],
            'conid': stock['conid']
        })

    execution_time = time.time() - start_time

    print("=" * 70)
    print(f"[COMPLETE] Found {len(stocks)} stocks in {execution_time:.1f}s")
    print("=" * 70)
    print("\nResults:")
    for i, stock in enumerate(stocks, 1):
        print(f"  {i}. {stock['symbol']} (rank: {stock['rank']})")
    print()

    result = {
        'stocks': stocks,
        'total': len(stocks),
        'execution_time_seconds': execution_time,
        'timestamp': datetime.now().isoformat()
    }

    return result


if __name__ == '__main__':
    results = run_minimal_screening(
        min_volume=100000,
        min_price=1.0,
        max_price=20.0,
        max_results=20
    )

    print("=" * 70)
    print("JSON OUTPUT")
    print("=" * 70)
    print(json.dumps(results, indent=2, default=str))
