#!/usr/bin/env python3
"""
Simple TWS test - step by step
Test 1: Can we connect to TWS?
Test 2: Can we get data for SIDU?
Test 3: Can we scan for ANY stock?
Test 4: Add filters one by one
"""

from ib_insync import *
import time

def test_tws_basic():
    ib = IB()

    # Test 1: Connect
    print("=" * 60)
    print("TEST 1: Connecting to TWS...")
    print("=" * 60)
    try:
        ib.connect('127.0.0.1', 7496, clientId=999)
        print(f"✅ Connected! Server version: {ib.client.serverVersion()}\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return

    # Test 2: Get data for SIDU
    print("=" * 60)
    print("TEST 2: Can we get data for SIDU?")
    print("=" * 60)
    try:
        contract = Stock('SIDU', 'SMART', 'USD')
        details = ib.reqContractDetails(contract)
        if details:
            print(f"✅ SIDU found!")
            print(f"   Exchange: {details[0].contract.primaryExchange}")
            print(f"   ConID: {details[0].contract.conId}")

            # Try to get current price
            ib.qualifyContracts(contract)
            ticker = ib.reqMktData(contract)
            ib.sleep(2)  # Wait for data
            print(f"   Last price: ${ticker.last if ticker.last else 'N/A'}")
            print(f"   Close: ${ticker.close if ticker.close else 'N/A'}")
            ib.cancelMktData(contract)
        else:
            print("❌ SIDU not found")
    except Exception as e:
        print(f"❌ Error getting SIDU: {e}")

    print()

    # Test 3: Scanner with NO filters
    print("=" * 60)
    print("TEST 3: Scanner with ZERO filters (just get ANY stocks)")
    print("=" * 60)
    try:
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',
            scanCode='MOST_ACTIVE',
            numberOfRows=5  # Just 5 stocks
        )

        print("Requesting scanner data...")
        scan_data = ib.reqScannerData(scan)

        if scan_data:
            print(f"✅ Found {len(scan_data)} stocks:")
            for i, data in enumerate(scan_data, 1):
                symbol = data.contractDetails.contract.symbol
                print(f"   {i}. {symbol}")
        else:
            print("❌ No stocks returned")

    except Exception as e:
        print(f"❌ Scanner error: {e}")

    print()

    # Test 4: Scanner with volume filter ONLY
    print("=" * 60)
    print("TEST 4: Scanner with volume filter (>100K)")
    print("=" * 60)
    try:
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',
            scanCode='MOST_ACTIVE',
            aboveVolume=100000,
            numberOfRows=5
        )

        scan_data = ib.reqScannerData(scan)

        if scan_data:
            print(f"✅ Found {len(scan_data)} stocks with volume >100K:")
            for i, data in enumerate(scan_data, 1):
                symbol = data.contractDetails.contract.symbol
                print(f"   {i}. {symbol}")
        else:
            print("❌ No stocks returned")

    except Exception as e:
        print(f"❌ Scanner error: {e}")

    print()

    # Test 5: Scanner with price filter
    print("=" * 60)
    print("TEST 5: Scanner with price filter ($1-$20)")
    print("=" * 60)
    try:
        scan = ScannerSubscription(
            instrument='STK',
            locationCode='STK.US.MAJOR',
            scanCode='MOST_ACTIVE',
            abovePrice=1.0,
            belowPrice=20.0,
            numberOfRows=5
        )

        scan_data = ib.reqScannerData(scan)

        if scan_data:
            print(f"✅ Found {len(scan_data)} stocks priced $1-$20:")
            for i, data in enumerate(scan_data, 1):
                symbol = data.contractDetails.contract.symbol
                print(f"   {i}. {symbol}")
        else:
            print("❌ No stocks returned")

    except Exception as e:
        print(f"❌ Scanner error: {e}")

    print()

    # Disconnect
    ib.disconnect()
    print("=" * 60)
    print("Tests complete")
    print("=" * 60)

if __name__ == '__main__':
    test_tws_basic()
