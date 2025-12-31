# Trading Documentation

**Centralized documentation for the AI-powered trading system.**

---

## Quick Reference

| Document | Purpose | Read When |
|----------|---------|-----------|
| [TRADING_DATA_SOURCES.md](./TRADING_DATA_SOURCES.md) | All data sources (Yahoo, SEC, Alpaca, IBKR) | Understanding where data comes from |
| [TRADING_SYSTEM.md](./TRADING_SYSTEM.md) | Protected features list (#19-54) | Before modifying trading code |
| [TRADING_ENHANCEMENTS.md](./TRADING_ENHANCEMENTS.md) | Phase 2 implementation details | Adding new features |
| [TRADING_DECISION_PROCESS.md](./TRADING_DECISION_PROCESS.md) | How trading decisions are made | Understanding the decision flow |
| [TRADING_DATA_TAXONOMY.md](./TRADING_DATA_TAXONOMY.md) | Data classification and categories | Data modeling work |
| [TRADING_TOOL_USE_STRATEGY.md](./TRADING_TOOL_USE_STRATEGY.md) | Tool calling patterns | Optimizing research agents |
| [RESEARCH_CACHE_TESTING.md](./RESEARCH_CACHE_TESTING.md) | Testing the cache system | Debugging cache issues |
| [MIGRATION_YAHOO_FINANCE.md](./MIGRATION_YAHOO_FINANCE.md) | Historical: Yahoo Finance migration | Reference only |

---

## Trading Modes

### 1. Consensus Mode
Multiple AI models analyze shared research data and vote on a trading decision. A Judge model synthesizes the final recommendation.

**API:** `POST /api/trading/consensus`

### 2. Individual Mode
2+ models independently analyze research. Good for comparing different model perspectives.

**API:** `POST /api/trading/individual`

### 3. Debate Mode
3-role structured debate: Analyst → Critic → Synthesizer. Two rounds of refinement for thorough analysis.

**API:** `POST /api/trading/debate`

---

## Data Sources Summary

| Source | Type | Cost | Key Data |
|--------|------|------|----------|
| **Yahoo Finance** | Market data | FREE | Quotes, bars, news, fundamentals |
| **SEC EDGAR** | Fundamentals | FREE | 10-K, 10-Q, filings, ratios |
| **Alpaca** | Broker | FREE (paper) | Account, positions, orders |
| **IBKR** | Broker | Optional | Full real-time data |

See [TRADING_DATA_SOURCES.md](./TRADING_DATA_SOURCES.md) for complete details.

---

## Key Code Locations

```
lib/
├── agents/
│   └── research-agents.ts      # 4-agent research orchestration
├── alpaca/
│   ├── market-data-tools.ts    # 8 market data tools
│   ├── sec-edgar-tools.ts      # 3 SEC EDGAR tools
│   └── data-coordinator.ts     # Shared data fetching
├── trading/
│   ├── get_stock_quote.ts      # Yahoo Finance quotes
│   └── research-cache.ts       # Supabase caching
├── data-providers/
│   ├── yahoo-finance-provider.ts
│   └── sec-edgar/
│       ├── sec-edgar-provider.ts
│       ├── xbrl-parser.ts
│       └── cik-mapper.ts
└── brokers/
    ├── alpaca-broker.ts
    └── ibkr-broker.ts

app/api/trading/
├── consensus/route.ts          # Consensus mode API
├── individual/route.ts         # Individual mode API
└── debate/route.ts             # Debate mode API
```

---

## Research Pipeline

```
User Query → Broker Auth → Fetch Market Data → Research Agents (30-40 tool calls)
                                    ↓
                          Check Cache (TTL: 15min-24hr)
                                    ↓
                          4 Agents: Technical, Fundamental, Sentiment, Risk
                                    ↓
                          Calculate Score → AI Decision → Response
```

---

## Environment Setup

```bash
# Required
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret

# Optional (caching)
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

---

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - Master index
- [docs/workflow/FEATURES.md](../workflow/FEATURES.md) - All protected features
- [docs/architecture/PROJECT_STRUCTURE.md](../architecture/PROJECT_STRUCTURE.md) - Full codebase structure
