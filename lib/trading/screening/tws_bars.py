#!/usr/bin/env python3
"""
TWS Bars Client - Pre-Market Gap Calculation

Gets historical bars including pre-market hours (4am-9:30am ET) from TWS API.
Calculates gap % from previous close - critical for pre-market screening.

Test Results:
- Gets bars with useRTH=False (include extended hours)
- 36/192 bars from pre-market period (4am-9:30am)
- Can calculate gap %, pre-market volume, momentum

Run: python -m lib.trading.screening.tws_bars
"""

from ib_insync import *
import asyncio
from typing import Dict, Optional, List
from datetime import datetime, time


class TWSBarsClient:
    """
    TWS API Bars Client

    Fetches historical bars including pre-market hours.
    Calculates gaps and pre-market momentum.
    """

    def __init__(self, ib: IB):
        """
        Initialize Bars Client

        Args:
            ib: Connected IB instance from TWSScannerClient
        """
        self.ib = ib

    async def get_pre_market_bars(
        self,
        contract: Contract,
        bar_size: str = '5 mins',
        duration: str = '1 D'
    ) -> Dict:
        """
        Get pre-market bars and calculate gap

        Args:
            contract: IB Contract object
            bar_size: Bar size ('1 min', '5 mins', '15 mins', etc.)
            duration: Duration ('1 D', '2 D', etc.)

        Returns:
            Dict with pre-market data and gap calculation

        Example:
            {
                'symbol': 'AAPL',
                'gap_percent': 3.45,
                'gap_direction': 'up',  # or 'down'
                'pre_market_price': 185.50,
                'previous_close': 179.25,
                'pre_market_volume': 1234567,
                'pre_market_high': 186.00,
                'pre_market_low': 184.50,
                'pre_market_bars_count': 36,
                'first_bar_time': '2026-01-03 04:00:00',
                'last_bar_time': '2026-01-03 09:25:00',
                'momentum_score': 75.5  # 0-100
            }
        """
        try:
            # Request historical bars including extended hours
            bars = await self.ib.reqHistoricalDataAsync(
                contract,
                endDateTime='',
                durationStr=duration,
                barSizeSetting=bar_size,
                whatToShow='TRADES',
                useRTH=False,  # Include pre/post market
                formatDate=1
            )

            if not bars:
                return {
                    'symbol': contract.symbol,
                    'error': 'No bars data available'
                }

            # Separate pre-market bars (before 9:30 AM ET)
            pre_market_bars = self._filter_pre_market_bars(bars)

            # Calculate gap and metrics
            if pre_market_bars:
                gap_data = self._calculate_gap(pre_market_bars, bars)
            else:
                gap_data = {
                    'error': 'No pre-market bars available',
                    'note': 'Market may not be open or outside pre-market hours'
                }

            gap_data['symbol'] = contract.symbol
            gap_data['total_bars'] = len(bars)
            gap_data['pre_market_bars_count'] = len(pre_market_bars)

            return gap_data

        except Exception as e:
            return {
                'symbol': contract.symbol,
                'error': str(e)
            }

    def _filter_pre_market_bars(self, bars: List) -> List:
        """
        Filter for pre-market bars only (4:00 AM - 9:30 AM ET)

        Args:
            bars: List of bar objects

        Returns:
            List of pre-market bars only
        """
        pre_market_bars = []

        for bar in bars:
            bar_time = bar.date

            # Check if before 9:30 AM (market open)
            # Note: TWS returns times in local timezone
            if bar_time.hour < 9 or (bar_time.hour == 9 and bar_time.minute < 30):
                # And after 4:00 AM (pre-market start)
                if bar_time.hour >= 4:
                    pre_market_bars.append(bar)

        return pre_market_bars

    def _calculate_gap(self, pre_market_bars: List, all_bars: List) -> Dict:
        """
        Calculate gap % and pre-market metrics

        Args:
            pre_market_bars: List of pre-market bars
            all_bars: All bars including previous day

        Returns:
            Dict with gap data
        """
        if not pre_market_bars or not all_bars:
            return {'error': 'Insufficient bars for gap calculation'}

        # Current pre-market price (last pre-market bar close)
        pre_market_price = pre_market_bars[-1].close

        # Previous close (first bar of the day is previous close reference)
        # Find the last bar before pre-market starts
        previous_close = None
        for bar in all_bars:
            if bar.date.hour < 4:  # Before 4am = previous day
                previous_close = bar.close

        if not previous_close:
            # Fallback: use first bar close
            previous_close = all_bars[0].close

        # Calculate gap
        gap_amount = pre_market_price - previous_close
        gap_percent = (gap_amount / previous_close) * 100

        # Pre-market volume
        pre_market_volume = sum(bar.volume for bar in pre_market_bars)

        # Pre-market high/low
        pre_market_high = max(bar.high for bar in pre_market_bars)
        pre_market_low = min(bar.low for bar in pre_market_bars)

        # Momentum score (based on gap size + volume)
        momentum_score = self._calculate_momentum_score(
            gap_percent,
            pre_market_volume,
            pre_market_high,
            pre_market_low,
            pre_market_price
        )

        return {
            'gap_percent': round(gap_percent, 2),
            'gap_amount': round(gap_amount, 2),
            'gap_direction': 'up' if gap_percent > 0 else 'down',
            'pre_market_price': round(pre_market_price, 2),
            'previous_close': round(previous_close, 2),
            'pre_market_volume': int(pre_market_volume),
            'pre_market_high': round(pre_market_high, 2),
            'pre_market_low': round(pre_market_low, 2),
            'pre_market_range': round(pre_market_high - pre_market_low, 2),
            'first_bar_time': str(pre_market_bars[0].date),
            'last_bar_time': str(pre_market_bars[-1].date),
            'momentum_score': round(momentum_score, 1)
        }

    def _calculate_momentum_score(
        self,
        gap_percent: float,
        volume: int,
        high: float,
        low: float,
        current_price: float
    ) -> float:
        """
        Calculate momentum score (0-100)

        Args:
            gap_percent: Gap %
            volume: Pre-market volume
            high: Pre-market high
            low: Pre-market low
            current_price: Current pre-market price

        Returns:
            Momentum score 0-100

        Factors:
            - Gap magnitude (40 points)
            - Volume (30 points)
            - Price position in range (20 points)
            - Range expansion (10 points)
        """
        score = 0.0

        # Factor 1: Gap magnitude (40 points max)
        abs_gap = abs(gap_percent)
        if abs_gap > 10:
            score += 40
        elif abs_gap > 5:
            score += 30
        elif abs_gap > 3:
            score += 20
        elif abs_gap > 1:
            score += 10

        # Factor 2: Volume (30 points max)
        # High volume = strong momentum
        if volume > 5_000_000:
            score += 30
        elif volume > 1_000_000:
            score += 20
        elif volume > 500_000:
            score += 10

        # Factor 3: Price position in range (20 points max)
        # Price near high of range = bullish
        # Price near low of range = bearish
        range_size = high - low
        if range_size > 0:
            position_in_range = (current_price - low) / range_size
            if gap_percent > 0:  # Bullish gap
                # Want price near high
                if position_in_range > 0.8:
                    score += 20
                elif position_in_range > 0.6:
                    score += 10
            else:  # Bearish gap
                # Want price near low
                if position_in_range < 0.2:
                    score += 20
                elif position_in_range < 0.4:
                    score += 10

        # Factor 4: Range expansion (10 points max)
        # Larger range = more volatility/momentum
        range_percent = (range_size / current_price) * 100
        if range_percent > 5:
            score += 10
        elif range_percent > 3:
            score += 5

        return min(100, score)

    async def get_bars_batch(
        self,
        contracts: List[Contract],
        bar_size: str = '5 mins',
        batch_size: int = 3
    ) -> List[Dict]:
        """
        Get pre-market bars for multiple contracts

        Args:
            contracts: List of Contract objects
            bar_size: Bar size
            batch_size: Contracts to process at once (TWS API limit)

        Returns:
            List of pre-market data dicts
        """
        results = []

        for i in range(0, len(contracts), batch_size):
            batch = contracts[i:i + batch_size]

            tasks = [
                self.get_pre_market_bars(contract, bar_size)
                for contract in batch
            ]

            batch_results = await asyncio.gather(*tasks)
            results.extend(batch_results)

            # Delay between batches (TWS historical data rate limit)
            if i + batch_size < len(contracts):
                await asyncio.sleep(1.0)

        return results

    def filter_by_gap(
        self,
        bars_data_list: List[Dict],
        min_gap_percent: float = 3.0
    ) -> List[Dict]:
        """
        Filter stocks by minimum gap %

        Args:
            bars_data_list: List of bars data dicts
            min_gap_percent: Minimum absolute gap % (default: 3.0)

        Returns:
            List of stocks with gap >= min_gap_percent
        """
        return [
            data for data in bars_data_list
            if 'gap_percent' in data and
            abs(data['gap_percent']) >= min_gap_percent
        ]

    def sort_by_gap(
        self,
        bars_data_list: List[Dict],
        descending: bool = True
    ) -> List[Dict]:
        """
        Sort stocks by gap %

        Args:
            bars_data_list: List of bars data dicts
            descending: Sort descending (largest gaps first)

        Returns:
            Sorted list
        """
        return sorted(
            bars_data_list,
            key=lambda x: abs(x.get('gap_percent', 0)),
            reverse=descending
        )


