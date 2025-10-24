# 📚 DOCUMENTATION MAP - AI Council Project

**Complete reference of all documentation files and their purposes**
**Last Updated**: October 24, 2025

---

## 🎯 MANDATORY SESSION START (Read These Every Time)

These files MUST be read at the start of every development session:

| File | Purpose | Priority |
|------|---------|----------|
| **CLAUDE.md** | Master index & session context | 🔴 CRITICAL |
| **WORKFLOW.md** | Step-by-step development method | 🔴 CRITICAL |
| **PRIORITIES.md** | Current TODO list & progress tracking | 🔴 CRITICAL |
| **FEATURES.md** | Protected features (prevent breakage) | 🟠 HIGH |
| **PROJECT_OVERVIEW.md** | System architecture & vision | 🟡 MEDIUM |

**Reading Order**: CLAUDE.md → WORKFLOW.md → PRIORITIES.md → FEATURES.md → PROJECT_OVERVIEW.md

---

## 🏗️ ARCHITECTURE & SETUP

Core system architecture and configuration documentation:

| File | Purpose | When to Read |
|------|---------|--------------|
| **PROJECT_OVERVIEW.md** | Complete system architecture, tech stack, feature map | For context, when planning changes |
| **README.md** | Project introduction, quick start guide | New developers, deployment |
| **SUPABASE_SETUP.md** | Database setup, schemas, RLS policies | Database changes, auth work |
| **AI_MODELS_SETUP.md** | AI provider configuration (8 providers, 43 models) | AI integration changes |
| **TRADING_ENHANCEMENTS.md** | Paper trading system architecture (Phase 2) | Trading feature work |

---

## 🛠️ DEVELOPMENT BEST PRACTICES

Guidelines for debugging, code quality, and development patterns:

| File | Purpose | When to Read |
|------|---------|--------------|
| **BEST_PRACTICES.md** | Debugging patterns, successful fix methods | When encountering issues |
| **SUB_AGENTS.md** | Sub-agent specifications & orchestration | When using autonomous agents |
| **WORKFLOW.md** | Step-by-step development process | Every session start |

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

**When to Use**: Launch orchestration-master for complex multi-file features

---

## 📊 PLANNING & PROGRESS TRACKING

Project phases, roadmaps, and work logs:

| File | Purpose | Status |
|------|---------|--------|
| **MVP.md** | MVP strategy, core features, launch plan | Reference |
| **PHASE_2_PLAN.md** | Phase 2 feature planning | Reference |
| **PHASE_3_PROGRESS.md** | Phase 3 progress tracking | Active |
| **AUTONOMOUS_WORK_LOG.md** | Log of autonomous work sessions | Active |
| **SESSION_SUMMARY_OCT_24.md** | October 24 session summary | Archive |
| **CLEANUP_SUMMARY.md** | Code cleanup documentation | Reference |

---

## 🚀 FEATURE-SPECIFIC DOCUMENTATION

Detailed documentation for major features:

### Trading System (Paper Trading)
- **TRADING_ENHANCEMENTS.md** - Complete trading system documentation
  - 43 models across 8 providers
  - Professional timeframe analysis
  - Enhanced prompts with risk management
  - Model selection UI architecture

### AI Models & Providers
- **AI_MODELS_SETUP.md** - Provider configuration
  - Anthropic (10 models)
  - OpenAI (10 models)
  - Google (6 models)
  - Groq (5 models)
  - Mistral (2 models)
  - Perplexity (2 models)
  - Cohere (2 models)
  - xAI (3 models)

### Other Features
- **ULTRA_MODE_REDESIGN_PLAN.md** - Ultra Mode architecture redesign
- **PRO_MODE_FIX_ANALYSIS.md** - Pro Mode authentication fix analysis
- **MEMORY_IMPLEMENTATION_PLAN.md** - Memory system implementation plan
- **FUTURE_PROJECT_MEMORYCODE.md** - Future project ideas

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

**Note**: Archive folder contains historical context - read only if needed for specific research.

---

## 🧪 TEST DOCUMENTATION (tests/)

- **tests/README.md** - Test suite documentation and guidelines

---

## 🔧 OTHER DOCUMENTATION

