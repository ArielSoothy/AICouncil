# TWS API Screening Module

**Pre-Market Stock Screening using TWS API (ib_insync)**

This module provides comprehensive pre-market stock screening by connecting to Interactive Brokers TWS Desktop and fetching data that was previously unavailable via Client Portal API.

---

## 🎯 Why TWS API?

After extensive testing, we discovered that **TWS API provides 90% of needed data** vs Client Portal API's 30%:

| Data Type | Client Portal API | TWS API | Result |
|-----------|-------------------|---------|--------|
| **Fundamentals** | ❌ 404 Error | ✅ P/E, EPS, Market Cap | **TWS Wins** |
| **Short Data** | ❌ Field 7636 = 0 | ✅ 85M shares (tick 236) | **TWS Wins** |
| **Ratios** | ❌ 0 fields | ✅ 60+ ratios (tick 258) | **TWS Wins** |
| **Scanners** | ✅ 563 types | ✅ 3,323 types | **TWS Wins** (5.9x more) |
| **Real-Time Quotes** | ❌ 0 fields | ✅ Working | **TWS Wins** |
| **Social Sentiment** | ❌ None | ❌ None | **External API needed** |

**Conclusion**: TWS API + Finnhub (sentiment) = Complete screening solution

---

## 📦 Components

### 1. `tws_scanner.py` - Stock Scanner
**Purpose**: Find pre-market gappers, most active stocks, hot stocks
**Methods**:
- `scan_pre_market_gaps()` - Find stocks with gaps
- `scan_most_active()` - Most active by volume
- `scan_hot_by_volume()` - Hot stocks

**Example**:
```python
from lib.trading.screening.tws_scanner import TWSScannerClient

scanner = TWSScannerClient()
await scanner.connect()

results = await scanner.scan_pre_market_gaps(
    min_gap_percent=3.0,
    min_volume=500000,
    max_results=20
)
# Returns: 20 stocks with highest gaps
```

### 2. `tws_fundamentals.py` - Company Fundamentals
**Purpose**: Get P/E, EPS, Market Cap, Sector, Revenue, etc.
**Methods**:
- `get_fundamentals()` - Get fundamental data for 1 stock
- `get_fundamentals_batch()` - Batch request for multiple stocks

**Data Available**:
- Valuation: P/E, Market Cap, EPS
- Company: Sector, Industry, Description, Employees
- Financials: Revenue, Net Income, Assets, Debt, Equity

**Example**:
```python
from lib.trading.screening.tws_fundamentals import TWSFundamentalsClient

fund_client = TWSFundamentalsClient(ib)
fundamentals = await fund_client.get_fundamentals(contract)

# Returns:
# {
#     'pe_ratio': 36.58,
#     'eps': 7.43,
#     'market_cap': 4017099000000,
#     'sector': 'Technology',
#     'revenue': 391035000000,
#     ...
# }
```

### 3. `tws_short_data.py` - Short Selling Data ⭐ CRITICAL
**Purpose**: Get shortable shares - UNAVAILABLE in Client Portal API
**Methods**:
- `get_short_data()` - Get short data for 1 stock
- `get_short_data_batch()` - Batch request
- `filter_hard_to_borrow()` - Find HTB stocks
- `calculate_short_squeeze_score()` - Squeeze potential (0-100)

**Data Available**:
- Shortable shares count
- Short fee rate (if available)
- Borrow difficulty (Easy/Moderate/Hard/Very Hard)
- Hard-to-borrow flag

**Example**:
```python
from lib.trading.screening.tws_short_data import TWSShortDataClient

short_client = TWSShortDataClient(ib)
short_data = await short_client.get_short_data(contract)

# Returns:
# {
#     'shortable_shares': 85540528,
#     'borrow_difficulty': 'Easy',
#     'is_hard_to_borrow': False
# }

# Calculate short squeeze potential
score = short_client.calculate_short_squeeze_score(
    short_data,
    volume=100_000_000
)
# Returns: 65.5 (0-100 score)
```

### 4. `tws_ratios.py` - 60+ Fundamental Ratios
**Purpose**: Comprehensive fundamental analysis - FAR MORE than Yahoo Finance
**Methods**:
- `get_ratios()` - Get 60+ ratios for 1 stock
- `get_ratios_batch()` - Batch request
- `calculate_value_score()` - Value investing score (0-100)

