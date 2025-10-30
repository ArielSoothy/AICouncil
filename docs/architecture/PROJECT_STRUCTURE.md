# PROJECT STRUCTURE

**Complete Visual Guide to AI Council / Verdict AI Codebase**

Last Updated: October 28, 2025

## Purpose

This document provides a comprehensive visual map of the entire project structure, helping you:
- Quickly understand the codebase organization
- Find specific files and components
- Know where to add new files
- Navigate between related code
- Understand architectural layers

## Quick Navigation

| What You Need | Where to Look |
|---------------|---------------|
| UI Components | `/components/` (organized by feature) |
| API Endpoints | `/app/api/` (route handlers) |
| Pages/Routes | `/app/` (Next.js 13+ app directory) |
| Business Logic | `/lib/` (services, agents, providers) |
| Type Definitions | `/types/` (TypeScript interfaces) |
| State Management | `/contexts/` (React contexts) |
| Custom Hooks | `/hooks/` (React hooks) |
| Database Schema | `/supabase/` (migrations, schema) |
| Tests | `/tests/` (organized by type) |
| Documentation | `/docs/` (all project docs) |

---

## Complete Directory Tree

```
AICouncil/
├── .claude/                          # Claude Code agent configurations
│   └── agents/                       # Sub-agent specifications
│
├── .github/                          # GitHub workflows and configs
│   └── copilot-instructions.md       # GitHub Copilot instructions
│
├── app/                              # Next.js 13+ App Directory (routes & pages)
│   ├── admin/                        # Admin dashboard pages
│   ├── agents/                       # Agent debate page
│   ├── arena/                        # Arena mode page
│   ├── auth/                         # Authentication pages
│   ├── dashboard/                    # User dashboard page
│   ├── history/                      # Conversation history page
│   ├── marketing/                    # Marketing/landing pages
│   ├── trading/                      # Paper trading page
│   ├── ultra/                        # Ultra consensus mode page
│   ├── api/                          # API Route Handlers
│   │   ├── admin/                    # Admin analytics endpoints
│   │   │   └── analytics/            # Usage analytics
│   │   ├── agents/                   # Agent system endpoints
│   │   │   ├── debate/               # Debate API
│   │   │   ├── debate-heterogeneous/ # Heterogeneous debate
│   │   │   └── debate-stream/        # Streaming debate
│   │   ├── arena/                    # Arena mode endpoints
│   │   │   ├── config/               # Arena configuration
│   │   │   ├── cron/                 # Scheduled jobs
│   │   │   ├── execute/              # Arena execution
│   │   │   └── leaderboard/          # Leaderboard data
│   │   ├── consensus/                # Consensus endpoints
│   │   │   ├── elaborate/            # Elaborate consensus
│   │   │   ├── normalize/            # Normalize responses
│   │   │   └── why/                  # Disagreement analysis
│   │   ├── trading/                  # Paper trading endpoints
│   │   │   ├── consensus/            # Trading consensus
│   │   │   ├── debate/               # Trading debate
│   │   │   ├── history/              # Trade history
│   │   │   ├── individual/           # Individual model analysis
│   │   │   └── portfolio/            # Portfolio data (Alpaca)
│   │   ├── auth-test/                # Auth testing endpoint
│   │   ├── benchmark/                # Performance benchmarks
│   │   ├── conversations/            # Conversation CRUD
│   │   │   └── [id]/                 # Individual conversation
│   │   ├── feedback/                 # User feedback
│   │   ├── health/                   # Health checks
│   │   │   └── supabase/             # Supabase health
│   │   ├── memory/                   # Memory system endpoints
│   │   ├── models/                   # Model metadata
│   │   ├── question-generator/       # Question generation
│   │   └── setup/                    # Setup/migration endpoints
│   │       └── migrate-arena/        # Arena migration
│   ├── layout.tsx                    # Root layout (providers, metadata)
│   ├── globals.css                   # Global styles
│   └── page.tsx                      # Home page
│
├── components/                       # React Components (organized by feature)
│   ├── agents/                       # Agent debate components
│   │   ├── agent-selector.tsx        # Model selection UI
│   │   ├── debate-display.tsx        # Debate visualization
│   │   └── debate-interface.tsx      # Debate orchestration
│   ├── arena/                        # Arena mode components
│   ├── auth/                         # Authentication components
│   ├── consensus/                    # Consensus mode components
│   │   ├── enhanced-consensus-display-v3.tsx  # Main consensus UI
│   │   ├── model-selector.tsx        # Model selection
│   │   └── ultra-model-badge-selector.tsx     # Badge-based selector
│   ├── conversation/                 # Conversation components
│   ├── debate/                       # Debate-specific components
│   │   └── cost-breakdown.tsx        # Cost calculation display
│   ├── landing/                      # Landing page components
│   ├── shared/                       # Shared/reusable components
│   ├── trading/                      # Paper trading components
│   │   └── single-model-badge-selector.tsx    # Trading model selector
│   └── ui/                           # Base UI components (buttons, cards, etc.)
│       └── header.tsx                # App header/navigation
│
├── contexts/                         # React Context Providers
│   └── auth-context.tsx              # Authentication context
│
├── docs/                             # All Project Documentation
│   ├── active/                       # Active work-in-progress docs
│   ├── architecture/                 # System architecture docs
│   │   ├── AI_MODELS_SETUP.md        # AI model configuration guide
│   │   ├── PROJECT_OVERVIEW.md       # Executive summary & architecture
│   │   ├── PROJECT_STRUCTURE.md      # This file
│   │   └── SUPABASE_SETUP.md         # Database setup guide
│   ├── archived/                     # Historical/archived docs
│   ├── features/                     # Feature-specific documentation
│   │   └── TRADING_ENHANCEMENTS.md   # Paper trading system docs
│   ├── guides/                       # How-to guides & best practices
│   │   ├── BEST_PRACTICES.md         # Debugging patterns
│   │   └── SUB_AGENTS.md             # Sub-agent specifications
│   ├── history/                      # Session logs & summaries
│   ├── planning/                     # Planning & roadmap docs
│   │   ├── MVP.md                    # MVP strategy
│   │   ├── PHASE_*.md                # Phase planning docs
│   │   └── TRADING_TOOL_USE_STRATEGY.md  # Trading implementation plan
│   ├── reference/                    # Reference materials
│   └── workflow/                     # Core workflow documentation
│       ├── FEATURES.md               # Protected features list
│       ├── PRIORITIES.md             # Current TODO list
│       └── WORKFLOW.md               # Development workflow
│
├── features/                         # Feature Modules (experimental)
│   └── debate/                       # Debate feature module
│       ├── api/                      # Debate API logic
│       ├── components/               # Debate components
│       ├── hooks/                    # Debate hooks
│       ├── types/                    # Debate types
│       └── utils/                    # Debate utilities
│
├── hooks/                            # Custom React Hooks
│
├── lib/                              # Core Business Logic & Services
│   ├── agents/                       # Agent system implementation
│   │   ├── agent-system.ts           # Multi-agent orchestration
│   │   └── cost-calculator.ts        # Token/cost calculations
│   ├── ai-providers/                 # AI Provider Integrations
│   │   ├── anthropic.ts              # Claude (Anthropic)
│   │   ├── openai.ts                 # GPT (OpenAI)
│   │   ├── google.ts                 # Gemini (Google)
│   │   ├── groq.ts                   # Llama/Gemma (Groq)
│   │   ├── xai.ts                    # Grok (xAI)
│   │   ├── mistral.ts                # Mistral AI
│   │   ├── perplexity.ts             # Perplexity AI
│   │   └── cohere.ts                 # Cohere
│   ├── alpaca/                       # Alpaca Trading API
│   │   ├── client.ts                 # Alpaca client
│   │   ├── enhanced-prompts.ts       # Trading prompts
│   │   ├── data-coordinator.ts       # Data coordination
│   │   └── market-data-tools.ts      # Market data tools
│   ├── cache/                        # Caching utilities
│   ├── config/                       # Configuration files
│   ├── data-providers/               # Data provider abstractions
│   ├── features/                     # Feature flags & toggles
│   ├── heterogeneous-mixing/         # Multi-model mixing logic
│   │   ├── index.ts                  # Main mixing logic
│   │   └── model-selector.ts         # Model selection algorithm
│   ├── memory/                       # Memory/conversation system
│   ├── models/                       # Model Registry & Metadata
│   │   └── model-registry.ts         # SINGLE SOURCE OF TRUTH for all models
│   ├── question-generator/           # Question generation logic
│   ├── services/                     # Business services
│   │   └── cost-service.ts           # Cost calculation service
│   ├── supabase/                     # Supabase utilities
│   ├── testing/                      # Testing utilities
│   ├── trading/                      # Trading system logic
│   │   └── models-config.ts          # Trading model configuration
│   ├── types/                        # Shared type utilities
│   ├── web-search/                   # Web search integration
│   ├── model-metadata.ts             # Model metadata (LEGACY - use model-registry.ts)
│   └── user-tiers.ts                 # User tier management
│
├── scripts/                          # Utility Scripts
│
├── supabase/                         # Supabase Configuration
│   ├── migrations/                   # Database migrations
│   └── .temp/                        # Temporary files
│
├── tests/                            # Test Suite
│   ├── api/                          # API endpoint tests
│   ├── behavioral/                   # Behavioral tests
│   ├── e2e/                          # End-to-end tests
│   ├── features/                     # Feature tests
│   ├── fixtures/                     # Test fixtures/data
│   ├── helpers/                      # Test helpers
│   ├── integration/                  # Integration tests
│   ├── pages/                        # Page tests
│   ├── screenshots/                  # Screenshot storage
│   ├── scripts/                      # Test scripts
│   └── ui/                           # UI component tests
│
├── types/                            # TypeScript Type Definitions
│   └── consensus.ts                  # Consensus types
│
├── _archive/                         # Archived Files (historical)
│
├── CLAUDE.md                         # Claude AI master instructions
├── DOCUMENTATION_MAP.md              # Documentation navigation hub
├── README.md                         # GitHub project README
├── package.json                      # Node.js dependencies
├── tsconfig.json                     # TypeScript configuration
├── next.config.js                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS configuration
└── playwright.config.ts              # Playwright test configuration
```

