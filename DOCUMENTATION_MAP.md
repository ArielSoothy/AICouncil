# 📚 DOCUMENTATION MAP - AI Council Project

**Complete reference of all documentation files and their organized structure**
**Last Updated**: February 6, 2026

---

## 🎯 MANDATORY SESSION START (Read These Every Time)

These files MUST be read at the start of every development session:

| File | Purpose | Priority |
|------|---------|----------|
| **CLAUDE.md** | Master index & session context | 🔴 CRITICAL |
| **DOCUMENTATION_MAP.md** | This file - find all docs | 🔴 CRITICAL |
| **docs/workflow/WORKFLOW.md** | Step-by-step development method | 🔴 CRITICAL |
| **docs/workflow/PRIORITIES.md** | Current TODO list & progress tracking | 🔴 CRITICAL |
| **docs/workflow/FEATURES.md** | Protected features (prevent breakage) | 🟠 HIGH |
| **docs/architecture/PROJECT_OVERVIEW.md** | System architecture & vision | 🟡 MEDIUM |

**Reading Order**: `CLAUDE.md → DOCUMENTATION_MAP.md → docs/workflow/WORKFLOW.md → docs/workflow/PRIORITIES.md → docs/workflow/FEATURES.md`

---

## 📁 DOCUMENTATION FOLDER STRUCTURE

