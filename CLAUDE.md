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

## 🤖 MULTI-MODEL ORCHESTRATION FOR COMPLEX DECISIONS

**NEW CAPABILITY**: Use Claude + Gemini CLI + Codex CLI together for high-stakes decisions

**When to Use**:
- Architecture decisions (hard to reverse)
- Product-market fit analysis (need brutal honesty)
- Security reviews (multiple vulnerability perspectives)
- Code review of protected features

**How It Works**:
```bash
# 1. Gemini: Product/business analysis
gemini "Brutal product-market fit analysis: [context]"

# 2. Codex: Code quality review (background)
codex exec "Technical review: [context]" &

# 3. Claude: Codebase analysis + synthesis
Read files, test with Playwright, synthesize all perspectives
```

**Documentation**: `docs/guides/MULTI_MODEL_ORCHESTRATION.md`
**Case Study**: Used successfully for productization review (Dec 2025)

**Key Insight**: Different models catch different issues - Gemini's brutal honesty + Codex's code focus + Claude's synthesis = better decisions

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
| `CodexCLIProvider` | `/opt/homebrew/bin/codex` | ChatGPT Plus/Pro |
| `GoogleCLIProvider` | `/opt/homebrew/bin/gemini` | Gemini Advanced |

### CLI Has TWO Auth Modes (CRITICAL TO UNDERSTAND!)

**Claude Code CLI (`npx @anthropic-ai/claude-code`):**
```
API MODE (credits):
├── Uses ANTHROPIC_API_KEY environment variable
├── Has --max-budget-usd flag for spending limits
├── Credits can run out → "Credit balance too low"
└── DO NOT USE for Sub tiers!

SUBSCRIPTION MODE (unlimited):
├── Uses setup-token (run: `npx @anthropic-ai/claude-code setup-token`)
├── Requires Claude Pro/Max subscription
├── NO credits, NO --max-budget-usd
├── Unlimited usage within fair use
└── REQUIRED for Sub tiers!
```

**OpenAI Codex CLI (`codex`):**
```
API MODE: Uses OPENAI_API_KEY → has credits
SUBSCRIPTION MODE: Uses ChatGPT Plus login → unlimited
```

**Google Gemini CLI (`gemini`):**
```
API MODE: Uses GOOGLE_API_KEY → has credits
SUBSCRIPTION MODE: Uses OAuth personal account → unlimited
```

**HOW TO SET UP SUBSCRIPTION MODE:**

**Step 1: Run the setup command for each CLI:**
```bash
# Claude Code CLI - requires Claude Pro/Max subscription
npx @anthropic-ai/claude-code setup-token

# OpenAI Codex CLI - requires ChatGPT Plus/Pro subscription
codex login

# Google Gemini CLI - requires Gemini Advanced subscription
gemini auth login
```

**Step 2: Code removes API keys from environment:**
```typescript
const envWithoutApiKey = { ...process.env };
delete envWithoutApiKey.ANTHROPIC_API_KEY; // Force subscription mode

const child = spawn('npx', args, {
  env: envWithoutApiKey, // No API key = uses subscription auth
});
```

**IMPORTANT**: Even after removing `ANTHROPIC_API_KEY` from env, Claude Code CLI has its **OWN internal credential storage**. If you see "Credit balance too low" in Sub mode, the user needs to run `setup-token` to switch from API credits to subscription auth.

### ⚠️ CRITICAL: Claude CLI Non-Interactive Mode Bug (January 2026)

**KNOWN BUG**: Claude CLI `-p` (non-interactive) flag does NOT properly use subscription auth!

