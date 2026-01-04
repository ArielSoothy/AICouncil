#!/usr/bin/env python3
"""
TWS Scanner Client - SYNCHRONOUS VERSION (WORKS!)

Uses synchronous ib_insync API because async version has timeout issues.
Simple, fast, reliable - exactly what we need.
"""

from ib_insync import *
from typing import List, Dict

class TWSScannerSync:
    """
    TWS API Scanner Client - Synchronous Version

    Uses synchronous ib.reqScannerData() instead of async version.
    Much more reliable, no timeouts.
    """

    def __init__(
        self,
        host: str = '127.0.0.1',
        port: int = 7496,
        client_id: int = 5
    ):
        self.ib = IB()
        self.host = host
        self.port = port
        self.client_id = client_id
        self.is_connected = False

    def connect(self) -> bool:
        """Connect to TWS Desktop"""
        try:
            self.ib.connect(self.host, self.port, self.client_id)
            self.is_connected = True
            print(f"[SUCCESS] ✅ Connected to TWS on port {self.port}")
            print(f"[INFO] Server version: {self.ib.client.serverVersion()}")
            return True
        except Exception as e:
            print(f"[FAIL] ❌ Connection failed: {e}")
            raise ConnectionError(f"Failed to connect to TWS: {e}")

    def disconnect(self):
        """Disconnect from TWS"""
        if self.is_connected:
            self.ib.disconnect()
            self.is_connected = False
            print("[INFO] Disconnected from TWS")

    def scan_most_active(
        self,
        min_volume: int = 100000,
        min_price: float = 1.0,
        max_price: float = 20.0,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Scan for most active stocks

        Args:
            min_volume: Minimum volume threshold
            min_price: Minimum stock price
            max_price: Maximum stock price
            max_results: Maximum number of results

        Returns:
            List of scanner results
        """
        if not self.is_connected:
            self.connect()

        print(f"\n[SCANNING] Looking for MOST_ACTIVE stocks...")
        print(f"  Filters: Volume > {min_volume:,}, Price ${min_price}-${max_price}")
        print(f"  Max results: {max_results}")

        # Create scanner subscription
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',
            scanCode='MOST_ACTIVE',
            aboveVolume=min_volume,
            abovePrice=min_price,
            belowPrice=max_price,
            numberOfRows=max_results
        )

        # Request scanner data (synchronous - works instantly!)
        try:
            scan_data = self.ib.reqScannerData(scan)
        except Exception as e:
            print(f"[ERROR] ❌ Scanner error: {e}")
            return []

        if not scan_data:
            print("[WARN] ⚠️ No results from scanner")
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
                'contract': contract,
                'contract_details': data.contractDetails
            }

            results.append(result)
            print(f"  {i}. {contract.symbol} (rank: {data.rank})")

        return results

    def scan_top_gainers(
        self,
        min_volume: int = 100000,
        min_price: float = 1.0,
        max_price: float = 20.0,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Scan for top percentage gainers

        NOTE: TOP_PERC_GAIN requires market hours.
        Use MOST_ACTIVE as fallback on weekends.
        """
        if not self.is_connected:
            self.connect()

        print(f"\n[SCANNING] Looking for TOP_PERC_GAIN stocks...")
        print(f"  Filters: Volume > {min_volume:,}, Price ${min_price}-${max_price}")
        print(f"  Max results: {max_results}")

        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',
            scanCode='TOP_PERC_GAIN',
            aboveVolume=min_volume,
            abovePrice=min_price,
            belowPrice=max_price,
            numberOfRows=max_results
        )

        try:
            scan_data = self.ib.reqScannerData(scan)
        except Exception as e:
            print(f"[WARN] ⚠️ TOP_PERC_GAIN failed (market closed?), trying MOST_ACTIVE...")
            return self.scan_most_active(min_volume, min_price, max_price, max_results)

        if not scan_data:
            print("[WARN] ⚠️ No results, trying MOST_ACTIVE instead...")
            return self.scan_most_active(min_volume, min_price, max_price, max_results)

        print(f"[SUCCESS] ✅ Found {len(scan_data)} top gainers")

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
                'contract_details': data.contractDetails
            }
            results.append(result)
            print(f"  {i}. {contract.symbol} (rank: {data.rank})")

        return results


def main():
    """Test the synchronous scanner"""
    print("=" * 70)
    print("TWS Scanner - SYNCHRONOUS VERSION")
    print("=" * 70)

    scanner = TWSScannerSync()

    try:
        # Connect
        scanner.connect()

        # Test MOST_ACTIVE
        print("\n[TEST] MOST_ACTIVE scanner...")
        results = scanner.scan_most_active(
            min_volume=100000,
            min_price=1.0,
            max_price=20.0,
            max_results=10
        )

        if results:
            print(f"\n✅ SUCCESS! Got {len(results)} stocks:")
            for stock in results:
                print(f"   {stock['symbol']}")

    except Exception as e:
        print(f"\n[ERROR] ❌ {e}")
    finally:
        scanner.disconnect()

    print("\n" + "=" * 70)
    print("[COMPLETE] Test finished")
    print("=" * 70)


if __name__ == '__main__':
    print("Starting TWS Scanner (Synchronous)...")
    print("Make sure TWS Desktop is running on port 7496!\n")
    main()
