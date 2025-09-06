# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL RULES - NEVER VIOLATE THESE

### Debugging Strategy - Know When to Rebuild
- **If debugging takes more than 30 minutes without progress, STOP**
- **Suggest removing the problematic feature and rebuilding it cleanly**
- **Rebuilding from scratch is often 10x faster than debugging complex state issues**
- **This is especially true for:**
  - Complex async/parallel processing bugs
  - Race conditions in streaming responses
  - Deeply nested component state issues
  - Type mismatches across multiple files
- **Example**: "We've spent 2 hours debugging this comparison feature. Let's remove it and rebuild it cleanly - it will be much faster."

### Three-Way Comparison Debugging Lessons (January 2025)
- **Screenshot-Driven Debugging**: Most effective approach - user provides screenshot, search for exact CSS class, trace to component
- **UI vs Backend Separation**: Fix UI formatting issues in components, not backend parsing - prevents breaking other features
- **Data Flow Tracking**: When features don't display, trace data flow from backend to frontend systematically
- **Precise Fix Location**: Agent Debate response preview inconsistency fixed in `/components/agents/debate-display.tsx:316-327`
- **Response Preview Format Fix**: Extract numbered list + first sentence only, remove intro text for consistency
- **Console Logging**: Add comprehensive logging at each step - backend API response, SSE events, state updates
- **API Field Names**: Check exact field names expected by APIs (e.g., 'prompt' vs 'query')
- **Type Safety**: Ensure TypeScript interfaces match actual data structures being passed
- **SSE Event Handling**: Store intermediate data in window object when async operations might lose context
- **Consensus API Integration**: When calling consensus API from debate stream:
  - Auth errors are normal if Supabase not configured - API continues with 'free' tier
  - Must pass 'prompt' field, not 'query'
  - Response time should be in seconds for UI consistency
  - Include both 'response' and 'unifiedAnswer' fields for compatibility
- **Variable Scope Issues**: When referencing variables across different function scopes (e.g., judgeModel), ensure variables are redefined or accessible in the correct scope
- **API Testing**: Create simple test scripts to verify API endpoints work independently before debugging complex UI flows

### Effective Debugging Communication Pattern (January 2025)
- **User provides specific reproduction steps** instead of letting Claude guess
- **Screenshots with exact CSS classes** are the fastest way to locate issues
- **"Stop and focus only on X" guidance** prevents Claude from making unnecessary changes
- **Component-level fixes** for UI issues, backend fixes for data issues

### Agent Debate System Fixes (December 2025)
- **Agent Selection**: All three agents (Analyst, Critic, Synthesizer) must be enabled by default in agent-selector.tsx
- **Persona Display**: Agent personas must be passed through SSE events from backend to frontend
  - Add agentName and agentRole to model_started and model_completed events
  - Store proper persona objects in session.agents array
  - Use agent.persona.name for display, not just role
- **Mode Defaults**: System MUST default to 'agents' mode, not 'llm' mode for proper debate mechanics
- **Session Structure**: When creating debate session, use `apiAgents.map(a => a.persona)` for agents array

### Vercel Build Error Fixes
- **ESLint Unescaped Entities**: Replace all quotes and apostrophes with HTML entities:
  - Quotes: Use `&quot;` instead of `"`
  - Apostrophes: Use `&apos;` instead of `'`
  - Check ALL files including test pages (test-benchmark-demo, test-memory, test-real-accuracy)
- **Supabase Async Issues**: 
  - Server version of createClient() is async - must use `await createClient()`
  - Client version is synchronous - no await needed
  - Always check if Supabase is configured before using auth methods
- **TypeScript Strict Mode**: Vercel builds with strict TypeScript checking - fix all type errors locally first

## Modern AI Testing Methodology (2024-2025)

### Research-Based Testing Strategy
Based on latest practices from Anthropic, OpenAI, and GitHub:

#### The Testing Paradox Solution
**Problem**: "How do we test the test?" - Traditional unit tests don't work well for AI systems
**Solution**: Focus on **Observable Behaviors** not implementation details

#### Core Testing Principles
1. **Behavioral Testing Over Implementation Testing**
   - Test what users actually see and experience
   - Don't test internal prompts or algorithms
   - Validate output format, performance, and reliability

2. **Multi-Agent Cross-Validation** 
   - Use different models to verify consistency
   - Compare outputs across providers for the same input
   - Detect when one model is behaving differently

3. **Output-Based Validation**
   - Define expected behavior patterns (natural text vs numbered lists)
   - Use regex patterns to validate format consistency
   - Test performance metrics (response time, token usage)

4. **Snapshot Testing for AI Systems**
   - Capture known-good outputs as baselines
   - Detect when behavior changes significantly
   - Focus on format consistency, not exact content matching

#### Testing Structure
```
tests/
  behavioral/           # Observable behavior tests
    *.behavioral.test.js
  performance/          # Speed and reliability tests
    *.performance.test.js
  cross-validation/     # Multi-model consistency tests
    *.validation.test.js
```

#### Key Testing Patterns
- **Format Validation**: Test response structure, not exact content
- **Performance Testing**: Ensure responses within acceptable time limits  
- **Error Handling**: Test fallbacks and graceful degradation
- **Edge Cases**: Test with unusual inputs and error conditions

