#!/usr/bin/env python3
"""
TWS API (ib_insync) Comprehensive Probe

Tests what data is available through TWS API that user sees in TWS Desktop:
- Fundamental data (ReportSnapshot, CalendarReport)
- Short selling data (tick 236 - shortableShares, fee rate)
- Social sentiment (if available via ticks)
- Market data with new subscriptions ($14.50/mo)
- Pre-built scanners

User just subscribed to:
- US Securities Snapshot Bundle ($10/mo)
- US Equity Streaming Add-on ($4.50/mo)

This might give us ALL the data we need without external APIs!

Prerequisites:
- pip install ib_insync
- TWS Desktop running on port 7497 (paper) or 4001 (live)
- TWS API enabled in settings

Run: python scripts/test-tws-api.py
"""

from ib_insync import *
import asyncio
from datetime import datetime

def print_section(title):
    print(f"\n{'='*70}")
    print(f"=== {title}")
    print(f"{'='*70}\n")

async def test_tws_connectivity():
    """Test connection to TWS Desktop"""
    ib = IB()

    print_section("TWS API Connectivity Test")
    print("Attempting to connect to TWS Desktop...")
    print("Trying port 7496 (detected from settings)...")

    try:
        await ib.connectAsync('127.0.0.1', 7496, clientId=1)
        print("[SUCCESS] ✅ Connected to TWS on port 7496")
        return ib, 7496
    except Exception as e:
        print(f"[INFO] Port 7496 failed: {e}")
        print("Trying port 7497 (paper trading)...")

        try:
            await ib.connectAsync('127.0.0.1', 7497, clientId=1)
            print("[SUCCESS] ✅ Connected to TWS on port 7497 (paper trading)")
            return ib, 7497
        except Exception as e2:
            print(f"[INFO] Port 7497 failed: {e2}")
            print("Trying port 4001 (live trading)...")

            try:
                await ib.connectAsync('127.0.0.1', 4001, clientId=1)
                print("[SUCCESS] ✅ Connected to TWS on port 4001 (live trading)")
                return ib, 4001
            except Exception as e3:
                print(f"[FAIL] ❌ Connection failed: {e3}")
                print("\nTroubleshooting:")
                print("1. Is TWS Desktop running?")
                print("2. Is API enabled? (File → Global Configuration → API → Settings)")
                print("3. Is 'Enable ActiveX and Socket Clients' checked?")
                print("4. Is 'Read-Only API' unchecked?")
                return None, None

async def test_fundamental_data(ib):
    """
    Test reqFundamentalData - TWS Desktop shows:
    - Company fundamentals tab
    - Financial statements
    - Analyst estimates
    """
    print_section("Test 1: Fundamental Data (reqFundamentalData)")

    # Create contract
    contract = Stock('AAPL', 'SMART', 'USD')
    await ib.qualifyContractsAsync(contract)
    print(f"Testing contract: {contract.symbol} (conId: {contract.conId})")

    # Test different report types
    report_types = [
        ('ReportSnapshot', 'Financial summary'),
        ('ReportsFinSummary', 'Financial summary'),
        ('ReportRatios', 'Financial ratios'),
        ('ReportsFinStatements', 'Financial statements'),
        ('RESC', 'Analyst estimates'),
        ('CalendarReport', 'Earnings calendar')
    ]

    results = {}

    for report_type, description in report_types:
        try:
            print(f"\n[TEST] {report_type} ({description})...")
            data = await ib.reqFundamentalDataAsync(contract, report_type)

            if data and len(data) > 100:
                # Check for key fields in XML
                has_market_cap = 'MarketCap' in data or 'mktCap' in data
                has_pe = 'PE' in data or 'peRatio' in data
                has_eps = 'EPS' in data or 'earningsPerShare' in data
                has_sector = 'Sector' in data or 'Industry' in data

                found = []
                if has_market_cap: found.append('Market Cap')
                if has_pe: found.append('P/E Ratio')
                if has_eps: found.append('EPS')
                if has_sector: found.append('Sector/Industry')

                print(f"  [SUCCESS] ✅ {len(data)} bytes received")
                print(f"  Found: {', '.join(found) if found else 'XML data present'}")
                results[report_type] = 'SUCCESS'

                # Show sample (first 500 chars)
                print(f"  Sample: {data[:500]}...")
            else:
                print(f"  [PARTIAL] ⚠️ Data received but short ({len(data) if data else 0} bytes)")
                results[report_type] = 'PARTIAL'

        except Exception as e:
            print(f"  [FAIL] ❌ {e}")
            results[report_type] = 'FAIL'

    return results

