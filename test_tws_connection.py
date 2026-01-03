#!/usr/bin/env python3
"""
Minimal TWS Connection Test
Tests if ib_insync can connect to TWS Desktop at all
"""

from ib_insync import IB
import asyncio

async def test_connection():
    ib = IB()

    print("=" * 60)
    print("TWS Connection Test")
    print("=" * 60)

    # Try different client IDs to avoid conflicts
    for client_id in [30, 31, 32, 99, 100]:
        print(f"\nTrying client_id={client_id}...")
        try:
            await ib.connectAsync('127.0.0.1', 7496, clientId=client_id, timeout=10)
            print(f"✅ SUCCESS! Connected with client_id={client_id}")
            print(f"   Server version: {ib.client.serverVersion()}")
            print(f"   Connection time: {ib.client.connectionTime()}")

            # Disconnect
            ib.disconnect()
            print(f"✅ Disconnected cleanly")
            return True

        except Exception as e:
            print(f"❌ FAILED with client_id={client_id}: {e}")
            continue

    print("\n" + "=" * 60)
    print("❌ ALL CONNECTION ATTEMPTS FAILED")
    print("=" * 60)
    return False

if __name__ == '__main__':
    print("Starting minimal TWS connection test...")
    print("TWS Desktop should be running on port 7496\n")

    success = asyncio.run(test_connection())

    if not success:
        print("\nTroubleshooting:")
        print("1. Check TWS: File → Global Configuration → API → Settings")
        print("2. Ensure 'Enable ActiveX and Socket Clients' is checked")
        print("3. Check if 'Read-Only API' is unchecked")
        print("4. Verify socket port is 7496")
        print("5. Try restarting TWS Desktop")
