# Trading Decision Data Points - Complete Taxonomy

**Created**: December 11, 2025
**Purpose**: Comprehensive reference for all data points needed for stock trading decisions
**Status**: Phase 1 & Phase 2 COMPLETE (December 11, 2025)

## Implementation Summary

### COMPLETED (December 11, 2025)

**Phase 1: Fundamentals via Yahoo Finance (FREE)**
- `lib/data-providers/types.ts` - Added FundamentalData interface (25+ fields)
- `lib/data-providers/yahoo-finance-provider.ts` - Fetches P/E, EPS, Market Cap, Beta, Analyst Targets, etc.
  - **Updated December 11, 2025**: Now uses `yahoo-finance2` npm package which handles crumb/cookie authentication automatically (Yahoo added auth requirement in late 2024)
- `lib/alpaca/data-coordinator.ts` - Includes fundamentals in shared data
- `lib/alpaca/enhanced-prompts.ts` - Updated to use actual fundamental data

**Phase 2: Deterministic Scoring Engine**
- `lib/trading/scoring-engine.ts` - Complete scoring system with:
  - Technical scoring (RSI, MACD, MAs, Bollinger, S/R levels)
  - Fundamental scoring (P/E, EPS, Analyst targets, Beta)
  - Trend scoring (Direction, Strength)
  - Sentiment scoring (News keyword analysis)
  - Timeframe-adjusted weights (Day/Swing/Position/Long-term)
  - Deterministic input hash for reproducibility audit

**Phase 3: Documentation**
- `docs/architecture/TRADING_DATA_TAXONOMY.md` - This document
- Plan file with comprehensive research sources

---

## Executive Summary

This document defines the complete taxonomy of data points required for stock market trading decisions. It includes what we currently have, what we need to add, weighting frameworks, and determinism strategies.

**Key Finding**: System currently collects 30-40 data points (excellent technical coverage), but missing fundamental data (P/E, EPS, etc.).

---

## 1. CURRENT DATA POINTS (What We Have)

### Account & Position Data (Alpaca)
| Data Point | Status |
|------------|--------|
| Portfolio value | Have |
| Cash available | Have |
| Buying power | Have |
| Current positions | Have |
| Unrealized P&L | Have |
| Cost basis | Have |

### Market Data (Yahoo Finance)
| Data Point | Status |
|------------|--------|
| Current price | Have |
| Bid/Ask spread | Have |
| Volume | Have |
| OHLC bars (1min-1day) | Have |

### Technical Indicators (8 Tools)
| Indicator | Status |
|-----------|--------|
| RSI (14-period) | Have |
| MACD (12,26,9) | Have |
| EMA 20, SMA 50, SMA 200 | Have |
| Bollinger Bands | Have |
| Support/Resistance | Have |
| Volume Profile | Have |
| 52-week High/Low | Have |

### News & Sentiment
| Data Point | Status |
|------------|--------|
| News headlines | Have |
| News summaries | Have |
| Earnings date | Placeholder only |

---

## 2. DATA TAXONOMY BY CATEGORY

### CATEGORY 1: TECHNICAL ANALYSIS (Weight: 25-35%)

**Currently Have:**
- Price action (OHLC)
- Moving averages (EMA 20, SMA 50, SMA 200)
- RSI (momentum)
- MACD (trend strength)
- Bollinger Bands (volatility)
- Support/Resistance levels
- Volume analysis
- 52-week range

**To Add (Phase 2+):**
- Average True Range (ATR) - volatility measurement
- Stochastic oscillator - overbought/oversold
- VWAP (Volume Weighted Average Price) - institutional levels

### CATEGORY 2: FUNDAMENTAL ANALYSIS (Weight: 25-35%)

**Currently Have:**
- News headlines and summaries

**Adding in Phase 1 (via Yahoo Finance):**
- P/E Ratio (Price to Earnings) - CRITICAL
- Forward P/E - future valuation
- EPS (Earnings Per Share) - profitability
- Market Cap - company size
- Dividend Yield - income
- Beta - market correlation
- Earnings Date - event risk
- Average Volume (3mo) - liquidity

**Future (Phase 2+ with FMP API):**
- Revenue growth rate
- EPS growth rate
- Profit margins
- ROE / ROA
- Analyst ratings

### CATEGORY 3: SENTIMENT ANALYSIS (Weight: 15-20%)

**Currently Have:**
- News sentiment (from headlines)

**To Add (Future):**
- Social media sentiment (Twitter/X, Reddit)
- Fear & Greed Index
- Put/Call ratio
- Short interest %
- VIX (market fear gauge)

### CATEGORY 4: INSTITUTIONAL DATA (Weight: 10-15%)

**Currently Have:** Nothing

**To Add (Future with FMP/SEC):**
- 13F institutional holdings
- Institutional ownership %
- Insider trading (Form 4)

### CATEGORY 5: MACROECONOMIC (Weight: 5-10%)

**Currently Have:** Nothing

**To Add (Future with FRED):**
- Fed interest rate
- Treasury yields
- Inflation rate (CPI)

---

## 3. WEIGHTING FRAMEWORK

### Timeframe-Adjusted Weights

| Category | Day Trading | Swing | Position | Long-term |
|----------|-------------|-------|----------|-----------|
| Technical | 45% | 35% | 25% | 15% |
| Fundamental | 10% | 20% | 35% | 45% |
| Sentiment | 25% | 25% | 20% | 15% |
| Institutional | 10% | 10% | 10% | 15% |
| Macro | 5% | 5% | 5% | 5% |
| Relative | 5% | 5% | 5% | 5% |

