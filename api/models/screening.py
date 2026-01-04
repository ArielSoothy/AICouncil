"""
Pydantic Models for Screening API

Request/response models for FastAPI pre-market screening endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ScreeningRequest(BaseModel):
    """Request model for pre-market screening"""

    min_gap_percent: float = Field(
        default=3.0,
        ge=0,
        description="Minimum gap percentage (e.g., 3.0 for 3%)"
    )

    min_volume: int = Field(
        default=500000,
        ge=0,
        description="Minimum pre-market volume"
    )

    max_results: int = Field(
        default=20,
        ge=1,
        le=50,
        description="Maximum number of results to return (1-50)"
    )

    include_sentiment: bool = Field(
        default=True,
        description="Include Finnhub social sentiment data"
    )

    scan_code: str = Field(
        default='TOP_PERC_GAIN',
        description="TWS scanner code (TOP_PERC_GAIN, MOST_ACTIVE, HOT_BY_VOLUME, etc.)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "min_gap_percent": 3.0,
                "min_volume": 500000,
                "max_results": 20,
                "include_sentiment": True,
                "scan_code": "TOP_PERC_GAIN"
            }
        }


class StockResult(BaseModel):
    """Individual stock screening result"""

    symbol: str = Field(..., description="Stock symbol (e.g., 'AAPL')")
    rank: int = Field(..., description="Scanner rank (0 = highest)")

    gap_percent: float = Field(..., description="Gap percentage from previous close")
    gap_direction: str = Field(..., description="Gap direction ('up' or 'down')")

    pre_market_volume: int = Field(..., description="Pre-market trading volume")
    pre_market_price: float = Field(..., description="Current pre-market price")
    previous_close: float = Field(..., description="Previous day's closing price")

    fundamentals: Optional[Dict[str, Any]] = Field(None, description="Fundamental data (P/E, EPS, Market Cap, etc.)")
    short_data: Optional[Dict[str, Any]] = Field(None, description="Short selling data (shortable shares, borrow difficulty)")
    ratios: Optional[Dict[str, Any]] = Field(None, description="60+ fundamental ratios")
    bars: Optional[Dict[str, Any]] = Field(None, description="Pre-market bars and gap analysis")
    sentiment: Optional[Dict[str, Any]] = Field(None, description="Social sentiment data (Reddit, Twitter)")

    score: float = Field(..., ge=0, le=100, description="Composite screening score (0-100)")

    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "AAPL",
                "rank": 0,
                "gap_percent": 3.45,
                "gap_direction": "up",
                "pre_market_volume": 1234567,
                "pre_market_price": 185.50,
                "previous_close": 179.25,
                "fundamentals": {
                    "pe_ratio": 36.58,
                    "eps": 7.43,
                    "market_cap": 4017099000000,
                    "sector": "Technology"
                },
                "short_data": {
                    "shortable_shares": 85540528,
                    "borrow_difficulty": "Easy"
                },
                "ratios": {
                    "roe": 160.58,
                    "debt_to_equity": 2.30,
                    "beta": 1.09
                },
                "bars": {
                    "gap_percent": 3.45,
                    "momentum_score": 75.5
                },
                "sentiment": {
                    "score": 0.75,
                    "mentions": 234
                },
                "score": 85.5
            }
        }


class ScreeningResponse(BaseModel):
    """Response model for pre-market screening"""

    stocks: List[StockResult] = Field(..., description="List of stock screening results")
    total_scanned: int = Field(..., description="Total number of stocks scanned")
    total_returned: int = Field(..., description="Number of stocks returned")
    execution_time_seconds: float = Field(..., description="Pipeline execution time in seconds")
    timestamp: str = Field(..., description="Screening timestamp (ISO format)")
    scan_parameters: Optional[Dict[str, Any]] = Field(None, description="Scan filters that were used (for transparency)")

    class Config:
        json_schema_extra = {
            "example": {
                "stocks": [
                    {
                        "symbol": "AAPL",
                        "rank": 0,
                        "gap_percent": 3.45,
                        "gap_direction": "up",
                        "pre_market_volume": 1234567,
                        "pre_market_price": 185.50,
                        "previous_close": 179.25,
                        "fundamentals": {"pe_ratio": 36.58},
                        "short_data": {"shortable_shares": 85540528},
                        "ratios": {"roe": 160.58},
                        "bars": {"momentum_score": 75.5},
                        "sentiment": {"score": 0.75},
                        "score": 85.5
                    }
                ],
                "total_scanned": 50,
                "total_returned": 20,
                "execution_time_seconds": 25.3,
                "timestamp": "2026-01-03T21:30:00"
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: str = Field(..., description="Current timestamp")
    tws_connected: bool = Field(..., description="TWS Desktop connection status")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "1.0.0",
                "timestamp": "2026-01-03T21:30:00",
                "tws_connected": True
            }
        }