---

## Folder Descriptions

### 📱 `/app/` - Next.js App Directory

**Purpose**: Next.js 13+ App Router structure with pages and API routes.

| Subfolder | Purpose | Key Files |
|-----------|---------|-----------|
| `/app/admin/` | Admin dashboard for analytics | `page.tsx` |
| `/app/agents/` | Agent debate interface | `page.tsx` |
| `/app/arena/` | Arena competitive mode | `page.tsx` |
| `/app/auth/` | Login/signup pages | `page.tsx` |
| `/app/trading/` | Paper trading interface | `page.tsx` |
| `/app/ultra/` | Ultra consensus mode | `page.tsx` |
| `/app/api/` | API route handlers | (see API section) |

**Special Files**:
- `layout.tsx` - Root layout with providers (Auth, Analytics)
- `page.tsx` - Home page / landing page
- `globals.css` - Global styles (Tailwind base)

### 🔌 `/app/api/` - API Route Handlers

**Purpose**: Server-side API endpoints (Next.js Route Handlers).

**Pattern**: Each folder = route segment, `route.ts` = handler.

**Key Endpoints**:

| Endpoint | Purpose | Methods |
|----------|---------|---------|
| `/api/agents/debate-stream` | Streaming agent debate | POST |
| `/api/consensus` | Multi-model consensus | POST |
| `/api/trading/consensus` | Trading consensus | POST |
| `/api/trading/portfolio` | Alpaca portfolio data | GET |
| `/api/conversations` | Conversation CRUD | GET, POST, DELETE |
| `/api/health` | Health checks | GET |

