# Trading Data Sources

**Last Updated**: December 2025
**Purpose**: Document all data sources used for trading research and analysis

---

## Overview

The trading system uses a **Centralized Research** pattern: fetch market data ONCE, share with ALL AI models. This reduces API costs and ensures consistency across model responses.

---

## Primary Data Sources (All FREE)

### 1. Yahoo Finance

**API Endpoints:**
- Chart data: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- News: `https://query2.finance.yahoo.com/v1/finance/search`
- Fundamentals: `yahoo-finance2` npm package

**Data Provided:**
| Category | Data Points |
|----------|-------------|
| Quote | Price, bid, ask, volume, exchange, timestamp |
| Historical | OHLC bars (up to 90 days) |
| Technical | RSI, MACD, EMA-20, SMA-50, SMA-200, Bollinger Bands |
| Price Levels | 30-day support/resistance, 52-week high/low |
| News | Latest 5 articles with sentiment |
| Fundamentals | P/E, EPS, market cap, beta, dividend yield, analyst target |

**Rate Limits:** ~2,000 requests/hour
**Cost:** FREE, no API key required

**Key File:** `lib/data-providers/yahoo-finance-provider.ts`

---

### 2. SEC EDGAR

**API Endpoints:**
- Company Facts (XBRL): `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`
- Submissions: `https://data.sec.gov/submissions/CIK{cik}.json`

**Data Provided:**
| Category | Data Points |
|----------|-------------|
| Income Statement | Revenue, net income, operating income |
| Balance Sheet | Assets, liabilities, equity, cash, debt |
| Per Share | EPS, shares outstanding |
| Ratios | Debt-to-equity, current ratio, ROE, ROA |
| Filings | 10-K (annual), 10-Q (quarterly), 8-K (events) |

**Rate Limits:** 10 requests/second (requires User-Agent header)
**Cost:** FREE, no API key required
**Coverage:** All US public companies

**Key Files:**
- `lib/data-providers/sec-edgar/sec-edgar-provider.ts`
- `lib/data-providers/sec-edgar/xbrl-parser.ts`
- `lib/data-providers/sec-edgar/cik-mapper.ts`

**Best For:** Obscure small-cap stocks with sparse Yahoo Finance data, biotech R&D analysis

---

### 3. Alpaca Markets

**API Endpoints:**
- Paper Trading: `https://paper-api.alpaca.markets`
- Production: `https://api.alpaca.markets`

**Data Provided:**
| Category | Data Points |
|----------|-------------|
| Market Data | Historical bars (OHLC), 15-min delayed quotes |
| News | Stock-specific news articles |
| Account | Positions, balances, buying power, P&L |
| Orders | Order history, execution details |

**Requirements:** `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`
**Cost:** FREE (paper trading), paid for live
**Data Feed:** IEX (free tier, 15-minute delayed)

**Key Files:**
- `lib/brokers/alpaca-broker.ts`
- `lib/alpaca/market-data-tools.ts`

---

## Optional Data Sources

### 4. Interactive Brokers (IBKR)

**API:** Client Portal API (localhost gateway)
**Endpoint:** `https://localhost:5050/v1/api`

**Data Provided:**
- Full real-time market data (if subscribed)
- Historical bars with no delay
- Account info, positions, full data access

**Requirements:** IBKR Gateway running and authenticated
**Documentation:** https://interactivebrokers.github.io/cpwebapi/

**Key File:** `lib/brokers/ibkr-broker.ts`

**Data Priority:** System tries IBKR first (full data), falls back to Alpaca (free tier)

---

## Research Tools (11 Total)

### Alpaca Market Data Tools (8)

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `get_stock_quote` | Real-time price | Yahoo Finance |
| `get_price_bars` | Historical OHLC | IBKR > Alpaca |
| `get_stock_news` | Latest news | Alpaca API |
| `calculate_rsi` | RSI indicator | Calculated from bars |
| `calculate_macd` | MACD indicator | Calculated from bars |
| `get_volume_profile` | Volume analysis | IBKR > Alpaca |
| `get_support_resistance` | Key price levels | Calculated from bars |
| `check_earnings_date` | Earnings calendar | N/A (not available on free tier) |

**File:** `lib/alpaca/market-data-tools.ts`

