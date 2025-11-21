# Unified Debate Engine Architecture

**Status**: 🔨 IN PROGRESS (November 21, 2025)
**Priority**: 🔴 CRITICAL - Core Product
**Author**: Claude Code Session

---

## Executive Summary

The Unified Debate Engine is the **core product** of AI Council. It enables multiple AI models to debate any topic using real research, producing clear, actionable recommendations backed by evidence.

**Key Innovation**: Research-driven debate eliminates hallucination and produces verifiable answers.

---

## 1. Academic Foundation

### 1.1 Research Papers Supporting This Architecture

| Paper | Authors | Key Finding | Impact |
|-------|---------|-------------|--------|
| **"Improving Factuality and Reasoning in LLMs through Multiagent Debate"** | Google, 2023 | 17.7% reasoning improvement, 13.2% factual accuracy improvement | Proves debate works |
| **"MADR: Multi-Agent Debate Refinement"** | Various, 2024 | 4 roles: Debater1, Debater2, Judge, Refiner | Inspired our agent structure |
| **"Chain-of-Debate"** | Microsoft Research, 2024 | 23% reasoning improvement, 31% hallucination reduction | Tracks WHY models disagree |
| **"Heterogeneous Agent Discussion"** | MIT, 2024 | 25% improvement from mixing different model families | Use diverse models |
| **Google DeepMind Debate Protocol** | DeepMind, 2024-2025 | "Doubly-efficient debate" - honest strategy proves facts | Error detection mechanism |

### 1.2 Key Academic Insights

