# CLAUDE.md - Master Index & Session Context

**AI Council Development - Structured Workflow System**

## 🚫 ABSOLUTE RULES - NEVER VIOLATE

### NO MOCK DATA - EVER
```
⛔ NEVER use mock data, fake data, placeholder data, or dummy data
⛔ NEVER suggest "fallback to mock data" as a solution
⛔ NEVER create test fixtures that pretend to be real data

✅ If a service is unavailable → show clear error message to user
✅ If auth fails → prompt user to authenticate
✅ If API is down → tell user to check connection/credentials
```

**Why**: Mock data hides real problems and creates false confidence. Users deserve to see real errors so they can fix them.

---

## 🛡️ DEFENSIVE DEVELOPMENT - PREVENTING FEATURE BREAKAGE

### The Core Problem:
"Many times when we add a feature, another feature is broken and sometimes I can't see it until later"

### The Solution - Modular Defense Strategy:

#### 1. **File Operation Safety Rules**:
```
❌ NEVER: Use Write on existing files (replaces entire file)
✅ ALWAYS: Use Edit for surgical changes
✅ ALWAYS: Read entire file before editing
✅ ALWAYS: Search for dependencies before changing
```

#### 2. **Pre-Change Checklist**:
```bash
# BEFORE changing any component:
1. grep -r "ComponentName" . --include="*.tsx" --include="*.ts"
2. npm run type-check  # Baseline
3. Make ONE surgical edit
4. npm run type-check  # Verify
5. git commit -m "checkpoint: [change]"
```

#### 3. **Context Window Protection**:
```
Every new conversation MUST include:
- git log --oneline -5  # Recent changes
- List of protected features from docs/workflow/FEATURES.md
- Any current errors/warnings
- Explicit "DO NOT MODIFY: [list]"
```

#### 4. **Feature Isolation Rules**:
- One feature = One commit
- One file change at a time when possible
- Test after EACH change
- Document in docs/workflow/FEATURES.md IMMEDIATELY

#### 5. **Rollback Strategy**:
```bash
# If ANYTHING breaks:
git status  # Check what changed
git diff    # Review changes
git reset --hard HEAD  # Nuclear option
```

#### 6. **Quick Troubleshooting - Common Issues**:

**🚨 0 Tool Calls / 0 Tokens / Fast Response (~500ms)?**
```
FIRST CHECK: API Credits/Rate Limits!
- Symptom: Research shows 0 tool calls, 0 tokens, completes in ~500ms
- Root cause (90% of time): API credits exhausted or rate limited
- Fix: Check https://console.anthropic.com/settings/billing (Anthropic)
       Check https://platform.openai.com/usage (OpenAI)
- DO NOT immediately assume code is broken!
- DO NOT revert recent commits until API status confirmed!

December 2025 Incident: Spent hours debugging "broken tool calling"
when the actual cause was depleted Anthropic credits. The 0 tokens
and fast response time are the telltale signs of an API auth/billing issue.
```

## 🔑 SUB PRO/MAX MODE - SUBSCRIPTION-BASED PROVIDERS

**CRITICAL: Sub Pro/Max tiers use CLI SUBSCRIPTION, NOT per-call API billing!**

### How It Works
- **Sub Pro/Max tiers** → Use CLI providers (subscription-based, monthly fee)
- **Pro/Max tiers** → Use API providers (per-call billing via API keys)

### Provider Selection Logic (in `app/api/trading/consensus/stream/route.ts`):
```typescript
const useSubscription = tier === 'sub-pro' || tier === 'sub-max';

if (useSubscription) {
  // Uses ClaudeCLIProvider, CodexCLIProvider, GoogleCLIProvider
  // These run CLI tools that use monthly subscriptions
} else {
  // Uses AnthropicProvider, OpenAIProvider, GoogleProvider
  // These use API keys with per-call billing
}
```

### CLI Providers (Subscription-Based)
| Provider | CLI Command | Subscription |
|----------|-------------|--------------|
| `ClaudeCLIProvider` | `npx @anthropic-ai/claude-code` | Claude Pro/Max ($20-100/mo) |
| `CodexCLIProvider` | `npx openai-codex` | ChatGPT Plus/Pro |
| `GoogleCLIProvider` | `gcloud ai` | Gemini Advanced |