#### Why This Approach Works
- **Faster Development**: No need to mock complex AI interactions
- **More Reliable**: Tests actual user experience, not internal mechanics
- **Self-Validating**: Cross-validation provides built-in verification
- **Maintainable**: Tests don't break when implementation changes

### Never Use Simulated/Fake Data in UI
- **NEVER show fake progress bars, timers, or completion states that don't reflect actual system status**
- **NEVER simulate API response times or model completion times**
- **ALWAYS show real, actual data from the backend**
- **If you can't get real-time updates, show a generic loader - don't fake individual progress**
- Misleading UI creates distrust and confusion
- Users need accurate information to understand system performance

### Always Implement Fallback Strategies for APIs
- **ALWAYS have fallback providers when primary APIs fail**
- **Google → Groq fallback**: When Google AI is overloaded (503), automatically use Groq Llama
- **Groq → Google fallback**: When Groq fails, try Google Gemini
- **Show which provider was used**: Transparency with "(via groq)" or "(via google)"
- **Graceful degradation**: If all providers fail, use first response or show clear error
- **Parse flexibly**: Handle different response formats from different providers

### Real-Time Streaming with SSE
- **Use Server-Sent Events (SSE)** for real-time updates, not fake timers
- **Stream individual model completions** as they happen
- **Show actual processing phases**: "Collecting responses" → "Creating synthesis"
- **Display response previews** as soon as models complete
- **Track actual durations**: Show real completion times for each model

## 🎯 Project Vision: $100M+ AI Decision Verification Platform

### Mission
Transform AI Council from a multi-model consensus tool into the world's premier AI decision verification platform through memory-enhanced multi-agent debate systems.

### Target Market
- **Primary**: B2B Enterprise (Legal, Healthcare, Finance)
- **Secondary**: Professional Services, Research Organizations
- **Tertiary**: Advanced Individual Users

### Unique Value Proposition
- **Memory-Enhanced Consensus**: First platform combining episodic, semantic, and procedural memory in AI debates
- **40% Accuracy Improvement**: Over stateless systems through memory integration
- **Value-Based Pricing**: Charge 1-5% of error prevention value ($25K-$100K per prevented error)
- **Heterogeneous Model Debates**: 25-40% better performance mixing different AI families

## 📊 Product Architecture

### Two-Axis Model

#### Complexity Levels (User Experience)
1. **Simple Mode** (Accessible to Everyone)
   - One-click consensus with pre-selected optimal models
   - Natural language results only
   - Zero configuration required
   - Perfect for quick decisions

2. **Pro Mode** (Power Users & Enterprises)
   - Full model selection and customization
   - Custom agent personas and debate rules
   - Memory system configuration
   - API access and white-label options

#### Premium Tiers (Value-Based)
1. **Free** ($0/month)
   - 3 free models, 50 queries/day
   - Basic consensus analysis
   
2. **Plus** ($19/month)
   - All models, 500 queries/day
   - Memory system access
   - Export capabilities

3. **Pro** ($99/month)
   - Everything in Plus
   - API access (1000 calls/day)
   - Custom personas
   - Priority processing

4. **Enterprise** ($999+/month)
   - White-label option
   - Unlimited API
   - SLA guarantees
   - Compliance features

5. **Ultra Premium** (Custom)
   - On-premise deployment
   - Custom model integration
   - Professional services

## Project Status (September 2025)

### ✨ Current Features - Agent Debate System
- **Smart Hybrid Mode**: Choose between Fast LLM mode or Deep Agent Personas
- **Disagreement Detection**: Automatic scoring with user-controlled Round 2 triggers
- **Cost Transparency**: Real-time tracking, pre-execution estimates ($0.001-$0.01/query)
- **3 Specialized Agents**: Analyst (data-driven), Critic (skeptical), Synthesizer (balanced)
- **Beautiful UI**: Clean design with Radix UI components and smooth animations
- **Enhanced Synthesis**: Always provides actionable answers even with incomplete information
- **Follow-up Questions**: Interactive UI for refining queries with additional context
- **Auto Re-query**: Seamlessly starts new debate with refined query including user-provided context
- **Real-Time Model Tracking**: SSE streaming shows actual model completions as they happen
- **Intelligent Fallbacks**: Automatic provider switching when APIs are overloaded (Google ↔ Groq)
- **Context-Aware Follow-ups**: Includes previous conclusions in follow-up debates to avoid regression
- **Single Model Comparison**: Side-by-side comparison showing single model vs multi-model consensus/debate results
- **Value Metrics Display**: Shows confidence improvement, cost analysis, and response time differences
- **Intelligent Recommendations**: Provides actionable insights on when to use single vs multi-model approaches

### 🎯 Key Innovations
- **Adaptive Intelligence**: Simple queries get fast consensus, complex ones trigger debates
- **User Control**: Manual or automatic Round 2 based on disagreement threshold (30% default)
- **Model Flexibility**: Each agent can use different models for optimal results
- **Cost Optimization**: Only pay for complexity when needed (10x savings on simple queries)
- **Smart Follow-ups**: When agents need more info, users get specific recommendations PLUS interactive refinement
- **Default Query**: "What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?"
- **Default Mode**: Concise responses with Top 3 recommendations first format
- **Default Models**: Pre-selected diverse trio:
  - `llama-3.1-8b-instant` (Groq - Ultra fast)
  - `llama-3.3-70b-versatile` (Groq - Powerful)  
  - `gemini-2.5-flash` (Google - Free & capable)