### SEC EDGAR Tools (3)

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `get_10k_data` | Annual report fundamentals | SEC EDGAR XBRL |
| `get_company_filings` | Recent filings list | SEC EDGAR submissions |
| `get_rnd_spending` | R&D analysis | SEC EDGAR 10-K/10-Q |

**File:** `lib/alpaca/sec-edgar-tools.ts`

---

## Research Agents (4)

The research pipeline uses 4 specialized agents making **30-40 tool calls** per analysis:

| Agent | Focus | Tools Used |
|-------|-------|------------|
| **Technical Analyst** | Price action, indicators, patterns | 5-8 tools |
| **Fundamental Analyst** | News, earnings, company data | 4-6 tools |
| **Sentiment Analyst** | Market psychology, news sentiment | 3-5 tools |
| **Risk Manager** | Position sizing, stop-loss, risk levels | 6-10 tools |

**File:** `lib/agents/research-agents.ts`

---

## Data Flow Architecture

```
User Query (Trading Mode)
    |
    v
Broker Authentication (Alpaca or IBKR)
    |
    v
Fetch Shared Market Data:
    +-- Yahoo Finance (prices, news, fundamentals)
    +-- Alpaca (bars, news)
    +-- IBKR (bars - if authenticated)
    |
    v
Detect Sparse Data --> SEC EDGAR Fallback (if needed)
    |
    v
Check Research Cache
    |-- HIT: Return cached research (2x faster)
    +-- MISS: Run 4 Research Agents
              |
              v
         Calculate Deterministic Score
              |
              v
         Call Decision Models (Consensus/Individual/Debate)
              |
              v
         Generate Final Trading Decision
```

---

## Research Caching

**Database:** Supabase PostgreSQL (`research_cache` table)
**File:** `lib/trading/research-cache.ts`

### Smart TTL Strategy

| Timeframe | TTL | Rationale |
|-----------|-----|-----------|
| Day trading | 15 min | Intraday volatility |
| Swing trading | 1 hour | Daily timeframe |
| Position trading | 4 hours | Weekly holds |
| Long-term | 24 hours | Fundamental stability |

### Cache Key Format
`{symbol}-{timeframe}` (e.g., "AAPL-swing", "TSLA-day")

### Performance
- **45% cost savings** with 50% cache hit rate
- **2x faster responses** for cached queries (<2s vs 8-12s)
- **Zero API calls** on cache hits

---

## Data Enhancement & Fallback

**File:** `lib/data-providers/data-enhancer.ts`

The system automatically detects sparse data from Yahoo Finance and triggers SEC EDGAR as a fallback:

1. Detect missing fundamentals (P/E, EPS, etc.)
2. Query SEC EDGAR for 10-K/10-Q data
3. Merge Yahoo prices + SEC fundamentals
4. Return complete data set

**Best For:** Small-cap stocks, recent IPOs, obscure tickers

---

## Key Files Summary

| File | Purpose |
|------|---------|
| `lib/agents/research-agents.ts` | 4-agent research orchestration |
| `lib/alpaca/market-data-tools.ts` | 8 Alpaca market tools |
| `lib/alpaca/sec-edgar-tools.ts` | 3 SEC EDGAR tools |
| `lib/alpaca/data-coordinator.ts` | Shared data fetching |
| `lib/trading/get_stock_quote.ts` | Real Yahoo Finance quotes |
| `lib/data-providers/yahoo-finance-provider.ts` | Yahoo Finance integration |
| `lib/data-providers/sec-edgar/sec-edgar-provider.ts` | SEC EDGAR integration |
| `lib/trading/research-cache.ts` | Caching system (Supabase) |
| `lib/brokers/alpaca-broker.ts` | Alpaca broker integration |
| `lib/brokers/ibkr-broker.ts` | IBKR broker integration |

---

## Environment Variables

```bash
# Required
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret

# Optional (for caching)
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# Optional (for IBKR)
IBKR_GATEWAY_URL=https://localhost:5050
```

---

## Related Documentation

- [TRADING_ENHANCEMENTS.md](./TRADING_ENHANCEMENTS.md) - Phase 2 paper trading system
- [TRADING_DECISION_PROCESS.md](./TRADING_DECISION_PROCESS.md) - How trading decisions are made
- [TRADING_DATA_TAXONOMY.md](./TRADING_DATA_TAXONOMY.md) - Data classification
- [RESEARCH_CACHE_TESTING.md](./RESEARCH_CACHE_TESTING.md) - Testing the cache system
