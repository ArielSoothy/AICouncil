#!/usr/bin/env python3
"""
Comprehensive TWS API Clients Test Suite

Tests all 5 TWS API clients in sequence:
1. Scanner (3,323 scan types)
2. Fundamentals (P/E, EPS, Market Cap, Sector)
3. Short Data (shortable shares - CRITICAL!)
4. Ratios (60+ fundamental ratios)
5. Bars (pre-market gaps)

Prerequisites:
- TWS Desktop running on port 7496
- API enabled in TWS settings
- Market data subscriptions active ($14.50/mo)

Run: python scripts/test-all-tws-clients.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from ib_insync import *
import asyncio
from datetime import datetime

from lib.trading.screening.tws_scanner_sync import TWSScannerSync
from lib.trading.screening.tws_fundamentals import TWSFundamentalsClient
from lib.trading.screening.tws_short_data import TWSShortDataClient
from lib.trading.screening.tws_ratios import TWSRatiosClient
from lib.trading.screening.tws_bars import TWSBarsClient


def print_header(title):
    """Print formatted section header"""
    print("\n" + "=" * 80)
    print(f"=== {title}")
    print("=" * 80 + "\n")


def print_success(message):
    """Print success message"""
    print(f"[SUCCESS] ✅ {message}")


def print_fail(message):
    """Print failure message"""
    print(f"[FAIL] ❌ {message}")


def print_info(message):
    """Print info message"""
    print(f"[INFO] ℹ️  {message}")


async def test_all_clients():
    """
    Comprehensive test of all TWS API clients

    Returns:
        Dict with test results summary
    """
    print_header("TWS API Clients - Comprehensive Test Suite")
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Testing all 5 TWS API clients in sequence...")
    print("\nPrerequisites:")
    print("  ✓ TWS Desktop running on port 7496")
    print("  ✓ API enabled in TWS settings")
    print("  ✓ Market data subscriptions active ($14.50/mo)")
    print()

    results = {
        'scanner': None,
        'fundamentals': None,
        'short_data': None,
        'ratios': None,
        'bars': None,
        'overall': 'PENDING'
    }

    # Connect to TWS
    ib = IB()

    try:
        print_info("Connecting to TWS Desktop on port 7496...")
        await ib.connectAsync('127.0.0.1', 7496, clientId=1)
        print_success(f"Connected to TWS (Server version: {ib.client.serverVersion()})")

    except Exception as e:
        print_fail(f"Connection failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Is TWS Desktop running? (Not Gateway)")
        print("  2. Is API enabled? (File → Global Configuration → API → Settings)")
        print("  3. Is 'Enable ActiveX and Socket Clients' checked?")
        print("  4. Is socket port set to 7496?")
        results['overall'] = 'FAILED - NO CONNECTION'
        return results

    # Create test contracts
    print_info("Creating test contracts (AAPL, TSLA, NVDA)...")
    test_contracts = [
        Stock('AAPL', 'SMART', 'USD'),
        Stock('TSLA', 'SMART', 'USD'),
        Stock('NVDA', 'SMART', 'USD')
    ]
    await ib.qualifyContractsAsync(*test_contracts)
    print_success("Test contracts qualified")

    # -------------------------------------------------------------------
    # TEST 1: Scanner Client (SYNC - WORKS!)
    # -------------------------------------------------------------------
    print_header("TEST 1: Scanner Client (Sync Version)")

    try:
        scanner = TWSScannerSync(client_id=2)  # Use different client ID to avoid conflict
        scanner.connect()

        # Test MOST_ACTIVE scan (works anytime, not just market hours)
        print_info("Running MOST_ACTIVE scan...")
        scan_results = scanner.scan_most_active(
            min_volume=100000,
            min_price=1.0,
            max_price=20.0,
            max_results=5
        )

        if scan_results:
            print_success(f"Scanner returned {len(scan_results)} stocks:")
            for i, stock in enumerate(scan_results[:3], 1):
                print(f"  {i}. {stock['symbol']} (rank: {stock['rank']})")
            results['scanner'] = 'PASS'
        else:
            print_info("No scan results (may be outside market hours)")
            results['scanner'] = 'PARTIAL'

        scanner.disconnect()

    except Exception as e:
        print_fail(f"Scanner test failed: {e}")
        results['scanner'] = 'FAIL'

    # -------------------------------------------------------------------
    # TEST 2: Fundamentals Client
    # -------------------------------------------------------------------
    print_header("TEST 2: Fundamentals Client (P/E, EPS, Market Cap)")

    try:
        fundamentals_client = TWSFundamentalsClient(ib)

        print_info("Getting fundamentals for AAPL...")
        aapl_fund = await fundamentals_client.get_fundamentals(
            test_contracts[0],
            'ReportSnapshot'
        )

        if 'error' not in aapl_fund:
            print_success("Fundamental data received:")
            if 'pe_ratio' in aapl_fund:
                print(f"  P/E Ratio: {aapl_fund['pe_ratio']:.2f}")
            if 'eps' in aapl_fund:
                print(f"  EPS: ${aapl_fund['eps']:.2f}")
            if 'market_cap' in aapl_fund:
                market_cap_b = aapl_fund['market_cap'] / 1_000_000_000
                print(f"  Market Cap: ${market_cap_b:.2f}B")
            if 'sector' in aapl_fund:
                print(f"  Sector: {aapl_fund['sector']}")

            # Test batch request
            print_info("Testing batch fundamentals (AAPL, TSLA, NVDA)...")
            batch_fund = await fundamentals_client.get_fundamentals_batch(
                test_contracts[:3]
            )
            print_success(f"Batch fundamentals: {len(batch_fund)} stocks processed")

            results['fundamentals'] = 'PASS'
        else:
            print_fail(f"Fundamentals error: {aapl_fund['error']}")
            results['fundamentals'] = 'FAIL'

    except Exception as e:
        print_fail(f"Fundamentals test failed: {e}")
        results['fundamentals'] = 'FAIL'

    # -------------------------------------------------------------------
    # TEST 3: Short Data Client ⭐ CRITICAL
    # -------------------------------------------------------------------
    print_header("TEST 3: Short Data Client (Shortable Shares) ⭐ CRITICAL")

    try:
        short_client = TWSShortDataClient(ib)

        print_info("Getting short data for AAPL...")
        aapl_short = await short_client.get_short_data(test_contracts[0])

        if 'error' not in aapl_short and aapl_short['shortable_shares']:
            shares = aapl_short['shortable_shares']
            print_success("Short data received:")
            print(f"  Shortable Shares: {shares:,}")
            print(f"  Borrow Difficulty: {aapl_short['borrow_difficulty']}")
            print(f"  Is Hard to Borrow: {aapl_short['is_hard_to_borrow']}")

            # Calculate short squeeze score
            squeeze_score = short_client.calculate_short_squeeze_score(
                aapl_short,
                volume=100_000_000
            )
            print(f"  Short Squeeze Score: {squeeze_score:.1f}/100")

            # Test batch request
            print_info("Testing batch short data (AAPL, TSLA, NVDA)...")
            batch_short = await short_client.get_short_data_batch(
                test_contracts[:3]
            )
            print_success(f"Batch short data: {len(batch_short)} stocks processed")
            for stock in batch_short:
                if stock.get('shortable_shares'):
                    print(f"  {stock['symbol']}: {stock['shortable_shares']:,} shares")

            results['short_data'] = 'PASS'
        else:
            error_msg = aapl_short.get('error', 'No shortable shares data')
            print_fail(f"Short data error: {error_msg}")
            print_info("This might indicate market data subscription needed")
            results['short_data'] = 'FAIL'

    except Exception as e:
        print_fail(f"Short data test failed: {e}")
        results['short_data'] = 'FAIL'

    # -------------------------------------------------------------------
    # TEST 4: Ratios Client (60+ ratios)
    # -------------------------------------------------------------------
    print_header("TEST 4: Ratios Client (60+ Fundamental Ratios)")

    try:
        ratios_client = TWSRatiosClient(ib)

        print_info("Getting 60+ ratios for AAPL...")
        aapl_ratios = await ratios_client.get_ratios(test_contracts[0])

        if 'error' not in aapl_ratios:
            ratio_count = len(aapl_ratios) - 1  # -1 for 'symbol' key
            print_success(f"Ratios received: {ratio_count} ratios")

            # Display key ratios
            print("\n  Key Ratios:")
            if 'pe_ratio' in aapl_ratios:
                print(f"    P/E: {aapl_ratios['pe_ratio']:.2f}")
            if 'roe' in aapl_ratios:
                print(f"    ROE: {aapl_ratios['roe']:.2f}%")
            if 'debt_to_equity' in aapl_ratios:
                print(f"    Debt/Equity: {aapl_ratios['debt_to_equity']:.2f}")
            if 'current_ratio' in aapl_ratios:
                print(f"    Current Ratio: {aapl_ratios['current_ratio']:.2f}")
            if 'beta' in aapl_ratios:
                print(f"    Beta: {aapl_ratios['beta']:.2f}")

            # Calculate value score
            value_score = ratios_client.calculate_value_score(aapl_ratios)
            print(f"\n  Value Score: {value_score:.1f}/100")

            # Test batch request
            print_info("Testing batch ratios (AAPL, TSLA, NVDA)...")
            batch_ratios = await ratios_client.get_ratios_batch(
                test_contracts[:3]
            )
            print_success(f"Batch ratios: {len(batch_ratios)} stocks processed")

            results['ratios'] = 'PASS'
        else:
            print_fail(f"Ratios error: {aapl_ratios['error']}")
            results['ratios'] = 'FAIL'

    except Exception as e:
        print_fail(f"Ratios test failed: {e}")
        results['ratios'] = 'FAIL'

    # -------------------------------------------------------------------
    # TEST 5: Bars Client (Pre-market gaps)
    # -------------------------------------------------------------------
    print_header("TEST 5: Bars Client (Pre-Market Gaps)")

    try:
        bars_client = TWSBarsClient(ib)

        print_info("Getting pre-market bars for AAPL...")
        aapl_bars = await bars_client.get_pre_market_bars(test_contracts[0])

        if 'error' not in aapl_bars:
            print_success("Bars data received:")
            print(f"  Total bars: {aapl_bars.get('total_bars', 0)}")
            print(f"  Pre-market bars: {aapl_bars.get('pre_market_bars_count', 0)}")

            if 'gap_percent' in aapl_bars:
                print(f"\n  Gap Analysis:")
                print(f"    Gap: {aapl_bars['gap_percent']}% ({aapl_bars['gap_direction']})")
                print(f"    Previous Close: ${aapl_bars['previous_close']}")
                print(f"    Pre-Market Price: ${aapl_bars['pre_market_price']}")
                if aapl_bars.get('pre_market_volume'):
                    print(f"    Pre-Market Volume: {aapl_bars['pre_market_volume']:,}")
                if 'momentum_score' in aapl_bars:
                    print(f"    Momentum Score: {aapl_bars['momentum_score']}/100")

                results['bars'] = 'PASS'
            else:
                print_info("No gap data (may be outside pre-market hours)")
                print_info("For real pre-market data, run between 4:00-9:30 AM ET")
                results['bars'] = 'PARTIAL'

        else:
            print_info(f"Bars note: {aapl_bars.get('error', 'No bars data')}")
            if 'note' in aapl_bars:
                print_info(f"  {aapl_bars['note']}")
            results['bars'] = 'PARTIAL'

    except Exception as e:
        print_fail(f"Bars test failed: {e}")
        results['bars'] = 'FAIL'

    # -------------------------------------------------------------------
    # Disconnect
    # -------------------------------------------------------------------
    ib.disconnect()
    print_info("Disconnected from TWS")

    # -------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------
    print_header("TEST SUMMARY")

    test_results = [
        ("Scanner Client", results['scanner']),
        ("Fundamentals Client", results['fundamentals']),
        ("Short Data Client ⭐", results['short_data']),
        ("Ratios Client", results['ratios']),
        ("Bars Client", results['bars'])
    ]

    print(f"{'Test':<30} {'Result':<15}")
    print("-" * 50)

    pass_count = 0
    fail_count = 0

    for test_name, result in test_results:
        if result == 'PASS':
            icon = '✅'
            pass_count += 1
        elif result == 'PARTIAL':
            icon = '⚠️'
        elif result == 'FAIL':
            icon = '❌'
            fail_count += 1
        else:
            icon = '❓'

        print(f"{test_name:<30} {icon} {result}")

    # Overall result
    if fail_count == 0 and pass_count >= 4:
        results['overall'] = 'PASS'
        overall_icon = '✅'
    elif fail_count == 0:
        results['overall'] = 'PARTIAL'
        overall_icon = '⚠️'
    else:
        results['overall'] = 'FAIL'
        overall_icon = '❌'

    print("-" * 50)
    print(f"{'OVERALL':<30} {overall_icon} {results['overall']}")

    # Critical assessment
    print("\n" + "=" * 80)
    print("CRITICAL ASSESSMENT")
    print("=" * 80)

    if results['short_data'] == 'PASS':
        print("\n✅ SHORT DATA WORKING!")
        print("   This is the CRITICAL data that Client Portal API couldn't provide")
        print("   Field 7636 returned 0 in Client Portal → TWS tick 236 works!")
    else:
        print("\n⚠️ SHORT DATA NOT WORKING")
        print("   This is critical for pre-market screening")
        print("   Check: Market data subscriptions active?")

    if results['ratios'] == 'PASS':
        print("\n✅ 60+ RATIOS AVAILABLE")
        print("   Far more comprehensive than Yahoo Finance (~15 ratios)")
    else:
        print("\n⚠️ RATIOS NOT WORKING")

    if pass_count >= 4:
        print("\n" + "=" * 80)
        print("🎉 SUCCESS! TWS API provides 90% of needed data")
        print("=" * 80)
        print("\nNext steps:")
        print("  1. Build FastAPI REST bridge (Phase 6)")
        print("  2. Create screening orchestrator (Phase 7)")
        print("  3. Integrate Finnhub for sentiment (Phase 8)")
        print("  4. Connect to Next.js frontend (Phase 9)")
    else:
        print("\n" + "=" * 80)
        print("⚠️ SOME TESTS FAILED - Review errors above")
        print("=" * 80)

    return results


if __name__ == '__main__':
    print("=" * 80)
    print("TWS API Clients - Comprehensive Test Suite")
    print("=" * 80)
    print("\nMake sure TWS Desktop is running on port 7496!")
    print("Press Ctrl+C to cancel...\n")

    import time
    time.sleep(2)

    results = asyncio.run(test_all_clients())

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    print(f"\nOverall Result: {results['overall']}")
    print()