### Key Files
- `lib/ai-providers/cli/claude-cli.ts` - Claude subscription provider
- `lib/ai-providers/cli/codex-cli.ts` - OpenAI subscription provider
- `lib/ai-providers/cli/google-cli.ts` - Google subscription provider

### Billing Model
- **Sub Pro/Max**: Monthly fee covers unlimited usage (within fair use)
- **Pro/Max API**: Pay per token ($3-15/1M tokens depending on model)

### Debugging CLI Errors
If "Claude CLI Error" appears:
1. Check terminal for `🔷 Claude CLI raw response:` logs
2. Verify CLI is authenticated: `npx @anthropic-ai/claude-code --version`
3. Check subscription status in Claude app settings

### CRITICAL: NO API FALLBACK FOR SUB TIERS
**This is a hard rule - NEVER change this behavior!**

```
⛔ Sub Pro/Max tiers MUST use CLI providers ONLY
⛔ If CLI fails → show error to user, DO NOT fall back to API
⛔ User pays monthly subscription → should NEVER be charged per-call API fees
```

**Why this matters:**
- User selected "Sub Pro" = they want to use their Claude/GPT/Gemini subscription
- Falling back to API = unexpected charges on their API key
- This was a recurring bug that I kept re-introducing - NEVER DO THIS AGAIN

**If CLI fails, show THIS error:**
```
"CLI provider for {provider} not configured. Install the CLI tool or switch to Pro/Max tier for API access."
```

**DO NOT:**
- Silently fall back to API providers
- Log "falling back to API" and continue
- Try to "help" by using API when CLI fails

## 🤖 SUB-AGENT SYSTEM:
**For complex features, use the orchestrated sub-agent system defined in docs/guides/SUB_AGENTS.md:**
- **Orchestration Agent**: Coordinates all other agents
- **Research Agent**: Analyzes codebase structure
- **Dependency Agent**: Maps dependencies to prevent breakage
- **Implementation Agent**: Executes code changes
- **Testing Agent**: Verifies all protected features
- **Documentation Agent**: Syncs all documentation

**Launch Pattern**: Start with Orchestration Agent for multi-file features

## 🎯 UNIFIED DEBATE ENGINE - THE CORE PRODUCT

**CRITICAL: The Debate Engine is the core product. All features should connect to it.**

### Vision (November 2025)
```
User Query → Domain Detection → Research Phase → Debate → Clear Answer
```

### Architecture
- **Consensus Mode**: Quick - multiple models answer independently
- **Debate Mode**: Deep - models challenge each other with real research

### Research Modes (Configurable)
| Mode | Description | Best For |
|------|-------------|----------|
| **Centralized** (default) | 1 model researches → shares with all | Fast, cheap, consistent |
| **Distributed** | Each model researches independently | Thorough, diverse perspectives |
| **Hybrid** | Base research + agents request more | Balanced approach |

### Agent Roles (MADR-Inspired)
| Agent | Role | MADR Equivalent |
|-------|------|-----------------|
| **Analyst** | Systematic analysis | Debater 1 |
| **Critic** | Challenge flaws | Debater 2 |
| **Judge** (NEW) | Assess consensus | Judge |
| **Synthesizer** | Refine & conclude | Refiner |

### Domain Frameworks (Plugins)
All frameworks use the SAME debate engine:
- **General**: Any query, no special intake
- **Vacation**: 9 questions → MAUT scorecard
- **Apartment**: 10 questions → Comparison table
- **Trading**: Symbol + timeframe → Bull/Bear analysis

### Key Files
- `lib/debate/research-modes.ts` - Research mode configuration
- `lib/agents/general-research-agents.ts` - Research engine
- `app/api/agents/debate-stream/route.ts` - Main debate orchestration

### Academic Foundation
- Google 2023: 17.7% reasoning improvement with debate
- Microsoft 2024: 31% hallucination reduction
- MIT 2024: 25% improvement from model diversity

**📚 Full documentation: `docs/architecture/UNIFIED_DEBATE_ENGINE.md`**

## 🎯 MODEL REGISTRY - SINGLE SOURCE OF TRUTH