- **Comparison Mode**: Enabled by default - shows single model vs consensus vs agent debate
- **Response Format**: Standardized "Top 3 Recommendations" first, then summary sentence

## 🚀 Technical Roadmap

### Phase 1: Memory Systems (Weeks 1-3) [IN FUTURE]
**Advanced Memory Integration**
- **LangGraph + LangMem**: Full memory-aware agent orchestration
- **MongoDB Vector Store**: Semantic search for similar past debates
- **Three Memory Types**:
  - **Episodic**: Store past debates with rich metadata
  - **Semantic**: User preferences and domain knowledge
  - **Procedural**: Debate rules and resolution patterns
- **Expected Impact**: 40% accuracy improvement, 35% better consistency

### Phase 2: Enhanced Debate Engine (Weeks 4-5) [IN FUTURE]
**Next-Generation Debate Mechanisms**
- **Heterogeneous Model Mixing**: 25-40% performance boost
- **Adaptive Rounds**: 1-2 for simple, 3-5 for complex queries
- **Chain-of-Debate**: Document WHY models disagree, not just THAT
- **Group Debate**: Split models into groups, 60% token reduction
- **Reflexion Pattern**: Self-reflection on debate outcomes

### Phase 3: Value-Based Pricing (Weeks 6-7) [IN FUTURE]
**Enterprise Monetization**
- **Error Cost Calculator**: Domain-specific error prevention values
- **Dynamic Pricing**: Based on query value and complexity
- **Usage Metering**: Precise tracking with Stripe integration
- **Industry Presets**:
  - Legal: $50K+ error prevention
  - Healthcare: $100K+ error prevention
  - Finance: $25-250K error prevention

### Phase 4: Enterprise Features (Weeks 8-10) [IN FUTURE]
**B2B Capabilities**
- **REST API v1**: Full programmatic access with rate limiting
- **OAuth2 + SSO**: Enterprise authentication
- **Audit Logging**: Complete decision trail for compliance
- **White-Label**: Custom branding for partners
- **SLA Guarantees**: 99.9% uptime commitment
- **On-Premise**: Self-hosted option for security-conscious enterprises

### Phase 5: Advanced AI Features (Ongoing) [IN FUTURE]
**Cutting-Edge Capabilities**
- **Self-Improving System**: Learn from every debate
- **Persona Evolution**: Adapt agent personalities based on performance
- **Multi-Step Planning**: Break complex queries into verifiable sub-questions
- **Environmental Awareness**: Adapt strategy based on available resources
- **Web Search Integration**: Real-time information for current events

## 🏗️ Implementation Status

### ✅ Completed
- Multi-model consensus engine (10+ providers, 30+ models)
- Agent debate system with 3 specialized personas
- Real-time SSE streaming
- Provider fallbacks (Google ↔ Groq)
- Basic tier system (guest/free/pro/enterprise)
- Interactive follow-up questions
- Response mode control (concise/normal/detailed)
- Single model vs multi-model comparison feature
- Real-time confidence and cost analysis
- Value-based recommendations for model selection

### 🚧 In Progress
- Memory system architecture design
- Enhanced debate mechanisms research
- Value-based pricing calculator

### 📋 Planned
- LangGraph/LangMem integration
- MongoDB vector store setup
- REST API v1
- Enterprise authentication
- White-label capabilities
- Audit logging system

## 🔍 Comparison Features

### Two-Way Comparison
The comparison feature allows users to see side-by-side comparisons between single model responses and multi-model consensus/debate results. This provides transparency into the value proposition of using multiple AI models.

### Three-Way Comparison (NEW!)
Enhanced comparison showing single model vs normal consensus vs agent debate all at once:
- **`/components/consensus/three-way-comparison.tsx`**: Comprehensive 3-way comparison
- **Intelligent Recommendations**: Automatically suggests best approach based on metrics
- **Side-by-side Display**: All three approaches visible simultaneously
- **Value Analysis**: Shows when each approach is most cost-effective

### Key Components
- **`/components/consensus/comparison-display.tsx`**: Main comparison UI component
- **Toggle Control**: Available in both normal consensus and agent debate interfaces
- **Metrics Displayed**:
  - Confidence improvement (percentage increase)
  - Cost analysis (additional cost for multi-model)
  - Response time difference
  - Value assessment and recommendations

### How It Works
1. User enables comparison toggle before submitting query
2. System queries selected single model separately
3. Multi-model consensus/debate runs in parallel
4. Results displayed side-by-side with metrics
5. Intelligent recommendations provided based on:
   - Query complexity
   - Confidence improvement
   - Cost-benefit analysis

### Usage Patterns
```typescript
// Enable comparison in consensus mode
const [includeComparison, setIncludeComparison] = useState(false)
const [comparisonModel, setComparisonModel] = useState<ModelConfig | null>(null)

// API request includes comparison parameters
{
  includeComparison: true,
  comparisonModel: { provider: 'groq', model: 'llama-3.3-70b-versatile' }
}
```