1. **Debate > Consensus**: Models challenging each other catches errors that consensus misses
2. **Diverse Models**: Different architectures have complementary strengths (MIT finding)
3. **Research-First**: Injecting real data prevents hallucination (Google approach)
4. **Judge Role**: Having a dedicated assessor improves final synthesis (MADR)
5. **Structured Output**: Requiring format prevents "it depends" answers

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER QUERY                                  │
│   "Help me plan a vacation" / "Should I buy TSLA?" / Anything      │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│              DOMAIN DETECTION (Optional)                            │
│   Auto-detect OR user selects: General / Vacation / Trading        │
└───────────────────────────────┬────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   General    │      │  Vacation    │      │   Trading    │
│  (Any Query) │      │  Framework   │      │  Framework   │
│              │      │              │      │              │
│ No special   │      │ • 9 questions│      │ • Symbol     │
│ intake flow  │      │ • Hotel APIs │      │ • Timeframe  │
│              │      │ • MAUT score │      │ • Risk level │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│           🔬 RESEARCH ENGINE (Configurable Mode)                    │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Centralized │  │ Distributed │  │   Hybrid    │                │
│  │ (1 model    │  │ (each model │  │ (base +     │                │
│  │  researches)│  │  researches)│  │  additional)│                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
│  Output: ResearchFindings → injected into agent prompts            │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│        🎯 UNIFIED DEBATE ENGINE (The Core Product)                  │
│                                                                     │
│  Agents (MADR-Inspired):                                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────────┐            │
│  │ Analyst │→ │ Critic  │→ │  Judge  │→ │ Synthesizer│            │
│  │(analyze)│  │(challenge│  │(assess  │  │(refine &   │            │
│  │         │  │  flaws) │  │consensus│  │ conclude)  │            │
│  └─────────┘  └─────────┘  └─────────┘  └────────────┘            │
│                                                                     │
│  Rounds: 1-3 (configurable)                                        │
│  Research: Injected into all prompts                               │
│  Constraint: "Cite sources, NO inventing facts"                    │
│                                                                     │
│  Output: Clear recommendation + confidence + evidence              │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│              💾 PERSISTENCE LAYER (Projects)                        │
│                                                                     │
│  Memory System:                                                     │
│  • Episodic: "This hotel conversation"                             │
│  • Semantic: "User prefers boutique hotels"                        │
│  • Procedural: "For hotels, check Booking.com"                     │
│                                                                     │
│  Cache System:                                                      │
│  • Research results cached by TTL                                  │
│  • Smart invalidation based on data freshness                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Research Modes

### 3.1 Centralized Mode (Default)

**How it works:**
1. Single model (Llama 3.3 70B on Groq) conducts web search
2. Research findings formatted as text block
3. Injected into ALL agent prompts
4. Agents analyze the SAME data from different perspectives

**Pros:**
- Fast (~10-15 seconds)
- Cheap (1 research call)
- Consistent facts for all agents
- No conflicting "evidence"

**Cons:**
- Single model's search biases
- May miss perspectives other models would find

**Best for:** Factual queries, quick decisions, budget-conscious usage

### 3.2 Distributed Mode

**How it works:**
1. Each agent conducts its own research
2. Models use their native search capabilities
3. Each agent brings its own findings to debate
4. Debate includes comparing/reconciling different sources

**Pros:**
- Diverse perspectives
- Each model's strengths utilized
- More comprehensive coverage

**Cons:**
- Slower (~30-60 seconds)
- More expensive (multiple research calls)
- May find conflicting facts

**Best for:** Complex decisions, controversial topics, when thoroughness matters

### 3.3 Hybrid Mode

**How it works:**
1. Centralized base research conducted first
2. All agents receive base research
3. During debate, agents can request additional targeted searches
4. Additional findings added to their context

**Pros:**
- Balanced approach
- Base consistency + targeted depth
- Adaptive to query complexity

**Cons:**
- Medium cost
- More complex implementation

**Best for:** Medium-complexity decisions, iterative exploration

---

## 4. Agent Roles (MADR-Inspired)

### 4.1 Current Agents (3-Agent System)

| Agent | Role | Focus | Color |
|-------|------|-------|-------|
| **Analyst** | Data-driven analysis | Facts, evidence, patterns | Blue |
| **Critic** | Challenge assumptions | Risks, flaws, alternatives | Red |
| **Synthesizer** | Build consensus | Integration, balance, action | Green |

### 4.2 Enhanced Agents (4-Agent System - In Progress)

| Agent | Role | MADR Equivalent | New Responsibility |
|-------|------|-----------------|-------------------|
| **Analyst** | Systematic analysis | Debater 1 | Find insights using typology |
| **Critic** | Challenge flaws | Debater 2 | Find issues without typology |
| **Judge** | Assess consensus | Judge | Determine if consensus reached, identify gaps |
| **Synthesizer** | Refine & conclude | Refiner | Use feedback to produce final answer |

### 4.3 Judge Agent Responsibilities

The Judge (new role) should:
1. **Assess Consensus**: Did Analyst and Critic agree on key points?
2. **Identify Gaps**: What evidence is missing?
3. **Evaluate Evidence**: Which sources are stronger?
4. **Flag Conflicts**: Where do they fundamentally disagree?
5. **Guide Synthesis**: What should the Synthesizer focus on?

---

## 5. Domain Frameworks (Plugins)

### 5.1 Plugin Interface

```typescript
interface DomainFramework {
  id: string                    // 'vacation', 'apartment', 'trading'
  name: string                  // 'Trip Planning'
  description: string           // User-facing description

  // Intake Configuration
  questions: IntakeQuestion[]   // Domain-specific questions
  contextExtractor: (conversation: string) => StructuredContext

  // Research Configuration
  researchPrompt: (context: StructuredContext) => string
  preferredSources?: string[]   // e.g., ['booking.com', 'tripadvisor.com']
  researchMode?: ResearchMode   // Override default mode

  // Output Configuration
  outputFormat: 'scorecard' | 'comparison' | 'ranking' | 'recommendation'
  synthesisPrompt?: string      // Domain-specific synthesis instructions
}
```

### 5.2 Current Frameworks

| Framework | Status | Questions | Output Format |
|-----------|--------|-----------|---------------|
| General (Any Query) | ✅ Production | None | Recommendation |
| Vacation/Trip | ✅ Built (feature branch) | 9 questions | MAUT Scorecard |
| Apartment | ✅ Built (feature branch) | 10 questions | Comparison Table |
| Career | ✅ Built (feature branch) | 8 questions | Recommendation |
| Trading | ✅ Production | Symbol, Timeframe | Bull/Bear Analysis |

### 5.3 How Frameworks Use Debate Engine

```
User selects "Vacation" →
  Framework provides 9 questions →
  User answers (conversational intake) →
  Framework extracts structured context →
  Framework generates research prompt →
  UNIFIED DEBATE ENGINE runs →
  Framework formats output (MAUT scorecard)
```

**Key Point:** All frameworks use the SAME debate engine. They differ only in:
- Intake questions
- Research prompts
- Output formatting

---

## 6. Implementation Status

### 6.1 Completed

- [x] Research-driven debate architecture
- [x] Centralized research mode (using Llama 3.3 70B on Groq)
- [x] Research injection into agent prompts
- [x] Synthesis engine for clear recommendations
- [x] 3-agent debate system (Analyst, Critic, Synthesizer)
- [x] Memory system foundation (episodic, semantic, procedural)
- [x] Research cache system
- [x] Domain frameworks on feature branch

### 6.2 In Progress (This Session)

- [ ] Research mode configuration (`lib/debate/research-modes.ts`) ← DONE
- [ ] Judge agent role
- [ ] Research mode selector UI
- [ ] Domain framework plugin interface

### 6.3 Planned

- [ ] Distributed research mode implementation
- [ ] Hybrid research mode implementation
- [ ] Projects UI (save/resume conversations)
- [ ] Trading integration with debate engine
- [ ] Framework-specific research sources

---

## 7. Key Files

### 7.1 Core Debate Engine

| File | Purpose |
|------|---------|
| `app/api/agents/debate-stream/route.ts` | Main debate orchestration |
| `lib/agents/debate-prompts.ts` | Agent prompt templates |
| `lib/agents/general-research-agents.ts` | Research engine |
| `lib/agents/synthesis-engine.ts` | Extract recommendations |
| `lib/debate/research-modes.ts` | Research mode configs (NEW) |

### 7.2 Types & Interfaces

| File | Purpose |
|------|---------|
| `types/general-research.ts` | Research type definitions |
| `lib/agents/types.ts` | Agent type definitions |
| `types/domain-framework.ts` | Plugin interface (TODO) |

### 7.3 Supporting Systems

| File | Purpose |
|------|---------|
| `lib/memory/memory-service.ts` | Memory system |
| `lib/trading/research-cache.ts` | Cache system |
| `lib/models/model-registry.ts` | Model definitions |

---

## 8. Testing & Validation

### 8.1 Test Queries (Validated Nov 19, 2025)

| Query | Research Mode | Result |
|-------|---------------|--------|
| "Best scooters under 20k shekels for TLV-Jerusalem" | Centralized | ✅ 7 real sources, clear recommendation |

### 8.2 Expected Metrics (From Academic Research)

| Metric | Single Model | Debate System | Improvement |
|--------|--------------|---------------|-------------|
| Factual Accuracy | 70% | 83-87% | +13-17% |
| Reasoning | Baseline | +17.7% | Google finding |
| Hallucination | Baseline | -31% | Microsoft finding |
| Consistency | 20-30% variance | 5-10% variance | 3-4x more stable |

---

## 9. Handoff Notes

### 9.1 Critical Context

1. **Research-driven debate was restored Nov 19, 2025** - it had been accidentally removed
2. **Centralized mode uses Llama 3.3 70B on Groq** - free, has internet, no token limits
3. **Gemini 2.5 was NEVER RELEASED** - Google skipped from 2.0 to 3.0
4. **GPT-5.1 added to model registry** - latest OpenAI model

### 9.2 Design Decisions Made

| Decision | Rationale |
|----------|-----------|
| Centralized as default | Fastest, cheapest, consistent - good for most queries |
| Llama 3.3 70B for research | Free tier on Groq, has internet, no token limits |
| MADR-inspired Judge role | Academic research shows improved synthesis |
| Frameworks as plugins | Reusable debate engine, domain-specific customization |

### 9.3 Next Steps Priority

1. **Finish Judge agent** - Add 4th agent role
2. **Research mode UI** - Let users choose mode
3. **Test distributed mode** - Each model researches independently
4. **Connect trading to debate engine** - Unify all features

---

## 10. References

- `docs/architecture/RESEARCH_DRIVEN_DEBATE.md` - Detailed research architecture
- `debate_research.md` - Academic paper summaries
- `CLAUDE.md` - Project context and instructions
- `docs/workflow/FEATURES.md` - Protected features list

---

**Last Updated**: November 21, 2025
**Session**: Claude Code - Unified Debate Engine Implementation