**CRITICAL: All models must be defined in `lib/models/model-registry.ts` ONLY**

### Location
- **File**: `lib/models/model-registry.ts`
- **Status**: ✅ Implemented January 2025
- **Purpose**: Single source of truth for all 46+ AI models across 8 providers

### Architecture
```typescript
// MODEL_REGISTRY contains ALL models with metadata
export const MODEL_REGISTRY: Record<Provider, ModelInfo[]> = {
  anthropic: [...], // Claude models
  openai: [...],    // GPT models
  google: [...],    // Gemini models
  groq: [...],      // Llama/Gemma models (all free)
  xai: [...],       // Grok models
  perplexity: [...],// Sonar models
  mistral: [...],   // Mistral models
  cohere: [...]     // Command models
}
```

### Model Metadata Structure
Each model includes:
- `id`: Unique model identifier (e.g., "claude-sonnet-4-5-20250929")
- `name`: Human-readable display name
- `provider`: Provider key
- `tier`: Cost tier ('free' | 'budget' | 'balanced' | 'premium' | 'flagship')
- `badge`: Optional emoji badge for UI (🌟 🎁 ⚡ 💰 💎)
- `hasInternet`: Boolean for internet access capability
- `isLegacy`: Boolean to mark deprecated models

### Usage Rules

**✅ DO:**
```typescript
import { MODEL_REGISTRY, getModelsByProvider } from '@/lib/models/model-registry'

// Get models for a provider
const anthropicModels = getModelsByProvider('anthropic')

// Get all providers with models
const allProviders = getAllProviders()

// Check internet access
if (hasInternetAccess(modelId)) { /* ... */ }
```

**❌ DON'T:**
```typescript
// ❌ NEVER define model lists inline in components
const models = ['gpt-5', 'claude-3-5-sonnet', ...] // WRONG!

// ❌ NEVER duplicate model lists
const availableModels = {
  openai: ['gpt-5', 'gpt-4o'],  // WRONG!
  anthropic: ['claude-sonnet-4-5-20250929'] // WRONG!
}
```

### Files That Use Registry
- **AI Providers** (8 files): `lib/ai-providers/*.ts` - Use `getModelsByProvider()`
- **User Tiers**: `lib/user-tiers.ts` - Derives ALL_MODELS from registry
- **Trading Config**: `lib/trading/models-config.ts` - Generates TRADING_MODELS from registry
- **Components** (3 files): Import from registry, never define inline

### Benefits
1. **Single Update Point**: Add/remove models in ONE place
2. **Type Safety**: Full TypeScript support
3. **Consistency**: Same models everywhere
4. **Metadata**: Centralized tier, cost, and feature info
5. **Maintainability**: No more 25+ duplicate lists!

### Legacy Models
Models marked with `isLegacy: true` (e.g., Claude 2.0/2.1) are kept in registry but excluded from UI selectors.

### Power/Cost Display System (December 2025)

**Status**: ✅ Implemented December 2025
**Purpose**: Show model "power" (benchmark-based weight) and cost tier in all model selectors

#### Grade System (Benchmark-Based)
```
Weight 0.95-1.0  → A+ (Top tier - flagship models)
Weight 0.85-0.94 → A  (Premium models)
Weight 0.75-0.84 → B+ (Balanced models)
Weight 0.65-0.74 → B  (Budget models)
Weight 0.55-0.64 → C+ (Economy models)
Weight 0.50-0.54 → C  (Basic models)
```

#### Cost Tiers
```
FREE  → Green badge (Groq/Google free tier)
$     → Blue badge (input + output < $0.005/1K)
$$    → Amber badge (input + output < $0.02/1K)
$$$   → Rose badge (input + output >= $0.02/1K)
```

#### Helper Functions
```typescript
import {
  getModelGrade,      // Returns { grade: 'A+', weight: 0.98, display: 'A+(0.98)' }
  getModelCostTier,   // Returns 'FREE' | '$' | '$$' | '$$$'
  getSelectableModels // Returns only working, non-legacy models
} from '@/lib/models/model-registry'
```

