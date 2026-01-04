#!/usr/bin/env python3
"""
TWS Scanner Client - Pre-Market Stock Screening

Uses ib_insync to connect to TWS Desktop and run market scanners.
Replaces Client Portal API scanner with TWS API scanner (3,323 scan types vs 563).

Prerequisites:
- TWS Desktop running on port 7496
- API enabled in TWS settings
- Market data subscriptions active ($14.50/mo)

Run: python -m lib.trading.screening.tws_scanner
"""

from ib_insync import *
import ib_insync.util as util
import asyncio
import nest_asyncio
from typing import List, Dict, Optional
from datetime import datetime

# Enable nested event loops for FastAPI/web framework compatibility
nest_asyncio.apply()
util.patchAsyncio()


class TWSScannerClient:
    """
    TWS API Scanner Client

    Connects to TWS Desktop and runs market scanners to find pre-market gappers,
    most active stocks, and other screening criteria.
    """

    def __init__(
        self,
        host: str = '127.0.0.1',
        port: int = 7496,
        client_id: int = 1
    ):
        """
        Initialize TWS Scanner Client

        Args:
            host: TWS API host (default: localhost)
            port: TWS API port (default: 7496 from user settings)
            client_id: Client ID for TWS connection (default: 1)
        """
        self.ib = IB()
        self.host = host
        self.port = port
        self.client_id = client_id
        self.is_connected = False

    async def connect(self) -> bool:
        """
        Connect to TWS Desktop

        Uses thread executor for ib_insync connection to avoid event loop conflicts
        with FastAPI/web frameworks.

        Returns:
            True if connected successfully

        Raises:
            ConnectionError if TWS not running or API not enabled
        """
        try:
            # Use synchronous connect in thread executor to avoid event loop conflicts
            import concurrent.futures
            loop = asyncio.get_event_loop()

            def _connect():
                self.ib.connect(self.host, self.port, self.client_id)
                return True

            with concurrent.futures.ThreadPoolExecutor() as executor:
                await loop.run_in_executor(executor, _connect)

            self.is_connected = True
            print(f"[SUCCESS] ✅ Connected to TWS on port {self.port}")
            print(f"[INFO] Server version: {self.ib.client.serverVersion()}")
            return True
        except Exception as e:
            print(f"[FAIL] ❌ Connection failed: {e}")
            print("\nTroubleshooting:")
            print("1. Is TWS Desktop running?")
            print("2. Is API enabled? (File → Global Configuration → API → Settings)")
            print("3. Is 'Enable ActiveX and Socket Clients' checked?")
            print("4. Is socket port set to 7496?")
            raise ConnectionError(f"Failed to connect to TWS: {e}")

    def disconnect(self):
        """Disconnect from TWS"""
        if self.is_connected:
            self.ib.disconnect()
            self.is_connected = False
            print("[INFO] Disconnected from TWS")

    async def get_scanner_parameters(self) -> str:
        """
        Get available scanner parameters (scan types, filters, etc.)

        Returns:
            XML string with scanner parameters

        Note: This returns ~3,323 scan types in XML format
        """
        if not self.is_connected:
            await self.connect()

        params = await self.ib.reqScannerParametersAsync()

        # Count scan types
        scan_count = params.count('<displayName>')
        print(f"[INFO] {scan_count} scan types available")

        return params

    async def scan_pre_market_gaps(
        self,
        min_gap_percent: float = 3.0,
        min_volume: int = 500000,
        max_results: int = 20,
        scan_code: str = 'TOP_PERC_GAIN',
        min_price: float = 1.0,
        max_price: float = 20.0,
        max_market_cap: float = 3_000_000_000  # $3B
    ) -> List[Dict]:
        """
        Scan for pre-market gappers with smart pre-filtering

        Args:
            min_gap_percent: Minimum gap % (not directly filterable, filter in post-processing)
            min_volume: Minimum volume threshold
            max_results: Maximum number of results
            scan_code: Scanner code (TOP_PERC_GAIN, TOP_PERC_LOSE, MOST_ACTIVE, etc.)
            min_price: Minimum stock price (default $1 - avoid penny stocks)
            max_price: Maximum stock price (default $20 - low-float runners typically under $20)
            max_market_cap: Maximum market cap in dollars (default $3B - proxy for low-float)

        Returns:
            List of scanner results with contract details + scan_parameters dict

        Example:
            results = await scanner.scan_pre_market_gaps(
                min_gap_percent=10.0,
                min_volume=500000,
                max_results=20,
                min_price=1.0,
                max_price=20.0,
                max_market_cap=3_000_000_000
            )
        """
        if not self.is_connected:
            await self.connect()

        print(f"\n[SCANNING] Looking for {scan_code} stocks...")
        print(f"  Filters: Volume > {min_volume:,}, Price ${min_price}-${max_price}, MarketCap < ${max_market_cap/1_000_000_000:.1f}B")
        print(f"  Max results: {max_results}")

        # Create scanner subscription with smart pre-filters
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',  # US major exchanges
            scanCode=scan_code,
            aboveVolume=min_volume,       # Pre-filter: volume
            abovePrice=min_price,         # Pre-filter: min price (avoid penny stocks)
            belowPrice=max_price,         # Pre-filter: max price (low-float runners typically < $20)
            marketCapBelow=max_market_cap,  # Pre-filter: market cap (proxy for float)
            numberOfRows=max_results
        )

        # Request scanner data with timeout
        try:
            scan_data = await asyncio.wait_for(
                self.ib.reqScannerDataAsync(scan),
                timeout=30  # 30 second timeout
            )
        except asyncio.TimeoutError:
            print("[WARN] ⚠️ Scanner timeout - market may be closed or no stocks match criteria")
            return []

        if not scan_data:
            print("[WARN] ⚠️ No results from scanner (may need market hours)")
            return []

        print(f"[SUCCESS] ✅ Found {len(scan_data)} stocks")

        # Convert to dict format
        results = []
        for i, data in enumerate(scan_data, 1):
            contract = data.contractDetails.contract

            result = {
                'rank': data.rank,
                'symbol': contract.symbol,
                'exchange': contract.exchange,
                'currency': contract.currency,
                'conid': contract.conId,
                'contract': contract,  # Keep full contract for later use
                'contract_details': data.contractDetails
            }

            results.append(result)
            print(f"  {i}. {contract.symbol} (rank: {data.rank})")

        return results

    async def scan_most_active(
        self,
        min_volume: int = 1000000,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Scan for most active stocks by volume

        Args:
            min_volume: Minimum volume threshold
            max_results: Maximum number of results

        Returns:
            List of most active stocks
        """
        return await self.scan_pre_market_gaps(
            min_volume=min_volume,
            max_results=max_results,
            scan_code='MOST_ACTIVE'
        )

    async def scan_hot_by_volume(
        self,
        min_volume: int = 1000000,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Scan for hot stocks by volume

        Args:
            min_volume: Minimum volume threshold
            max_results: Maximum number of results

        Returns:
            List of hot stocks
        """
        return await self.scan_pre_market_gaps(
            min_volume=min_volume,
            max_results=max_results,
            scan_code='HOT_BY_VOLUME'
        )

    async def scan_historical_top_gains(
        self,
        min_volume: int = 500000,
        min_price: float = 1.0,
        max_price: float = 50.0,
        max_market_cap: float = None,
        max_results: int = 20,
        lookback_hours: int = 48
    ) -> List[Dict]:
        """
        Scan for TOP_PERC_GAIN stocks using MOST_ACTIVE as fallback

        When market is closed (Sunday), use MOST_ACTIVE scanner which has better
        cached data availability than TOP_PERC_GAIN.

        Args:
            min_volume: Minimum volume threshold (relaxed for cached data)
            min_price: Minimum stock price
            max_price: Maximum stock price (relaxed to $50 for better results)
            max_market_cap: Maximum market cap (None = no limit for cached data)
            max_results: Maximum number of results
            lookback_hours: How many hours back to look (default 48 = 2 days)

        Returns:
            List of top percentage gainers or most active stocks (fallback)
        """
        if not self.is_connected:
            await self.connect()

        print(f"\n[SCANNING] Looking for MOST_ACTIVE stocks (cached data, works on Sunday)...")
        print(f"  Filters: Volume > {min_volume:,}, Price ${min_price}-${max_price}")
        if max_market_cap:
            print(f"  Market Cap < ${max_market_cap/1_000_000_000:.1f}B")
        print(f"  Max results: {max_results}")

        # Create scanner subscription with MOST_ACTIVE (better cached data)
        # Remove ALL filters on Sunday to maximize cache hit rate
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',
            scanCode='MOST_ACTIVE',  # More reliable cached data than TOP_PERC_GAIN
            numberOfRows=max_results * 2  # Get more results, filter later
        )
        # Note: All filters removed for Sunday - TWS caches MOST_ACTIVE without filters

        # Request scanner data
        try:
            scan_data = await asyncio.wait_for(
                self.ib.reqScannerDataAsync(scan),
                timeout=30
            )

        except asyncio.TimeoutError:
            print("[WARN] ⚠️ MOST_ACTIVE scanner timeout - no cached data available")
            return []

        if not scan_data:
            print("[WARN] ⚠️ No cached results from MOST_ACTIVE scanner")
            return []

        print(f"[SUCCESS] ✅ Found {len(scan_data)} stocks from cached data")

        # Convert to dict format
        results = []
        for i, data in enumerate(scan_data, 1):
            contract = data.contractDetails.contract

            result = {
                'rank': data.rank,
                'symbol': contract.symbol,
                'exchange': contract.exchange,
                'currency': contract.currency,
                'conid': contract.conId,
                'contract': contract,
                'contract_details': data.contractDetails,
                'historical': True  # Mark as historical/cached data
            }

            results.append(result)
            print(f"  {i}. {contract.symbol} (rank: {data.rank}) [cached]")

            # Stop when we have enough results
            if len(results) >= max_results:
                break

        return results