async def test_market_data_ticks(ib):
    """
    Test reqMktData with genericTickList for advanced data

    With new market data subscriptions, we might get:
    - Tick 236: Shortable shares
    - Tick 456: IBDividends
    - And potentially sentiment/social data
    """
    print_section("Test 2: Market Data with Generic Ticks (New Subscriptions)")

    contract = Stock('AAPL', 'SMART', 'USD')
    await ib.qualifyContractsAsync(contract)

    print("Testing with new market data subscriptions:")
    print("- US Securities Snapshot Bundle ($10/mo)")
    print("- US Equity Streaming Add-on ($4.50/mo)")
    print()

    # Generic tick types to test
    # https://interactivebrokers.github.io/tws-api/tick_types.html
    tick_tests = [
        ('236', 'Shortable Shares (short inventory)'),
        ('456', 'IBDividends'),
        ('104', 'Historical Volatility'),
        ('106', 'Option Implied Volatility'),
        ('162', 'Index Future Premium'),
        ('165', 'Misc Stats'),
        ('221', 'Mark Price'),
        ('225', 'Auction Values'),
        ('233', 'RTVolume (real-time volume)'),
        ('258', 'Fundamental Ratios'),
        ('411', 'Realtime Historical Volatility'),
    ]

    results = {}

    for tick_id, description in tick_tests:
        try:
            print(f"\n[TEST] Tick {tick_id}: {description}")

            # Request market data with specific tick
            ticker = ib.reqMktData(contract, tick_id, False, False)
            await asyncio.sleep(3)  # Wait for data

            # Check what we got
            tick_data = {}
            if hasattr(ticker, 'shortableShares') and ticker.shortableShares:
                tick_data['shortableShares'] = ticker.shortableShares
            if hasattr(ticker, 'fundamentalRatios') and ticker.fundamentalRatios:
                tick_data['fundamentalRatios'] = ticker.fundamentalRatios
            if hasattr(ticker, 'rtVolume') and ticker.rtVolume:
                tick_data['rtVolume'] = ticker.rtVolume

            # Check all tick attributes
            for attr in dir(ticker):
                if not attr.startswith('_') and hasattr(ticker, attr):
                    val = getattr(ticker, attr)
                    if val and not callable(val) and attr not in ['contract', 'time']:
                        tick_data[attr] = val

            if tick_data:
                print(f"  [SUCCESS] ✅ Received data:")
                for key, val in tick_data.items():
                    print(f"    {key}: {val}")
                results[tick_id] = 'SUCCESS'
            else:
                print(f"  [FAIL] ❌ No data received (might need different subscription)")
                results[tick_id] = 'FAIL'

            ib.cancelMktData(contract)

        except Exception as e:
            print(f"  [FAIL] ❌ {e}")
            results[tick_id] = 'FAIL'

    return results

async def test_scanner_data(ib):
    """
    Test reqScannerData for pre-built market scanners

    TWS Desktop has many pre-built scanners visible.
    Can we access them programmatically?
    """
    print_section("Test 3: Pre-Built Market Scanners (reqScannerData)")

    # Get scanner parameters first
    try:
        print("[INFO] Requesting scanner parameters...")
        params = await ib.reqScannerParametersAsync()
        print(f"[SUCCESS] ✅ {len(params)} bytes of scanner params received")

        # Parse XML to count scan types (rough estimate)
        scan_count = params.count('<displayName>')
        print(f"  Estimated scan types available: {scan_count}")

    except Exception as e:
        print(f"[FAIL] ❌ Scanner parameters: {e}")
        return {}

    # Test a few common scanners
    scanner_tests = [
        ('TOP_PERC_GAIN', 'Top % Gainers'),
        ('TOP_PERC_LOSE', 'Top % Losers'),
        ('MOST_ACTIVE', 'Most Active'),
        ('HOT_BY_VOLUME', 'Hot by Volume'),
    ]

    results = {}

    for scan_code, description in scanner_tests:
        try:
            print(f"\n[TEST] Scanner: {scan_code} ({description})")

            # Create scanner subscription
            sub = ScannerSubscription(
                instrument='STK',
                locationCode='STK.US.MAJOR',
                scanCode=scan_code,
                aboveVolume=1000000,
                numberOfRows=10
            )

            # Request scanner data
            scanData = await ib.reqScannerDataAsync(sub)

            if scanData and len(scanData) > 0:
                print(f"  [SUCCESS] ✅ {len(scanData)} results returned")
                print(f"  Top 3 results:")
                for i, data in enumerate(scanData[:3], 1):
                    symbol = data.contractDetails.contract.symbol
                    print(f"    {i}. {symbol}")
                results[scan_code] = 'SUCCESS'
            else:
                print(f"  [FAIL] ❌ No results (might need subscription)")
                results[scan_code] = 'FAIL'

        except Exception as e:
            print(f"  [FAIL] ❌ {e}")
            results[scan_code] = 'FAIL'

    return results

async def test_real_time_vs_delayed(ib):
    """
    Test if we're getting real-time data with new subscriptions
    """
    print_section("Test 4: Real-Time vs Delayed Data")

    contract = Stock('AAPL', 'SMART', 'USD')
    await ib.qualifyContractsAsync(contract)

    try:
        ticker = ib.reqMktData(contract, '', False, False)
        await asyncio.sleep(2)

        if ticker.marketDataType == 1:
            print("[SUCCESS] ✅ Real-time data (not delayed)")
            print(f"  Last price: ${ticker.last}")
            print(f"  Bid/Ask: ${ticker.bid} / ${ticker.ask}")
            return 'REAL_TIME'
        elif ticker.marketDataType == 2:
            print("[INFO] ⚠️ Frozen data")
            return 'FROZEN'
        elif ticker.marketDataType == 3:
            print("[INFO] ⚠️ Delayed data (15-minute delay)")
            print("  New subscriptions might not be active yet")
            return 'DELAYED'
        else:
            print(f"[INFO] Data type: {ticker.marketDataType}")
            return 'UNKNOWN'

    except Exception as e:
        print(f"[FAIL] ❌ {e}")
        return 'FAIL'