#### Shared UI Components
```typescript
import { ModelBadge, ModelDropdownItem } from '@/components/shared/model-badge'

// Badge with power/cost display
<ModelBadge
  modelId="claude-sonnet-4-5-20250929"
  showPower={true}   // Shows A+(0.98)
  showCost={true}    // Shows $$$ badge
/>

// Dropdown item with power/cost
<ModelDropdownItem
  modelId="gemini-2.0-flash"
  selected={true}
  showPower={true}
  showCost={true}
/>
```

#### Files Updated
- `lib/models/model-registry.ts` - Added helper functions + types
- `components/shared/model-badge.tsx` - NEW: Shared components
- `components/consensus/ultra-model-badge-selector.tsx` - Uses shared components
- `components/trading/single-model-badge-selector.tsx` - Uses shared components

#### Protected Feature
- **Feature #40** in `docs/workflow/FEATURES.md`
- DO NOT remove power/cost display from model selectors
- DO NOT modify grade thresholds without user approval

## 🚀 MANDATORY SESSION START PROTOCOL:
**EVERY NEW CONVERSATION MUST START WITH THESE STEPS IN ORDER:**

1. **Read CLAUDE.md** (this file - master index & session context)
2. **Read DOCUMENTATION_MAP.md** (find which docs are relevant to your task)
3. **Read docs/workflow/WORKFLOW.md** (step-by-step work method)
4. **Read docs/workflow/PRIORITIES.md** (current TODO list)
5. **Read docs/workflow/FEATURES.md** (protected features)
6. **Read relevant feature docs** (from DOCUMENTATION_MAP.md based on task)
7. **Optional: Read docs/guides/BEST_PRACTICES.md** (debugging patterns)
8. **Optional: Read docs/guides/SUB_AGENTS.md** (when using autonomous agents)

**Quick Reading Order**: `CLAUDE.md → DOCUMENTATION_MAP.md → docs/workflow/WORKFLOW.md → docs/workflow/PRIORITIES.md → docs/workflow/FEATURES.md`

## 📂 DOCUMENTATION STRUCTURE:

**📚 For complete documentation reference, see [DOCUMENTATION_MAP.md](./DOCUMENTATION_MAP.md)**

### Core Documentation (Quick Reference)

| File | Purpose | When to Read |
|------|---------|--------------|
| **docs/workflow/WORKFLOW.md** | Step-by-step session method | Every session start |
| **docs/workflow/PRIORITIES.md** | Current TODOs + progress | Every session start |
| **docs/workflow/FEATURES.md** | Protected features INDEX | Before any changes |
| **docs/architecture/PROJECT_OVERVIEW.md** | Architecture + vision + status | For context |
| **docs/architecture/PROJECT_STRUCTURE.md** | Complete codebase structure + navigation | When navigating codebase or adding files |
| **docs/architecture/UNIFIED_DEBATE_ENGINE.md** | 🎯 Core product architecture, research modes, MADR | Debate engine work |
| **docs/architecture/RESEARCH_DRIVEN_DEBATE.md** | Research-first debate implementation | Debate debugging |
| **docs/guides/BEST_PRACTICES.md** | Debugging patterns | When issues arise |
| **docs/guides/SUB_AGENTS.md** | Sub-agent specifications & orchestration | When using autonomous agents |
| **docs/features/TRADING_ENHANCEMENTS.md** | Paper trading system (Phase 2) | Trading feature work |
| **DOCUMENTATION_MAP.md** | Complete documentation index | Finding specific docs |

### 📁 Protected Features (Split Files - December 2025)

**IMPORTANT**: Features documentation is split for readability. When checking protected features:

| File | Features | Check Before Modifying |
|------|----------|----------------------|
| **docs/features/CORE_DEBATE.md** | 1-18 | Debate system, UI, memory, agents |
| **docs/features/TRADING_SYSTEM.md** | 19-54 | Trading, providers, models, research |
| **docs/features/ARENA_MODE.md** | 55-56 | Arena competition mode |

**Always read the relevant split file before modifying any feature!**


## 📋 CONVERSATION PROMPT TEMPLATE:

**Use this template to create future conversation prompts:**

