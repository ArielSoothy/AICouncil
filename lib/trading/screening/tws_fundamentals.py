#!/usr/bin/env python3
"""
TWS Fundamentals Client - Company Fundamental Data

Gets fundamental data from TWS API using reqFundamentalData().
Returns P/E, EPS, Market Cap, Sector, Industry, Revenue, etc.

Test Results (AAPL):
- ReportSnapshot: 10,641 bytes (P/E, EPS, Market Cap, Sector)
- ReportsFinSummary: 45,403 bytes (Complete financial statements)

Run: python -m lib.trading.screening.tws_fundamentals
"""

from ib_insync import *
import xml.etree.ElementTree as ET
from typing import Dict, Optional, List
from decimal import Decimal
import asyncio


class TWSFundamentalsClient:
    """
    TWS API Fundamentals Client

    Fetches company fundamental data via reqFundamentalData().
    Parses XML to extract key metrics.
    """

    def __init__(self, ib: IB):
        """
        Initialize Fundamentals Client

        Args:
            ib: Connected IB instance from TWSScannerClient
        """
        self.ib = ib

    async def get_fundamentals(
        self,
        contract: Contract,
        report_type: str = 'ReportSnapshot'
    ) -> Dict:
        """
        Get fundamental data for a contract

        Args:
            contract: IB Contract object
            report_type: Type of report
                - 'ReportSnapshot': Quick overview (P/E, EPS, Market Cap)
                - 'ReportsFinSummary': Complete financials (45KB)
                - 'ReportRatios': Financial ratios
                - 'ReportsFinStatements': Financial statements
                - 'RESC': Analyst estimates
                - 'CalendarReport': Earnings calendar

        Returns:
            Dict with fundamental metrics

        Example:
            {
                'pe_ratio': 36.58,
                'eps': 7.43,
                'market_cap': 4017099000000,  # $4.02T
                'sector': 'Technology',
                'industry': 'Consumer Electronics',
                'revenue': 391035000000,
                'net_income': 104956000000,
                'description': 'Apple Inc. designs, manufactures...'
            }
        """
        try:
            # Request fundamental data
            xml_data = await self.ib.reqFundamentalDataAsync(
                contract,
                report_type
            )

            if not xml_data or len(xml_data) < 100:
                return {
                    'error': 'No fundamental data available',
                    'symbol': contract.symbol
                }

            # Parse XML
            fundamentals = self._parse_fundamentals_xml(xml_data, report_type)
            fundamentals['symbol'] = contract.symbol
            fundamentals['report_type'] = report_type

            return fundamentals

        except Exception as e:
            return {
                'error': str(e),
                'symbol': contract.symbol
            }

    def _parse_fundamentals_xml(
        self,
        xml_data: str,
        report_type: str
    ) -> Dict:
        """
        Parse fundamental data XML

        Args:
            xml_data: XML string from TWS API
            report_type: Type of report

        Returns:
            Dict with extracted fundamental metrics
        """
        try:
            root = ET.fromstring(xml_data)

            if report_type == 'ReportSnapshot':
                return self._parse_report_snapshot(root)
            elif report_type == 'ReportsFinSummary':
                return self._parse_financial_summary(root)
            elif report_type == 'ReportRatios':
                return self._parse_ratios(root)
            else:
                return {'raw_xml_length': len(xml_data)}

        except Exception as e:
            return {'parse_error': str(e)}

    def _parse_report_snapshot(self, root: ET.Element) -> Dict:
        """
        Parse ReportSnapshot XML

        Extracts: P/E, EPS, Market Cap, Sector, Industry, etc.
        """
        data = {}

        # Company info
        data['company_name'] = self._get_text(root, './/CoIDs/CoID')

        # Valuation metrics
        data['pe_ratio'] = self._get_float(root, './/Ratio[@Type="PRICEBOOK"]')
        data['eps'] = self._get_float(root, './/EPS')
        data['market_cap'] = self._get_float(root, './/MktCap')

        # Classification
        data['sector'] = self._get_text(root, './/Sector')
        data['industry'] = self._get_text(root, './/Industry')

        # Financial data
        data['revenue'] = self._get_float(root, './/TotalRevenue')
        data['net_income'] = self._get_float(root, './/NetIncome')
        data['total_assets'] = self._get_float(root, './/TotalAssets')
        data['total_debt'] = self._get_float(root, './/TotalDebt')
        data['shareholders_equity'] = self._get_float(root, './/ShareholdersEquity')

        # Company description
        data['description'] = self._get_text(root, './/CoGeneralInfo/LongDesc')

        # Employees
        data['employees'] = self._get_int(root, './/Employees')

        # Clean None values
        return {k: v for k, v in data.items() if v is not None}

    def _parse_financial_summary(self, root: ET.Element) -> Dict:
        """
        Parse ReportsFinSummary XML

        Contains complete financial statements (Income, Balance Sheet, Cash Flow)
        """
        data = {}

        # This is a large XML with complete financials
        # For now, extract key metrics
        data['has_income_statement'] = root.find('.//IncomeStatement') is not None
        data['has_balance_sheet'] = root.find('.//BalanceSheet') is not None
        data['has_cash_flow'] = root.find('.//CashFlow') is not None

        # Extract latest fiscal year data
        data['fiscal_year_end'] = self._get_text(root, './/FiscalPeriodEnd')

        return data

    def _parse_ratios(self, root: ET.Element) -> Dict:
        """
        Parse ReportRatios XML

        Financial ratios like ROE, ROA, Debt/Equity, etc.
        """
        data = {}

        # Profitability
        data['roe'] = self._get_float(root, './/ROE')
        data['roa'] = self._get_float(root, './/ROA')
        data['profit_margin'] = self._get_float(root, './/ProfitMargin')

        # Liquidity
        data['current_ratio'] = self._get_float(root, './/CurrentRatio')
        data['quick_ratio'] = self._get_float(root, './/QuickRatio')

        # Leverage
        data['debt_to_equity'] = self._get_float(root, './/DebtEquity')
        data['debt_to_assets'] = self._get_float(root, './/DebtAssets')

        return {k: v for k, v in data.items() if v is not None}

    def _get_text(self, root: ET.Element, xpath: str) -> Optional[str]:
        """Get text value from XML element"""
        try:
            elem = root.find(xpath)
            return elem.text if elem is not None and elem.text else None
        except:
            return None

    def _get_float(self, root: ET.Element, xpath: str) -> Optional[float]:
        """Get float value from XML element"""
        try:
            text = self._get_text(root, xpath)
            if text:
                # Remove commas and convert
                return float(text.replace(',', ''))
            return None
        except:
            return None

    def _get_int(self, root: ET.Element, xpath: str) -> Optional[int]:
        """Get integer value from XML element"""
        try:
            val = self._get_float(root, xpath)
            return int(val) if val is not None else None
        except:
            return None

    async def get_fundamentals_batch(
        self,
        contracts: list,
        report_type: str = 'ReportSnapshot'
    ) -> list:
        """
        Get fundamentals for multiple contracts

        Args:
            contracts: List of Contract objects
            report_type: Type of report

        Returns:
            List of fundamental data dicts
        """
        tasks = [
            self.get_fundamentals(contract, report_type)
            for contract in contracts
        ]
        return await asyncio.gather(*tasks)


