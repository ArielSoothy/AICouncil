# 📚 DOCUMENTATION MAP - AI Council Project

**Complete reference of all documentation files and their organized structure**
**Last Updated**: January 2025

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
| **docs/core/SYSTEM_OVERVIEW.md** | Complete system overview (merged README + PROJECT_OVERVIEW) | 🟡 MEDIUM |

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
│   ├── core/                           # Core system documentation (NEW)
│   │   ├── SYSTEM_OVERVIEW.md          # Complete system overview (merged README + PROJECT_OVERVIEW)
│   │   └── TRADING_SYSTEM.md           # Complete trading system docs (merged PAPER_TRADE + TRADING_ENHANCEMENTS)
│   │
│   ├── workflow/                       # Daily workflow & task management
│   │   ├── WORKFLOW.md                 # Step-by-step development process
│   │   ├── PRIORITIES.md               # Current TODO list & progress
│   │   └── FEATURES.md                 # Protected features list
│   │
│   ├── architecture/                   # System design & configuration
│   │   ├── PROJECT_STRUCTURE.md        # Codebase structure & navigation
│   │   ├── SUPABASE_SETUP.md           # Database setup & schemas
│   │   └── AI_MODELS_SETUP.md          # AI provider configuration
│   │
│   ├── research/                       # Research & decision frameworks (NEW)
│   │   ├── DECISION_FRAMEWORKS.md      # Current MADR implementation & validation status
│   │   ├── DOMAIN_TAXONOMY.md          # Domain classification & implementation priorities
│   │   └── INTAKE_AGENT_RESEARCH.md    # Complete intake agent research (4 domains)
│   │
│   ├── features/                       # Feature-specific documentation
│   │   ├── GLOBAL_TIER_SELECTOR.md     # App-wide Free/Pro/Max tier system
│   │   ├── ULTRA_MODE_REDESIGN_PLAN.md # Ultra Mode architecture
│   │   ├── PRO_MODE_FIX_ANALYSIS.md    # Pro Mode auth fix analysis
│   │   ├── MEMORY_IMPLEMENTATION_PLAN.md # Memory system plan
│   │   └── FUTURE_PROJECT_MEMORYCODE.md # Future project ideas
│   │
│   ├── planning/                       # Roadmaps & project phases
│   │   ├── MVP.md                      # MVP strategy & core features
│   │   ├── PHASE_2_PLAN.md             # Phase 2 feature planning
│   │   ├── PHASE_3_PROGRESS.md         # Phase 3 progress tracking
│   │   └── DOMAIN_FRAMEWORK_ROADMAP.md # 10-week domain framework implementation plan (NEW)
│   │
│   ├── guides/                         # Best practices & development guides
│   │   ├── BEST_PRACTICES.md           # Debugging patterns & successful methods (includes debate research)
│   │   ├── SUB_AGENTS.md               # Sub-agent specifications & orchestration
│   │   ├── MANUAL_STEPS.md             # Manual steps for deployment
│   │   ├── RESEARCH_CACHE_TESTING.md   # Research caching system testing guide
│   │   └── evals.md                    # Evaluation metrics & testing
│   │
│   ├── history/                        # Session logs & work summaries
│   │   ├── SESSION_SUMMARY_OCT_24.md   # October 24 session summary
│   │   ├── RESEARCH_CACHE_VALIDATION.md # Research cache test results
│   │   ├── MIGRATION_YAHOO_FINANCE.md  # Alpaca to Yahoo Finance migration
│   │   ├── AUTONOMOUS_WORK_LOG.md      # Autonomous work log
│   │   └── CLEANUP_SUMMARY.md          # Cleanup documentation
│   │
│   └── archived/                       # Legacy documentation
│       └── README.md                   # Archive index
│
├── _archive/                           # Historical files (Phase 1 cleanup)
│   ├── original-docs/                  # Merged/superseded documentation (NEW)
│   │   ├── README.md                   # Archive index
│   │   ├── README.md (original)        # Pre-merge README
│   │   ├── PROJECT_OVERVIEW.md         # Pre-merge PROJECT_OVERVIEW
│   │   ├── PAPER_TRADE.MD              # Pre-merge trading plan
│   │   └── debate_research.md          # Pre-merge debate research
│   │
│   ├── test-pages/                     # Obsolete test pages (NEW)
│   │   ├── README.md                   # Archive index
│   │   ├── test-heterogeneous/         # Feature #9 complete
│   │   ├── test-memory/                # Memory foundation complete
│   │   ├── test-question-intelligence/ # Feature #14 complete
│   │   └── auth-test/                  # Auth testing complete
│   │
│   ├── DEBATE_RESEARCH.md              # (superseded by BEST_PRACTICES.md)
│   ├── DEFAULT_MODEL_OPTIMIZATION.md
│   ├── ENHANCED_JUDGE_SYSTEM.md
│   ├── FREE_WEB_SEARCH.md
│   ├── MARKET_RESEARCH.md
│   ├── PROJECT_NOTES.md
│   ├── setup-database.md
│   ├── STRUCTURED_PROMPTS.md
│   └── TOKEN_OPTIMIZATION.md
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

