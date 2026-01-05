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

**Current Session:** 🔨 **WINNERS STRATEGY IMPLEMENTATION** (January 5, 2026 - Afternoon)
**Goal:** Implement Winners Strategy scoring + filters from AI research synthesis

**📋 PLAN FILE:** `~/.claude/plans/glistening-bubbling-blanket.md`
**RESEARCH SOURCE:** `docs/trading/Winners_Strategy/` (4 research docs from Claude/Gemini/GPT/Grok)

**✅ COMPLETED - Phase 1 (Stock Deep-Dive):**
- ✅ **Expandable Stock Rows:** Click any stock to expand with detail view
- ✅ **TradingView Chart:** Embed professional charts in expanded view
- ✅ **Better Metrics Display:** Momentum + Squeeze sections
- ✅ **Action Buttons:** "🤖 AI Analysis" and "⭐ Watchlist" buttons

**✅ COMPLETED - Phase 2 (AI Analysis):**
- ✅ **Analyze API Route:** `/api/trading/screening/analyze` with Gemini CLI (subscription)
- ✅ **Winners Strategy Scoring Engine:** `lib/trading/screening/winners-scoring.ts` (534 lines)
  - TWO PLAYBOOKS: Momentum Score vs Squeeze Score (GPT research insight)
  - 10-point max score with research-based thresholds
  - Handles missing data gracefully (Float, Borrow Fee etc.)
- ✅ **AI Prompt Integration:** LLM receives Winners Strategy score breakdown
- ✅ **UI Score Display:** Winners Strategy Score section in expanded stock view

**✅ COMPLETED - Phase 2.5 (Supernova Filters):**
- ✅ **Gap Direction Filter:** UP/DOWN/BOTH toggle (default: UP for momentum)
- ✅ **Minimum Gap Filter:** Enforced at API level (default: 10%)
- ✅ **Volume Display Fix:** Removed $ prefix (was showing "$443M" instead of "443M")
- ✅ **Updated Presets:** Low-Float Runners, Extreme Movers, Wide Net

**✅ COMPLETED - Phase 2.6 (UI Placeholders for Phase 3 Data):**
- ✅ **Momentum Section Placeholders:** Relative Volume, Avg Volume (20d) with info tooltips
- ✅ **Squeeze Section Placeholders:** Float, Borrow Fee %, Days to Cover, Short Interest % with info tooltips
- ✅ **Winners Strategy Badges:** Added to both Momentum and Squeeze sections
- ✅ **Phase 3 Info Banner:** Explains TWS API integration roadmap
- ✅ **All placeholders show:** 📡 Phase 3 indicator for clear data source tracking

**🔜 PHASE 3 (Pending - TWS Data Integration):**
- 🔴 Add float, short interest, borrow fee to TWS scanner API
- 🔴 Phase 3 data will populate Winners Strategy squeeze scores
- 🔴 Track analysis history in Supabase
- 🔴 Data needed: Float shares, Borrow fee rate, Short ratio, Average volume (20d)

**📁 FILES TO MODIFY:**
- `components/trading/PreMarketScreening.tsx` - Main changes (expandable rows, chart, metrics)

---

**Previous Session:** ✅ **SCREENING ENHANCEMENTS COMPLETE** (January 5, 2026 - Morning)
**Goal:** Add TWS restart detection, sorting mechanism, and data caching to Pre-Market Screening

**✅ COMPLETED - Session Enhancements:**
- ✅ **TWS Restart Detection:** 10-second timeout per stock (was 60s), warning banner when all requests fail
- ✅ **Sorting Mechanism:** 5 sort options (Top Gainers, Highest Score, Most Volume, Price, Scanner Rank)
- ✅ **Data Caching - Hybrid Architecture:**
  - localStorage: Instant page refresh persistence
  - Supabase: Historical scan storage (`screening_scans` table)
