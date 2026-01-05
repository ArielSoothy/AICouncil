"""
TWS API Screening Module

Provides pre-market stock screening using TWS API (ib_insync).

Modules:
    tws_scanner_sync: Scanner client for finding stocks (SYNC - WORKS!)
    tws_fundamentals: Fundamental data (P/E, EPS, Market Cap)
    tws_short_data: Short selling data (shortable shares, fee rates)
    tws_ratios: 60+ fundamental ratios
    tws_bars: Pre-market bars and gap calculation
    simple_orchestrator: Combines all data sources

Note: Finnhub sentiment REMOVED (Jan 2026) - requires $50/mo premium subscription

Usage:
    from lib.trading.screening.tws_scanner_sync import TWSScannerSync

    scanner = TWSScannerSync()
    scanner.connect()
    results = scanner.scan_most_active()
    scanner.disconnect()
"""

__version__ = '2.0.0'  # V2 with sync scanner
__author__ = 'Verdict AI'