### Signal Scoring

```
Each data point produces signal: BULLISH (+1), NEUTRAL (0), BEARISH (-1)

Category Score = (Sum of signals x weights) / Number of signals

Final Score = Weighted sum across categories

Interpretation:
  +0.6 to +1.0  = STRONG BUY
  +0.3 to +0.59 = BUY
  -0.29 to +0.29 = HOLD
  -0.59 to -0.3 = SELL
  -1.0 to -0.6  = STRONG SELL
```

---

## 4. DETERMINISM STRATEGY

### Goal
Same inputs must produce same outputs (reproducible for real money).

### Implementation

**A. Quantitative Layer (100% Deterministic)**
```typescript
const dataScore = calculateDataScore(technicalData, fundamentalData, ...);
const technicalSignal = interpretTechnical(rsi, macd, sma); // Pure functions
const finalScore = calculateWeightedScore(signals, weights);
```

**B. LLM Layer (Near-Deterministic)**
```typescript
const response = await model.chat({
  messages: [...],
  seed: hashInputs(symbol, timeframe, timestamp),
  temperature: 0.1, // Very low randomness
});
```

**C. Consensus Layer (Statistical Determinism)**
- Multiple models + weighted voting = stable output

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Fundamentals via Yahoo Finance (FREE) - IN PROGRESS

**Files to modify:**
1. `lib/data-providers/types.ts` - Add FundamentalData interface
2. `lib/data-providers/yahoo-finance-provider.ts` - Fetch fundamentals
3. `lib/alpaca/data-coordinator.ts` - Include fundamentals
4. `lib/alpaca/enhanced-prompts.ts` - Use actual data

**Data to add:**
- P/E Ratio, Forward P/E
- EPS (trailing twelve months)
- Market Cap
- Dividend Yield
- Beta
- Earnings Date
- Average Volume (3mo)

### Phase 2: Hybrid Scoring System

**Files to create:**
- `lib/trading/scoring-engine.ts` - Deterministic signal calculation
- `lib/trading/signal-interpreter.ts` - Data to BULLISH/NEUTRAL/BEARISH

### Phase 3: Determinism Layer

**Changes:**
- Add `seed` parameter to model calls
- Lower `temperature` to 0.1-0.2
- Hash inputs for reproducible seeds
- Add audit trail logging

### Phase 4: Optional Premium Data (FMP API - $19/mo)

**If needed:**
- Analyst ratings consensus
- 13F institutional holdings
- Insider transactions

---

## 6. DECISION OUTPUT FORMAT

```json
{
  "symbol": "AAPL",
  "timestamp": "2025-12-11T10:30:00Z",
  "inputHash": "a1b2c3d4...",

  "scores": {
    "technical": { "score": 0.65, "signal": "BULLISH", "confidence": 0.8 },
    "fundamental": { "score": 0.45, "signal": "BULLISH", "confidence": 0.7 },
    "sentiment": { "score": 0.30, "signal": "NEUTRAL", "confidence": 0.6 }
  },

  "weightedScore": 0.52,
  "recommendation": "BUY",
  "confidence": 0.72,

  "reasoning": {
    "bullishFactors": ["RSI showing momentum", "EPS beat"],
    "bearishFactors": ["P/E above average"],
    "keyLevels": { "support": 185.50, "resistance": 195.00 }
  }
}
```

---

## 7. KEY INSIGHTS FROM RESEARCH

1. **Academic validation**: Multi-agent debate shows 13.2% improvement with voting
2. **Optimal ML weight**: 0.40-0.45 for hybrid approaches
3. **Determinism achievable**: Low temperature + seed + consensus
4. **Alpaca/IBKR limitation**: Trading APIs only, no fundamentals
5. **Yahoo Finance solution**: Has fundamentals, we just need to fetch them

---

## 8. SOURCES

- [Deep Learning for Algorithmic Trading (ScienceDirect 2025)](https://www.sciencedirect.com/science/article/pii/S2590005625000177)
- [Multi-Agent Debate (ACL 2025)](https://aclanthology.org/2025.findings-acl.606/)
- [Voting vs Consensus (arXiv 2025)](https://arxiv.org/abs/2502.19130)
- [OpenAI Reproducible Outputs](https://cookbook.openai.com/examples/reproducible_outputs_with_the_seed_parameter)

---

## NEXT SESSION PROMPT

```
Continue Trading Data Taxonomy implementation.

COMPLETED:
- Research and planning complete
- Plan documented in docs/architecture/TRADING_DATA_TAXONOMY.md
- FundamentalData interface defined

IN PROGRESS:
- Phase 1: Add fundamentals via Yahoo Finance

TODO:
1. Extend Yahoo Finance provider to fetch fundamentals
2. Update data-coordinator.ts to include fundamentals
3. Update enhanced-prompts.ts to use actual data
4. Create scoring-engine.ts
5. Add determinism layer
6. Test trading system

FILES TO MODIFY:
- lib/data-providers/types.ts - Add FundamentalData interface
- lib/data-providers/yahoo-finance-provider.ts - Fetch fundamentals
- lib/alpaca/data-coordinator.ts - Include fundamentals
- lib/alpaca/enhanced-prompts.ts - Use actual data
- lib/trading/scoring-engine.ts - NEW: Create scoring engine

PRIORITY: Fundamentals first, then scoring, then determinism
```