```
Continue Verdict AI development work.

Previous session: ✅ Fixed ESLint warnings & completed project rebrand to "Verdict AI" with centralized branding system
Next priority: Chain-of-Debate Display Enhancement (Phase 1) - Build UI to show WHY agents disagree

MANDATORY START: Read CLAUDE.md → DOCUMENTATION_MAP.md → docs/workflow/WORKFLOW.md → docs/workflow/PRIORITIES.md → docs/workflow/FEATURES.md
Launch orchestration-master agent to coordinate the next task that is approved by user on the todo list/priorities
TodoWrite: Research debate data structure + Design disagreement components + Implement visualization + Test all features + Update docs
Follow structured workflow: Work → Test → Document → Ask approval → Push → New prompt
```

**Template Variables:**
- `[Brief summary of what was completed]` - 1-2 key achievements from the session
- `[Next high priority task from docs/workflow/PRIORITIES.md]` - Top item from PRIORITIES.md high priority section

## 💾 RESEARCH CACHING SYSTEM (Phase 2C)

**Status**: ✅ PRODUCTION READY (October 30, 2025)
**Purpose**: Cache market research to avoid redundant API calls and accelerate trading analysis

### Key Achievement
- **45% cost savings** with 50% cache hit rate
- **2x faster responses** for cached queries (<2s vs 8-12s)
- **Zero API calls** on cache hits (vs 30-40 calls per research)

### Implementation
**Database**: `research_cache` table in Supabase (PostgreSQL + JSONB)
- ✅ **Status**: DEPLOYED (October 30, 2025)
- ✅ **Shared**: Same table for local dev & production Vercel
- ⚠️ **DO NOT** run SQL script again - table exists

**Service**: `lib/trading/research-cache.ts` - ResearchCache class
**Integration**: Consensus Mode API (`/app/api/trading/consensus/route.ts`)

### Smart TTL Strategy
Cache expiration based on trading timeframe:
- **Day trading**: 15min (intraday volatility)
- **Swing trading**: 1hr (daily timeframe)
- **Position trading**: 4hr (weekly holds)
- **Long-term**: 24hr (fundamental stable)

### Cache Key
`symbol + timeframe` (e.g., "TSLA-swing" different from "TSLA-day")

### Server Logs
```bash
# Cache hit
✅ Cache hit: AAPL-swing (age: 4min, expires in: 56min, access: 2)
✅ Using cached research (saved 30-40 API calls!)

# Cache miss
💨 Cache miss - running fresh research pipeline...
✅ Research complete: 35 tools used, 9.2s duration
💾 Research cached for future queries
```

### Files Created
- `lib/trading/research-cache.ts` - Cache service class
- `scripts/create-research-cache-table.sql` - Database schema
- `docs/guides/RESEARCH_CACHE_TESTING.md` - Testing guide
- `RESEARCH_CACHE_IMPLEMENTATION_SUMMARY.md` - Complete summary

### Documentation
- **Feature #22** in `docs/workflow/FEATURES.md`
- **Phase 2C** in `docs/features/TRADING_ENHANCEMENTS.md`
- **Testing**: `docs/guides/RESEARCH_CACHE_TESTING.md`

### Future Enhancements (Phase 2D)
- Extend to Individual/Debate modes
- Incremental updates (fetch only new data)
- Real-time cache invalidation on breaking news

---

## 🚀 NEXT SESSION PROMPT (Ready to Use):