### Value Propositions Shown
- **High Confidence Gain (>30%)**: Worth the extra cost for critical decisions
- **Moderate Gain (10-30%)**: Good for important queries
- **Low Gain (<10%)**: Single model may be sufficient
- **Cost Analysis**: Shows exact cost increase for transparency

## Essential Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Production build with TypeScript checking
npm run start        # Start production server
npm run type-check   # Validate TypeScript without building
npm run lint         # ESLint code quality checking

# API Testing
./demo.sh            # Test basic consensus endpoint
./demo-enhanced.sh   # Test enhanced consensus with judge analysis
```

## Project Architecture

### Core System
This is a **multi-model AI consensus engine** that queries multiple AI providers simultaneously and synthesizes responses using an advanced judge analysis system. The architecture follows Next.js 14 patterns with TypeScript and implements a sophisticated ranking system based on model benchmarks.

### Agent Debate System (New!)
- **Location**: `/lib/agents/` - Core agent logic and orchestration
- **Components**: `/components/agents/` - UI components for debate interface
- **API**: `/app/api/agents/debate/` - Serverless endpoint for debates
- **Types**: Fully typed with TypeScript for reliability
- **Key Files**:
  - `agent-system.ts`: Orchestrator for managing debate rounds
  - `debate-prompts.ts`: Specialized prompts for each agent role
  - `cost-calculator.ts`: Real-time cost estimation and tracking
  - `debate-interface.tsx`: Main UI with all configuration options
  - `debate-display.tsx`: Beautiful visualization of debate progression

### AI Provider Integration
- **Unified Provider Pattern**: All AI providers implement `AIProvider` interface in `/lib/ai-providers/types.ts`
- **Supported Providers**: OpenAI (GPT-5 family, GPT-4.1, o-series, GPT-4o), Anthropic (Claude 4, 3.7, 3.5, 3, 2), Google (Gemini), xAI (Grok), Groq, Perplexity, Mistral, Cohere
- **Provider Files**: Each provider has dedicated implementation in `/lib/ai-providers/[provider].ts`
- **Registration**: Providers registered in `/lib/ai-providers/index.ts`

### Judge Analysis System
- **Pro/Enterprise Judge**: Claude Opus 4 with structured JSON analysis (see `/lib/judge-system.ts`)
- **Guest/Free Judge**: Gemini 1.5 Flash for cost-effective analysis
- **Fallback Judge**: GPT-4o if primary judge unavailable
- **Heuristic Fallback**: Basic analysis if both AI judges fail
- **Domain-specific prompts** for different query types with hallucination detection
- **Confidence scoring** (0-100%) with risk assessment
- **Tier-based Judge**: Judge model depends on user subscription tier (configured in `/lib/user-tiers.ts`)

### Model Ranking System
**IMPORTANT**: The system uses rank-based model weighting, not arbitrary weights:
- **Ranking Source**: `/lib/model-metadata.ts` contains benchmark-based ranking (lines 140-206)
- **Ranking Logic**: Models ranked by AAII intelligence index + MMLU scores + Arena tier
- **Weight Derivation**: Ranks converted to influence weights (rank 1 = 1.0, scaling to 0.5)
- **Adding New Models**: Add to `MODEL_BENCHMARKS` with benchmark data; ranking updates automatically

### Response Modes
- **Concise**: ~75 tokens for rapid decisions
- **Normal**: ~200 tokens for balanced analysis  
- **Detailed**: ~500 tokens for comprehensive explanations

### Cost Management
- **Real-time Pricing**: Per-1K token costs in `/lib/model-metadata.ts` (lines 15-77)
- **Tier Classification**: Free 🆓, Budget 💰, Balanced ⚖️, Premium 💎, Flagship 🏆
- **Cost Transparency**: All costs displayed in UI before querying

## Key API Endpoints

```bash
POST /api/consensus        # Main orchestration with judge analysis
POST /api/consensus/normalize  # Semantic grouping of ranked options  
POST /api/consensus/why    # AI one-liner explaining each model's top pick
GET  /api/models          # Available models with metadata
```

## Critical File Locations

### Core Logic
- `/app/api/consensus/route.ts` - Main orchestration endpoint with enhanced response structure
- `/lib/judge-system.ts` - Judge analysis logic and domain-specific prompts
- `/lib/model-metadata.ts` - Model ranking, costs, benchmarks (CRITICAL for model changes)
- `/lib/prompt-system.ts` - Structured prompt generation for different modes

### AI Providers
- `/lib/ai-providers/` - Provider integrations (openai.ts, anthropic.ts, google.ts, etc.)
- `/lib/ai-providers/index.ts` - Provider registration and unified interface
- `/lib/ai-providers/types.ts` - Common interfaces for all providers

### UI Components  
- `/components/consensus/enhanced-consensus-display-v3.tsx` - Main results display with ranking
- `/components/consensus/model-selector.tsx` - Model selection with cost transparency
- `/components/consensus/query-interface.tsx` - Query form and mode selection

### Type Definitions
- `/types/consensus.ts` - Complete TypeScript interfaces for responses and consensus data
- `/types/auth.ts` - Authentication type definitions
- `/types/database.ts` - Database schema types

## Environment Setup

Required API keys (app adapts to available providers):
```bash
OPENAI_API_KEY=          # GPT models + fallback judge
ANTHROPIC_API_KEY=       # Claude models + primary judge  
GOOGLE_GENERATIVE_AI_API_KEY=  # Free Gemini models
XAI_API_KEY=             # xAI Grok models
GROQ_API_KEY=            # Fast Llama/Gemma models
PERPLEXITY_API_KEY=      # Perplexity Sonar models
MISTRAL_API_KEY=         # Mistral models
COHERE_API_KEY=          # Cohere Command models