**Ratios Categories**:
- **Valuation** (10): P/E, P/B, P/S, PEG, EV/EBITDA, etc.
- **Profitability** (8): EPS, ROE, ROA, Profit Margin, Gross Margin, etc.
- **Liquidity** (3): Current Ratio, Quick Ratio, Cash Ratio
- **Leverage** (4): Debt/Equity, Debt/Assets, Interest Coverage, etc.
- **Efficiency** (4): Asset Turnover, Inventory Turnover, etc.
- **Market** (5): Market Cap, Beta, Shares Outstanding, Float, etc.
- **Growth** (5): Revenue Growth, Earnings Growth, etc.
- **Dividend** (2): Dividend Yield, Payout Ratio
- **Per Share** (4): Book Value, Cash, Revenue per share, etc.
- **Financial Health** (4): Working Capital, Net Income, OCF, FCF

**Example**:
```python
from lib.trading.screening.tws_ratios import TWSRatiosClient

ratios_client = TWSRatiosClient(ib)
ratios = await ratios_client.get_ratios(contract)

# Returns:
# {
#     'pe_ratio': 36.58,
#     'roe': 160.58,
#     'debt_to_equity': 2.30,
#     'current_ratio': 0.87,
#     'beta': 1.09,
#     'market_cap': 4017099,
#     ... 54 more ratios ...
# }

# Calculate value investing score
value_score = ratios_client.calculate_value_score(ratios)
# Returns: 55.0 (0-100 score)
```

### 5. `tws_bars.py` - Pre-Market Gaps & Momentum
**Purpose**: Calculate gap % from previous close using pre-market bars
**Methods**:
- `get_pre_market_bars()` - Get bars from 4am-9:30am ET
- `get_bars_batch()` - Batch request
- `filter_by_gap()` - Filter stocks by min gap %
- `sort_by_gap()` - Sort by gap size

**Data Available**:
- Gap % and direction (up/down)
- Pre-market price vs previous close
- Pre-market volume, high, low, range
- Momentum score (0-100)
- Time range of pre-market activity

**Example**:
```python
from lib.trading.screening.tws_bars import TWSBarsClient

bars_client = TWSBarsClient(ib)
bars_data = await bars_client.get_pre_market_bars(contract)

# Returns:
# {
#     'gap_percent': 3.45,
#     'gap_direction': 'up',
#     'pre_market_price': 185.50,
#     'previous_close': 179.25,
#     'pre_market_volume': 1234567,
#     'momentum_score': 75.5
# }
```

---

## 🚀 Quick Start

### Prerequisites
```bash
# 1. TWS Desktop running on port 7496
# 2. API enabled in TWS settings
# 3. Market data subscriptions active ($14.50/mo)
```

### Installation
```bash
cd /Users/user/AI-Counsil/AICouncil

# Option 1: Automated setup
bash scripts/setup-tws-screening.sh

# Option 2: Manual setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Test Individual Components
```bash
# Activate virtual environment
source venv/bin/activate

# Test scanner
python3 -m lib.trading.screening.tws_scanner

# Test fundamentals
python3 -m lib.trading.screening.tws_fundamentals

# Test short data (CRITICAL!)
python3 -m lib.trading.screening.tws_short_data

# Test ratios (60+ ratios)
python3 -m lib.trading.screening.tws_ratios

# Test pre-market bars
python3 -m lib.trading.screening.tws_bars
```

### Complete Screening Example
```python
from ib_insync import *
from lib.trading.screening.tws_scanner import TWSScannerClient
from lib.trading.screening.tws_fundamentals import TWSFundamentalsClient
from lib.trading.screening.tws_short_data import TWSShortDataClient
from lib.trading.screening.tws_ratios import TWSRatiosClient
from lib.trading.screening.tws_bars import TWSBarsClient