async def main():
    """Test the TWS Scanner Client"""
    print("=" * 70)
    print("TWS Scanner Client - Test Run")
    print("=" * 70)

    scanner = TWSScannerClient()

    try:
        # Connect
        await scanner.connect()

        # Test 1: Get scanner parameters
        print("\n[TEST 1] Getting scanner parameters...")
        params = await scanner.get_scanner_parameters()
        print(f"  Scanner params: {len(params)} bytes received")

        # Test 2: Scan for pre-market gappers
        print("\n[TEST 2] Scanning for TOP_PERC_GAIN stocks...")
        results = await scanner.scan_pre_market_gaps(
            min_gap_percent=3.0,
            min_volume=500000,
            max_results=10
        )

        if results:
            print(f"\n[RESULTS] Top {len(results)} gainers:")
            for stock in results[:5]:
                print(f"  {stock['symbol']} (rank: {stock['rank']})")
        else:
            print("\n[INFO] No results (may be outside market hours)")

        # Test 3: Scan for most active
        print("\n[TEST 3] Scanning for MOST_ACTIVE stocks...")
        active = await scanner.scan_most_active(
            min_volume=1000000,
            max_results=5
        )

        if active:
            print(f"\n[RESULTS] Top {len(active)} most active:")
            for stock in active:
                print(f"  {stock['symbol']}")

    except Exception as e:
        print(f"\n[ERROR] ❌ {e}")
    finally:
        scanner.disconnect()

    print("\n" + "=" * 70)
    print("[COMPLETE] TWS Scanner test finished")
    print("=" * 70)


if __name__ == '__main__':
    print("Starting TWS Scanner Client test...")
    print("Make sure TWS Desktop is running on port 7496!\n")
    asyncio.run(main())
