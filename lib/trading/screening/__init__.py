"""
TWS API Screening Module

Provides pre-market stock screening using TWS API (ib_insync).

Modules:
    tws_scanner: Scanner client for finding stocks
    tws_fundamentals: Fundamental data (P/E, EPS, Market Cap)
    tws_short_data: Short selling data (shortable shares, fee rates)
    tws_ratios: 60+ fundamental ratios
    tws_bars: Pre-market bars and gap calculation
    finnhub_sentiment: Social sentiment from Finnhub
    screening_orchestrator: Combines all data sources

Usage:
    from lib.trading.screening.tws_scanner import TWSScannerClient

    scanner = TWSScannerClient()
    await scanner.connect()
    results = await scanner.scan_pre_market_gaps()
"""

__version__ = '1.0.0'
__author__ = 'Verdict AI'
