# Verdict AI Features Documentation - Index

**PURPOSE**: Quick reference index to all protected features. Full details in split files.

## 📁 Feature Files (Split for Better Readability)

| File | Features | Description |
|------|----------|-------------|
| **[CORE_DEBATE.md](../features/CORE_DEBATE.md)** | 1-18 | Debate system, UI, memory, branding |
| **[TRADING_SYSTEM.md](../features/TRADING_SYSTEM.md)** | 19-54 | Ultra mode, paper trading, providers |
| **[ARENA_MODE.md](../features/ARENA_MODE.md)** | 55-56 | AI trading competition mode |

**IMPORTANT**: When checking protected features, read the appropriate split file above!

---

## 🔒 Quick Feature Reference

### Core Debate (Features 1-18) → [Full Details](../features/CORE_DEBATE.md)

| # | Feature | Status | Key Files |
|---|---------|--------|-----------|
| 1 | Multi-Round Agent Debate | ✅ ACTIVE | `lib/agents/agent-system.ts` |
| 2 | Individual Round Tabs | ✅ ACTIVE | `components/agents/debate-display.tsx` |
| 3 | Agent Personas & Order | ✅ ACTIVE | `lib/agents/types.ts` |
| 4 | Round Selection Controls | ✅ ACTIVE | `/agents` page |
| 5 | Dynamic Round Addition | ✅ ACTIVE | `debate-display.tsx` |
| 6 | Smart Text Truncation | ✅ ACTIVE | `debate-display.tsx` |
| 7 | Full Response Scrolling | ✅ ACTIVE | `debate-display.tsx` |
| 8 | Memory System Foundation | 🔧 READY | `lib/memory/` |
| 9 | Heterogeneous Model Mixing | ✅ ACTIVE | `lib/heterogeneous-mixing/` |
| 10 | Centralized Branding | ✅ ACTIVE | `lib/config/branding.ts` |
| 11 | Pro Mode Testing Unlock | 🧪 DEV ONLY | `app/app/page.tsx` |
| 12 | Evaluation Data Collection | ✅ ACTIVE | Database + API |
| 13 | Feedback Collection | ✅ ACTIVE | `components/consensus/feedback-form.tsx` |
| 14 | AI Question Generator | ✅ ACTIVE | `lib/question-generator/` |
| 15 | Debate Conversation Saving | ✅ ACTIVE | `debate-interface.tsx` |
| 16 | Interactive Follow-ups | ✅ ACTIVE | `synthesis-tab.tsx` |
| 17 | Generate Question Button | ✅ ACTIVE | `debate-interface.tsx` |
| 18 | Admin Dashboard Format | ✅ ACTIVE | `app/admin/page.tsx` |

### Trading System (Features 19-54) → [Full Details](../features/TRADING_SYSTEM.md)

| # | Feature | Status | Key Files |
|---|---------|--------|-----------|
| 19 | Ultra Mode | ✅ ACTIVE | `/app/ultra/page.tsx` |
| 19a | Global Tier Selector | ✅ ACTIVE | `lib/config/model-presets.ts` |
| 20 | AI Tool Use Research | ✅ ACTIVE | `lib/trading/research-agents.ts` |
| 21 | Data Provider Architecture | ✅ ACTIVE | `lib/trading/data-providers/` |
| 22 | Research Caching | ✅ ACTIVE | `lib/trading/research-cache.ts` |
| 32 | Model Testing System | ✅ ACTIVE | `lib/models/model-registry.ts` |
| 33 | Debate Progress Flowchart | ✅ ACTIVE | `components/debate/` |
| 34 | Pre-Debate Questions | ✅ ACTIVE | `/api/agents/clarify/` |
| 35 | Centralized Model Registry | ✅ ACTIVE | `lib/models/model-registry.ts` |
| 36 | Native Web Search | ✅ ACTIVE | `lib/agents/tools.ts` |
| 37 | Pre-Research Stage | ✅ ACTIVE | `debate-stream/route.ts` |
| 38 | Model Fallback System | ✅ ACTIVE | `debate-stream/route.ts` |
| 39 | Multi-Broker Support | ✅ ACTIVE | `lib/brokers/` |
| 40 | Model Power/Cost Display | ✅ ACTIVE | `model-registry.ts` |
| 41 | Model Metadata Complete | ✅ ACTIVE | `model-registry.ts` |
| 42 | Model Registry Consistency | ✅ ACTIVE | `model-registry.ts` |
| 43 | Trading Data Taxonomy | ✅ ACTIVE | `lib/trading/taxonomy.ts` |
| 44 | Scoring Engine | ✅ ACTIVE | `lib/trading/scoring-engine.ts` |
| 45 | Kelly Criterion & Risk | ✅ ACTIVE | `lib/trading/math-methods.ts` |
| 46 | Research Progress UI | ✅ ACTIVE | `research-progress-panel.tsx` |
| 47 | LLM Seed Parameter | ✅ ACTIVE | Provider implementations |
| 48 | Trading Audit Trail | ✅ ACTIVE | `lib/trading/audit-logger.ts` |
| 49 | Portfolio Auto-Refresh | ✅ ACTIVE | `portfolio-display.tsx` |
| 50 | Model Health Check | ✅ ACTIVE | `model-health-banner.tsx` |
| 51 | SSE Streaming Progress | ✅ ACTIVE | `consensus/stream/route.ts` |
| 52 | CLI Subscription Providers | ✅ ACTIVE | `lib/ai-providers/cli/` |
| 53 | SEC EDGAR Integration | ✅ ACTIVE | `lib/trading/sec-edgar.ts` |
| 54 | Research Findings Pipeline | ✅ ACTIVE | `consensus/stream/route.ts` |

### Arena Mode (Features 55-56) → [Full Details](../features/ARENA_MODE.md)

| # | Feature | Status | Key Files |
|---|---------|--------|-----------|
| 55 | Arena Mode Competition | ✅ ACTIVE | `app/arena/page.tsx` |
| 56 | Arena Progress UI (SSE) | ✅ ACTIVE | `arena/execute/stream/route.ts` |

---

## 🛡️ PROTECTION RULE

**Always check the relevant feature file before making changes:**
1. Debate/UI changes → Read `docs/features/CORE_DEBATE.md`
2. Trading changes → Read `docs/features/TRADING_SYSTEM.md`
3. Arena changes → Read `docs/features/ARENA_MODE.md`

**Ask user before modifying any protected feature.**

---

## 📝 Adding New Features

When adding a new feature:
1. Add to the appropriate split file (CORE_DEBATE, TRADING_SYSTEM, or ARENA_MODE)
2. Update the quick reference table in this index
3. Follow the existing format with Status, Location, Purpose, DO NOT rules

---

*Last Updated: December 15, 2025*
*Split for better readability - each file is now under 500 lines*