- ✅ **History Panel:** Modal showing past scans from Supabase
- ✅ **Browser Tested:** Playwright verified localStorage persistence across refreshes

**📁 FILES CREATED:**
- `lib/trading/screening-cache.ts` - Cache service (localStorage + Supabase)
- `scripts/create-screening-scans-table.sql` - Supabase table schema

**📁 FILES MODIFIED:**
- `lib/trading/screening/tws_scanner_sync.py` - Added 10s timeout, TWS restart detection
- `api/routes/screening_v2.py` - Added warning field to ScanJob model
- `components/trading/PreMarketScreening.tsx` - Sorting, caching, history panel

---

**Previous Session:** ✅ **DATABASE-BACKED SCREENING ARCHITECTURE COMPLETE** (January 3, 2026)
**Goal:** Implement Gemini AI's recommended database-backed architecture for TWS API pre-market screening

**✅ COMPLETED - Phases 1-8 (TWS API Integration):**
- ✅ Phase 1: TWS Scanner client (find pre-market gappers)
- ✅ Phase 2: TWS Fundamentals client (P/E, EPS, Market Cap)
- ✅ Phase 3: TWS Short Data client (shortable shares, borrow fee)
- ✅ Phase 4: TWS Ratios client (60+ fundamental ratios)
- ✅ Phase 5: TWS Bars client (pre-market gaps, volume)
- ✅ Phase 6: FastAPI REST bridge (database-backed, no ib_insync!)
- ✅ Phase 7: Screening Orchestrator (6 data sources combined)
- ✅ Phase 8: Finnhub Sentiment client (Reddit, Twitter)