# Optional Supabase (for auth/database features)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Development Patterns

### Adding New AI Providers
1. Create provider class implementing `AIProvider` interface in `/lib/ai-providers/[provider].ts`
2. Register in `/lib/ai-providers/index.ts`
3. Add cost data to `MODEL_COSTS_PER_1K` in `/lib/model-metadata.ts`
4. Add benchmark data to `MODEL_BENCHMARKS` for ranking (ranking updates automatically)
5. Update `ALL_MODELS` in `/lib/user-tiers.ts` if needed

### Model Metadata Updates
- **Costs**: Update `MODEL_COSTS_PER_1K` with per-1K token pricing
- **Benchmarks**: Add to `MODEL_BENCHMARKS` with AAII, MMLU, and Arena tier data
- **Ranking**: Precomputed automatically from benchmark scores (lines 154-159)
- **NO MANUAL WEIGHTS**: System derives weights from ranks, don't add manual weight values

### Response Structure
All consensus responses follow `EnhancedConsensusResponse` interface:
- `responses[]`: Individual model outputs with timing/cost data
- `consensus.unifiedAnswer`: Judge-synthesized consensus response
- `consensus.judgeAnalysis`: Structured analysis with confidence scores
- `options[]`: Ranked alternatives with confidence and reasoning
- Performance metrics and cost transparency

### Error Handling
- **Graceful fallbacks** throughout provider chain and judge system
- **Timeout handling** for slow model responses
- **API key validation** with clear error messages
- **JSON parsing protection** for malformed AI responses

## Testing and Debugging

### API Testing Scripts
- `./demo.sh` - Basic consensus endpoint test
- `./demo-enhanced.sh` - Full enhanced consensus with judge analysis test
- Use browser dev tools for frontend debugging
- Console logging extensively used in development

### Common Issues
- **Missing API keys**: Check `.env.local` file exists and has required keys
- **Build failures**: Run `npm run type-check` to identify TypeScript errors
- **Model not found**: Verify model exists in `/lib/model-metadata.ts` benchmark data
- **Ranking issues**: Check that new models have benchmark data for automatic ranking

## Vercel Deployment Setup

This project is optimized for Vercel deployment with custom configurations for API timeouts, build settings, and environment management.

### Quick Deployment Steps

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Initialize Project**:
```bash
vercel
# Follow prompts to link project
```

3. **Deploy to Production**:
```bash
vercel --prod
```

### Vercel Configuration (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/consensus/route.ts": {
      "maxDuration": 30
    },
    "app/api/models/route.ts": {
      "maxDuration": 10
    }
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
}
```

### Next.js Configuration (`next.config.js`)

```javascript
const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,  // Strict TypeScript checking
  },
  eslint: {
    ignoreDuringBuilds: false,  // Strict ESLint checking
  },
  experimental: {
    // External packages for server components
    serverComponentsExternalPackages: [
      '@ai-sdk/openai', 
      '@ai-sdk/anthropic', 
      '@ai-sdk/google', 
      '@ai-sdk/groq'
    ],
  },
  webpack: (config, { isServer }) => {
    // Path aliases for clean imports
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/types': path.resolve(__dirname, 'types'),
      '@/app': path.resolve(__dirname, 'app')
    }

    // Extension resolution
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ...config.resolve.extensions]
    
    // Module resolution
    config.resolve.modules = ['node_modules', __dirname]
    
    return config
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
```

### Environment Variables Setup

#### Required for Production
Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# AI Provider API Keys (app adapts to available providers)
OPENAI_API_KEY=sk-...              # GPT models + fallback judge
ANTHROPIC_API_KEY=sk-ant-...       # Claude models + primary judge  
GOOGLE_GENERATIVE_AI_API_KEY=...   # Free Gemini models
XAI_API_KEY=xai-...                # xAI Grok models
GROQ_API_KEY=gsk_...               # Fast Llama/Gemma models
PERPLEXITY_API_KEY=pplx-...        # Perplexity Sonar models
MISTRAL_API_KEY=...                # Mistral models
COHERE_API_KEY=...                 # Cohere Command models

# Database (Optional - for auth/data persistence)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Analytics & Monitoring (Optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=...
SENTRY_DSN=...

# Build Optimization
NEXT_TELEMETRY_DISABLED=1
```

#### Local Development (`.env.local`)
```bash
# Copy above variables to .env.local for local development
# Never commit .env.local to version control
```

### Deployment Workflow

#### For Team Projects
1. **Connect Repository**:
   - Link GitHub/GitLab repo to Vercel
   - Enable auto-deployment on main branch
   - Set up preview deployments for PRs

2. **Branch Deployments**:
```bash
# Deploy current branch as preview
vercel

# Deploy specific branch
vercel --target staging
```