```
/
├── README.md                           # Project introduction (GitHub standard)
├── CLAUDE.md                           # Master index & session context
├── DOCUMENTATION_MAP.md                # This file - complete doc reference
│
├── docs/
│   ├── workflow/                       # Daily workflow & task management
│   │   ├── WORKFLOW.md                 # Step-by-step development process
│   │   ├── PRIORITIES.md               # Current TODO list & progress
│   │   └── FEATURES.md                 # Protected features list
│   │
│   ├── architecture/                   # System design & configuration
│   │   ├── PROJECT_OVERVIEW.md         # Complete system architecture
│   │   ├── PROJECT_STRUCTURE.md        # Codebase structure & navigation
│   │   ├── SUPABASE_SETUP.md           # Database setup & schemas
│   │   ├── AI_MODELS_SETUP.md          # AI provider configuration
│   │   ├── UNIFIED_DEBATE_ENGINE.md    # Core debate architecture (MADR-inspired) (NEW)
│   │   └── RESEARCH_DRIVEN_DEBATE.md   # Research-first debate implementation
│   │
│   ├── trading/                        # Trading system documentation (CONSOLIDATED)
│   │   ├── README.md                   # Trading docs index & quick reference
│   │   ├── TRADING_DATA_SOURCES.md     # All data sources (Yahoo, SEC, Alpaca, IBKR)
│   │   ├── TRADING_SYSTEM.md           # Protected features #19-54
│   │   ├── TRADING_ENHANCEMENTS.md     # Phase 2 implementation details
│   │   ├── TRADING_DECISION_PROCESS.md # How AI models make trading decisions
│   │   ├── TRADING_DATA_TAXONOMY.md    # Data classification & categories
│   │   ├── TRADING_TOOL_USE_STRATEGY.md # Tool calling patterns
│   │   ├── RESEARCH_CACHE_TESTING.md   # Cache system testing guide
│   │   ├── SCREENING_INTEGRATION.md    # Full screening integration guide (Phase 9)
│   │   ├── DATABASE_BACKED_ARCHITECTURE.md # Why dual-server (event loop fix)
│   │   ├── TWS_API_MIGRATION_PLAN.md   # 10-phase TWS migration (Phases 1-10 complete)
│   │   ├── PRE_MARKET_SCREENING_IMPLEMENTATION_STATUS.md # Phase status + timeline
│   │   ├── IBKR_DATA_AVAILABILITY.md   # What data IBKR TWS provides
│   │   └── MIGRATION_YAHOO_FINANCE.md  # Historical: Yahoo Finance migration
│   │
│   ├── features/                       # Feature-specific documentation
│   │   ├── GLOBAL_TIER_SELECTOR.md     # App-wide Free/Pro/Max tier system
│   │   ├── CORE_DEBATE.md              # Protected features #1-18
│   │   ├── ARENA_MODE.md               # Protected features #55-56
│   │   ├── ULTRA_MODE_REDESIGN_PLAN.md # Ultra Mode architecture
│   │   ├── PRO_MODE_FIX_ANALYSIS.md    # Pro Mode auth fix analysis
│   │   ├── MEMORY_IMPLEMENTATION_PLAN.md # Memory system plan
│   │   └── FUTURE_PROJECT_MEMORYCODE.md # Future project ideas
│   │
│   ├── planning/                       # Roadmaps & project phases
│   │   ├── MVP.md                      # MVP strategy & core features
│   │   ├── PHASE_2_PLAN.md             # Phase 2 feature planning
│   │   └── PHASE_3_PROGRESS.md         # Phase 3 progress tracking
│   │
│   ├── guides/                         # Best practices & development guides
│   │   ├── BEST_PRACTICES.md           # Debugging patterns & successful methods
│   │   ├── SUB_AGENTS.md               # Sub-agent specifications & orchestration
│   │   ├── MULTI_MODEL_ORCHESTRATION.md # Multi-model orchestration (Claude+Gemini+Codex) (NEW)
│   │   ├── ERROR_TAXONOMY.md           # Complete LLM error types & handling
│   │   ├── MANUAL_STEPS.md             # Manual steps for deployment
│   │   ├── RESEARCH_CACHE_TESTING.md   # Research caching system testing guide
│   │   ├── IBKR_AUTH_TROUBLESHOOTING.md # IBKR Gateway auth flow & troubleshooting
│   │   └── evals.md                    # Evaluation metrics & testing
│   │
│   ├── history/                        # Session logs & work summaries
│   │   └── (Session summaries, work logs, cleanup docs)
│   │
│   └── archived/                       # Legacy documentation
│       └── README.md                   # Archive index
│
├── _archive/                           # Historical documentation
│   ├── DEBATE_RESEARCH.md
│   ├── DEFAULT_MODEL_OPTIMIZATION.md
│   ├── ENHANCED_JUDGE_SYSTEM.md
│   ├── FREE_WEB_SEARCH.md
│   ├── MARKET_RESEARCH.md
│   ├── PROJECT_NOTES.md
│   ├── setup-database.md
│   ├── STRUCTURED_PROMPTS.md
│   └── TOKEN_OPTIMIZATION.md
│
├── .claude/agents/                     # Sub-agent specifications (12 agents)
│   ├── orchestration-master.md
│   ├── architecture-planner.md
│   ├── surgical-implementer.md
│   ├── testing-validation-checker.md
│   ├── codebase-research-analyst.md
│   ├── code-search-analyzer.md
│   ├── dependency-analyzer.md
│   ├── debug-analyzer.md
│   ├── ui-ux-consistency-checker.md
│   ├── performance-optimizer.md
│   ├── product-guardian.md
│   └── documentation-sync.md
│
├── .github/
│   └── copilot-instructions.md         # GitHub Copilot configuration
│
└── tests/
    └── README.md                       # Test suite documentation
```

---

## 🔥 CRITICAL FILES (Root Level Only)

**Keep in root for immediate access:**

| File | Purpose | Why Root Level |
|------|---------|----------------|
| **README.md** | Project introduction, quick start | GitHub standard, first file visitors see |
| **CLAUDE.md** | Master index, session context | Must be easily findable every session |
| **DOCUMENTATION_MAP.md** | Complete documentation reference | Navigation hub for all other docs |
| **RESEARCH_CACHE_IMPLEMENTATION_SUMMARY.md** | Research caching complete summary (NEW) | Quick reference for Phase 2C implementation |

**NEVER move these files** - they are entry points for all documentation.

---

## 📂 WORKFLOW DOCUMENTATION (docs/workflow/)

Daily workflow, task management, and protected features:

| File | Purpose | When to Read |
|------|---------|--------------|
| **WORKFLOW.md** | Step-by-step development process | Every session start |
| **PRIORITIES.md** | Current TODO list & progress tracking | Every session start |
| **FEATURES.md** | Protected features INDEX (see split files below) | Before any code changes |

