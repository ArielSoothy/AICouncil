# 🎯 CURRENT PRIORITIES & SESSION PROGRESS

## 📚 REQUIRED CONTEXT FOR AI - READ THESE BASED ON WORK MODE:

**🔴 CRITICAL: When working on ANY trading features, ALWAYS read:**
- `/Users/user/AI-Counsil/AICouncil/docs/features/TRADING_ENHANCEMENTS.md` - Complete trading system documentation
- `/Users/user/AI-Counsil/AICouncil/PAPER_TRADE.MD` - Paper trading implementation details

**Other context-specific docs (see DOCUMENTATION_MAP.md for full list):**
- Ultra Mode/Consensus work → `docs/architecture/AI_MODELS_SETUP.md`
- Agent Debate work → `docs/guides/SUB_AGENTS.md`
- Database changes → `docs/architecture/SUPABASE_SETUP.md`

**📜 Historical completed work:** See `docs/workflow/PRIORITIES_ARCHIVE.md` for all previously completed features

---

## 📝 CURRENT SESSION CONTEXT:

**Current Session:** 🔧 **SCREENING-TO-DEBATE PIPELINE** (February 7, 2026)
**Goal:** Connect pre-market screening to AI debate engine for daily stock briefings

**✅ ALL PHASES COMPLETE:**
- ✅ Phase 1: Foundation - Types (`lib/trading/screening-debate/types.ts`) + Database SQL (`scripts/create-screening-debates-table.sql`)
- ✅ Phase 2: Core Pipeline - Prompts, Judge extension (BUY/WATCH/SKIP), Pipeline orchestrator
- ✅ Phase 3: API Routes - SSE streaming endpoint + Results fetch endpoint
- ✅ Phase 4: Frontend UI - React hook, Config modal, Progress bar, Briefing page, Stock card integration
- ✅ Phase 5: Trade Execution - Multi-broker executor via BrokerFactory (Alpaca + IBKR)
- ✅ Phase 6: Polish - Navigation (Briefing link), Documentation (Feature #58), TypeScript clean

**Previous Session:** 🔧 Code Quality Improvements (February 6, 2026)
- ✅ Error Boundaries, Shared Utilities, Type Safety, Dead Code Removal
- ✅ ESLint Cleanup, Component Refactoring (3 large components split)
- ✅ Documentation updates

**⚠️ DEFERRED (separate PR):**
- Pre-existing type errors in `individual-mode.tsx` (2 errors, pre-existing)
- ESLint `ignoreDuringBuilds` in `next.config.ts` should be removed when all warnings fixed
- console.log cleanup (319 API route + 49 component instances)

---

## 📜 ARCHIVED SESSIONS (Collapsed - See git history for details)

<details>
<summary>January 2026 Sessions (click to expand)</summary>

- **Jan 5, 2026 PM:** Winners Strategy Implementation - Expandable stock rows, TradingView charts, AI analysis, scoring engine, supernova filters
- **Jan 5, 2026 AM:** Screening Enhancements - TWS restart detection, sorting, data caching (localStorage + Supabase), history panel
- **Jan 3-4, 2026:** Database-Backed Screening Architecture - Phases 1-10 complete, Gemini AI recommended architecture, FastAPI + TWS integration

</details>

<details>
<summary>December 2025 Sessions (click to expand)</summary>

- **Dec 17:** Judge + Cache + Alpaca + IBKR Fixes - Judge tier-aware provider, cache key fix, IEX free feed, IBKR polling reduction
- **Dec 15:** Arena Real-Time Prices + Website Testing - Alpaca real-time prices, CLI subscription mode, comprehensive site testing
- **Dec 14:** Model Health Check + Fallback Hardening - Ping tests, broken model ID fixes, MODEL_REGISTRY rewrite
- **Dec 9:** Multi-Broker Support + IBKR Auth - Broker selector dropdown, IBKR auth dialog
- **Dec 7:** Decision Memory System + Model Fallback - Full decision memory (types, service, API, UI), Gemini quota fallback

</details>

---

## 🎯 IMMEDIATE PRIORITIES

### 1. ✅ Decision Memory System - COMPLETE
- ✅ SQL script run in Supabase - table created
- ✅ SaveDecisionButton integrated into /agents page
- ✅ Browser tested: Save button visible after debate
- ⚠️ Note: Requires `.env.local` with Supabase credentials for local testing
- **Next**: Test with logged-in user to verify full save flow

### 2. ⏳ ALIVE AGENT Enhancements
- Add JSDoc generation task category
- Add test file generation task category
- Improve task discovery with priority scoring
- Add Slack/Discord webhook notifications

### 2. ⏳ Trading Modes Consolidation
**Goal:** Merge Individual LLMs mode INTO Consensus Trade mode
- Individual responses already shown inside Consensus (lines 731-740 of consensus-mode.tsx)
- Remove redundant Individual mode tab
- Update mode selector from 3 to 2 modes

### 3. ⏳ MVP Feedback Collection
**Based on MVP.md analysis:**
- Simple helpful/not helpful rating after results
- Optional comment box for user feedback
- Email signup for product updates
- Monitor usage patterns for 1-2 weeks

---

## 🔧 Current Agent Configuration (Working - DO NOT CHANGE):
- **Analyst:** llama-3.1-8b-instant (Groq)
- **Critic:** gemini-1.5-flash-8b (Google)
- **Synthesizer:** llama-3.3-70b-versatile (Groq with auto-fallback)

---

## 🚀 AI TOOL USE - REAL-TIME MARKET RESEARCH

**Status:** ✅ WORKING (November 19, 2025)

### 8 Trading Tools:
1. `get_stock_quote` - Real-time price, bid/ask, volume
2. `get_price_bars` - Historical candlestick data
3. `get_stock_news` - Latest news articles
4. `calculate_rsi` - RSI indicator (14-period)
5. `calculate_macd` - MACD indicator
6. `get_volume_profile` - Trading volume analysis
7. `get_support_resistance` - Key price levels
8. `check_earnings_date` - Upcoming earnings

### Working Models:
- ✅ Claude 3.5 Haiku, GPT-4o, Gemini 2.5 Pro/Flash, Grok 4 Fast
- ⚠️ Llama 3.3 70B: Works as judge, hits rate limits as decision model

### Pending:
- ⏳ Debate Mode tool integration
- ⏳ UI research activity display

---

## 🟡 MEDIUM PRIORITY

### Chain-of-Debate Enhancement
- Phase 1: Display disagreement reasoning ⏳
- Phase 2: Track WHY models disagree ⏳
- Phase 3: Adaptive rounds based on complexity ⏳
- Phase 4: Smart synthesis strategies ⏳
- Phase 5: Benchmark suite + statistical validation ⏳

---

## 🟢 LOW PRIORITY - FUTURE

### Performance Optimization
- Measure actual token usage per query type
- Calculate real costs for each mode
- Create cost/performance matrix

### Keyboard Shortcuts
- Ctrl+Enter submit, Escape clear, Tab navigation

### Response Caching
- localStorage-based with optional Redis
- Cache search results for 1 hour

### Analytics Dashboard
- Query tracking per user
- Cost per user analysis
- Model accuracy scoring

---

## 💤 BACKLOG - LONG-TERM ROADMAP

### Q4 2025
- [x] Multi-model consensus engine ✅
- [x] Agent debate system ✅
- [x] Real-time streaming ✅
- [ ] Memory system integration (ON HOLD)

### Q1 2026
- [ ] REST API v1
- [ ] Enterprise authentication
- [ ] Value-based pricing

### Q2 2026
- [ ] On-premise deployment
- [ ] Custom model integration
- [ ] Advanced analytics

---

## 📊 SYSTEM STATUS

**TypeScript:** ✅ 0 errors (`npx tsc --noEmit` clean)
**Branch:** main
**Last Session:** February 6, 2026 - Comprehensive Improvement Plan (Phases 1-7) + Component Refactoring (consensus, screening, debate)

---

## 📝 PROJECT MANAGEMENT NOTES

**Task Status Markers**:
- ⏳ Pending (not started)
- 🔄 In Progress (actively working)
- ✅ Complete (finished and tested)
- ❌ Blocked (waiting on dependency)
- 💤 Backlog (future consideration)

**How to Use**: Update status markers as work progresses. Move completed items to PRIORITIES_ARCHIVE.md periodically.