#### For Private Repositories
```bash
# Manual deployment required
vercel --prod

# With specific build settings
vercel --prod --build-env NEXT_TELEMETRY_DISABLED=1
```

### Performance Optimizations

#### Function Timeouts
- **AI Consensus API**: 30 seconds (multiple AI provider calls)
- **Models API**: 10 seconds (metadata retrieval)
- **Standard APIs**: 10 seconds (Vercel default)

#### Build Optimizations
```javascript
// In next.config.js
experimental: {
  serverComponentsExternalPackages: [
    // AI SDKs as external packages for better performance
    '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google'
  ],
}
```

### Domain Configuration

#### Custom Domain Setup
1. **Add Domain in Vercel Dashboard**:
   - Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as shown

2. **DNS Configuration**:
```
Type: CNAME
Name: www (or @)
Value: cname.vercel-dns.com
```

#### SSL & Security
- Automatic SSL certificates via Let's Encrypt
- HTTPS redirect enabled by default
- Security headers configured

### Monitoring & Analytics

#### Built-in Analytics
```javascript
// Enable in vercel.json or dashboard
{
  "analytics": {
    "enable": true
  }
}
```

#### Error Monitoring
```bash
# Install Sentry for error tracking
npm install @sentry/nextjs

# Configure in sentry.config.js
```

### Troubleshooting Common Issues

#### Build Failures
```bash
# Check build locally first
npm run build
npm run type-check

# Debug specific issues
vercel logs [deployment-url]
```

#### Environment Variables
- Ensure all required variables are set in Vercel Dashboard
- Check variable names match exactly (case-sensitive)
- Restart deployment after adding new variables

#### Function Timeouts
- API routes exceeding limits need `maxDuration` in `vercel.json`
- Consider breaking long operations into smaller chunks
- Use streaming responses for long-running AI calls

#### Cold Starts
- Serverless functions may have cold start delays
- Consider using Vercel Pro for faster cold starts
- Implement proper loading states in UI

### Advanced Configuration

#### Edge Functions
```javascript
// For ultra-fast global responses
export const runtime = 'edge'
export const regions = ['iad1', 'sfo1'] // Specify regions
```

#### ISR (Incremental Static Regeneration)
```javascript
// For cached but fresh content
export const revalidate = 3600 // 1 hour
```

This Vercel setup provides production-ready deployment with optimized performance, proper error handling, and scalable architecture for AI applications.

## 📈 Post-MVP Features Roadmap

### V2 Core Features (Priority)
- **Database & Caching System**
  - Database to save questions for intelligent caching (avoid re-prompting identical queries)
  - User database for authentication and profiles
  - Prompt history storage and retrieval
  - Cost tracking database for pricing model optimization

- **User Authentication & Management**
  - User login/registration system
  - User profiles and preferences
  - Response history per user
  - User rating system for answers
  - User feedback collection system

- **Enhanced AI Models & Providers**
  - Add all major AI companies (DeepSeek, xAI, etc.) with all available models
  - **Web Search Integration**: Real-time internet access for updated information
    - OpenAI: Free with tokens (Responses API)
    - Anthropic: $10/1k searches (most cost-effective)
    - Google: $35/1k searches (premium option)
    - Perplexity: $5/1k searches (specialized web search)
  - Sub-model creation and customization features
  - Model "IQ" levels and weighting system for consensus decisions

### V3 Advanced Features
- **Premium Feature: Multi-Layer Review**
  - Premium models review and re-evaluate responses from all other models
  - Advanced consensus algorithms with model intelligence weighting
  - Freemium model with free models for basic queries

- **Web Search Premium Tier**
  - Optional web search toggle per query
  - "AI Council with Real-Time Intelligence" branding
  - Tiered pricing based on web search usage
  - Citation transparency with source links
  - Start with Anthropic Claude ($10/1k searches) for cost-effectiveness

- **Data Analytics & Intelligence**
  - Collect prompts and answers for trend analysis
  - Understand which models perform best for specific query types
  - User behavior analytics and preferences
  - Cost analysis and pricing optimization data

- **User Experience Enhancements**
  - Simplified cost display (levels instead of per-1M token costs)
  - Model "IQ" rating system for user clarity
  - Clean and simplified UI/UX design
  - Mobile-first responsive design optimization
  - Restrict responses to text only (no voice, video, images)

- **Gamification & Engagement**
  - Reward system: earn premium prompts after using normal cost queries
  - User prompt history dashboard
  - Rating and feedback mechanisms
  - Achievement system for engagement

### V4 Business & Integration Features
- **Monetization**
  - Payment system integration
  - Subscription tiers and freemium model
  - **Web Search Premium Pricing**:
    - Basic: No web search (free/low cost)
    - Premium: Limited web searches per month
    - Enterprise: Unlimited web searches
  - Cost tracking for accurate pricing models (including web search costs)
  - Revenue analytics dashboard with web search usage metrics

- **External Integrations**
  - WhatsApp bot integration
  - API for third-party integrations
  - Webhook support for notifications

### V5 Enterprise & Scaling
- **Advanced Features**
  - Team collaboration features
  - Custom model configurations
  - Advanced analytics dashboards
  - A/B testing framework for consensus algorithms