**Path**: `/docs/workflow/`

### 📁 Protected Features (Split Files - December 2025)

Features documentation is split for better readability:

| File | Features | Check Before Modifying |
|------|----------|----------------------|
| **docs/features/CORE_DEBATE.md** | 1-18 | Debate system, UI, memory, agents |
| **docs/trading/TRADING_SYSTEM.md** | 19-54 | Trading, providers, models, research |
| **docs/features/ARENA_MODE.md** | 55-56 | Arena competition mode |

---

## 🏗️ ARCHITECTURE DOCUMENTATION (docs/architecture/)

System design, tech stack, and configuration:

| File | Purpose | When to Read |
|------|---------|--------------|
| **PROJECT_OVERVIEW.md** | Complete system architecture, tech stack, feature map | For context, when planning changes |
| **PROJECT_STRUCTURE.md** | Complete codebase structure, directory tree, navigation guide | When navigating codebase or adding new files |
| **SUPABASE_SETUP.md** | Database setup, schemas, RLS policies | Database changes, auth work |
| **AI_MODELS_SETUP.md** | AI provider configuration (8 providers, 46+ models) | AI integration changes |
| **UNIFIED_DEBATE_ENGINE.md** | 🎯 Core debate architecture (MADR-inspired), research modes | Debate engine work |
| **RESEARCH_DRIVEN_DEBATE.md** | Research-first debate implementation details | Debate debugging |
| **PRE_RESEARCH_ARCHITECTURE.md** | Why models don't research autonomously, pre-research pattern | Debate research issues |

**Path**: `/docs/architecture/`

**Related Code**: `lib/research/research-coordinator.ts` - Modular research decision-making (December 2024)

---

## 📈 TRADING DOCUMENTATION (docs/trading/)

**NEW**: Consolidated trading documentation folder with all trading-related docs:

| File | Purpose | When to Read |
|------|---------|--------------|
| **README.md** | Trading docs index & quick reference | First stop for trading work |
| **TRADING_DATA_SOURCES.md** | All data sources (Yahoo, SEC, Alpaca, IBKR) | Understanding where data comes from |
| **TRADING_SYSTEM.md** | Protected features #19-54 | Before modifying trading code |
| **TRADING_ENHANCEMENTS.md** | Phase 2 implementation details | Adding new features |
| **TRADING_DECISION_PROCESS.md** | How AI models make decisions | Understanding trading logic |
| **TRADING_DATA_TAXONOMY.md** | Data classification & categories | Data modeling work |
| **TRADING_TOOL_USE_STRATEGY.md** | Tool calling patterns | Optimizing research agents |
| **RESEARCH_CACHE_TESTING.md** | Cache system testing guide | Debugging cache issues |
| **SCREENING_INTEGRATION.md** | Full screening integration guide (Phase 9) | Stock scanner work |
| **DATABASE_BACKED_ARCHITECTURE.md** | Why dual-server (event loop fix) | Understanding scanner architecture |
| **TWS_API_MIGRATION_PLAN.md** | 10-phase TWS migration (Phases 1-10 complete) | Scanner history/context |
| **PRE_MARKET_SCREENING_IMPLEMENTATION_STATUS.md** | Phase status + timeline | Checking scanner progress |
| **IBKR_DATA_AVAILABILITY.md** | What data IBKR TWS provides | Understanding data sources |

**Path**: `/docs/trading/`

### Data Sources Summary
- **Yahoo Finance**: Quotes, bars, news, fundamentals (FREE)
- **SEC EDGAR**: 10-K, 10-Q, filings, ratios (FREE)
- **Alpaca**: Broker data, positions, orders (FREE paper trading)
- **IBKR TWS**: Full real-time data, scanner, fundamentals, short data, ratios (requires TWS Desktop on port 7496)

### Stock Screening System (Pre-Market Scanner)
- **Frontend**: `http://localhost:3000/trading/screening` (Next.js)
- **Backend**: `http://localhost:8000` (FastAPI Python — separate server required)
- **Data**: TWS Desktop (port 7496) → Python orchestrator → Supabase → FastAPI → Frontend
- **Start**: `npm run dev` + `uvicorn api.main:app --reload --port 8000`
- **See CLAUDE.md**: Full "Stock Screening System" section with all details

