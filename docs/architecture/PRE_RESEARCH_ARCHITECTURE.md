# Pre-Research Architecture: Why Models Don't Research Autonomously

**Created**: November 2025
**Status**: Design Document
**Related**: UNIFIED_DEBATE_ENGINE.md, domain-framework.ts

---

## Executive Summary

This document explains why AI models don't autonomously call web search tools during debates, despite having tools available. It provides architectural guidance for implementing a pre-research stage that ensures consistent, high-quality research across all debate sessions.

---

## The Core Discovery

### Observed Behavior

Server logs showed that web search tools were enabled but never called:

```
=== OPENAI DEBUG ===
useWebSearch: true
Tools passed: none
OpenAI: Native web search enabled

=== OPENAI SUCCESS ===
🔍 Step finished: { toolCalls: 0, toolResults: 0 }  <-- Model chose not to search
```

**Result**: "Found 0 sources" for all agents despite tools being available.

### Root Cause

Models have web search tools available but **choose not to call them**. This is by design in how LLMs are trained.

---

## Why Models Don't Research Autonomously

### 1. Training Objective Conflict

LLMs are trained to **answer directly**, not to "think about what to research first."

Their optimization function rewards:
- Providing coherent, helpful responses
- Using knowledge from training data
- Being confident in existing knowledge

Tool-calling is a **secondary behavior** that competes with the primary "answer the question" instinct.

### 2. Prompt Design Issue

Current debate prompts instruct models to:

```
"CITE SPECIFIC EVIDENCE" - Each claim must be supported
"Use phrases like: Based on..., Research indicates..."
```

This tells models to **cite evidence they already have**, not to **go search for new evidence**.

Models interpret this as: "Use your training knowledge to cite sources."

### 3. Expert Persona Framing

The debate prompts frame models as domain experts:

```
"As The Analyst, you are opening this important debate..."
"Your expertise areas: [technical analysis, market data, risk assessment]"
```

This frames the model as an **expert who already knows things**, not a researcher who needs to gather information first.

### 4. Tool Usage Cost Perception

Models learn during training that:
- Tool calls add latency
- Users prefer quick responses
- Conversational contexts reward directness

Without explicit instruction that "you MUST search first," models default to answering directly.

### 5. Multi-Step Reasoning Overhead

To autonomously search, a model must:
1. Recognize information gap
2. Decide to search
3. Formulate search query
4. Execute tool call
5. Parse results
6. Integrate into response

Each step is a decision point where the model can "give up" and just answer directly.

---

## Existing Architecture Analysis

The codebase already has the **correct architecture** for pre-research:

### Domain Framework (`types/domain-framework.ts`)

```typescript
export interface DomainFramework {
  // Research is DESIGNED to be separate from debate
  researchPromptGenerator: (context: StructuredContext) => string;
  preferredSources?: string[];  // Pre-defined sources
  defaultResearchMode?: ResearchMode;
  additionalSearchQueries?: (context: StructuredContext) => string[];
}
```

### Query Analyzer (`lib/heterogeneous-mixing/query-analyzer.ts`)

```typescript
export function analyzeQuery(query: string): QueryAnalysis {
  // BEFORE calling models, determine if search is needed
  return {
    requiresWebSearch: boolean;
    requiresMultiStep: boolean;
    primaryType: QueryType;
    complexity: 'low' | 'medium' | 'high' | 'very-high';
  }
}
```

### Context Extractor (`lib/web-search/context-extractor.ts`)

```typescript
// System generates search queries, NOT the model
generateSearchQueries(
  context: ExtractedContext,
  originalQuery: string,
  role: 'analyst' | 'critic' | 'synthesizer',
  round: number
): string[]
```

### Research Cache (`lib/trading/research-cache.ts`)

```typescript
// Already implemented for trading - can extend to debates
export class ResearchCache {
  async getCache(cacheKey: string): Promise<CachedData | null>
  async setCache(cacheKey: string, data: ResearchData, ttlMinutes: number): Promise<void>
}
```

---

## Pre-Research vs Per-Agent Research Comparison

| Aspect | Per-Agent Research (Tool-Based) | Pre-Research Stage |
|--------|--------------------------------|-------------------|
| **Control** | Model decides IF and WHAT to search | System decides, model receives |
| **Reliability** | Unpredictable (0% to 100%) | Consistent (100% when enabled) |
| **Query Quality** | Model-dependent, often suboptimal | Optimized, role-specific queries |
| **Caching** | Complex (per-model, per-query) | Simple (per-query) |
| **Cost** | Redundant searches (each model searches) | Single search, shared context |
| **Latency** | Serial (search → think → respond) | Parallel (search while preparing) |
| **Evidence Quality** | Varies by model | Standardized, verified sources |
| **Debugging** | Hard (black box) | Easy (logged search queries) |

---

## Recommended Architecture

### Data Flow