**NEVER move these files** - they are entry points for all documentation.

---

## 📂 WORKFLOW DOCUMENTATION (docs/workflow/)

Daily workflow, task management, and protected features:

| File | Purpose | When to Read |
|------|---------|--------------|
| **WORKFLOW.md** | Step-by-step development process | Every session start |
| **PRIORITIES.md** | Current TODO list & progress tracking | Every session start |
| **FEATURES.md** | Protected features (prevent breakage) | Before any code changes |

**Path**: `/docs/workflow/`

---

## 📖 CORE DOCUMENTATION (docs/core/)

**NEW CATEGORY** - Comprehensive system overviews and core feature documentation:

| File | Purpose | When to Read |
|------|---------|--------------|
| **SYSTEM_OVERVIEW.md** | Complete system overview (merged README + PROJECT_OVERVIEW) | For context, understanding overall system |
| **TRADING_SYSTEM.md** | Complete trading system docs (merged PAPER_TRADE + TRADING_ENHANCEMENTS) | Trading feature work, paper trading |

**Path**: `/docs/core/`

**Note**: These files consolidate previously duplicate documentation into single authoritative sources.

---

## 🏗️ ARCHITECTURE DOCUMENTATION (docs/architecture/)

System design, tech stack, and configuration:

| File | Purpose | When to Read |
|------|---------|--------------|
| **PROJECT_STRUCTURE.md** | Complete codebase structure, directory tree, navigation guide | When navigating codebase or adding new files |
| **SUPABASE_SETUP.md** | Database setup, schemas, RLS policies | Database changes, auth work |
| **AI_MODELS_SETUP.md** | AI provider configuration (8 providers, 46+ models) | AI integration changes |

**Path**: `/docs/architecture/`

---

## 🔬 RESEARCH DOCUMENTATION (docs/research/)

**NEW CATEGORY** - Research findings, decision frameworks, and domain analysis:

| File | Purpose | When to Read |
|------|---------|--------------|
| **DECISION_FRAMEWORKS.md** | Current MADR implementation & validation status | Understanding current debate system |
| **DOMAIN_TAXONOMY.md** | Domain classification & implementation priorities | Planning domain-specific frameworks |
| **INTAKE_AGENT_RESEARCH.md** | Complete intake agent research (4 domains: apartment, trip, budget, product) | Implementing domain frameworks |

**Path**: `/docs/research/`

**Contents:**
- **DECISION_FRAMEWORKS.md**: Multi-Agent Debate Research (MADR), Google 2023/Microsoft 2024/MIT 2024 research, 3 agent personas, consensus mode judge system, trading framework with 4 research agents, research caching (Phase 2C), validation status
- **DOMAIN_TAXONOMY.md**: Top 10 AI decision query domains, user's 4 priority domains (apartment rent, trip planner, budget planner, product decision), implementation priority matrix, domain-specific UI patterns
- **INTAKE_AGENT_RESEARCH.md**: Intake agent architecture, 22 apartment questions, 20 trip questions, 18 budget questions, 17 product questions, decision matrices, query optimization, success metrics

---

## 🚀 FEATURE DOCUMENTATION (docs/features/)

Detailed documentation for major features:

| File | Purpose | When to Read |
|------|---------|--------------|
| **GLOBAL_TIER_SELECTOR.md** | App-wide Free/Pro/Max tier system | Tier system work |
| **ULTRA_MODE_REDESIGN_PLAN.md** | Ultra Mode architecture redesign | Ultra Mode changes |
| **PRO_MODE_FIX_ANALYSIS.md** | Pro Mode authentication fix analysis | Pro Mode work |
| **MEMORY_IMPLEMENTATION_PLAN.md** | Memory system implementation plan | Memory feature work |
| **FUTURE_PROJECT_MEMORYCODE.md** | Future project ideas & concepts | Planning future features |