```
Continue Verdict AI development work.

Previous session: ✅ COMPLETED - Research Caching System (Phase 2C) - PRODUCTION READY & VALIDATED
Next priority: 🎯 Monitor cache performance for 1 week, then decide Phase 2D or Phase 3

MANDATORY START: Read CLAUDE.md → DOCUMENTATION_MAP.md → docs/workflow/WORKFLOW.md → docs/workflow/PRIORITIES.md → docs/workflow/FEATURES.md

RESEARCH CACHING SYSTEM - PHASE 2C COMPLETE (October 30, 2025):
✅ Database schema deployed to Supabase (SHARED: local dev + production)
✅ ResearchCache service class complete (380 lines)
✅ Integrated with Consensus Mode API
⚠️ DO NOT RUN SQL SCRIPT AGAIN - table already exists in Supabase
✅ Browser validated: Cache hit working (AAPL-swing test)
✅ Performance verified: 96% faster (52.8s → 2s), 100% cost savings on hit
✅ TTL strategy working: 15min-24hr based on timeframe
✅ Access tracking: Monitoring cache hits, age, expiration
✅ Documentation complete: FEATURES.md + TRADING_ENHANCEMENTS.md + Testing guide
✅ TypeScript: 0 errors

CACHE VALIDATION TEST RESULTS:
- Cache hit: AAPL-swing (age: 4min, expires in: 56min, access: 2)
- Saved: 17-40 API calls per cached query
- Cost: $0 on cache hit vs $0.003 fresh research
- Response time: <2s vs 52.8s original (96% improvement)

PAPER TRADING PHASE 2 - 100% COMPLETE & PRODUCTION READY (October 24, 2025):
✅ All 12 Steps Validated: Browser tested + TypeScript clean (0 errors)
✅ Individual Mode: 8 models queried, professional Bull/Bear/Technical/Fundamental analysis
✅ Consensus Mode: Judge system working ("4/6 models recommend BUY NVDA"), Progress UI
✅ Debate Mode: Badge-based role selector (Analyst/Critic/Synthesizer) with Free/Pro/Max presets
✅ Portfolio Display: Real-time Alpaca account data ($100k+ portfolio, 2 positions, P&L tracking)
✅ Trade History: Past trades with expandable reasoning
✅ Progress Indicators: Real-time step-by-step visual feedback (Phase 2A.7)
✅ Stock Symbol Input: Optional targeted analysis (TSLA, AAPL, etc.) - Phase 2A.5
✅ Timeframe Selector: 4 professional timeframes (Day/Swing/Position/Long-term) - Phase 2A
✅ Badge-Based Model Selector: Matching Ultra Mode UI across all modes - Phase 2A.6
✅ Judge System: Heuristic model-weighted consensus with intelligent synthesis - Phase 2A.9
✅ 46 Models: 1,050% increase from 4 models (8 providers: Anthropic, OpenAI, Google, Groq, xAI, Mistral, Perplexity, Cohere)
✅ Start New Analysis Button: Reset functionality across all modes (October 24, 2025)

PHASE 2A ENHANCEMENTS ALSO COMPLETE:
✅ Free/Pro/Max preset buttons for instant model tier selection
✅ Cross-provider model selection in Debate Mode (any model for any role)
✅ Trading history persistence with localStorage restoration
✅ Enhanced prompts with Risk:Reward ratios, stop-loss, take-profit levels
✅ Professional reasoning format (Bullish/Bearish cases, Technical, Fundamental, Sentiment, Timing)

DOCUMENTATION UPDATES (This Session):
✅ PRIORITIES.md: Updated Phase 2 from "⏳ pending" to "✅ 100% COMPLETE"
✅ FEATURES.md: Already shows 100% complete (no changes needed)
✅ TypeScript: 0 errors validation passed

CURRENT BRANCH: feature/paper-trading-phase2 (ready for merge to main)

PHASE 3 PRIORITIES (FROM PRIORITIES.md):
1. ⏳ Timeframe Selector Component (create reusable component)
2. ⏳ Arena Mode - Competitive AI Trading (leaderboard, autonomous scheduler)
3. ⏳ Auto-Execution Controls & Safety Rails (position limits, daily loss limits, emergency stop)
4. 🔴 URGENT: Investigate Sonnet 4.5 Internet Access Issue on Ultra Mode

ALTERNATIVE OPTIONS:
- Start Phase 3 enhancements (Arena Mode, Safety Rails)
- Fix Sonnet 4.5 internet access issue (URGENT)
- Launch to AI course colleagues for feedback
- Merge Phase 2 to main and deploy

Follow structured workflow: Work → Test → Document → Ask approval → Push → New prompt
Key Focus: Phase 2 is PRODUCTION READY - User can decide: Phase 3 or Launch

IMPORTANT: All 3 trading modes tested and working. System ready for real user testing or Phase 3 development.
```

## 🌐 CRITICAL: Playwright Browser Management
**ALWAYS FOLLOW PROPER BROWSER WORKFLOW TO AVOID "browser already in use" ERRORS:**
- **NEVER** call `browser_navigate()` multiple times without closing
- **ALWAYS** close browser before opening new sessions  
- **ONE BROWSER AT A TIME** - no exceptions

