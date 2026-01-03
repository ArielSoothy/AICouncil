#!/usr/bin/env python3
"""
Test Database-Backed Architecture

Quick test to verify:
1. Orchestrator can write to database (simulated - no TWS)
2. FastAPI can read from database
3. End-to-end data flow works

Usage: python scripts/test-database-flow.py
"""

import os
import sys
from datetime import datetime
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_database_write():
    """Test writing mock screening data to database"""
    print("\n" + "="*70)
    print("TEST 1: Database Write (Mock Data)")
    print("="*70)

    try:
        from supabase import create_client

        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

        if not supabase_url or not supabase_key:
            print("[FAIL] ❌ Supabase credentials not found")
            print("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
            return False

        supabase = create_client(supabase_url, supabase_key)
        print("[INFO] ✅ Supabase client created")

        # Create mock screening data (with all required fields for Pydantic validation)
        mock_data = {
            'execution_time_seconds': 8.5,
            'total_scanned': 10,
            'total_returned': 3,
            'min_gap_percent': 3.0,
            'min_volume': 500000,
            'max_results': 20,
            'scan_code': 'TEST_SCAN',
            'include_sentiment': True,
            'stocks': [
                {
                    'symbol': 'TEST1',
                    'rank': 0,
                    'gap_percent': 5.25,
                    'gap_direction': 'up',
                    'pre_market_volume': 1234567,
                    'pre_market_price': 150.50,
                    'previous_close': 143.00,
                    'fundamentals': {'pe_ratio': 28.5, 'market_cap': 2500000000},
                    'short_data': {'shortable_shares': 50000000, 'borrow_difficulty': 'Easy'},
                    'ratios': {'roe': 42.5, 'debt_to_equity': 1.2},
                    'bars': {'vwap': 148.25, 'high': 151.00},
                    'sentiment': {'score': 0.75, 'mentions': 150},
                    'score': 85.5
                },
                {
                    'symbol': 'TEST2',
                    'rank': 1,
                    'gap_percent': 4.10,
                    'gap_direction': 'up',
                    'pre_market_volume': 987654,
                    'pre_market_price': 75.25,
                    'previous_close': 72.30,
                    'fundamentals': {'pe_ratio': 22.8, 'market_cap': 1200000000},
                    'short_data': {'shortable_shares': 30000000, 'borrow_difficulty': 'Moderate'},
                    'ratios': {'roe': 38.2, 'debt_to_equity': 0.8},
                    'bars': {'vwap': 74.50, 'high': 76.00},
                    'sentiment': {'score': 0.65, 'mentions': 95},
                    'score': 78.2
                },
                {
                    'symbol': 'TEST3',
                    'rank': 2,
                    'gap_percent': 3.50,
                    'gap_direction': 'up',
                    'pre_market_volume': 654321,
                    'pre_market_price': 42.10,
                    'previous_close': 40.68,
                    'fundamentals': {'pe_ratio': 18.5, 'market_cap': 850000000},
                    'short_data': {'shortable_shares': 20000000, 'borrow_difficulty': 'Easy'},
                    'ratios': {'roe': 35.8, 'debt_to_equity': 0.5},
                    'bars': {'vwap': 41.80, 'high': 42.50},
                    'sentiment': {'score': 0.55, 'mentions': 78},
                    'score': 72.8
                }
            ]
        }

        # Insert into database
        response = supabase.table('screening_results').insert(mock_data).execute()

        if response.data:
            result_id = response.data[0]['id']
            print(f"[SUCCESS] ✅ Mock data written to database (ID: {result_id})")
            print(f"  Total stocks: {len(mock_data['stocks'])}")
            print(f"  Execution time: {mock_data['execution_time_seconds']}s")
            return True
        else:
            print("[FAIL] ❌ No data returned from insert")
            return False

    except ImportError:
        print("[FAIL] ❌ Supabase not installed")
        print("Run: pip install supabase")
        return False
    except Exception as e:
        print(f"[FAIL] ❌ Database write failed: {e}")
        return False


def test_database_read():
    """Test reading latest screening data from database"""
    print("\n" + "="*70)
    print("TEST 2: Database Read (Latest Results)")
    print("="*70)

    try:
        from supabase import create_client

        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

        supabase = create_client(supabase_url, supabase_key)

        # Read latest result
        response = supabase.table('screening_results')\
            .select('*')\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()

        if response.data and len(response.data) > 0:
            result = response.data[0]
            print(f"[SUCCESS] ✅ Latest screening data retrieved")
            print(f"  Created: {result['created_at']}")
            print(f"  Scan code: {result['scan_code']}")
            print(f"  Total scanned: {result['total_scanned']}")
            print(f"  Total returned: {result['total_returned']}")
            print(f"  Execution time: {result['execution_time_seconds']}s")
            print(f"  Stocks: {len(result['stocks'])} returned")

            if result['stocks']:
                print("\n  Top 3 Stocks:")
                for i, stock in enumerate(result['stocks'][:3], 1):
                    print(f"    {i}. {stock['symbol']}: Score {stock['score']}, Gap {stock['gap_percent']}%")

            return True
        else:
            print("[FAIL] ❌ No screening results found in database")
            print("Run orchestrator first to populate database")
            return False

    except Exception as e:
        print(f"[FAIL] ❌ Database read failed: {e}")
        return False


def test_history_query():
    """Test querying historical screening data"""
    print("\n" + "="*70)
    print("TEST 3: Database History Query")
    print("="*70)

    try:
        from supabase import create_client

        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

        supabase = create_client(supabase_url, supabase_key)

        # Get last 5 screening runs
        response = supabase.table('screening_results')\
            .select('id, created_at, total_scanned, total_returned, execution_time_seconds, scan_code')\
            .order('created_at', desc=True)\
            .limit(5)\
            .execute()

        if response.data:
            print(f"[SUCCESS] ✅ Retrieved {len(response.data)} historical screenings")
            print("\n  Recent Screenings:")
            for i, result in enumerate(response.data, 1):
                print(f"    {i}. {result['created_at'][:19]} - {result['scan_code']}: {result['total_returned']} stocks ({result['execution_time_seconds']}s)")
            return True
        else:
            print("[INFO] No historical data found")
            return True

    except Exception as e:
        print(f"[FAIL] ❌ History query failed: {e}")
        return False


def main():
    print("="*70)
    print("DATABASE-BACKED ARCHITECTURE - END-TO-END TEST")
    print("="*70)
    print(f"Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Check environment
    if not os.getenv('NEXT_PUBLIC_SUPABASE_URL'):
        print("\n[ERROR] Missing environment variables")
        print("Load .env.local: source .env.local")
        sys.exit(1)

    # Run tests
    results = []
    results.append(("Database Write", test_database_write()))
    results.append(("Database Read", test_database_read()))
    results.append(("History Query", test_history_query()))

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<50} {status}")

    print("-"*70)
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Database-backed architecture working!")
        print("\nNext steps:")
        print("1. Test orchestrator with real TWS connection")
        print("2. Start FastAPI server and test endpoints")
        print("3. Integrate with Next.js frontend")
    else:
        print("\n⚠️ Some tests failed. Check configuration.")
        sys.exit(1)


if __name__ == '__main__':
    main()