---

## 🚀 FEATURE DOCUMENTATION (docs/features/)

Detailed documentation for non-trading features:

| File | Purpose | When to Read |
|------|---------|--------------|
| **CORE_DEBATE.md** | Protected features #1-18 | Before modifying debate system |
| **ARENA_MODE.md** | Protected features #55-56 | Before modifying arena mode |
| **GLOBAL_TIER_SELECTOR.md** | App-wide Free/Pro/Max tier system | Tier system changes |
| **ULTRA_MODE_REDESIGN_PLAN.md** | Ultra Mode architecture redesign | Ultra Mode changes |
| **PRO_MODE_FIX_ANALYSIS.md** | Pro Mode authentication fix analysis | Pro Mode work |
| **MEMORY_IMPLEMENTATION_PLAN.md** | Memory system implementation plan | Memory feature work |
| **FUTURE_PROJECT_MEMORYCODE.md** | Future project ideas & concepts | Planning future features |

**Path**: `/docs/features/`

---

## 📊 PLANNING DOCUMENTATION (docs/planning/)

Project phases, roadmaps, and MVP strategy:

| File | Purpose | Status |
|------|---------|--------|
| **MVP.md** | MVP strategy, core features, launch plan | Reference |
| **PHASE_2_PLAN.md** | Phase 2 feature planning | Reference |
| **PHASE_3_PROGRESS.md** | Phase 3 progress tracking | Active |

**Path**: `/docs/planning/`

---

## 🛠️ GUIDES & BEST PRACTICES (docs/guides/)

Development guidelines, debugging patterns, and orchestration:

| File | Purpose | When to Read |
|------|---------|--------------|
| **BEST_PRACTICES.md** | Debugging patterns, successful fix methods | When encountering issues |
| **SUB_AGENTS.md** | Sub-agent specifications & orchestration | When using autonomous agents |
| **MULTI_MODEL_ORCHESTRATION.md** | Multi-model orchestration (Claude + Gemini + Codex) for complex tasks | High-stakes decisions, code review, architecture |
| **ERROR_TAXONOMY.md** | Complete LLM error types & handling (15 categories) | Model errors, Sub mode bugs, error handling |
| **MANUAL_STEPS.md** | Manual steps required for deployment | Before deployment |
| **IBKR_AUTH_TROUBLESHOOTING.md** | IBKR Gateway auth flow & troubleshooting | IBKR auth issues |
| **evals.md** | Evaluation metrics and testing guidelines | Quality assurance |

**Path**: `/docs/guides/`

---

## 🔧 SCRIPTS & DATABASE (scripts/)

Database schemas, migration scripts, and automation:

| File | Purpose | When to Use |
|------|---------|------------|
| **create-research-cache-table.sql** | Research caching database schema (NEW) | Setting up Phase 2C caching |
| **test-alpaca.ts** | Alpaca API testing script | Testing trading integration |
| **test-*.ts** | Various test scripts | Testing specific features |

**Path**: `/scripts/`

**IMPORTANT**: SQL scripts must be run in Supabase SQL Editor before using the corresponding features.

---

## 📜 HISTORY & LOGS (docs/history/)

Session summaries, work logs, and completed work documentation:

| File | Purpose | Status |
|------|---------|--------|
| **SESSION_SUMMARY_OCT_24.md** | October 24 session summary | Archive |
| **AUTONOMOUS_WORK_LOG.md** | Log of autonomous work sessions | Active |
| **CLEANUP_SUMMARY.md** | Code cleanup documentation | Reference |
| **debate_research.md** | Debate system research notes | Reference |

**Path**: `/docs/history/`

---

## 🎭 SUB-AGENT SPECIFICATIONS (.claude/agents/)

Specialized autonomous agent definitions (12 agents):

### Orchestration & Planning
- **orchestration-master.md** - Master coordinator for complex multi-step tasks
- **architecture-planner.md** - System design, component structure, implementation roadmaps
- **product-guardian.md** - Strategic oversight, reality checks, scope validation