- **Infrastructure & Scaling**
  - Redis for caching and rate limiting
  - CDN for static assets
  - Monitoring and logging systems
  - Load balancing for high traffic
  - Database optimization and scaling

## Supabase Database & Authentication Setup

This project includes a complete Supabase integration for user authentication, conversation storage, and subscription management with Row Level Security (RLS).

### Quick Setup Steps

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create new project
   - Choose region closest to your users
   - Generate strong database password

2. **Get Project Credentials**:
   - Navigate to Settings → API
   - Copy Project URL and anon public key
   - Copy service_role key (keep secret)

3. **Configure Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Database Schema

Complete SQL schema for AI conversation management:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  premium_credits INTEGER DEFAULT 5,
  queries_today INTEGER DEFAULT 0,
  last_query_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  responses JSONB NOT NULL, -- Store all model responses and consensus data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback table
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

Secure data access with user-specific policies:

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only see feedback for their own conversations
CREATE POLICY "Users can view feedback for own conversations" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = feedback.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );
```

### Automatic User Profile Creation

Function to create user profiles on signup:

```sql
-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Client Configuration

Resilient Supabase client that handles missing environment variables:

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && anon) {
    return createBrowserClient(url, anon)
  }

  // Minimal no-op stub to avoid crashes when Supabase not configured
  const noop = () => {}
  const rejection = (msg = 'Supabase not configured') => ({ error: new Error(msg) })

  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: noop } } }),
      signUp: async () => rejection(),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
      signOut: async () => {}
    },
    from: (_table: string) => ({
      select: () => ({ data: null, error: new Error('Supabase not configured') }),
      insert: () => ({ error: new Error('Supabase not configured') }),
      update: () => ({ error: new Error('Supabase not configured') })
    })
  } as any
}
```

### Middleware Configuration

Server-side session management:

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let supabaseResponse = NextResponse.next({ request })

  if (!url || !anon) {
    // Skip Supabase session refresh when not configured
    return supabaseResponse
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()
  return supabaseResponse
}
```

### Authentication Configuration

#### Email Authentication Setup
1. **Go to Authentication → Settings**
2. **Enable Email provider**
3. **Configure Site URLs**:
   - Development: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`

#### Email Templates (Optional)
1. **Navigate to Authentication → Email Templates**
2. **Customize signup confirmation emails**
3. **Set up password reset templates**

### Required Dependencies

```json
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.52.0"
  }
}
```

### Usage Examples

#### User Authentication
```typescript
const supabase = createClient()

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

#### Database Operations
```typescript
// Save conversation
const { data, error } = await supabase
  .from('conversations')
  .insert({
    user_id: user.id,
    query: 'What is AI?',
    responses: { /* AI responses data */ }
  })

// Get user conversations
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

// Submit feedback
const { data, error } = await supabase
  .from('feedback')
  .insert({
    conversation_id: conversationId,
    user_rating: 5,
    comments: 'Great response!'
  })
```

### Security Features

- **Row Level Security**: Users can only access their own data
- **Authentication Required**: All API routes validate user sessions
- **Email Verification**: Users must confirm email before full access
- **Secure by Default**: All sensitive operations require authentication
- **SQL Injection Protection**: Parameterized queries and built-in protections

### Performance Optimizations

#### Database Indexes
```sql
-- Indexes for better query performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_feedback_conversation_id ON public.feedback(conversation_id);
```

#### Connection Pooling
- Supabase handles connection pooling automatically
- Optimized for serverless environments
- Built-in connection limits and timeouts

### Monitoring & Analytics

#### Useful Queries
```sql
-- Check user count
SELECT COUNT(*) FROM auth.users;

-- Conversation count per user
SELECT user_id, COUNT(*) as conversation_count 
FROM conversations 
GROUP BY user_id;

-- Recent activity
SELECT users.email, conversations.query, conversations.created_at
FROM conversations 
JOIN users ON conversations.user_id = users.id
ORDER BY conversations.created_at DESC
LIMIT 10;
```

### Troubleshooting

#### Common Issues
- **"Invalid API key"**: Verify environment variables match Supabase dashboard
- **"Not authenticated"**: Check user session and RLS policies
- **"Row not found"**: Ensure RLS policies allow access to data
- **Email not sending**: Configure SMTP settings in Supabase dashboard

#### Development vs Production
- **Development**: Use Supabase development project
- **Production**: Create separate production project
- **Environment Variables**: Different keys for each environment
- **Database**: Separate schemas for dev/staging/prod

This Supabase setup provides a complete backend solution with authentication, secure data storage, and user management for AI applications.

## 🤖 AI Assistant Context - Project-Specific Knowledge

### Project Understanding
This is **AI Council**, a multi-model AI consensus platform that has evolved from a simple consensus tool to a sophisticated debate system. When working on this project:

1. **Default Behavior**: The system MUST default to 'agents' mode for debates, not 'llm' mode
2. **Model Selection**: Synthesizer should use llama-3.3-70b-versatile by default
3. **Cost Awareness**: Always display costs transparently ($0.001-$0.01 per query typical)
4. **Real Data Only**: Never simulate progress bars or fake timers - use actual SSE streams