### 🧩 `/components/` - React Components

**Purpose**: Reusable UI components organized by feature.

**Organization Strategy**:
- Feature-based folders (e.g., `agents/`, `consensus/`, `trading/`)
- Shared components in `/shared/`
- Base UI primitives in `/ui/`

**Naming Convention**:
- PascalCase for component files: `DebateDisplay.tsx`
- Kebab-case for file names: `debate-display.tsx`
- One component per file (except small related components)

**Key Components**:

| Component | Location | Purpose |
|-----------|----------|---------|
| `debate-interface.tsx` | `/agents/` | Main debate orchestration |
| `enhanced-consensus-display-v3.tsx` | `/consensus/` | Consensus visualization |
| `ultra-model-badge-selector.tsx` | `/consensus/` | Badge-based model picker |
| `header.tsx` | `/ui/` | App navigation header |

### 📚 `/lib/` - Core Business Logic

**Purpose**: Server-side business logic, services, and utilities.

**Critical Subsystems**:

#### `/lib/models/model-registry.ts` 🌟 **SINGLE SOURCE OF TRUTH**
- **All 46+ AI models defined here**
- Never duplicate model lists elsewhere
- Use `getModelsByProvider()` helper functions
- Includes metadata: tier, cost, capabilities

#### `/lib/ai-providers/` - AI Provider Integrations
- One file per provider (8 total)
- Consistent interface across all providers
- Handles API calls, streaming, error handling