async def main():
    """Test the TWS Fundamentals Client"""
    print("=" * 70)
    print("TWS Fundamentals Client - Test Run")
    print("=" * 70)

    # Connect to TWS
    ib = IB()

    try:
        await ib.connectAsync('127.0.0.1', 7496, clientId=1)
        print("[SUCCESS] ✅ Connected to TWS\n")

        # Create test contract (AAPL)
        contract = Stock('AAPL', 'SMART', 'USD')
        await ib.qualifyContractsAsync(contract)

        # Initialize fundamentals client
        fundamentals_client = TWSFundamentalsClient(ib)

        # Test 1: ReportSnapshot
        print("[TEST 1] Getting ReportSnapshot for AAPL...")
        snapshot = await fundamentals_client.get_fundamentals(
            contract,
            'ReportSnapshot'
        )

        if 'error' not in snapshot:
            print("[SUCCESS] ✅ Fundamental data received:")
            if 'pe_ratio' in snapshot:
                print(f"  P/E Ratio: {snapshot['pe_ratio']}")
            if 'eps' in snapshot:
                print(f"  EPS: ${snapshot['eps']}")
            if 'market_cap' in snapshot:
                market_cap_billions = snapshot['market_cap'] / 1_000_000_000
                print(f"  Market Cap: ${market_cap_billions:.2f}B")
            if 'sector' in snapshot:
                print(f"  Sector: {snapshot['sector']}")
            if 'industry' in snapshot:
                print(f"  Industry: {snapshot['industry']}")
            if 'revenue' in snapshot:
                revenue_billions = snapshot['revenue'] / 1_000_000_000
                print(f"  Revenue: ${revenue_billions:.2f}B")
        else:
            print(f"[FAIL] ❌ {snapshot['error']}")

        # Test 2: ReportsFinSummary
        print("\n[TEST 2] Getting ReportsFinSummary for AAPL...")
        fin_summary = await fundamentals_client.get_fundamentals(
            contract,
            'ReportsFinSummary'
        )

        if 'error' not in fin_summary:
            print("[SUCCESS] ✅ Financial summary received:")
            if 'has_income_statement' in fin_summary:
                print(f"  Income Statement: {fin_summary['has_income_statement']}")
            if 'has_balance_sheet' in fin_summary:
                print(f"  Balance Sheet: {fin_summary['has_balance_sheet']}")
            if 'has_cash_flow' in fin_summary:
                print(f"  Cash Flow: {fin_summary['has_cash_flow']}")
        else:
            print(f"[PARTIAL] ⚠️ {fin_summary['error']}")

        # Test 3: Batch request
        print("\n[TEST 3] Batch request for AAPL, MSFT, GOOGL...")
        contracts_batch = [
            Stock('AAPL', 'SMART', 'USD'),
            Stock('MSFT', 'SMART', 'USD'),
            Stock('GOOGL', 'SMART', 'USD')
        ]
        await ib.qualifyContractsAsync(*contracts_batch)

        batch_results = await fundamentals_client.get_fundamentals_batch(
            contracts_batch
        )

        print(f"[SUCCESS] ✅ Received {len(batch_results)} results:")
        for result in batch_results:
            if 'error' not in result:
                symbol = result.get('symbol', 'Unknown')
                pe = result.get('pe_ratio', 'N/A')
                print(f"  {symbol}: P/E = {pe}")
            else:
                print(f"  {result['symbol']}: {result['error']}")

    except Exception as e:
        print(f"\n[ERROR] ❌ {e}")
    finally:
        ib.disconnect()

    print("\n" + "=" * 70)
    print("[COMPLETE] Fundamentals test finished")
    print("=" * 70)


if __name__ == '__main__':
    print("Starting TWS Fundamentals Client test...")
    print("Make sure TWS Desktop is running on port 7496!\n")
    asyncio.run(main())