async def main():
    """Test the TWS Bars Client"""
    print("=" * 70)
    print("TWS Bars Client - Test Run")
    print("=" * 70)

    # Connect to TWS
    ib = IB()

    try:
        await ib.connectAsync('127.0.0.1', 7496, clientId=1)
        print("[SUCCESS] ✅ Connected to TWS\n")

        # Create test contract
        aapl = Stock('AAPL', 'SMART', 'USD')
        await ib.qualifyContractsAsync(aapl)

        # Initialize bars client
        bars_client = TWSBarsClient(ib)

        # Test 1: Get pre-market bars
        print("[TEST 1] Getting pre-market bars for AAPL...")
        aapl_bars = await bars_client.get_pre_market_bars(aapl)

        if 'error' not in aapl_bars:
            print("[SUCCESS] ✅ Pre-market data received:")
            print(f"  Total bars: {aapl_bars['total_bars']}")
            print(f"  Pre-market bars: {aapl_bars['pre_market_bars_count']}")

            if 'gap_percent' in aapl_bars:
                print(f"\n  Gap Analysis:")
                print(f"    Gap: {aapl_bars['gap_percent']}% ({aapl_bars['gap_direction']})")
                print(f"    Previous Close: ${aapl_bars['previous_close']}")
                print(f"    Pre-Market Price: ${aapl_bars['pre_market_price']}")
                print(f"    Pre-Market Volume: {aapl_bars['pre_market_volume']:,}")
                print(f"    Momentum Score: {aapl_bars['momentum_score']}/100")

                if aapl_bars['pre_market_bars_count'] > 0:
                    print(f"\n  Time Range:")
                    print(f"    First Bar: {aapl_bars['first_bar_time']}")
                    print(f"    Last Bar: {aapl_bars['last_bar_time']}")
        else:
            print(f"[INFO] ⚠️ {aapl_bars.get('error', 'Unknown error')}")
            if 'note' in aapl_bars:
                print(f"  Note: {aapl_bars['note']}")

        # Test 2: Batch request
        print("\n[TEST 2] Batch request for AAPL, TSLA, NVDA...")
        contracts_batch = [
            Stock('AAPL', 'SMART', 'USD'),
            Stock('TSLA', 'SMART', 'USD'),
            Stock('NVDA', 'SMART', 'USD')
        ]
        await ib.qualifyContractsAsync(*contracts_batch)

        batch_results = await bars_client.get_bars_batch(contracts_batch)

        print(f"[SUCCESS] ✅ Received bars for {len(batch_results)} stocks:")
        for result in batch_results:
            symbol = result['symbol']
            if 'gap_percent' in result:
                gap = result['gap_percent']
                momentum = result['momentum_score']
                print(f"  {symbol}: Gap {gap}%, Momentum {momentum}/100")
            else:
                error = result.get('error', 'No data')
                print(f"  {symbol}: {error}")

        # Test 3: Filter by gap
        print("\n[TEST 3] Filtering for gaps >= 2%...")
        significant_gaps = bars_client.filter_by_gap(batch_results, min_gap_percent=2.0)

        if significant_gaps:
            print(f"[SUCCESS] ✅ Found {len(significant_gaps)} stocks with >= 2% gap:")
            for stock in significant_gaps:
                print(f"  {stock['symbol']}: {stock['gap_percent']}%")
        else:
            print("[INFO] No stocks with >= 2% gap in test set")

    except Exception as e:
        print(f"\n[ERROR] ❌ {e}")
    finally:
        ib.disconnect()

    print("\n" + "=" * 70)
    print("[COMPLETE] Bars test finished")
    print("=" * 70)
    print("\nNote: For real pre-market data, run this script between 4:00-9:30 AM ET")


if __name__ == '__main__':
    print("Starting TWS Bars Client test...")
    print("Make sure TWS Desktop is running on port 7496!\n")
    asyncio.run(main())
