# Consensus AI - GitHub Copilot Instructions

## Architecture Overview

This is a **multi-model AI consensus engine** built with Next.js 14, providing decision support by querying multiple AI providers simultaneously. The system uses an advanced judge analysis to synthesize responses into actionable consensus.

### Core Components
- **AI Providers**: OpenAI (GPT), Anthropic (Claude), Google (Gemini) via unified provider pattern
- **Judge System**: Claude Opus 4 primary judge with GPT-4o fallback for consensus analysis
- **Response Modes**: Concise (~75 tokens), Normal (~200 tokens), Detailed (~500 tokens)
- **Cost Tracking**: Real-time pricing per 1K tokens with tier classification (Free 🆓, Budget 💰, Balanced ⚖️, Premium 💎, Flagship 🏆)

## Key File Locations

```
/lib/ai-providers/        # Provider integrations (openai.ts, anthropic.ts, google.ts)
/lib/judge-system.ts      # Judge analysis logic and prompts
/lib/prompt-system.ts     # Structured prompt generation
/types/consensus.ts       # TypeScript interfaces for all data structures
/app/api/consensus/       # Main orchestration endpoint
/components/consensus/    # UI components for query interface and results
```

## Development Workflow

```bash
npm run dev          # Development server on localhost:3000
npm run build        # Production build
npm run type-check   # TypeScript validation
npm run lint         # ESLint checking
```

## Essential Patterns

### Provider Integration
All AI providers implement the `AIProvider` interface in `/lib/ai-providers/types.ts`. Add new providers by:
1. Creating provider class in `/lib/ai-providers/[provider].ts`
2. Registering in `/lib/ai-providers/index.ts`
3. Adding cost data to `TOKEN_COSTS` in `/app/api/consensus/route.ts`

### Response Structure
The system uses `EnhancedConsensusResponse` interface with:
- `responses[]`: Individual model outputs with timing/tokens
- `consensus.unifiedAnswer`: Judge-synthesized response
- `consensus.judgeAnalysis`: Structured analysis with confidence scores
- Cost transparency with `estimatedCost` and token usage

### Judge Analysis System
Located in `/lib/judge-system.ts`, uses domain-specific prompts to:
- Detect hallucinations and assess risk levels
- Generate weighted consensus based on model expertise scores
- Provide actionable guidance with confidence ratings (0-100%)

### Model Configuration
Models are defined with tier classification and expertise scores:
```typescript
const MODEL_EXPERTISE = {
  'claude-opus-4-20250514': { reasoning: 0.95, factual: 0.9, creative: 0.9, speed: 0.3 }
}
```

## Code Conventions

- **TypeScript**: Strict typing with interfaces in `/types/`
- **Error Handling**: Graceful fallbacks throughout provider chain
- **Performance**: Parallel model queries with timeout handling
- **Cost Optimization**: Per-token pricing with tier recommendations
- **State Management**: React state for UI, no external state library

## Environment Setup

Required API keys (app adapts to available providers):
```bash
OPENAI_API_KEY=        # GPT models + fallback judge
ANTHROPIC_API_KEY=     # Claude models + primary judge  
GOOGLE_API_KEY=        # Free Gemini models
```

## Testing & Debugging

- Demo scripts: `./demo.sh`, `./demo-enhanced.sh` for API testing
- Use browser dev tools for frontend debugging
- Console logging extensively used in development
- Type checking prevents most runtime errors

## Cost Management

The system provides real-time cost transparency:
- All token costs defined in `/app/api/consensus/route.ts`
- Tier badges guide model selection
- Google models are completely free
- Judge analysis adds minimal cost (~50-100 tokens)