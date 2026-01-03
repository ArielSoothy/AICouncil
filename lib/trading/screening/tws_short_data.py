#!/usr/bin/env python3
"""
TWS Short Data Client - Short Selling Information

Gets short selling data from TWS API using tick 236 (shortableShares).
This was the CRITICAL missing piece in Client Portal API (field 7636 returned 0).

Test Results (AAPL):
- Tick 236: 85,540,528 shortable shares ✅
- Real-time updates as availability changes

Run: python -m lib.trading.screening.tws_short_data
"""

from ib_insync import *
import asyncio
from typing import Dict, Optional, List


class TWSShortDataClient:
    """
    TWS API Short Data Client

    Fetches short selling data via tick 236 (shortableShares).
    Critical for pre-market screening to identify hard-to-borrow stocks.
    """

    def __init__(self, ib: IB):
        """
        Initialize Short Data Client

        Args:
            ib: Connected IB instance from TWSScannerClient
        """
        self.ib = ib

    async def get_short_data(
        self,
        contract: Contract,
        wait_seconds: float = 2.0
    ) -> Dict:
        """
        Get short selling data for a contract

        Args:
            contract: IB Contract object
            wait_seconds: Time to wait for data (default: 2.0)

        Returns:
            Dict with short selling metrics

        Example:
            {
                'symbol': 'AAPL',
                'shortable_shares': 85540528,
                'short_fee_rate': None,  # May not be available
                'is_hard_to_borrow': False,  # < 10M shares = hard to borrow
                'borrow_difficulty': 'Easy'  # Easy/Moderate/Hard/Very Hard
            }
        """
        try:
            # Request market data with tick 236 (shortableShares)
            ticker = self.ib.reqMktData(
                contract,
                '236',  # Tick 236 = Shortable Shares
                False,  # snapshot = False (streaming)
                False   # regulatorySnapshot = False
            )

            # Wait for data to arrive
            await asyncio.sleep(wait_seconds)

            # Extract short data
            shortable_shares = getattr(ticker, 'shortableShares', None)
            short_fee_rate = getattr(ticker, 'shortFeeRate', None)

            # Cancel market data subscription
            self.ib.cancelMktData(contract)

            # Analyze borrow difficulty
            if shortable_shares is not None:
                difficulty, is_hard = self._analyze_borrow_difficulty(shortable_shares)
            else:
                difficulty = 'Unknown'
                is_hard = None

            return {
                'symbol': contract.symbol,
                'shortable_shares': int(shortable_shares) if shortable_shares else None,
                'short_fee_rate': short_fee_rate,
                'is_hard_to_borrow': is_hard,
                'borrow_difficulty': difficulty
            }

        except Exception as e:
            return {
                'symbol': contract.symbol,
                'error': str(e),
                'shortable_shares': None
            }

    def _analyze_borrow_difficulty(
        self,
        shortable_shares: float
    ) -> tuple[str, bool]:
        """
        Analyze borrow difficulty based on shortable shares

        Args:
            shortable_shares: Number of shares available to short

        Returns:
            Tuple of (difficulty_level, is_hard_to_borrow)

        Thresholds:
            > 50M shares: Easy
            10M - 50M: Moderate
            1M - 10M: Hard (HTB)
            < 1M: Very Hard (very HTB)
        """
        if shortable_shares > 50_000_000:
            return ('Easy', False)
        elif shortable_shares > 10_000_000:
            return ('Moderate', False)
        elif shortable_shares > 1_000_000:
            return ('Hard', True)
        else:
            return ('Very Hard', True)

    async def get_short_data_batch(
        self,
        contracts: List[Contract],
        wait_seconds: float = 2.0,
        batch_size: int = 5
    ) -> List[Dict]:
        """
        Get short data for multiple contracts efficiently

        Args:
            contracts: List of Contract objects
            wait_seconds: Time to wait per batch
            batch_size: Number of contracts to process at once

        Returns:
            List of short data dicts

        Note: Batching prevents overwhelming TWS API
        """
        results = []

        # Process in batches to avoid rate limits
        for i in range(0, len(contracts), batch_size):
            batch = contracts[i:i + batch_size]

            # Request data for batch
            tasks = [
                self.get_short_data(contract, wait_seconds)
                for contract in batch
            ]

            batch_results = await asyncio.gather(*tasks)
            results.extend(batch_results)

            # Small delay between batches
            if i + batch_size < len(contracts):
                await asyncio.sleep(0.5)

        return results

    def filter_hard_to_borrow(
        self,
        short_data_list: List[Dict],
        threshold: int = 10_000_000
    ) -> List[Dict]:
        """
        Filter for hard-to-borrow stocks

        Args:
            short_data_list: List of short data dicts
            threshold: Shares threshold (default: 10M)

        Returns:
            List of hard-to-borrow stocks
        """
        return [
            data for data in short_data_list
            if data.get('shortable_shares') and
            data['shortable_shares'] < threshold
        ]

    def calculate_short_squeeze_score(
        self,
        short_data: Dict,
        volume: Optional[int] = None
    ) -> float:
        """
        Calculate short squeeze potential score (0-100)

        Args:
            short_data: Short data dict
            volume: Recent volume (optional)

        Returns:
            Score from 0 (no squeeze potential) to 100 (high squeeze potential)

        Factors:
            - Low shortable shares (50 points max)
            - High volume relative to float (30 points)
            - Hard to borrow difficulty (20 points)
        """
        score = 0.0

        shortable = short_data.get('shortable_shares')
        if not shortable:
            return 0.0

        # Factor 1: Low shortable shares (inverse relationship)
        # < 1M shares = 50 points
        # 1M - 10M = 40-20 points
        # > 10M = 0-20 points
        if shortable < 1_000_000:
            score += 50
        elif shortable < 10_000_000:
            # Linear scale from 40 to 20
            score += 40 - ((shortable - 1_000_000) / 9_000_000) * 20
        else:
            # Linear scale from 20 to 0
            score += max(0, 20 - ((shortable - 10_000_000) / 40_000_000) * 20)

        # Factor 2: Volume (if provided)
        if volume and shortable:
            volume_to_shortable_ratio = volume / shortable
            if volume_to_shortable_ratio > 0.5:  # 50%+ of shortable shares traded
                score += 30
            elif volume_to_shortable_ratio > 0.25:
                score += 20
            elif volume_to_shortable_ratio > 0.1:
                score += 10

        # Factor 3: Borrow difficulty
        difficulty = short_data.get('borrow_difficulty', 'Unknown')
        if difficulty == 'Very Hard':
            score += 20
        elif difficulty == 'Hard':
            score += 15
        elif difficulty == 'Moderate':
            score += 5

        return min(100, score)