**Path**: `/docs/features/`

**Note**: Trading documentation moved to `/docs/core/TRADING_SYSTEM.md` for consolidation.

---

## 📊 PLANNING DOCUMENTATION (docs/planning/)

Project phases, roadmaps, and MVP strategy:

| File | Purpose | Status |
|------|---------|--------|
| **MVP.md** | MVP strategy, core features, launch plan | Reference |
| **PHASE_2_PLAN.md** | Phase 2 feature planning | Reference |
| **PHASE_3_PROGRESS.md** | Phase 3 progress tracking | Active |
| **DOMAIN_FRAMEWORK_ROADMAP.md** | 10-week domain framework implementation plan | **NEW - Active** |

**Path**: `/docs/planning/`

**DOMAIN_FRAMEWORK_ROADMAP.md** - Complete execution plan:
- Phase 1: Documentation cleanup (Week 1) - IN PROGRESS
- Phase 2: Intake agent foundation (Week 2)
- Phases 3-6: Domain implementations (apartment, trip, budget, product)
- Phase 7: User-controlled research depth
- Phase 8: Integration & launch

---

## 🛠️ GUIDES & BEST PRACTICES (docs/guides/)

Development guidelines, debugging patterns, and orchestration:

| File | Purpose | When to Read |
|------|---------|--------------|
| **BEST_PRACTICES.md** | Debugging patterns, successful fix methods (includes debate research validation) | When encountering issues |
| **SUB_AGENTS.md** | Sub-agent specifications & orchestration | When using autonomous agents |
| **MANUAL_STEPS.md** | Manual steps required for deployment | Before deployment |
| **RESEARCH_CACHE_TESTING.md** | Research caching system testing guide | Testing Phase 2C caching |
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
| **RESEARCH_CACHE_VALIDATION.md** | Research cache test results (renamed from RESEARCH_CACHE_TEST_RESULTS.md) | Archive |
| **MIGRATION_YAHOO_FINANCE.md** | Alpaca to Yahoo Finance migration (renamed from ALPACA_TO_YAHOO_MIGRATION.md) | Archive |
| **AUTONOMOUS_WORK_LOG.md** | Log of autonomous work sessions | Active |
| **CLEANUP_SUMMARY.md** | Code cleanup documentation | Reference |

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

### _archive/original-docs/ (NEW - Phase 1 Cleanup)
Merged and superseded documentation files:

| File | Purpose | Status |
|------|---------|--------|
| **README.md (original)** | Pre-merge README (339 lines) | Archived - merged into /docs/core/SYSTEM_OVERVIEW.md |
| **PROJECT_OVERVIEW.md** | Pre-merge PROJECT_OVERVIEW (409 lines) | Archived - merged into /docs/core/SYSTEM_OVERVIEW.md |
| **PAPER_TRADE.MD** | Original trading plan (464 lines) | Archived - merged into /docs/core/TRADING_SYSTEM.md |
| **debate_research.md** | Debate research (273 lines) | Archived - merged into /docs/guides/BEST_PRACTICES.md |

### _archive/test-pages/ (NEW - Phase 1 Cleanup)
Obsolete test pages and API routes (features complete):