**✅ ARCHITECTURE DECISION (Gemini AI Consultation):**
- ❌ **REJECTED:** Direct FastAPI + ib_insync integration (event loop conflicts)
- ✅ **ACCEPTED:** Database-backed architecture (Gemini's Option C)
  - Orchestrator runs on schedule (cron/GitHub Actions)
  - Writes results to Supabase database
  - FastAPI reads from database only (no ib_insync code!)
  - Benefits: No event loop conflicts, <100ms responses, unlimited concurrent users

**✅ IMPLEMENTATION COMPLETE:**
- ✅ Supabase table schema (`screening_results`)
- ✅ Orchestrator modified to write to database
- ✅ FastAPI simplified to database-only reads
- ✅ Cron scheduler script created
- ✅ GitHub Actions workflow (reference only - TWS limitation)
- ✅ Complete documentation (600+ lines)
- ✅ Test scripts created
- ✅ All tests passed (6/6 - 100%)

**✅ TEST RESULTS:**
- Database Write: ✅ PASS (~200ms)
- Database Read: ✅ PASS (~50ms)
- FastAPI `/health`: ✅ PASS (<50ms)
- FastAPI `/latest`: ✅ PASS (<100ms)
- FastAPI `/history`: ✅ PASS (<100ms)
- **Performance:** 200-300x faster than attempted synchronous approach!

**📁 FILES CREATED:**
- `scripts/create-screening-results-table.sql` - Database schema
- `scripts/test-database-flow.py` - End-to-end test script
- `scripts/run-screening-cron.sh` - Cron scheduler
- `docs/trading/DATABASE_BACKED_ARCHITECTURE.md` - Complete architecture (600+ lines)
- `TESTING_SUMMARY.md` - User testing guide
- `TEST_RESULTS.md` - Comprehensive test results

**📁 FILES MODIFIED:**
- `lib/trading/screening/screening_orchestrator.py` - Added database writes
- `api/routes/screening.py` - Simplified to database-only reads
- `api/models/screening.py` - Made fields optional for flexibility
- `components/ui/header.tsx` - Added Screening navigation links (desktop + mobile)

**✅ PHASE 9 COMPLETE - Next.js Frontend Integration:**
- ✅ Created `components/trading/PreMarketScreening.tsx` (375 lines)
  - Auto-refresh every 5 minutes
  - Manual refresh button
  - Stats summary dashboard (total scanned, opportunities, execution time, avg score)
  - Detailed stock cards with all data fields
  - Score color-coding (green ≥80, yellow ≥60, red <60)
  - Loading states and error handling
  - Dark mode compatible
- ✅ Created `app/trading/screening/page.tsx` - Next.js page wrapper
- ✅ Added navigation links to header (desktop + mobile)
- ✅ Updated `.env.local.example` with `NEXT_PUBLIC_FASTAPI_URL`
- ✅ Created `docs/trading/SCREENING_INTEGRATION.md` - Complete integration guide
- ✅ TypeScript: 0 errors

**✅ HELPER SCRIPTS CREATED:**
- ✅ `scripts/start-screening-system.sh` - One-command launch (FastAPI + Next.js + orchestrator)
- ✅ `scripts/stop-screening-system.sh` - One-command shutdown (all services)
- ✅ `PHASE_10_TESTING_GUIDE.md` - Comprehensive user testing guide (300+ lines)

**✅ ENRICHMENT FIX COMPLETE (January 4, 2026):**
- ✅ Gap % now shows REAL last trading day change (was 0% before)
- ✅ Prices show actual values (not same value when market closed)
- ✅ Volume shows real trading activity (78M - 443M)
- ✅ Scores calculated from real data (avg 72.8, up from 21)
- ✅ Uses TWS `reqHistoricalData()` for 3-day daily bars
- ✅ ALL DATA FROM TWS ONLY - no external APIs!
- ✅ Top gainers identified: LVRO +144%, BNAI +62%, DVLT +55%

**⏳ PENDING (User Testing - Phase 10):**
- Test orchestrator with real TWS Desktop (run during pre-market hours 4:00-9:30am ET)
- Test frontend with FastAPI backend (verify data flow end-to-end)
- Set up production cron job (automate pre-market screening)

**🚀 READY FOR TESTING:**
Quick start: `./scripts/start-screening-system.sh`
Testing guide: `PHASE_10_TESTING_GUIDE.md`

**🚀 NEXT:** Phase 10 - Production Testing & Deployment (USER-DRIVEN)

---

**Previous Session:** ✅ **WORKING CHECKPOINT** - Judge + Cache + Alpaca + IBKR Fixes (December 17, 2025)
**Goal:** Fix judge "empty response" error + research cache + Alpaca 403 subscription error + IBKR session competition

**Progress:**
- ✅ **CRITICAL FIX #1:** Judge was hardcoded to API provider, ignored Sub Pro/Max tier
- ✅ Root cause: `const judgeProvider = PROVIDERS.anthropic` (always API, never CLI)
- ✅ Fixed: Judge now uses `getProviderForModelAndTier()` like decision models
- ✅ Sub Pro/Max: Uses ClaudeCLIProvider (subscription)
- ✅ Pro/Max: Uses AnthropicProvider (API)
- ✅ Added error classification to judge (matches decision model pattern)
- ✅ Sub mode bug detection: Alerts if BUDGET_LIMIT appears (should NEVER happen)
- ✅ Created ERROR_TAXONOMY.md (838 lines, 15 error categories)
- ✅ Documented all failure modes: rate limit, budget, auth, CLI, tools, JSON, etc.
- ✅ **CRITICAL FIX #2:** Research cache was using wrong cache key format
- ✅ Root cause: Code used `"${symbol}-${tier}"` but database schema expects separate columns
- ✅ Fixed: Changed from `researchCache.get('AAPL-sub-pro', 'day')` to `researchCache.get('AAPL', 'day')`
- ✅ Result: Cache will now match database rows correctly (symbol + timeframe)
- ✅ **CRITICAL FIX #3:** Alpaca tools failing with "403: subscription does not permit querying recent SIP data"
- ✅ Root cause: Free Alpaca tier doesn't include real-time SIP data (requires $9-90/mo subscription)
- ✅ Fixed: Added `feed: 'iex'` to use free IEX data (15-min delayed, sufficient for research)
- ✅ Result: All 10 trading tools now work without Alpaca subscription
- ✅ **CRITICAL FIX #4:** IBKR session competition - phone kept getting disconnected
- ✅ Root cause: UI polled IBKR status every 10 seconds, called ssodh/init with `compete: true`
- ✅ Fixed: Changed polling interval from 10 seconds to 10 minutes (600000ms)
- ✅ Result: Website checks status much less frequently, stops competing with phone session

**The Bug:**
```typescript
// ❌ BEFORE: Judge ignored tier
const judgeProvider = PROVIDERS.anthropic; // Always API

// ✅ AFTER: Judge respects tier
const { provider: judgeProvider } = getProviderForModelAndTier('anthropic', researchTier);
```

**Why It Failed:**
1. User selected Sub Pro mode (subscription, uses CLI not API)
2. Decision models correctly used ClaudeCLIProvider
3. Judge was hardcoded to AnthropicProvider (API)
4. No ANTHROPIC_API_KEY in Sub mode
5. Result: "Unable to analyze - empty response"

**The Cache Bug:**
```typescript
// ❌ BEFORE: Compound cache key doesn't match database schema
const cacheSymbol = `${symbol}-${researchTier}`; // "AAPL-sub-pro"
await researchCache.get(cacheSymbol, timeframe);
// Looks for: symbol='AAPL-SUB-PRO', timeframe='day' → NEVER MATCHES

// ✅ AFTER: Separate symbol and timeframe
await researchCache.get(symbol, timeframe);
// Looks for: symbol='AAPL', timeframe='day' → CORRECT
```

**The Alpaca Bug:**
```typescript
// ❌ BEFORE: Default SIP feed requires subscription
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true,
});
// Result: 403 subscription does not permit querying recent SIP data

// ✅ AFTER: Use free IEX feed (15-min delayed)
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  paper: true,
  feed: 'iex', // FREE data feed
});
```

**Files Modified:**
- `app/api/trading/consensus/stream/route.ts` - Judge provider + error classification + cache key fix
- `lib/alpaca/market-data-tools.ts` - Added IEX feed for free data access
- `components/trading/broker-status-badge.tsx` - Reduced IBKR polling from 10s to 10min
- `docs/guides/ERROR_TAXONOMY.md` - NEW: 15 error categories with detection/fix guides
- `DOCUMENTATION_MAP.md` - Added ERROR_TAXONOMY.md reference

**Commits:**
- `b894837` - fix(judge): Add error handling for judge model failures
- `b85e3dd` - fix(judge): Use tier-aware provider selection + error classification
- `91a37f9` - docs: Add comprehensive ERROR_TAXONOMY.md (15 error types)
- `4ffbfeb` - fix(cache): Remove tier from cache key to match database schema
- `be8c67d` - fix(alpaca): Use IEX feed for free market data access

**Previous Session:** ✅ Arena Real-Time Prices + CLI Provider Fixes (December 15, 2025)
**Goal:** Fix Arena price guessing bug, verify CLI subscription mode, end-to-end test

**Progress:**
- ✅ Fixed Arena price bug - models now use real-time Alpaca prices
- ✅ Added `fetchCurrentPrices()` to get 31 stock prices from Alpaca API
- ✅ CLI providers properly remove API keys from env (subscription mode)
- ✅ TLS warning filter (Node.js warnings not treated as errors)
- ✅ ProviderBadge shows 🔑 CLI / 🌐 API on all Arena results
- ✅ End-to-end test with Groq FREE model (llama-3.3-70b-versatile)
- ✅ Test result: AAPL entry $274.67 vs current $274.71 (< 0.02% error!)
- ✅ No mock data, no fake fallbacks - production ready

**Before vs After:**
| Model | Before (Training Data) | After (Real-Time) |
|-------|------------------------|-------------------|
| GPT-5 Codex | NVDA @ $890 ❌ | NVDA @ ~$177 ✅ |
| Gemini 2.5 Pro | NVDA @ $150 ❌ | NVDA @ ~$177 ✅ |

**Commits:**
- `86ae662` - feat: Arena real-time prices + end-to-end validation

**Previous Session:** ✅ Comprehensive Website Testing & Bug Fixes (December 15, 2025)
**Goal:** Test all modes of website in Free tier, fix issues found

**Issues Summary:**
| # | Issue | Status |
|---|-------|--------|
| 1 | Model not found warnings | ✅ Fixed |
| 2 | Trading Debate IBKR error | 🔍 Open |
| 3 | Portfolio loading (IBKR offline) | ✅ Expected |
| 4 | Auth page branding | ✅ Fixed |
| 5 | Admin page loading | ✅ Requires auth |
| 6 | Judge web search | ✅ Non-blocking |

**Previous Session:** ✅ Model Health Check System & Production Fixes (December 14, 2025)
- Added Model Health Check ping test (ultra-cheap ~$0.0001/model)
- Fixed broken model IDs (GPT-5.1 Codex Mini, Claude 4.5 Opus)
- ModelTester hidden on production
- Test Results: 32/37 models passed (86%)

**Files Modified:**
```
app/api/trading/test-model/route.ts     # ADDED: Ping test, fixed maxTokens
components/trading/model-tester.tsx     # ADDED: Ping/JSON/Tools buttons
components/trading/research-model-selector.tsx # REMOVED: Gemini option
lib/models/model-registry.ts            # FIXED: Model IDs, added status types
lib/utils/environment.ts                # ADDED: hostname-based production check
app/trading/page.tsx                    # FIXED: Use checkIsProduction() for client-side
docs/reports/MODEL_STATUS_REPORT.md     # ADDED: Full test results report
```

**Commits:**
- `d38305c` - feat: Add Model Health Check system with ping test
- `ba17f7a` - fix: Remove broken models from selectable list, add new status types
- `5dfad95` - fix: Only hide dev tools on Vercel production, not preview
- `2949884` - fix: Use hostname-based production detection for reliable client-side check

**Previous Session:** Model Fallback Hardening (December 14, 2025)
- ✅ Added Claude 4.5 Opus, Gemini 3 Pro Image
- ✅ Rewrote agent-selector.tsx to use MODEL_REGISTRY
- ✅ Power/cost badges in all model selectors

**Earlier Session:** Multi-Broker Support & IBKR Auth (December 9, 2025)
- ✅ Created broker selector dropdown + IBKR auth dialog (Features #39-40)

**Earlier Session:** Model Fallback System (December 7, 2025)
- ✅ Created `lib/models/model-fallback.ts` - Comprehensive fallback service
- ✅ Browser tested: Google Gemini hit quota → fell back to Groq → debate completed

**Earlier Session:** Decision Memory System (December 7, 2025)
- ✅ Built complete Decision Memory System (types, service, API, UI, page)
- ✅ SQL script run in Supabase - `decisions` table created
- **See Full Handoff:** `docs/history/SESSION_DECISION_MEMORY_DEC7.md`

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

**TypeScript:** ✅ 0 errors
**Branch:** claude-autonomous
**Last Commit:** 0ecf9ab [alive-agent] type-safety: lib/brokers/ibkr-broker.ts

---

## 📝 PROJECT MANAGEMENT NOTES

**Task Status Markers**:
- ⏳ Pending (not started)
- 🔄 In Progress (actively working)
- ✅ Complete (finished and tested)
- ❌ Blocked (waiting on dependency)
- 💤 Backlog (future consideration)

**How to Use**: Update status markers as work progresses. Move completed items to PRIORITIES_ARCHIVE.md periodically.