#### `/lib/agents/` - Multi-Agent System
- `agent-system.ts` - Orchestrates Analyst/Critic/Synthesizer
- `cost-calculator.ts` - Token and cost tracking

#### `/lib/alpaca/` - Paper Trading
- `client.ts` - Alpaca API client
- `enhanced-prompts.ts` - Trading-specific AI prompts
- `market-data-tools.ts` - Market data integration

#### `/lib/services/` - Business Services
- `cost-service.ts` - Centralized cost calculations

### 📘 `/types/` - TypeScript Definitions

**Purpose**: Shared TypeScript interfaces and types.

**Convention**:
- One file per domain (e.g., `consensus.ts`, `trading.ts`)
- Export interfaces, not classes
- Use `export type` for type aliases

### 🧪 `/tests/` - Test Suite

**Purpose**: Comprehensive test coverage.

**Organization**:

| Folder | Test Type | Tools |
|--------|-----------|-------|
| `/api/` | API endpoint tests | Jest |
| `/e2e/` | End-to-end tests | Playwright |
| `/integration/` | Integration tests | Jest |
| `/ui/` | Component tests | Jest + React Testing Library |
| `/behavioral/` | Behavioral tests | Playwright |

### 📄 `/docs/` - Documentation

**Purpose**: All project documentation (see DOCUMENTATION_MAP.md for details).

**Structure**:
- `/workflow/` - Core workflow docs (PRIORITIES, FEATURES, WORKFLOW)
- `/architecture/` - System design and architecture
- `/features/` - Feature-specific documentation
- `/guides/` - How-to guides and best practices
- `/planning/` - Roadmaps and planning docs

---

## Key Files Reference

### Configuration Files (Root)

| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies & scripts |
| `tsconfig.json` | TypeScript compiler config |
| `next.config.js` | Next.js framework config |
| `tailwind.config.js` | Tailwind CSS config |
| `playwright.config.ts` | E2E test config |
| `.env.local` | Environment variables (not in git) |
| `.env.example` | Environment variable template |

### Master Documentation (Root)

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude AI master instructions & session context |
| `DOCUMENTATION_MAP.md` | Complete documentation index |
| `README.md` | GitHub project README |

### Critical Implementation Files

| File | Location | Purpose |
|------|----------|---------|
| `model-registry.ts` | `/lib/models/` | **SINGLE SOURCE OF TRUTH for all models** |
| `agent-system.ts` | `/lib/agents/` | Multi-agent debate orchestration |
| `auth-context.tsx` | `/contexts/` | Global authentication state |
| `user-tiers.ts` | `/lib/` | User tier/permission management |
| `enhanced-prompts.ts` | `/lib/alpaca/` | Trading AI prompts |

---

## File Naming Conventions

### Components

```typescript
// ✅ Correct
components/agents/debate-display.tsx
components/consensus/ultra-model-badge-selector.tsx

// ❌ Incorrect
components/agents/DebateDisplay.tsx
components/consensus/UltraModelBadgeSelector.tsx
```

### API Routes

```typescript
// ✅ Correct
app/api/trading/consensus/route.ts
app/api/agents/debate-stream/route.ts

// ❌ Incorrect
app/api/trading/consensus.ts
app/api/agents/debateStream/route.ts
```

### Library Files

```typescript
// ✅ Correct
lib/ai-providers/anthropic.ts
lib/agents/cost-calculator.ts

// ❌ Incorrect
lib/ai-providers/Anthropic.ts
lib/agents/CostCalculator.ts
```

### Documentation

```markdown
✅ Correct: PRIORITIES.md, PROJECT_OVERVIEW.md
❌ Incorrect: priorities.md, project-overview.md

Rule: ALL_CAPS_WITH_UNDERSCORES for persistent docs
```