### Code Analysis & Research
- **codebase-research-analyst.md** - Deep codebase analysis, integration research
- **code-search-analyzer.md** - Pattern searching, dependency tracing
- **dependency-analyzer.md** - Dependency mapping before changes

### Implementation & Changes
- **surgical-implementer.md** - Precise code changes, minimal disruption
- **debug-analyzer.md** - Systematic bug investigation and fixes

### Quality & Validation
- **testing-validation-checker.md** - Feature testing, regression prevention
- **ui-ux-consistency-checker.md** - Design system compliance, responsive design
- **performance-optimizer.md** - Performance analysis and optimization

### Documentation
- **documentation-sync.md** - Documentation updates after work completion

**Path**: `/.claude/agents/`
**When to Use**: Launch orchestration-master for complex multi-file features

---

## 📦 ARCHIVED DOCUMENTATION (_archive/)

Historical documentation and research (reference only):

| File | Purpose | Status |
|------|---------|--------|
| **DEBATE_RESEARCH.md** | Agent debate system research | Archived |
| **DEFAULT_MODEL_OPTIMIZATION.md** | Model selection optimization | Archived |
| **ENHANCED_JUDGE_SYSTEM.md** | Judge system improvements | Archived |
| **FREE_WEB_SEARCH.md** | Web search integration research | Archived |
| **MARKET_RESEARCH.md** | Market analysis research | Archived |
| **PROJECT_NOTES.md** | Old project notes | Archived |
| **setup-database.md** | Old database setup (superseded by SUPABASE_SETUP.md) | Archived |
| **STRUCTURED_PROMPTS.md** | Prompt engineering research | Archived |
| **TOKEN_OPTIMIZATION.md** | Token usage optimization | Archived |

**Path**: `/_archive/`
**Note**: Archive folder contains historical context - read only if needed for specific research.

---

## 🎯 QUICK REFERENCE BY TASK TYPE

### Starting a New Session
1. Read CLAUDE.md
2. Read DOCUMENTATION_MAP.md
3. Read docs/workflow/WORKFLOW.md
4. Read docs/workflow/PRIORITIES.md
5. Read docs/workflow/FEATURES.md
6. Check docs/architecture/PROJECT_OVERVIEW.md for context