**Required Pattern:**
```javascript
1. mcp__playwright__browser_close()  // ALWAYS close first
2. mcp__playwright__browser_navigate(url)  // Then navigate  
3. [do testing]
4. mcp__playwright__browser_close()  // Close when done
```

**Browser Error Fix:**
If "browser already in use" error occurs:
1. `mcp__playwright__browser_close()` (force close)
2. Wait a moment  
3. `mcp__playwright__browser_navigate()` (try again)

## 🎯 SESSION COMPLETION CHECKLIST:
- [ ] Work tasks completed
- [ ] docs/workflow/PRIORITIES.md updated with progress
- [ ] ⚠️ docs/workflow/FEATURES.md updated if new feature added (add to protected list)
- [ ] ⚠️ DOCUMENTATION_MAP.md updated if new docs created
- [ ] Next conversation prompt updated
- [ ] User asked: "Any final observations?"
- [ ] Confirmed: "Documentation updated, next session prompt ready"

---

## 📝 DOCUMENTATION MAINTENANCE PROTOCOL

### When Creating New Documentation Files:

**MANDATORY STEPS - ALWAYS FOLLOW THIS PROCESS:**

1. **Choose the right category** (consult DOCUMENTATION_MAP.md):
   - Core Workflow? → Root level with clear name
   - Feature-specific? → Root level or create `/docs/features/` if many
   - Research/planning? → Root level with descriptive name
   - Historical? → Move to `/_archive/`
   - Sub-agent? → `/.claude/agents/`

2. **Update DOCUMENTATION_MAP.md IMMEDIATELY**:
   ```markdown
   # Add entry to appropriate section
   | **NEW_FILE.md** | Purpose description | When to read |
   ```

3. **Update CLAUDE.md if mandatory reading**:
   - If new doc should be read every session, add to MANDATORY SESSION START PROTOCOL
   - If related to core workflow, add to DOCUMENTATION STRUCTURE table

4. **Commit with clear message**:
   ```bash
   git add NEW_FILE.md DOCUMENTATION_MAP.md CLAUDE.md
   git commit -m "docs: Add NEW_FILE.md for [purpose]"
   ```

### When Archiving Documentation:

1. **Move to /_archive/** instead of deleting
2. **Update DOCUMENTATION_MAP.md** - move entry to "Archived" section
3. **Remove from CLAUDE.md** if it was listed there
4. **Commit**: `git commit -m "docs: Archive OLD_FILE.md"`

### Documentation File Naming Convention:

- **ALL_CAPS_WITH_UNDERSCORES.md** for important persistent docs
- **lowercase-with-hyphens.md** for temporary/experimental docs
- **Clear descriptive names**: `TRADING_ENHANCEMENTS.md` not `stuff.md`

### Quick Reference - Where to Put New Docs:

| Type of Documentation | Location | Example |
|----------------------|----------|---------|
| Core workflow/process | `/docs/workflow/` | `WORKFLOW.md`, `PRIORITIES.md`, `FEATURES.md` |
| System architecture | `/docs/architecture/` | `PROJECT_OVERVIEW.md`, `SUPABASE_SETUP.md` |
| Feature documentation | `/docs/features/` | `TRADING_ENHANCEMENTS.md` |
| Planning/roadmaps | `/docs/planning/` | `PHASE_3_PROGRESS.md`, `MVP.md` |
| Guides & best practices | `/docs/guides/` | `BEST_PRACTICES.md`, `SUB_AGENTS.md` |
| Session history/logs | `/docs/history/` | `SESSION_SUMMARY_*.md`, `AUTONOMOUS_WORK_LOG.md` |
| Sub-agent specs | `/.claude/agents/` | `orchestration-master.md` |
| Historical/archived | `/_archive/` | Old research, superseded docs |
| Test documentation | `/tests/` | `tests/README.md` |
| Master index files | Root level only | `README.md`, `CLAUDE.md`, `DOCUMENTATION_MAP.md` |

**This ensures every new conversation can quickly find the right documentation.** 📚