---

## Where to Add New Files

### Adding a New Component

**Decision Tree**:

1. **Is it feature-specific?**
   - ✅ Yes → `/components/{feature-name}/`
   - ❌ No → Go to step 2

2. **Is it a base UI primitive?** (button, card, dialog)
   - ✅ Yes → `/components/ui/`
   - ❌ No → `/components/shared/`

**Example**:
```
New trading chart component → /components/trading/trading-chart.tsx
New dialog component → /components/ui/dialog.tsx
New loading spinner → /components/shared/loading-spinner.tsx
```

### Adding a New API Endpoint

**Pattern**: `/app/api/{feature}/{action}/route.ts`

**Example**:
```typescript
// Trading analysis endpoint
app/api/trading/analyze/route.ts

// Admin analytics endpoint
app/api/admin/analytics/route.ts
```

### Adding a New Page

**Pattern**: `/app/{page-name}/page.tsx`

**Example**:
```typescript
// Settings page
app/settings/page.tsx

// User profile page
app/profile/page.tsx
```

### Adding New Business Logic

**Decision Tree**:

1. **Is it AI provider-specific?**
   - ✅ Yes → `/lib/ai-providers/{provider-name}.ts`

2. **Is it agent/debate logic?**
   - ✅ Yes → `/lib/agents/`

3. **Is it a reusable service?**
   - ✅ Yes → `/lib/services/`

4. **Is it feature-specific?**
   - ✅ Yes → `/lib/{feature-name}/`

5. **Is it a shared utility?**
   - ✅ Yes → `/lib/` (root level)

### Adding New Types

**Pattern**: `/types/{domain-name}.ts`

**Example**:
```typescript
// Trading types
types/trading.ts

// Arena types
types/arena.ts
```

### Adding Documentation

**See DOCUMENTATION_MAP.md for complete guide.**

**Quick Reference**:
- Core workflow → `/docs/workflow/`
- Architecture → `/docs/architecture/`
- Feature docs → `/docs/features/`
- Planning → `/docs/planning/`

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  /app/ (pages & routes) + /components/ (UI components)  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     API Layer                            │
│       /app/api/ (Route handlers, endpoints)             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Business Logic Layer                    │
│  /lib/ (services, agents, providers, utilities)         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   Data/Integration Layer                 │
│  /lib/ai-providers/ + /lib/alpaca/ + /lib/supabase/    │
└─────────────────────────────────────────────────────────┘
```

---

## Common Navigation Patterns

### "I need to modify the trading UI"
1. Start at `/app/trading/page.tsx` (page structure)
2. Check `/components/trading/` (trading components)
3. Review `/lib/trading/` (trading logic)

### "I need to add a new AI provider"
1. Create `/lib/ai-providers/{provider-name}.ts`
2. Add models to `/lib/models/model-registry.ts`
3. Update `/lib/user-tiers.ts` if needed

### "I need to change the debate system"
1. Check `/lib/agents/agent-system.ts` (orchestration)
2. Review `/components/agents/` (UI components)
3. Check `/app/api/agents/` (API endpoints)

### "I need to update authentication"
1. Check `/contexts/auth-context.tsx` (global state)
2. Review `/app/auth/` (auth pages)
3. Check `/lib/supabase/` (Supabase integration)

---

## Quick Tips

### Performance
- Components folder organized by feature = better code splitting
- API routes use edge runtime where possible
- Supabase client initialized per-request

### Type Safety
- All models defined in `/lib/models/model-registry.ts`
- Never duplicate model lists (use registry helpers)
- Types in `/types/` folder

### Testing
- Run `npm run type-check` before commits
- Tests mirror source structure
- Playwright for E2E, Jest for unit tests

### Documentation
- **Always read** `/docs/workflow/FEATURES.md` before changes
- Update `PRIORITIES.md` after completing work
- Archive old docs to `/_archive/`, don't delete

---

## Related Documentation

- **DOCUMENTATION_MAP.md** - Complete documentation index
- **docs/architecture/PROJECT_OVERVIEW.md** - Executive summary & features
- **docs/workflow/WORKFLOW.md** - Development workflow
- **CLAUDE.md** - Master instructions for AI sessions

---

*This structure supports the AI Council multi-model consensus platform with 46+ AI models across 8 providers.*