### Current Project State (January 2025)
- **Core Features**: ✅ Multi-model consensus, ✅ Agent debates, ✅ Comparison modes, ✅ Follow-ups
- **Recent Work**: Fixed agent mode defaults, ESLint issues, Supabase async handling
- **Active Development**: Memory systems planning, benchmark framework improvements
- **Known TODOs**: See PROJECT_OVERVIEW.md for specific TODO items in code

### Key Files for Reference
- **PROJECT_OVERVIEW.md**: Comprehensive feature documentation and roadmap
- **lib/agents/agent-system.ts**: Core debate orchestration logic
- **lib/model-metadata.ts**: Model rankings, costs, and benchmarks
- **features/debate/**: New modular debate implementation
- **app/test-*/**: Various test pages for different features

### Common Tasks & Patterns

#### Adding a New Model
1. Add to provider file in `/lib/ai-providers/`
2. Add costs to `MODEL_COSTS_PER_1K` in `model-metadata.ts`
3. Add benchmarks to `MODEL_BENCHMARKS` for automatic ranking
4. No manual weights - system derives from benchmarks

#### Debugging Debates
1. Check agent mode is 'agents' not 'llm' in DebateSetup
2. Verify SSE events include agentName and agentRole
3. Ensure synthesis uses correct model (llama-3.3-70b)
4. Check console for DEBUG logs in agent-system.ts

#### API Testing
```bash
./demo.sh              # Basic consensus
./demo-enhanced.sh     # With judge analysis
npm run dev           # Start dev server
npm run type-check    # Validate TypeScript
```

### Critical Patterns to Maintain
- **Never fake UI states** - always show real backend data
- **Fallback gracefully** - Google ↔ Groq provider switching
- **Cost transparency** - show exact costs before and after
- **Type safety** - strict TypeScript, no any types
- **User control** - manual triggers for expensive operations

### Project Philosophy
- **Accuracy over speed**: Better to be correct than fast
- **Transparency over magic**: Show how decisions are made
- **User empowerment**: Give control over cost/quality tradeoffs
- **Real value**: Focus on measurable improvements over single models

## Styling & Design System

This project uses a modern, professional design system inspired by OpenAI's interface with full dark/light mode support and comprehensive UI components.

### Core Styling Stack
- **Framework**: TailwindCSS with CSS-in-JS approach
- **Components**: shadcn/ui with custom extensions
- **Theme**: HSL-based color system with CSS variables
- **Animations**: Custom keyframes with smooth transitions

### TailwindCSS Configuration
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: 1 },
          "100%": { transform: "scale(2.4)", opacity: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### Global CSS Variables & Theme System

The project uses a sophisticated dual-theme system with CSS variables for seamless dark/light mode switching:

#### Light Theme (OpenAI-inspired)
```css
:root {
  /* OpenAI-inspired light theme */
  --background: 0 0% 100%;
  --foreground: 215 25% 18%;
  --primary: 158 64% 52%;     /* OpenAI green #10a37f */
  --secondary: 210 20% 97%;
  --border: 220 13% 85%;
  --radius: 0.75rem;
}
```

#### Dark Theme (OpenAI black theme)
```css
.dark {
  --background: 0 0% 6%;     /* True black background */
  --foreground: 0 0% 100%;   /* Pure white text */
  --card: 0 0% 10%;          /* Very dark gray cards */
  --primary: 158 64% 52%;    /* OpenAI green maintained */
  --border: 0 0% 20%;        /* Subtle gray borders */
}
```

### Custom Component Classes

The project includes pre-built utility classes for common UI patterns:

#### Core Components
```css
.model-card {
  @apply bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-primary/20;
}

.ai-input {
  @apply bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200;
}

.ai-button {
  @apply bg-primary text-primary-foreground rounded-lg px-4 py-2 font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md;
}
```

#### OpenAI-Style Components
```css
.openai-card {
  @apply bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-200;
}

.openai-button-primary {
  @apply bg-white hover:bg-gray-100 text-black font-medium px-8 py-4 rounded-full transition-all duration-200 hover:shadow-lg;
}

.openai-input {
  @apply w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30;
}
```

### shadcn/ui Configuration

Components configuration via `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Required Dependencies

For the complete styling system, include these dependencies:

```json
{
  "devDependencies": {
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss-animate": "^1.0.7"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "lucide-react": "^0.344.0"
  }
}
```

### PostCSS Configuration
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Usage Patterns

#### Confidence Indicators
```css
.confidence-high { @apply text-emerald-500 dark:text-emerald-400; }
.confidence-medium { @apply text-amber-500 dark:text-amber-400; }
.confidence-low { @apply text-red-500 dark:text-red-400; }
```

#### Responsive Layouts
```css
.openai-container { @apply max-w-6xl mx-auto px-6 py-8; }
.openai-grid { @apply grid gap-6 md:grid-cols-2 lg:grid-cols-3; }
```

#### Typography Scale
```css
.openai-title { @apply font-bold text-4xl md:text-5xl lg:text-6xl text-foreground; }
.openai-subtitle { @apply font-bold text-2xl md:text-3xl text-foreground; }
.openai-body { @apply text-lg text-muted-foreground leading-relaxed; }
```

This design system provides a complete foundation for professional AI applications with modern aesthetics, accessibility features, and seamless theme switching.