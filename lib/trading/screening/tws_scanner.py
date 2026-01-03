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
        scan_code: str = 'TOP_PERC_GAIN'
    ) -> List[Dict]:
        """
        Scan for pre-market gappers

        Args:
            min_gap_percent: Minimum gap % (not directly filterable, filter in post-processing)
            min_volume: Minimum volume threshold
            max_results: Maximum number of results
            scan_code: Scanner code (TOP_PERC_GAIN, TOP_PERC_LOSE, MOST_ACTIVE, etc.)

        Returns:
            List of scanner results with contract details

        Example:
            results = await scanner.scan_pre_market_gaps(
                min_gap_percent=3.0,
                min_volume=500000,
                max_results=20
            )
        """
        if not self.is_connected:
            await self.connect()

        print(f"\n[SCANNING] Looking for {scan_code} stocks...")
        print(f"  Filters: Volume > {min_volume:,}, Max results: {max_results}")

        # Create scanner subscription
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',  # US major exchanges
            scanCode=scan_code,
            aboveVolume=min_volume,
            numberOfRows=max_results
        )

        # Request scanner data
        scan_data = await self.ib.reqScannerDataAsync(scan)

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