```
User Query
    │
    ▼
┌──────────────────────┐
│  Query Analyzer      │  ← Detect if web search needed
│  (query-analyzer.ts) │
└──────────────────────┘
    │
    ▼ requiresWebSearch = true
┌──────────────────────┐
│  Context Extractor   │  ← Generate optimized search queries
│  (context-extractor) │
└──────────────────────┘
    │
    ▼ searchQueries[]
┌──────────────────────┐
│  Web Search Service  │  ← Execute searches (DuckDuckGo/Native)
│  (web-search/)       │
└──────────────────────┘
    │
    ▼ searchResults[]
┌──────────────────────┐
│  Research Cache      │  ← Cache results for future queries
│  (research-cache.ts) │
└──────────────────────┘
    │
    ▼ cachedResearch
┌──────────────────────┐
│  Prompt Builder      │  ← Inject as "RESEARCH CONTEXT"
│  (debate-prompts.ts) │
└──────────────────────┘
    │
    ▼ enrichedPrompt
┌──────────────────────┐
│  Agent Debate        │  ← Models debate with evidence
│  (agent-system.ts)   │
└──────────────────────┘
```

### Implementation Strategy

#### Phase 1: Pre-Research Integration

1. **In `agent-system.ts`**:
   - Check `analyzeQuery(query).requiresWebSearch`
   - If true, generate search queries via `ContextExtractor`
   - Execute search with DuckDuckGo (reliable fallback)
   - Cache results

2. **In `debate-prompts.ts`**:
   - Add `RESEARCH CONTEXT` section to prompts
   - Include search results as pre-gathered evidence
   - Update instructions: "Use the research provided below"

#### Phase 2: Caching Layer

3. **Extend `research-cache.ts`**:
   - Add debate query → search results caching
   - Smart TTL based on query type (current events = short, historical = long)

#### Phase 3: Keep Tools as Fallback

4. **Round 2 Enhancement**:
   - Keep native web search tools for Round 2
   - Models can search for specific counter-evidence
   - Pre-research covers breadth, tool-search covers depth

---

## Cache Key Strategy

For debate queries:

```typescript
const cacheKey = `debate-${hashQuery(query)}-${round}`;

// Example:
// "Should I buy TSLA?" → "debate-abc123-round1"
// Different rounds may need different research focus
```

For trading queries (existing):

```typescript
const cacheKey = `${symbol}-${timeframe}`;
// "TSLA-swing" different from "TSLA-day"
```

---

## TTL Strategy

Based on query type detection:

| Query Type | TTL | Reasoning |
|------------|-----|-----------|
| `current-events` | 15 min | Information changes rapidly |
| `factual` | 4 hr | Facts are stable |
| `analytical` | 1 hr | Analysis may need fresh data |
| `comparative` | 2 hr | Comparisons are moderately stable |
| `technical` | 4 hr | Technical docs change slowly |
| Default | 1 hr | Safe middle ground |

---

## Prompt Injection Format

New prompt structure with pre-research:

```
🎭 MULTI-AGENT DEBATE - OPENING STATEMENT (ROUND 1)

Query: ${query}

📚 RESEARCH CONTEXT (Pre-gathered evidence for your analysis):
${researchContext}

Sources consulted: ${sources.join(', ')}

---

As ${agent.name}, you are opening this important debate.

Your role is to:
1. **USE THE RESEARCH PROVIDED** - Cite from the evidence above
2. **Take a STRONG position** - Be confident in your analysis
3. **Present 3-4 key arguments** with evidence from the research
...
```

---

## Trade-offs and Considerations

### Advantages of Pre-Research

1. **Consistent Quality**: Every debate has researched evidence
2. **Cost Effective**: Single search shared by all agents
3. **Cacheable**: Same query = instant cached results
4. **Debuggable**: Clear log of what was searched
5. **Controllable**: System decides search strategy

### Disadvantages

1. **Less Model "Intelligence"**: Models don't learn to research
2. **Pre-determined Focus**: May miss tangential relevant info
3. **Additional Latency**: Search adds ~2-5s before debate
4. **Complexity**: Another system component to maintain

### Mitigation

- Keep tool-based search as Round 2 fallback
- Allow models to request additional searches
- Cache aggressively to minimize latency impact
- Log all searches for debugging

---

## Success Metrics

After implementation, measure:

1. **Evidence Citation Rate**: % of responses that cite provided research
2. **Cache Hit Rate**: % of debates using cached research
3. **Latency Impact**: Additional time from pre-research
4. **User Satisfaction**: Quality improvement in debate responses
5. **Cost Per Debate**: Reduction from shared research

---

## Related Documentation

- `docs/architecture/UNIFIED_DEBATE_ENGINE.md` - Overall debate architecture
- `docs/features/TRADING_ENHANCEMENTS.md` - Trading research caching
- `docs/guides/RESEARCH_CACHE_TESTING.md` - Cache testing guide
- `types/domain-framework.ts` - Framework plugin interface

---

## Conclusion

The observation that models don't autonomously call web search tools is **expected behavior**, not a bug. LLMs are optimized to answer directly, and tool-calling is a secondary behavior.

The correct architectural pattern is:
1. **System decides** if research is needed (query analysis)
2. **System executes** research (pre-research stage)
3. **System provides** evidence to models (prompt injection)
4. **Models debate** based on provided evidence (their strength)

This separates concerns properly:
- **System**: Research gathering, caching, query optimization
- **Models**: Analysis, reasoning, synthesis, debate

The existing codebase already has the infrastructure for this pattern. Implementation requires connecting the pieces.