| File | Purpose | When to Read |
|------|---------|--------------|
| **MANUAL_STEPS.md** | Manual steps required for deployment | Before deployment |
| **evals.md** | Evaluation metrics and testing | Quality assurance |
| **debate_research.md** (root) | Duplicate of archived debate research | Reference |
| **.github/copilot-instructions.md** | GitHub Copilot configuration | GitHub integration |
| **docs/archived/README.md** | Legacy documentation index | Historical reference |

---

## 📋 DOCUMENTATION HIERARCHY

```
MANDATORY (Every Session)
├── CLAUDE.md (Master Index) ⭐
├── WORKFLOW.md (Process)
├── PRIORITIES.md (TODOs)
├── FEATURES.md (Protected)
└── PROJECT_OVERVIEW.md (Context)

ARCHITECTURE
├── README.md
├── PROJECT_OVERVIEW.md
├── SUPABASE_SETUP.md
└── AI_MODELS_SETUP.md

FEATURE-SPECIFIC
├── TRADING_ENHANCEMENTS.md (Paper Trading Phase 2)
├── ULTRA_MODE_REDESIGN_PLAN.md
├── PRO_MODE_FIX_ANALYSIS.md
└── MEMORY_IMPLEMENTATION_PLAN.md

BEST PRACTICES
├── BEST_PRACTICES.md
├── SUB_AGENTS.md
└── WORKFLOW.md

PLANNING & PROGRESS
├── PRIORITIES.md
├── PHASE_3_PROGRESS.md
├── AUTONOMOUS_WORK_LOG.md
└── MVP.md

SUB-AGENTS (.claude/agents/)
├── orchestration-master.md
├── architecture-planner.md
├── surgical-implementer.md
├── testing-validation-checker.md
├── codebase-research-analyst.md
├── code-search-analyzer.md
├── dependency-analyzer.md
├── debug-analyzer.md
├── ui-ux-consistency-checker.md
├── performance-optimizer.md
├── product-guardian.md
└── documentation-sync.md

ARCHIVED (_archive/)
└── [Historical documentation - reference only]
```

---

## 🎯 QUICK REFERENCE BY TASK TYPE

### Starting a New Session
1. Read CLAUDE.md
2. Read WORKFLOW.md
3. Read PRIORITIES.md
4. Read FEATURES.md
5. Check PROJECT_OVERVIEW.md for context

### Working on Trading Features
1. Read TRADING_ENHANCEMENTS.md
2. Read AI_MODELS_SETUP.md
3. Check FEATURES.md (protected features)

### Using Sub-Agents
1. Read SUB_AGENTS.md (orchestration overview)
2. Launch orchestration-master for complex tasks
3. Check .claude/agents/ for specific agent specs

### Debugging Issues
1. Read BEST_PRACTICES.md (successful patterns)
2. Use debug-analyzer agent
3. Check FEATURES.md (what not to break)

### Deploying Changes
1. Read MANUAL_STEPS.md
2. Check SUPABASE_SETUP.md (database)
3. Review README.md (deployment process)

### Researching Architecture
1. Read PROJECT_OVERVIEW.md
2. Check relevant feature docs (TRADING_ENHANCEMENTS.md, etc.)
3. Review _archive/ for historical context if needed

---

## 🔄 KEEPING THIS MAP UPDATED

**When to update this file**:
- New feature documentation created
- Documentation restructured or renamed
- Archive files moved
- New sub-agents added
- Major workflow changes

**Update pattern**:
```bash
# After creating new documentation:
1. Add entry to appropriate section
2. Update hierarchy diagram
3. Update quick reference if needed
4. Commit with message: "docs: Update DOCUMENTATION_MAP.md"
```

---

## ✅ DOCUMENTATION HEALTH CHECK

Current documentation status:

- ✅ Core workflow files (CLAUDE.md, WORKFLOW.md, PRIORITIES.md, FEATURES.md) - UP TO DATE
- ✅ Trading system (TRADING_ENHANCEMENTS.md) - CURRENT (Phase 2)
- ✅ AI Models (AI_MODELS_SETUP.md) - CURRENT (43 models, 8 providers)
- ✅ Sub-agents (.claude/agents/) - COMPLETE (12 agents)
- ✅ Project overview (PROJECT_OVERVIEW.md) - CURRENT
- ⚠️ MVP.md - May need update after trading launch
- ⚠️ Phase docs - Check if Phase 3 is current phase

---

**This map provides a complete reference for navigating all project documentation. Use it to quickly find the right documentation for your task.**