| Mode | Subscription Works? | Source |
|------|---------------------|--------|
| Interactive (`claude`) | ✅ Yes | Normal CLI usage |
| Non-interactive (`claude -p "..."`) | ❌ **NO** - falls back to API | [GitHub Issue #2051](https://github.com/anthropics/claude-code/issues/2051) |

**Impact**: Any programmatic usage of Claude CLI (from Next.js routes, scripts, etc.) will charge API credits even if you have Claude Max subscription.

**Solution**: Use **Gemini CLI** for programmatic/non-interactive calls instead:
- Gemini CLI properly supports subscription mode in non-interactive mode
- Google AI Pro/Ultra subscription works with `-p` flag
- No known bugs with programmatic usage

**Code Change Made** (January 5, 2026):
- `app/api/trading/screening/analyze/route.ts` - Switched from `ClaudeCLIProvider` to `GoogleCLIProvider`
- Using `gemini-2.5-flash` model (supports "thinking mode" required by CLI)

**Note**: `gemini-2.0-*` models do NOT support thinking mode and will error with Gemini CLI. Use `gemini-2.5-*` models instead.

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

### ⚠️ CRITICAL UNDERSTANDING: SUB MODE = SUBSCRIPTION = NO CREDITS

**THIS IS A FUNDAMENTAL RULE THAT CLAUDE KEEPS FORGETTING:**

```
SUB PRO/MAX MODE:
├── Uses CLI providers (ClaudeCLIProvider, CodexCLIProvider, GoogleCLIProvider)
├── CLI providers use MONTHLY SUBSCRIPTION (Claude Pro $20/mo, ChatGPT Plus, etc.)
├── Subscriptions = UNLIMITED USAGE (within fair use)
├── There is NO "credit balance" concept for subscriptions
├── There is NO per-call billing
└── If you see "Credit balance is too low" → SOMETHING IS BROKEN

PRO/MAX MODE (not sub):
├── Uses API providers (AnthropicProvider, OpenAIProvider, etc.)
├── API = PAY PER TOKEN (credits that can run out)
├── "Credit balance too low" = normal, expected error when out of credits
└── User needs to add credits to their API account
```

**IF "Credit balance too low" APPEARS IN SUB MODE:**
1. The CLI is NOT properly using subscription auth
2. It may be using API mode instead of subscription mode
3. Check if `--max-budget-usd` is set (this is an API budget, not subscription)
4. The CLI tool might need re-authentication with subscription credentials
5. DO NOT blame API credits - Sub mode doesn't use API credits!

**NEVER SAY:**
- ❌ "Sub mode is working, CLI just ran out of credits"
- ❌ "The code is correct, add credits to continue"
- ❌ "Credit balance proves CLI is being called"

**CORRECT RESPONSE:**
- ✅ "Credit error in Sub mode = BUG - subscriptions have no credits"
- ✅ "CLI may be misconfigured to use API instead of subscription"
- ✅ "Need to investigate why CLI isn't using subscription auth"

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

### Sub Tier Billing Protection - Audit Checklist (December 2025)

**Files with Sub Tier Protection (USE provider-factory.ts):**
| Route | Status | Protection Method |
|-------|--------|-------------------|
| `app/api/trading/consensus/route.ts` | ✅ Fixed | Uses `getProviderForTier()` |
| `app/api/trading/individual/route.ts` | ✅ Fixed | Uses `getProviderForTier()` |
| `app/api/trading/debate/route.ts` | ✅ Fixed | Uses `getProviderForTier()` |
| `app/api/trading/consensus/stream/route.ts` | ✅ Safe | Already had CLI support |
| `app/api/arena/execute/route.ts` | ✅ Fixed | CLI map cleaned (no API) |
| `app/api/arena/execute/stream/route.ts` | ✅ Fixed | CLI map cleaned (no API) |

**Files with Tier Block (Don't support Sub tiers yet):**
| Route | Status | Error Message |
|-------|--------|---------------|
| `app/api/agents/debate-stream/route.ts` | ✅ Blocked | "Does not support sub tiers" |
| `app/api/consensus/route.ts` | ✅ Blocked | "Does not support sub tiers" |

**Central Provider Factory:**
- `lib/ai-providers/provider-factory.ts` - Single source of truth for tier-aware provider selection
- Functions: `getProviderForTier()`, `isSubscriptionTier()`, `assertProviderAllowedForTier()`

**Before Adding New Routes:**
```
1. Import from provider-factory.ts: getProviderForTier, isSubscriptionTier
2. NEVER create local PROVIDERS map
3. ALWAYS use getProviderForTier(tier, providerType)
4. If CLI not supported → block sub tiers with clear error
```

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
9. **Optional: Read docs/guides/MULTI_MODEL_ORCHESTRATION.md** (for high-stakes decisions using Gemini + Codex CLIs)

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
| **docs/trading/** | Trading system documentation (data sources, features, enhancements) | Trading feature work |
| **DOCUMENTATION_MAP.md** | Complete documentation index | Finding specific docs |

### 📁 Protected Features (Split Files - December 2025)

**IMPORTANT**: Features documentation is split for readability. When checking protected features:

| File | Features | Check Before Modifying |
|------|----------|----------------------|
| **docs/features/CORE_DEBATE.md** | 1-18 | Debate system, UI, memory, agents |
| **docs/trading/TRADING_SYSTEM.md** | 19-54 | Trading, providers, models, research |
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

Previous session (Feb 3, 2026): ✅ Stock Screening documentation added to CLAUDE.md + DOCUMENTATION_MAP.md
Next priority: 🔴 Run RLS fix SQL on Supabase (paper_trades table)

MANDATORY START: Read CLAUDE.md → DOCUMENTATION_MAP.md → docs/workflow/WORKFLOW.md → docs/workflow/PRIORITIES.md → docs/workflow/FEATURES.md

PENDING ACTION - RLS FIX FOR paper_trades TABLE:
⚠️ Supabase lint warning: RLS disabled on public.paper_trades
📄 SQL fix ready at: scripts/enable-paper-trades-rls.sql
🔗 Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/sql/new
✅ Won't break anything - backend uses service_role_key (bypasses RLS)

STOCK SCREENING SYSTEM (Pre-Market Scanner):
📍 URL: http://localhost:3000/trading/screening
📍 Requires TWO servers running:
   1. npm run dev (Next.js on port 3000)
   2. uvicorn api.main:app --reload --port 8000 (FastAPI)
📍 Also requires: TWS Desktop running on port 7496
📍 Full docs: See "Stock Screening System" section in CLAUDE.md
✅ All 10 phases complete - Production ready (January 2026)

TRADING SYSTEM STATUS:
✅ Paper Trading Phase 2: 100% complete (Individual/Consensus/Debate modes)
✅ Research Caching (Phase 2C): Production ready
✅ Stock Screening (Phases 1-10): Production ready
⚠️ paper_trades RLS: Disabled (security warning, fix ready)

WHAT'S WORKING:
- /trading - AI trading analysis (3 modes)
- /trading/screening - Pre-market stock scanner (requires FastAPI + TWS)
- /ultra - Multi-model consensus
- /arena - AI model competition

Follow structured workflow: Work → Test → Document → Ask approval → Push → New prompt
```

## 📈 STOCK SCREENING SYSTEM (Pre-Market Scanner)

**Status**: ✅ PRODUCTION READY (January 2026, Phases 1-10 Complete)
**URL**: http://localhost:3000/trading/screening
**Purpose**: Pre-market stock screening (4:00 AM - 9:30 AM ET) to find gap-up opportunities, short squeeze candidates, and volatile stocks using IBKR TWS API + sentiment analysis.

### Architecture: Dual-Server (Next.js + FastAPI + TWS)

```
Next.js Frontend (port 3000)
    ↓ fetches from
FastAPI Python Backend (port 8000)
    ↓ reads from
Supabase PostgreSQL (screening_results table, JSONB)
    ↑ written by
Screening Orchestrator (Python) → TWS Desktop (port 7496)
```

**Why dual-server**: FastAPI + ib_insync have conflicting asyncio event loops. Database-backed separation (Gemini AI recommended) gives <100ms API reads vs 20-30s direct calls.

### How to Start (3 services needed)

```bash
# Terminal 1: Next.js Frontend
npm run dev
# → http://localhost:3000/trading/screening

# Terminal 2: FastAPI Backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
# → http://localhost:8000/docs (Swagger UI)

# Terminal 3 (if running fresh screening):
source venv/bin/activate  # Python venv required
python -m lib.trading.screening.screening_orchestrator
# → Connects to TWS, scans stocks, writes to Supabase
```

### Prerequisites

| Requirement | Details |
|-------------|---------|
| **TWS Desktop** | Running on port 7496 (paper) or 4001 (live), API enabled in Global Configuration |
| **Python venv** | `source venv/bin/activate` + `pip install -r requirements.txt` |
| **Supabase** | `screening_results` table with JSONB (already deployed) |
| **Finnhub** (optional) | `FINNHUB_API_KEY` in `.env.local` for Reddit/Twitter sentiment |

### Environment Variable

`NEXT_PUBLIC_FASTAPI_URL` is NOT set in `.env.local` — component defaults to `http://localhost:8000` (matching `api/main.py`).

### Key Files

**Python Backend:**
| File | Purpose |
|------|---------|
| `api/main.py` | FastAPI server entry (CORS for port 3000) |
| `api/routes/screening_v2.py` | V2 endpoints: background job screening with status polling |
| `lib/trading/screening/simple_orchestrator.py` | Main pipeline: TWS data + scoring |
| `lib/trading/screening/tws_scanner_sync.py` | TWS scanner client |
| `lib/trading/screening/tws_fundamentals.py` | P/E, EPS, Market Cap from TWS XML |
| `lib/trading/screening/tws_short_data.py` | Shortable shares, fee rates |
| `lib/trading/screening/tws_bars.py` | Pre-market gap calculation + volume |
| `lib/trading/screening/reddit_sentiment.py` | Reddit sentiment scoring |

**Frontend:**
| File | Purpose |
|------|---------|
| `app/trading/screening/page.tsx` | Page route |
| `components/trading/PreMarketScreening.tsx` | Main UI (stats dashboard, stock cards, auto-refresh) |

**Database:**
| Table | Purpose |
|-------|---------|
| `screening_results` | JSONB array of enriched stock objects (gap %, volume, short data, sentiment, score) |
| `paper_trades` | Trade history (⚠️ RLS not yet enabled — run `scripts/enable-paper-trades-rls.sql`) |

### API Endpoints (FastAPI on :8000)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check + DB status |
| GET | `/api/screening/v2/run?params` | Start background screening job |
| GET | `/api/screening/v2/status/{jobId}` | Poll job status |
| GET | `/api/screening/latest` | Latest results from DB |

### Scoring System (Winners Strategy, 0-100)

Gap magnitude (30pts) + Volume (20pts) + Short squeeze potential (20pts) + Fundamentals (15pts) + Sentiment (15pts)

### Known Issues

1. **TWS session expires ~24h** — requires re-login in TWS Desktop
2. **Finnhub rate limit** — 60 calls/min on free tier (handled with delays)
3. **No `NEXT_PUBLIC_FASTAPI_URL` in .env.local** — relies on hardcoded default `localhost:8000`
4. **`paper_trades` RLS disabled** — Supabase lint warning, fix SQL ready at `scripts/enable-paper-trades-rls.sql`

### Documentation

- `docs/trading/SCREENING_INTEGRATION.md` — Full integration guide
- `docs/trading/DATABASE_BACKED_ARCHITECTURE.md` — Architecture rationale
- `docs/trading/TWS_API_MIGRATION_PLAN.md` — 10-phase migration plan
- `docs/trading/PRE_MARKET_SCREENING_IMPLEMENTATION_STATUS.md` — Phase status

---

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