| Directory | Purpose | Status |
|-----------|---------|--------|
| **test-heterogeneous/** | Heterogeneous model mixing tests | Archived - Feature #9 complete |
| **test-memory/** | Memory system foundation tests | Archived - Memory foundation complete |
| **test-question-intelligence/** | Question generation intelligence tests | Archived - Feature #14 complete |
| **auth-test/** | One-off authentication testing | Archived - Auth system stable |

### _archive/ (Root Level)
Historical documentation (pre-Phase 1 cleanup):

| File | Purpose | Status |
|------|---------|--------|
| **DEBATE_RESEARCH.md** | Agent debate system research | Archived (superseded by BEST_PRACTICES.md) |
| **DEFAULT_MODEL_OPTIMIZATION.md** | Model selection optimization | Archived |
| **ENHANCED_JUDGE_SYSTEM.md** | Judge system improvements | Archived |
| **FREE_WEB_SEARCH.md** | Web search integration research | Archived |
| **MARKET_RESEARCH.md** | Market analysis research | Archived |
| **PROJECT_NOTES.md** | Old project notes | Archived |
| **setup-database.md** | Old database setup (superseded by SUPABASE_SETUP.md) | Archived |
| **STRUCTURED_PROMPTS.md** | Prompt engineering research | Archived |
| **TOKEN_OPTIMIZATION.md** | Token usage optimization | Archived |

**Path**: `/_archive/`
**Note**: Archive folder contains historical context - read only if needed for specific research. All archived files preserved for reference, not deleted.

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
1. Read docs/core/TRADING_SYSTEM.md (complete trading system documentation)
2. Read docs/architecture/AI_MODELS_SETUP.md (model configuration)
3. Check docs/workflow/FEATURES.md (protected features)

### Working on Domain-Specific Frameworks
1. Read docs/research/DECISION_FRAMEWORKS.md (current MADR implementation)
2. Read docs/research/DOMAIN_TAXONOMY.md (domain classification & priorities)
3. Read docs/research/INTAKE_AGENT_RESEARCH.md (complete research for 4 domains)
4. Read docs/planning/DOMAIN_FRAMEWORK_ROADMAP.md (10-week execution plan)
5. Check docs/workflow/FEATURES.md (protected features)

### Using Sub-Agents
1. Read docs/guides/SUB_AGENTS.md (orchestration overview)
2. Launch orchestration-master for complex tasks
3. Check .claude/agents/ for specific agent specs

### Debugging Issues
1. Read docs/guides/BEST_PRACTICES.md (successful patterns)
2. Use debug-analyzer agent
3. Check docs/workflow/FEATURES.md (what not to break)

### Deploying Changes
1. Read docs/guides/MANUAL_STEPS.md
2. Check docs/architecture/SUPABASE_SETUP.md (database)
3. Review README.md (deployment process)

### Researching Architecture
1. Read docs/core/SYSTEM_OVERVIEW.md (complete system overview)
2. Read docs/architecture/PROJECT_STRUCTURE.md (codebase structure & file organization)
3. Check relevant feature docs in docs/features/
4. Review _archive/ for historical context if needed

---

## 📝 DOCUMENTATION MAINTENANCE PROTOCOL

### When Creating New Documentation Files:

**MANDATORY STEPS - ALWAYS FOLLOW THIS PROCESS:**

1. **Choose the right folder** (consult this map):
   - Core system docs? → `docs/core/`
   - Daily workflow? → `docs/workflow/`
   - System architecture? → `docs/architecture/`
   - Research & frameworks? → `docs/research/`
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

## ✅ DOCUMENTATION HEALTH CHECK

**Phase 1 Documentation Cleanup** - January 2025:

### Completed ✅
- ✅ Duplicate docs consolidated (README + PROJECT_OVERVIEW → SYSTEM_OVERVIEW.md)
- ✅ Trading docs merged (PAPER_TRADE + TRADING_ENHANCEMENTS → TRADING_SYSTEM.md)
- ✅ Research documented (DECISION_FRAMEWORKS.md, DOMAIN_TAXONOMY.md, INTAKE_AGENT_RESEARCH.md)
- ✅ Roadmap created (DOMAIN_FRAMEWORK_ROADMAP.md - 10-week plan)
- ✅ Test files archived (_archive/test-pages/)
- ✅ Original docs archived (_archive/original-docs/)
- ✅ Session logs moved (docs/history/)
- ✅ DOCUMENTATION_MAP.md updated (this file)
- ✅ New folder structure created (docs/core/, docs/research/, docs/planning/)

### Current Status
- ✅ Core workflow files (WORKFLOW.md, PRIORITIES.md, FEATURES.md) - UP TO DATE
- ✅ Core system docs (SYSTEM_OVERVIEW.md, TRADING_SYSTEM.md) - **NEW & CURRENT**
- ✅ Research documentation (3 new files) - **COMPLETE**
- ✅ Planning documentation (DOMAIN_FRAMEWORK_ROADMAP.md) - **NEW & ACTIVE**
- ✅ AI Models (AI_MODELS_SETUP.md) - CURRENT (46+ models, 8 providers)
- ✅ Sub-agents (.claude/agents/) - COMPLETE (12 agents)
- ✅ **Folder structure organized** - docs/ with 8 logical categories

### Next Steps
- ⏳ TypeScript validation (0 errors check) - PENDING
- ⏳ Git commit all Phase 1 changes - PENDING
- ⏳ User approval to proceed to Phase 2 - PENDING

---

**This map provides complete navigation for all project documentation. Use it to quickly find the right documentation for your task. All files are now organized in logical folders for easy discovery.**
