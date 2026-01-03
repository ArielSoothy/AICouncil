"""
IBKR TWS API Capabilities Probe
Enhanced version with scanner + pre-market testing
"""

from ib_insync import *
import asyncio
from datetime import datetime

def print_section(title):
    print(f"\n{'='*60}")
    print(f"=== {title}")
    print(f"{'='*60}\n")

async def probe_tws_capabilities():
    # Connect to TWS (try both ports)
    ib = IB()

    print_section("Connecting to TWS")
    try:
        await ib.connectAsync('127.0.0.1', 7497, clientId=1)
        print("[SUCCESS] Connected to TWS on port 7497 (paper trading)")
    except:
        try:
            await ib.connectAsync('127.0.0.1', 4001, clientId=1)
            print("[SUCCESS] Connected to TWS on port 4001 (live trading)")
        except Exception as e:
            print(f"[FAIL] Connection: {e}")
            return

    # Test ticker
    contract = Stock('AAPL', 'SMART', 'USD')
    await ib.qualifyContractsAsync(contract)

    results = []

    # Test 1: Short Data
    print_section("Test 1: Short Data")
    try:
        ticker = ib.reqMktData(contract, '236,233', False, False)
        await asyncio.sleep(3)

        if ticker.shortableShares:
            print(f"[SUCCESS] Short Data: {ticker.shortableShares:,} shares shortable")
            results.append(("Short Data", "SUCCESS", f"{ticker.shortableShares:,} shares"))
        else:
            print(f"[PARTIAL] Short Data: No shortable shares data (may need subscription)")
            results.append(("Short Data", "PARTIAL", "No data received"))

        ib.cancelMktData(contract)
    except Exception as e:
        print(f"[FAIL] Short Data: {e}")
        results.append(("Short Data", "FAIL", str(e)))

    # Test 2: Social Sentiment
    print_section("Test 2: Social Sentiment")
    try:
        # Try generic tick for social sentiment
        ticker = ib.reqMktData(contract, '258,411', False, False)
        await asyncio.sleep(3)

        # Check for any sentiment-related fields
        has_sentiment = False
        sentiment_data = []

        # Check for fundamental ratios (tick 258)
        if hasattr(ticker, 'fundamentalRatios') and ticker.fundamentalRatios:
            sentiment_data.append(f"Fundamental Ratios: {ticker.fundamentalRatios}")
            has_sentiment = True

        if has_sentiment:
            print(f"[PARTIAL] Social Sentiment: Found related data (not direct sentiment)")
            print(f"  Data: {', '.join(sentiment_data)}")
            results.append(("Social Sentiment", "PARTIAL", "No direct sentiment, has fundamentals"))
        else:
            print(f"[FAIL] Social Sentiment: Not available via market data ticks")
            results.append(("Social Sentiment", "FAIL", "Not in TWS API"))

        ib.cancelMktData(contract)
    except Exception as e:
        print(f"[FAIL] Social Sentiment: {e}")
        results.append(("Social Sentiment", "FAIL", str(e)))

    # Test 3: Fundamental Ratios
    print_section("Test 3: Fundamental Ratios")
    try:
        fundamental_data = await ib.reqFundamentalDataAsync(contract, 'ReportSnapshot')

        if fundamental_data and len(fundamental_data) > 100:
            # Parse XML to check for key fields
            has_market_cap = 'MarketCap' in fundamental_data or 'mktCap' in fundamental_data
            has_float = 'SharesOut' in fundamental_data or 'Float' in fundamental_data
            has_sector = 'Sector' in fundamental_data or 'Industry' in fundamental_data

            found_fields = []
            if has_market_cap: found_fields.append("Market Cap")
            if has_float: found_fields.append("Float")
            if has_sector: found_fields.append("Sector")

            print(f"[SUCCESS] Fundamentals: {len(fundamental_data)} bytes received")
            print(f"  Found: {', '.join(found_fields) if found_fields else 'XML data present'}")
            results.append(("Fundamentals", "SUCCESS", f"XML with {', '.join(found_fields)}"))
        else:
            print(f"[FAIL] Fundamentals: No data received (may need subscription)")
            results.append(("Fundamentals", "FAIL", "No data"))
    except Exception as e:
        print(f"[FAIL] Fundamentals: {e}")
        results.append(("Fundamentals", "FAIL", str(e)))

    # Test 4: News Feed
    print_section("Test 4: News Feed")
    try:
        providers = await ib.reqNewsProvidersAsync()
        print(f"[INFO] News Providers: {len(providers)} available")
        for p in providers[:3]:
            print(f"  - {p.code}: {p.name}")

        # Get historical news
        news_articles = await ib.reqHistoricalNewsAsync(
            conId=contract.conId,
            providerCodes='',
            startDateTime='',
            endDateTime='',
            totalResults=10
        )

        if news_articles:
            print(f"[SUCCESS] News: {len(news_articles)} articles fetched")
            print(f"  Latest: {news_articles[0].headline if news_articles else 'N/A'}")

            # Check if sentiment scores available
            has_sentiment = any(hasattr(a, 'sentiment') for a in news_articles)
            sentiment_note = " (with sentiment)" if has_sentiment else " (no sentiment scores)"

            results.append(("News Feed", "SUCCESS", f"{len(news_articles)} articles{sentiment_note}"))
        else:
            print(f"[FAIL] News: No articles received")
            results.append(("News Feed", "FAIL", "No articles"))
    except Exception as e:
        print(f"[FAIL] News: {e}")
        results.append(("News Feed", "FAIL", str(e)))

    # Test 5: Market Scanners
    print_section("Test 5: Market Scanners")
    try:
        # Get scanner parameters
        params = await ib.reqScannerParametersAsync()
        print(f"[INFO] Scanner parameters received: {len(params)} bytes")

        # Try a pre-market gap scan
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',
            scanCode='TOP_PERC_GAIN',
            aboveVolume=1000000
        )

        scanData = await ib.reqScannerDataAsync(scan)
        await asyncio.sleep(5)

        if scanData:
            print(f"[SUCCESS] Market Scanners: {len(scanData)} results")
            if scanData:
                print(f"  Top gainer: {scanData[0].contractDetails.contract.symbol}")
                print(f"  Scan codes available in params XML")
            results.append(("Market Scanners", "SUCCESS", f"{len(scanData)} stocks found"))
        else:
            print(f"[FAIL] Market Scanners: No results (may need subscription)")
            results.append(("Market Scanners", "FAIL", "No results"))
    except Exception as e:
        print(f"[FAIL] Market Scanners: {e}")
        results.append(("Market Scanners", "FAIL", str(e)))

    # Test 6: Pre-Market Data
    print_section("Test 6: Pre-Market Data")
    try:
        # Request bars including extended hours
        bars = await ib.reqHistoricalDataAsync(
            contract,
            endDateTime='',
            durationStr='1 D',
            barSizeSetting='5 mins',
            whatToShow='TRADES',
            useRTH=False,  # Include pre/post market
            formatDate=1
        )

        # Check if we have pre-market bars (before 9:30 AM ET)
        premarket_bars = [b for b in bars if b.date.hour < 9 or (b.date.hour == 9 and b.date.minute < 30)]

        if premarket_bars:
            print(f"[SUCCESS] Pre-Market: {len(premarket_bars)} bars from extended hours")
            print(f"  Earliest: {premarket_bars[0].date}, Volume: {premarket_bars[0].volume}")
            results.append(("Pre-Market Data", "SUCCESS", f"{len(premarket_bars)} bars from 4:00 AM"))
        else:
            print(f"[FAIL] Pre-Market: No extended hours data (may need subscription)")
            results.append(("Pre-Market Data", "FAIL", "No extended hours"))
    except Exception as e:
        print(f"[FAIL] Pre-Market: {e}")
        results.append(("Pre-Market Data", "FAIL", str(e)))

    # Test 7: Real-Time vs Delayed
    print_section("Test 7: Real-Time Data Check")
    try:
        ticker = ib.reqMktData(contract, '', False, False)
        await asyncio.sleep(2)

        if ticker.marketDataType == 1:
            print(f"[SUCCESS] Real-Time: Data is real-time (not delayed)")
            results.append(("Real-Time", "SUCCESS", "Real-time data"))
        elif ticker.marketDataType == 2:
            print(f"[PARTIAL] Real-Time: Data is frozen")
            results.append(("Real-Time", "PARTIAL", "Frozen data"))
        elif ticker.marketDataType == 3:
            print(f"[PARTIAL] Real-Time: Data is delayed (15-min)")
            results.append(("Real-Time", "PARTIAL", "Delayed 15-min"))
        else:
            print(f"[INFO] Real-Time: Type {ticker.marketDataType}")
            results.append(("Real-Time", "INFO", f"Type {ticker.marketDataType}"))

        ib.cancelMktData(contract)
    except Exception as e:
        print(f"[FAIL] Real-Time: {e}")
        results.append(("Real-Time", "FAIL", str(e)))

    # Print Final Report
    print_section("CAPABILITIES REPORT")
    print(f"{'Feature':<25} {'Status':<12} {'Details':<40}")
    print("-" * 80)
    for feature, status, details in results:
        print(f"{feature:<25} {status:<12} {details:<40}")

    # Disconnect
    ib.disconnect()
    print("\n[INFO] Disconnected from TWS")

    return results

if __name__ == '__main__':
    print("IBKR TWS API Capabilities Probe")
    print("=" * 60)
    print("Testing TWS API for pre-market stock screening capabilities")
    print("=" * 60)

    asyncio.run(probe_tws_capabilities())