async def screen_pre_market():
    # Connect
    ib = IB()
    await ib.connectAsync('127.0.0.1', 7496, clientId=1)

    # Initialize clients
    scanner = TWSScannerClient()
    fundamentals = TWSFundamentalsClient(ib)
    short_data = TWSShortDataClient(ib)
    ratios = TWSRatiosClient(ib)
    bars = TWSBarsClient(ib)

    # Step 1: Scan for gappers
    await scanner.connect()
    results = await scanner.scan_pre_market_gaps(
        min_gap_percent=3.0,
        min_volume=500000,
        max_results=20
    )

    # Step 2: Get data for each stock
    enriched = []
    for stock in results:
        contract = stock['contract']

        # Parallel data fetching
        fund, short, ratio, bar = await asyncio.gather(
            fundamentals.get_fundamentals(contract),
            short_data.get_short_data(contract),
            ratios.get_ratios(contract),
            bars.get_pre_market_bars(contract)
        )

        enriched.append({
            'symbol': stock['symbol'],
            'fundamentals': fund,
            'short_data': short,
            'ratios': ratio,
            'bars': bar
        })

    # Step 3: Calculate scores and sort
    # (See screening_orchestrator.py for complete implementation)

    ib.disconnect()
    return enriched

# Run
asyncio.run(screen_pre_market())
```

---

## 📊 Performance Targets

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| Scanner | <5 seconds | 20 stocks |
| Fundamentals | <10 seconds | 20 stocks (batch) |
| Short Data | <5 seconds | 20 stocks (batch) |
| Ratios | <10 seconds | 20 stocks (batch) |
| Bars | <15 seconds | 20 stocks (batch, TWS rate limit) |
| **Total Pipeline** | **<30 seconds** | **Complete screening** |

---

## 🔧 Troubleshooting

### "Connection refused" Error
```
[FAIL] ❌ Connection failed: [Errno 61] Connect call failed
```
**Solution**:
1. Is TWS Desktop running? (Not Gateway - Desktop app)
2. Is API enabled? File → Global Configuration → API → Settings
3. Is "Enable ActiveX and Socket Clients" checked?
4. Is socket port 7496? (Check in API settings)

### "No data available" Errors
```
{'error': 'No fundamental data available'}
```
**Possible causes**:
1. Stock doesn't have fundamental data
2. Market data subscriptions not active ($14.50/mo)
3. Outside market hours (some data requires market open)

**Solution**:
- Check IBKR account has market data subscriptions
- Test with major stocks (AAPL, MSFT, GOOGL)
- Run during market hours or pre-market (4am-9:30am ET)

### Rate Limits
TWS API has rate limits for historical data requests.

**Solution**:
- Batch processing built into clients
- Delays between batches
- Process 3-5 stocks at a time

---

## 📚 Next Steps

### Phase 6: FastAPI REST Bridge
Create REST API to expose TWS data to Next.js frontend.

**File**: `api/main.py`
**Endpoint**: `POST /api/screening/pre-market`

### Phase 7: Screening Orchestrator
Combine all clients into single screening pipeline.

**File**: `lib/trading/screening/screening_orchestrator.py`

### Phase 8: Finnhub Integration
Add social sentiment (only external API needed).

**File**: `lib/trading/screening/finnhub_sentiment.py`

---

## 📝 Documentation

- **Migration Plan**: `docs/trading/TWS_API_MIGRATION_PLAN.md`
- **Data Availability**: `docs/trading/IBKR_DATA_AVAILABILITY.md`
- **Implementation Status**: `docs/trading/PRE_MARKET_SCREENING_IMPLEMENTATION_STATUS.md`
- **Test Results**: `scripts/test-tws-api.py` output

---

## 🎯 Key Advantages Over Client Portal API

1. **Fundamentals**: TWS has P/E, EPS, Market Cap → Client Portal 404
2. **Short Data**: TWS has 85M shares → Client Portal field 7636 = 0
3. **Ratios**: TWS has 60+ ratios → Client Portal 0 fields
4. **Scanners**: TWS has 3,323 types → Client Portal 563 types
5. **Real-Time**: TWS works with subscriptions → Client Portal 0 fields

**Only missing**: Social sentiment → Use Finnhub free tier

---

*Last Updated: January 3, 2026*
*TWS API Migration: Phase 1-5 Complete (Scanner + Data Clients)*
*Next: Phases 6-10 (API Bridge + Orchestrator + Integration)*
