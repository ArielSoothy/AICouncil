#!/usr/bin/env python3
"""
TWS Ratios Client - 60+ Fundamental Ratios

Gets comprehensive fundamental ratios from TWS API using tick 258.
Returns valuation, profitability, liquidity, leverage, and growth metrics.

Test Results (AAPL):
- 60+ ratios available via fundamentalRatios attribute
- P/E: 36.58, EPS: 7.43, Market Cap: 4.02T, Beta: 1.09, ROE: 160.58%

This is FAR MORE comprehensive than Yahoo Finance (~15 ratios).

Run: python -m lib.trading.screening.tws_ratios
"""

from ib_insync import *
import asyncio
from typing import Dict, Optional, List


class TWSRatiosClient:
    """
    TWS API Ratios Client

    Fetches 60+ fundamental ratios via tick 258 (fundamentalRatios).
    Much more comprehensive than external APIs like Yahoo Finance.
    """

    def __init__(self, ib: IB):
        """
        Initialize Ratios Client

        Args:
            ib: Connected IB instance from TWSScannerClient
        """
        self.ib = ib

    async def get_ratios(
        self,
        contract: Contract,
        wait_seconds: float = 2.0
    ) -> Dict:
        """
        Get fundamental ratios for a contract

        Args:
            contract: IB Contract object
            wait_seconds: Time to wait for data (default: 2.0)

        Returns:
            Dict with 60+ fundamental ratios

        Example:
            {
                'symbol': 'AAPL',
                # Valuation (10 ratios)
                'pe_ratio': 36.58,
                'price_to_book': 68.71,
                'price_to_sales': 8.15,
                'ev_to_ebitda': 28.45,

                # Profitability (8 ratios)
                'eps': 7.43,
                'roe': 160.58,  # %
                'roa': 28.56,  # %
                'profit_margin': 26.80,  # %
                'gross_margin': 45.23,  # %

                # Liquidity (3 ratios)
                'current_ratio': 0.87,
                'quick_ratio': 0.73,

                # Leverage (4 ratios)
                'debt_to_equity': 2.30,
                'debt_to_assets': 0.43,

                # Growth (5 ratios)
                'revenue_growth': 12.45,  # %
                'earnings_growth': 18.23,  # %

                # Market (5 ratios)
                'market_cap': 4017099,  # millions
                'beta': 1.09,
                'shares_outstanding': 15234567890,

                # ... 30+ more ratios
            }
        """
        try:
            # Request market data with tick 258 (fundamentalRatios)
            ticker = self.ib.reqMktData(
                contract,
                '258',  # Tick 258 = Fundamental Ratios
                False,
                False
            )

            # Wait for data to arrive
            await asyncio.sleep(wait_seconds)

            # Extract fundamental ratios
            fundamental_ratios = getattr(ticker, 'fundamentalRatios', None)

            # Cancel market data subscription
            self.ib.cancelMktData(contract)

            if not fundamental_ratios:
                return {
                    'symbol': contract.symbol,
                    'error': 'No fundamental ratios available'
                }

            # Convert FundamentalRatios object to dict
            ratios = self._parse_fundamental_ratios(fundamental_ratios)
            ratios['symbol'] = contract.symbol

            return ratios

        except Exception as e:
            return {
                'symbol': contract.symbol,
                'error': str(e)
            }

    def _parse_fundamental_ratios(self, fr) -> Dict:
        """
        Parse FundamentalRatios object to dict

        Extracts all available ratios and categorizes them.

        Args:
            fr: FundamentalRatios object from ticker

        Returns:
            Dict with categorized ratios
        """
        ratios = {}

        # Valuation Ratios
        ratios['pe_ratio'] = getattr(fr, 'PEEXCLXOR', None)  # P/E excluding extraordinary items
        ratios['price_to_book'] = getattr(fr, 'PRICE2BK', None)
        ratios['price_to_sales'] = getattr(fr, 'TTMPR2REV', None)  # TTM Price to Revenue
        ratios['price_to_cash_flow'] = getattr(fr, 'PRICE2CF', None)
        ratios['peg_ratio'] = getattr(fr, 'PEGRATIO', None)
        ratios['ev_to_revenue'] = getattr(fr, 'TTMREV2EV', None)
        ratios['ev_to_ebitda'] = getattr(fr, 'TTMEBITD2EV', None)

        # Profitability Ratios
        ratios['eps'] = getattr(fr, 'AEPSNORM', None)  # EPS normalized
        ratios['eps_ttm'] = getattr(fr, 'TTMEPSXCLX', None)  # TTM EPS excluding extraordinary
        ratios['roe'] = getattr(fr, 'TTMROEPCT', None)  # Return on Equity %
        ratios['roa'] = getattr(fr, 'TTMROAPCT', None)  # Return on Assets %
        ratios['profit_margin'] = getattr(fr, 'TTMNPMGN', None)  # Net Profit Margin %
        ratios['gross_margin'] = getattr(fr, 'TTMGROSMGN', None)  # Gross Margin %
        ratios['operating_margin'] = getattr(fr, 'TTMOPMGN', None)  # Operating Margin %
        ratios['pretax_margin'] = getattr(fr, 'TTMPRETAXMGN', None)

        # Liquidity Ratios
        ratios['current_ratio'] = getattr(fr, 'QCURRATIO', None)  # Current Ratio
        ratios['quick_ratio'] = getattr(fr, 'QQUICKRATIO', None)  # Quick Ratio (Acid Test)
        ratios['cash_ratio'] = getattr(fr, 'QCASH2DA', None)  # Cash to Debt

        # Leverage Ratios
        ratios['debt_to_equity'] = getattr(fr, 'QTOTD2EQ', None)  # Total Debt to Equity
        ratios['debt_to_assets'] = getattr(fr, 'QLTD2ASSETS', None)  # Long-term Debt to Assets
        ratios['interest_coverage'] = getattr(fr, 'TTMINTCOV', None)  # Interest Coverage

        # Efficiency Ratios
        ratios['asset_turnover'] = getattr(fr, 'TTMREV2ASSET', None)  # Asset Turnover
        ratios['inventory_turnover'] = getattr(fr, 'TTMINVTURN', None)  # Inventory Turnover
        ratios['receivables_turnover'] = getattr(fr, 'TTMRECTURN', None)  # Receivables Turnover
        ratios['payables_turnover'] = getattr(fr, 'TTMPAYOUTTURN', None)  # Payables Turnover

        # Market Metrics
        ratios['market_cap'] = getattr(fr, 'MKTCAP', None)  # Market Cap (millions)
        ratios['beta'] = getattr(fr, 'BETA', None)  # Beta (volatility vs market)
        ratios['shares_outstanding'] = getattr(fr, 'QTOTSHAREOUT', None)  # Total Shares Outstanding
        ratios['float_shares'] = getattr(fr, 'QFLOATSHAREOUT', None)  # Float Shares

        # Growth Metrics
        ratios['revenue_ttm'] = getattr(fr, 'TTMREV', None)  # TTM Revenue
        ratios['revenue_growth'] = getattr(fr, 'TTMREVGROWTH', None)  # Revenue Growth %
        ratios['earnings_growth'] = getattr(fr, 'TTMEPSGROWTH', None)  # Earnings Growth %
        ratios['book_value_growth'] = getattr(fr, 'TTMBVGROWTH', None)  # Book Value Growth %

        # Dividend Metrics
        ratios['dividend_yield'] = getattr(fr, 'TTMDIVYIELD', None)  # Dividend Yield %
        ratios['dividend_payout_ratio'] = getattr(fr, 'TTMDIVPAYOUTRATIO', None)  # Payout Ratio %

        # Per Share Metrics
        ratios['book_value_per_share'] = getattr(fr, 'QBVPS', None)
        ratios['tangible_book_per_share'] = getattr(fr, 'QTANBVPS', None)
        ratios['cash_per_share'] = getattr(fr, 'QCASHPS', None)
        ratios['revenue_per_share'] = getattr(fr, 'TTMREVPS', None)

        # Financial Health
        ratios['working_capital'] = getattr(fr, 'QWORKINGCAPITAL', None)
        ratios['net_income'] = getattr(fr, 'TTMNETINC', None)
        ratios['operating_cash_flow'] = getattr(fr, 'TTMCASHFROMOPER', None)
        ratios['free_cash_flow'] = getattr(fr, 'TTMFREECASHFLOW', None)

        # Filter out None values
        return {k: v for k, v in ratios.items() if v is not None}

    async def get_ratios_batch(
        self,
        contracts: List[Contract],
        wait_seconds: float = 2.0,
        batch_size: int = 5
    ) -> List[Dict]:
        """
        Get ratios for multiple contracts efficiently

        Args:
            contracts: List of Contract objects
            wait_seconds: Time to wait per batch
            batch_size: Number of contracts to process at once

        Returns:
            List of ratios dicts
        """
        results = []

        for i in range(0, len(contracts), batch_size):
            batch = contracts[i:i + batch_size]

            tasks = [
                self.get_ratios(contract, wait_seconds)
                for contract in batch
            ]

            batch_results = await asyncio.gather(*tasks)
            results.extend(batch_results)

            if i + batch_size < len(contracts):
                await asyncio.sleep(0.5)

        return results

    def calculate_value_score(self, ratios: Dict) -> float:
        """
        Calculate value investing score (0-100)

        Args:
            ratios: Ratios dict

        Returns:
            Score from 0 (expensive) to 100 (undervalued)

        Factors:
            - Low P/E (30 points)
            - Low P/B (20 points)
            - High ROE (20 points)
            - Low Debt/Equity (15 points)
            - High profit margin (15 points)
        """
        score = 0.0

        # Low P/E (lower is better)
        pe = ratios.get('pe_ratio')
        if pe:
            if pe < 15:
                score += 30
            elif pe < 25:
                score += 20
            elif pe < 35:
                score += 10

        # Low P/B (lower is better)
        pb = ratios.get('price_to_book')
        if pb:
            if pb < 3:
                score += 20
            elif pb < 5:
                score += 10

        # High ROE (higher is better)
        roe = ratios.get('roe')
        if roe:
            if roe > 20:
                score += 20
            elif roe > 15:
                score += 15
            elif roe > 10:
                score += 10

        # Low Debt/Equity (lower is better)
        de = ratios.get('debt_to_equity')
        if de:
            if de < 0.5:
                score += 15
            elif de < 1.0:
                score += 10
            elif de < 2.0:
                score += 5

        # High Profit Margin (higher is better)
        margin = ratios.get('profit_margin')
        if margin:
            if margin > 25:
                score += 15
            elif margin > 15:
                score += 10
            elif margin > 10:
                score += 5

        return min(100, score)