async def test_news_providers(ib):
    """
    Test news providers and historical news
    """
    print_section("Test 5: News Providers & Articles")

    try:
        # Get news providers
        providers = await ib.reqNewsProvidersAsync()
        print(f"[SUCCESS] ✅ {len(providers)} news providers available")
        print("  Top 5 providers:")
        for p in providers[:5]:
            print(f"    - {p.code}: {p.name}")

        # Try to get news for a stock
        contract = Stock('AAPL', 'SMART', 'USD')
        await ib.qualifyContractsAsync(contract)

        print(f"\n[TEST] Fetching historical news for AAPL...")
        news = await ib.reqHistoricalNewsAsync(
            conId=contract.conId,
            providerCodes='',
            startDateTime='',
            endDateTime='',
            totalResults=10
        )

        if news and len(news) > 0:
            print(f"[SUCCESS] ✅ {len(news)} articles fetched")
            print(f"  Latest: {news[0].headline if news else 'N/A'}")

            # Check if sentiment is available
            has_sentiment = any(hasattr(n, 'sentiment') for n in news)
            if has_sentiment:
                print("  [BONUS] ✅ Sentiment data available in news!")
            else:
                print("  [INFO] No sentiment scores in news articles")

            return 'SUCCESS'
        else:
            print("[FAIL] ❌ No news articles returned")
            return 'FAIL'

    except Exception as e:
        print(f"[FAIL] ❌ {e}")
        return 'FAIL'

async def main():
    print("="*70)
    print("TWS API (ib_insync) Comprehensive Data Availability Test")
    print("="*70)
    print("\nThis will test if TWS API can access data visible in TWS Desktop:")
    print("- Fundamentals (Financial statements, ratios)")
    print("- Short selling data (shortable shares, fee rates)")
    print("- Market data with NEW subscriptions ($14.50/mo)")
    print("- Pre-built market scanners")
    print("- News with potential sentiment")
    print("\nIf TWS API has this data, we DON'T need Finnhub/Yahoo!\n")

    # Connect to TWS
    ib, port = await test_tws_connectivity()
    if not ib:
        print("\n[FATAL] ❌ Could not connect to TWS Desktop")
        print("Please start TWS and enable API, then run this script again.")
        return

    print(f"\n[INFO] Connected on port {port}")
    print(f"[INFO] Server version: {ib.client.serverVersion()}")

    # Run all tests
    fundamental_results = await test_fundamental_data(ib)
    tick_results = await test_market_data_ticks(ib)
    scanner_results = await test_scanner_data(ib)
    data_type = await test_real_time_vs_delayed(ib)
    news_result = await test_news_providers(ib)

    # Print final summary
    print_section("FINAL SUMMARY")

    print("Fundamental Data:")
    for report_type, status in fundamental_results.items():
        icon = '✅' if status == 'SUCCESS' else '⚠️' if status == 'PARTIAL' else '❌'
        print(f"  {icon} {report_type}: {status}")

    print("\nMarket Data Ticks:")
    for tick_id, status in tick_results.items():
        icon = '✅' if status == 'SUCCESS' else '❌'
        print(f"  {icon} Tick {tick_id}: {status}")

    print("\nMarket Scanners:")
    for scan_code, status in scanner_results.items():
        icon = '✅' if status == 'SUCCESS' else '❌'
        print(f"  {icon} {scan_code}: {status}")

    print(f"\nData Type: {data_type}")
    print(f"News/Sentiment: {news_result}")

    # Critical decision
    print("\n" + "="*70)
    print("CRITICAL DECISION:")
    print("="*70)

    fundamental_success = any(s == 'SUCCESS' for s in fundamental_results.values())
    tick_success = any(s == 'SUCCESS' for s in tick_results.values())
    scanner_success = any(s == 'SUCCESS' for s in scanner_results.values())

    if fundamental_success and tick_success:
        print("✅ TWS API HAS FUNDAMENTAL + MARKET DATA")
        print("   → We might NOT need Yahoo Finance!")
        print("   → Re-test Client Portal API with new subscriptions")
    else:
        print("❌ TWS API LACKS KEY DATA")
        print("   → Need external APIs (Yahoo Finance, Finnhub)")

    if scanner_success:
        print("✅ TWS API HAS MARKET SCANNERS")
        print("   → Can use TWS scanners instead of Client Portal")
    else:
        print("⚠️ TWS API SCANNERS NEED VERIFICATION")

    # Disconnect
    ib.disconnect()
    print("\n[INFO] Disconnected from TWS")

if __name__ == '__main__':
    print("Starting TWS API probe...")
    print("Make sure TWS Desktop is running with API enabled!\n")
    asyncio.run(main())