### Working on Trading Features
1. Read docs/trading/README.md (trading docs index)
2. Read docs/trading/TRADING_DATA_SOURCES.md (where data comes from)
3. Read docs/trading/TRADING_SYSTEM.md (protected features #19-54)
4. Read docs/trading/TRADING_ENHANCEMENTS.md (Phase 2 details)
5. Read docs/architecture/AI_MODELS_SETUP.md (model configuration)

### Using Sub-Agents
1. Read docs/guides/SUB_AGENTS.md (orchestration overview)
2. Launch orchestration-master for complex tasks
3. Check .claude/agents/ for specific agent specs

### Multi-Model Orchestration (NEW)
1. Read docs/guides/MULTI_MODEL_ORCHESTRATION.md (when to use, templates)
2. Use for: architecture decisions, security reviews, protected features
3. Pattern: Claude + Gemini + Codex consensus

### Debugging Issues
1. Read docs/guides/BEST_PRACTICES.md (successful patterns)
2. Use debug-analyzer agent
3. Check docs/workflow/FEATURES.md (what not to break)

### Deploying Changes
1. Read docs/guides/MANUAL_STEPS.md
2. Check docs/architecture/SUPABASE_SETUP.md (database)
3. Review README.md (deployment process)

### IBKR Authentication Issues
1. Read docs/guides/IBKR_AUTH_TROUBLESHOOTING.md (auth flow explanation)
2. Check Gateway is running: `curl -k https://127.0.0.1:5050/v1/api/iserver/auth/status`
3. Try ssodh/init to complete 2FA handshake
4. Check for competing sessions

### Researching Architecture
1. Read docs/architecture/PROJECT_OVERVIEW.md (system architecture & features)
2. Read docs/architecture/PROJECT_STRUCTURE.md (codebase structure & file organization)
3. Check relevant feature docs in docs/features/
4. Review _archive/ for historical context if needed

---

## 📝 DOCUMENTATION MAINTENANCE PROTOCOL

### When Creating New Documentation Files:

**MANDATORY STEPS - ALWAYS FOLLOW THIS PROCESS:**

1. **Choose the right folder** (consult this map):
   - Daily workflow? → `docs/workflow/`
   - System architecture? → `docs/architecture/`
   - Feature-specific? → `docs/features/`
   - Planning/roadmap? → `docs/planning/`
   - Best practices? → `docs/guides/`
   - Session history? → `docs/history/`
   - Sub-agent spec? → `.claude/agents/`
   - Historical/old? → `_archive/`

2. **Update DOCUMENTATION_MAP.md IMMEDIATELY**:
   - Add entry to appropriate section
   - Update folder structure diagram
   - Add to quick reference if needed

3. **Update CLAUDE.md if mandatory reading**:
   - Add to MANDATORY SESSION START PROTOCOL if needed every session
   - Add to documentation structure table if core workflow

4. **Commit with clear message**:
   ```bash
   git add docs/[folder]/NEW_FILE.md DOCUMENTATION_MAP.md
   git commit -m "docs: Add NEW_FILE.md for [purpose]"
   ```

### When Moving/Reorganizing Documentation:

1. **Use `git mv`** to preserve history
2. **Update all file references** in CLAUDE.md and DOCUMENTATION_MAP.md
3. **Update relative links** in affected documentation files
4. **Test that nothing breaks** (check for broken links)
5. **Commit**: `git commit -m "docs: Reorganize [description]"`

### Documentation File Naming Convention:

- **ALL_CAPS_WITH_UNDERSCORES.md** for important persistent docs
- **lowercase-with-hyphens.md** for temporary/experimental docs
- **Clear descriptive names**: `TRADING_ENHANCEMENTS.md` not `stuff.md`

---

## 🔄 KEEPING THIS MAP UPDATED

**When to update this file**:
- New feature documentation created
- Documentation moved to different folder
- Archive files added/removed
- New sub-agents added
- Major workflow changes
- Folder structure reorganized

**Update pattern**:
```bash
# After creating/moving documentation:
1. Add/update entry in appropriate section
2. Update folder structure diagram
3. Update quick reference if needed
4. Commit with message: "docs: Update DOCUMENTATION_MAP.md"
```

---

## 🔧 SHARED UTILITIES & REFACTORED COMPONENTS (February 2026)

### New Shared Utilities
| File | Purpose | When to Use |
|------|---------|------------|
| **lib/trading/json-extraction.ts** | JSON extraction from LLM responses | Parsing AI model outputs |
| **lib/supabase/admin.ts** | Supabase admin client singleton | Server-side DB operations |

### New UI Components
| File | Purpose |
|------|---------|
| **components/ui/error-boundary.tsx** | React error boundary wrapper |
| **components/ui/page-skeleton.tsx** | Loading skeleton for page layouts |

### Refactored Trading Components (February 2026)
| File | Purpose | Extracted From |
|------|---------|---------------|
| **components/trading/consensus/types.ts** | Shared types for consensus mode | consensus-mode.tsx |
| **components/trading/consensus/use-consensus-analysis.ts** | State management + API logic hook | consensus-mode.tsx |
| **components/trading/consensus/consensus-results.tsx** | Consensus results display + helpers | consensus-mode.tsx |
| **components/trading/consensus/research-panel.tsx** | Research activity, fallbacks, decisions | consensus-mode.tsx |
| **components/trading/consensus/index.ts** | Barrel exports for consensus module | N/A |

### Refactored Screening Components (February 2026)
| File | Purpose | Extracted From |
|------|---------|---------------|
| **components/trading/screening/types.ts** | Shared types for screening system | PreMarketScreening.tsx |
| **components/trading/screening/use-screening-data.ts** | Data fetching, caching, state management hook | PreMarketScreening.tsx |
| **components/trading/screening/scoring-utils.tsx** | Score color/formatting + Winners Strategy display | PreMarketScreening.tsx |
| **components/trading/screening/screening-filters.tsx** | Filter bar, sort, presets UI | PreMarketScreening.tsx |
| **components/trading/screening/screening-stats.tsx** | Stats dashboard summary cards | PreMarketScreening.tsx |
| **components/trading/screening/stock-card.tsx** | Individual stock card + expanded detail view | PreMarketScreening.tsx |
| **components/trading/screening/screening-history.tsx** | Scan history modal | PreMarketScreening.tsx |
| **components/trading/screening/index.ts** | Barrel exports for screening module | N/A |

### Screening-to-Debate Pipeline (February 2026)
| File | Purpose | Used By |
|------|---------|---------|
| **lib/trading/screening-debate/types.ts** | Bridge types (config, results, events) | Pipeline, API routes, UI |
| **lib/trading/screening-debate/prompts.ts** | Screening-enhanced debate prompts with ground truth data | Pipeline |
| **lib/trading/screening-debate/pipeline.ts** | Core orchestrator (research + debate + judge) | API route |
| **lib/trading/screening-debate/trade-executor.ts** | Multi-broker trade execution via BrokerFactory | Pipeline |
| **app/api/trading/screening/debate/route.ts** | SSE streaming endpoint | Frontend hook |
| **app/api/trading/screening/debate/results/route.ts** | Results fetch endpoint | Briefing page |
| **components/trading/screening-debate/use-screening-debate.ts** | React hook for SSE streaming | PreMarketScreening |
| **components/trading/screening-debate/debate-config-modal.tsx** | Configuration modal (topN, models, auto-trade) | PreMarketScreening |
| **components/trading/screening-debate/debate-progress-bar.tsx** | Real-time progress UI | PreMarketScreening |
| **components/trading/briefing/daily-briefing.tsx** | Historical briefing viewer | Briefing page |
| **components/trading/briefing/briefing-stock-card.tsx** | Per-stock debate result card | Daily briefing |
| **app/trading/briefing/page.tsx** | Daily briefing page route | Navigation |
| **scripts/create-screening-debates-table.sql** | Supabase table for debate results | Manual SQL execution |

### Refactored Debate Components (February 2026)
| File | Purpose | Extracted From |
|------|---------|---------------|
| **components/agents/debate-types.ts** | Shared types (WebSearchStatus, ModelStatus, etc.) | debate-interface.tsx |
| **components/agents/debate-presets.tsx** | AGENT_PRESETS tier configuration (free/pro/max/sub) | debate-interface.tsx |
| **components/agents/hooks/use-debate-session.ts** | Session state, config, agents, persistence hook | debate-interface.tsx |
| **components/agents/hooks/use-debate-streaming.ts** | SSE streaming, model statuses, flowchart hook | debate-interface.tsx |

### Deleted Files (February 2026 Cleanup)
- `components/conversations-debug/` - Debug components (removed)
- `app/api/benchmark/` - Benchmark route (removed)
- `lib/trading/screening/screening_simple.py` - Superseded by simple_orchestrator.py
- `scripts/debug-json-parsing.js` - Debug script (removed)

---

## ✅ DOCUMENTATION HEALTH CHECK

Current documentation status:

- ✅ Core workflow files (WORKFLOW.md, PRIORITIES.md, FEATURES.md) - UP TO DATE
- ✅ Trading system (TRADING_ENHANCEMENTS.md) - CURRENT (Phase 2)
- ✅ AI Models (AI_MODELS_SETUP.md) - CURRENT (46+ models, 8 providers)
- ✅ Sub-agents (.claude/agents/) - COMPLETE (12 agents)
- ✅ Project overview (PROJECT_OVERVIEW.md) - CURRENT
- ✅ **Folder structure organized** - docs/ folder created with logical categories
- ✅ **Component refactoring** - 3 large components split into modules (February 2026):
  - consensus-mode.tsx (1,038 lines -> modular)
  - PreMarketScreening.tsx (1,700+ lines -> modular)
  - debate-interface.tsx (2,357 lines -> 1,116 lines + hooks)
- ⚠️ MVP.md - May need update after trading launch
- ⚠️ Phase docs - Check if Phase 3 is current phase

---

**This map provides complete navigation for all project documentation. Use it to quickly find the right documentation for your task. All files are now organized in logical folders for easy discovery.**