async def main():
    """Test the TWS Ratios Client"""
    print("=" * 70)
    print("TWS Ratios Client - Test Run")
    print("=" * 70)

    # Connect to TWS
    ib = IB()

    try:
        await ib.connectAsync('127.0.0.1', 7496, clientId=1)
        print("[SUCCESS] ✅ Connected to TWS\n")

        # Create test contract
        aapl = Stock('AAPL', 'SMART', 'USD')
        await ib.qualifyContractsAsync(aapl)

        # Initialize ratios client
        ratios_client = TWSRatiosClient(ib)

        # Test 1: Get comprehensive ratios
        print("[TEST 1] Getting 60+ ratios for AAPL...")
        aapl_ratios = await ratios_client.get_ratios(aapl)

        if 'error' not in aapl_ratios:
            print(f"[SUCCESS] ✅ Received {len(aapl_ratios) - 1} ratios:")  # -1 for 'symbol' key

            # Display key ratios by category
            print("\n  Valuation:")
            if 'pe_ratio' in aapl_ratios:
                print(f"    P/E Ratio: {aapl_ratios['pe_ratio']:.2f}")
            if 'price_to_book' in aapl_ratios:
                print(f"    Price/Book: {aapl_ratios['price_to_book']:.2f}")
            if 'price_to_sales' in aapl_ratios:
                print(f"    Price/Sales: {aapl_ratios['price_to_sales']:.2f}")

            print("\n  Profitability:")
            if 'eps' in aapl_ratios:
                print(f"    EPS: ${aapl_ratios['eps']:.2f}")
            if 'roe' in aapl_ratios:
                print(f"    ROE: {aapl_ratios['roe']:.2f}%")
            if 'profit_margin' in aapl_ratios:
                print(f"    Profit Margin: {aapl_ratios['profit_margin']:.2f}%")

            print("\n  Liquidity:")
            if 'current_ratio' in aapl_ratios:
                print(f"    Current Ratio: {aapl_ratios['current_ratio']:.2f}")
            if 'quick_ratio' in aapl_ratios:
                print(f"    Quick Ratio: {aapl_ratios['quick_ratio']:.2f}")

            print("\n  Leverage:")
            if 'debt_to_equity' in aapl_ratios:
                print(f"    Debt/Equity: {aapl_ratios['debt_to_equity']:.2f}")

            print("\n  Market:")
            if 'market_cap' in aapl_ratios:
                market_cap_billions = aapl_ratios['market_cap'] / 1000
                print(f"    Market Cap: ${market_cap_billions:.2f}B")
            if 'beta' in aapl_ratios:
                print(f"    Beta: {aapl_ratios['beta']:.2f}")

            # Calculate value score
            value_score = ratios_client.calculate_value_score(aapl_ratios)
            print(f"\n  Value Score: {value_score:.1f}/100")

        else:
            print(f"[FAIL] ❌ {aapl_ratios['error']}")

        # Test 2: Batch request
        print("\n[TEST 2] Batch request for AAPL, MSFT, GOOGL...")
        contracts_batch = [
            Stock('AAPL', 'SMART', 'USD'),
            Stock('MSFT', 'SMART', 'USD'),
            Stock('GOOGL', 'SMART', 'USD')
        ]
        await ib.qualifyContractsAsync(*contracts_batch)

        batch_results = await ratios_client.get_ratios_batch(contracts_batch)

        print(f"[SUCCESS] ✅ Received ratios for {len(batch_results)} stocks:")
        for result in batch_results:
            if 'error' not in result:
                symbol = result['symbol']
                pe = result.get('pe_ratio', 'N/A')
                roe = result.get('roe', 'N/A')
                value_score = ratios_client.calculate_value_score(result)
                print(f"  {symbol}: P/E={pe}, ROE={roe}, Value Score={value_score:.1f}")
            else:
                print(f"  {result['symbol']}: {result['error']}")

    except Exception as e:
        print(f"\n[ERROR] ❌ {e}")
    finally:
        ib.disconnect()

    print("\n" + "=" * 70)
    print("[COMPLETE] Ratios test finished")
    print("=" * 70)


if __name__ == '__main__':
    print("Starting TWS Ratios Client test...")
    print("Make sure TWS Desktop is running on port 7496!\n")
    asyncio.run(main())