async def main():
    """Test the TWS Short Data Client"""
    print("=" * 70)
    print("TWS Short Data Client - Test Run")
    print("=" * 70)

    # Connect to TWS
    ib = IB()

    try:
        await ib.connectAsync('127.0.0.1', 7496, clientId=1)
        print("[SUCCESS] ✅ Connected to TWS\n")

        # Create test contracts
        aapl = Stock('AAPL', 'SMART', 'USD')
        tsla = Stock('TSLA', 'SMART', 'USD')
        await ib.qualifyContractsAsync(aapl, tsla)

        # Initialize short data client
        short_client = TWSShortDataClient(ib)

        # Test 1: Single stock short data
        print("[TEST 1] Getting short data for AAPL...")
        aapl_short = await short_client.get_short_data(aapl)

        if 'error' not in aapl_short:
            print("[SUCCESS] ✅ Short data received:")
            if aapl_short['shortable_shares']:
                shares = aapl_short['shortable_shares']
                print(f"  Shortable Shares: {shares:,}")
                print(f"  Borrow Difficulty: {aapl_short['borrow_difficulty']}")
                print(f"  Is Hard to Borrow: {aapl_short['is_hard_to_borrow']}")

                # Calculate short squeeze score
                squeeze_score = short_client.calculate_short_squeeze_score(
                    aapl_short,
                    volume=100_000_000  # Example volume
                )
                print(f"  Short Squeeze Score: {squeeze_score:.1f}/100")
            else:
                print("  No shortable shares data available")
        else:
            print(f"[FAIL] ❌ {aapl_short['error']}")

        # Test 2: Batch request
        print("\n[TEST 2] Batch request for AAPL, TSLA...")
        batch_results = await short_client.get_short_data_batch([aapl, tsla])

        print(f"[SUCCESS] ✅ Received {len(batch_results)} results:")
        for result in batch_results:
            if 'error' not in result and result['shortable_shares']:
                shares = result['shortable_shares']
                difficulty = result['borrow_difficulty']
                print(f"  {result['symbol']}: {shares:,} shares ({difficulty})")
            else:
                symbol = result.get('symbol', 'Unknown')
                print(f"  {symbol}: No data")

        # Test 3: Hard-to-borrow filter
        print("\n[TEST 3] Filtering for hard-to-borrow stocks...")
        htb_stocks = short_client.filter_hard_to_borrow(
            batch_results,
            threshold=50_000_000  # < 50M shares = HTB for this test
        )

        if htb_stocks:
            print(f"[SUCCESS] ✅ Found {len(htb_stocks)} hard-to-borrow stocks:")
            for stock in htb_stocks:
                print(f"  {stock['symbol']}: {stock['shortable_shares']:,} shares")
        else:
            print("[INFO] No hard-to-borrow stocks in test set")

    except Exception as e:
        print(f"\n[ERROR] ❌ {e}")
    finally:
        ib.disconnect()

    print("\n" + "=" * 70)
    print("[COMPLETE] Short data test finished")
    print("=" * 70)


if __name__ == '__main__':
    print("Starting TWS Short Data Client test...")
    print("Make sure TWS Desktop is running on port 7496!\n")
    asyncio.run(main())
