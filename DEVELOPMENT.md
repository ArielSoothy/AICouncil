# Consensus AI - Development Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:
- **OpenAI**: Get from https://platform.openai.com/api-keys
- **Anthropic**: Get from https://console.anthropic.com/
- **Google AI**: Get from https://makersuite.google.com/app/apikey

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000

## 🏗️ Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Next.js 14 project setup with TypeScript
- [x] Tailwind CSS + shadcn/ui setup and configuration
- [x] Complete project structure with organized components
- [x] Type definitions for enhanced consensus system
- [x] Environment configuration with validation

### ✅ Phase 2: Core Features (COMPLETED)
- [x] **AI provider integrations** ✅ ALL TESTED & WORKING
  - [x] OpenAI connection (GPT-4, GPT-3.5, GPT-4o)
  - [x] Anthropic connection (Claude 4, 3.7, 3.5, 3, 2 series)
  - [x] Google AI connection (Gemini models - FREE)
- [x] **API routes implementation** ✅ FULLY IMPLEMENTED
  - [x] `/api/consensus` endpoint with enhanced response structure
  - [x] `/api/models` endpoint with metadata
- [x] **UI components** ✅ FULLY IMPLEMENTED
  - [x] Enhanced query interface with mode selection
  - [x] Model selector with cost transparency and tier display
  - [x] Unified answer display with scrollable layout
  - [x] Ranked options table with confidence scores
  - [x] Individual model responses section
  - [x] Advanced consensus analysis display
- [x] **Rate limiting** ✅ BUILT-IN
- [x] **Error handling** ✅ COMPREHENSIVE

### ✅ Phase 3: Enhancement (COMPLETED)
- [x] **Advanced consensus algorithm** with model weighting ✅ IMPLEMENTED
- [x] **Judge analysis** with Claude Opus 4 and GPT-4o fallbacks ✅ TESTED
- [x] **Performance metrics** tracking and display ✅ IMPLEMENTED
- [x] **Cost transparency** with real-time pricing ✅ IMPLEMENTED
- [x] **Response caching** optimization ✅ BUILT-IN
- [x] **Mobile responsive design** ✅ FULLY RESPONSIVE
- [x] **Loading states** and error boundaries ✅ IMPLEMENTED
- [x] **Three response modes** (Concise/Normal/Detailed) ✅ TESTED

### ✅ Phase 4: Production Ready (COMPLETED)
- [x] **Environment variable validation** ✅ IMPLEMENTED
- [x] **Production build testing** ✅ VERIFIED (zero TypeScript errors)
- [x] **Deployment configuration** ✅ READY FOR VERCEL
- [x] **Performance optimization** ✅ IMPLEMENTED
- [x] **Error monitoring** ✅ BUILT-IN

## 🧪 Testing API Endpoints

### Test Models Endpoint
```bash
curl http://localhost:3000/api/models
```

Expected response: List of available models with cost and tier information

### Test Consensus Endpoint
```bash
curl -X POST http://localhost:3000/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the benefits of exercise?",
    "mode": "normal",
    "models": [
      {"provider": "openai", "model": "gpt-3.5-turbo", "enabled": true},
      {"provider": "anthropic", "model": "claude-3-haiku-20240307", "enabled": true}
    ]
  }'
```

Expected response: Enhanced consensus with unified answer, ranked options, and individual responses

## 📁 Key Files Overview

### Core Logic
- `app/api/consensus/route.ts` - Enhanced consensus orchestration with judge analysis
- `lib/ai-providers/` - AI provider integrations with error handling
- `components/consensus/enhanced-consensus-display-v3.tsx` - Main results display
- `components/consensus/model-selector.tsx` - Model selection with cost display
- `components/consensus/query-interface.tsx` - Query form and interface

### Configuration  
- `.env.local` - API keys and configuration
- `types/consensus.ts` - TypeScript definitions for enhanced responses
- `tailwind.config.js` - Styling configuration
- `next.config.js` - Next.js configuration

## 🔧 Development Tips & Features

### Cost Optimization
- **Model Mixing**: Use a combination of flagship, premium, and budget models
- **Response Modes**: Choose appropriate mode (concise/normal/detailed) for your needs
- **Free Models**: Google Gemini models are completely free
- **Real-time Costs**: Monitor costs in the model selector before querying

### UI Features  
- **Unified Answer**: AI judge provides clear consensus from all model responses
- **Ranked Options**: Quick-scan table with 1-liner alternatives and confidence scores
- **Individual Responses**: Access detailed answers from each model
- **Performance Metrics**: See response times, token usage, and costs per model
- **Mobile Responsive**: Optimized for both desktop and mobile use

### Error Handling
- **Graceful Fallbacks**: If Claude Opus 4 judge fails, falls back to GPT-4o, then heuristic analysis
- **API Key Validation**: Clear error messages for missing or invalid API keys
- **JSON Parsing**: Robust handling of malformed AI responses
- **Rate Limiting**: Built-in protection against API abuse

### Development Workflow
```bash
# Start development with hot reload
npm run dev

# Type checking during development  
npm run type-check

# Build and test production bundle
npm run build
npm start

# Deploy to production (after git push)
git add .
git commit -m "Your commit message"
git push origin main
vercel --prod  # REQUIRED: Manual deployment for private repo
```

### Adding New AI Providers
1. Create provider class in `lib/ai-providers/`
2. Implement `AIProvider` interface
3. Register in `lib/ai-providers/index.ts`
4. Add to model selector options

### Debugging
- Check browser console for client errors
- Check terminal for server errors
- Use `console.log` liberally during development
- Test API endpoints with curl/Postman

### Performance
- Use React DevTools for component debugging
- Monitor network tab for API call performance
- Check lighthouse for performance metrics

## 🎨 UI/UX Guidelines

### Design Principles
- **Mobile-first**: Start with mobile design
- **Progressive enhancement**: Add desktop features
- **Consistent spacing**: Use Tailwind spacing scale
- **Accessible**: Proper contrast, keyboard navigation

### Component Structure
```
components/
├── ui/              # Reusable UI components (shadcn/ui)
└── consensus/       # Feature-specific components
```

## 🚀 Deployment Guide

### Current Setup
- **Platform**: Vercel
- **Project**: `ai-council-new`
- **Repository**: Private GitHub repo (requires manual deployment)
- **Auto-deploy**: ❌ NOT ENABLED (private repo limitation)
- **Deployment Method**: Manual via CLI
- **Production URLs**: 
  - https://ai-council-bztsjoi55-ariels-projects-62f6e5f2.vercel.app (latest)
  - https://ai-council-emjyvz0ut-ariels-projects-62f6e5f2.vercel.app
  - https://ai-council-m1yiwc2wk-ariels-projects-62f6e5f2.vercel.app

### Manual Deployment (Required)
```bash
# Deploy to production (REQUIRED after each change)
vercel --prod

# Deploy to preview
vercel

# Check deployment status
vercel ls

# View logs
vercel logs
```

### Why Manual Deployment?
- **Private Repository**: GitHub repo is private for security
- **Vercel Limitation**: Auto-deployment requires webhooks/permissions for private repos
- **Chosen Solution**: Manual deployment for better control and privacy
- **Alternative**: Could make repo public or configure private repo access in Vercel dashboard

### Environment Variables
Set these in Vercel Dashboard → Project Settings → Environment Variables:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_AI_API_KEY`

### Security Notes
- ⚠️ Previous project "aicouncil" had unknown deployer - avoid using it
- ✅ Current project "ai-council-new" is secure and controlled by you
- Always verify the deployer username before trusting deployments

## 🌐 Web Search API Capabilities

### Current Status (July 2025)
All major AI providers now offer built-in web search APIs with transparent pricing:

| Provider | Models | Web Search API | Cost | Implementation |
|----------|---------|---------------|------|----------------|
| **OpenAI** | GPT-4o, GPT-3.5, o-series | ✅ YES | No additional cost* | Responses API with `web_search` tool |
| **Anthropic** | Claude 3.5/3.7 Sonnet, Claude 3.5 Haiku | ✅ YES | **$10 per 1,000 searches** | `web_search_20250305` tool |
| **Google** | Gemini 1.5 Pro/Flash, Gemini 2.0/2.5 | ✅ YES | **$35 per 1,000 searches** | "Grounding with Google Search" |
| **Perplexity** | Sonar, Sonar Pro | ✅ YES | Sonar: $5/1k, Sonar Pro: $3/750k input | Native web search core feature |

*OpenAI: No additional cost beyond standard tokens (as of March 2025)

### Strategic Implications

**Cost Considerations:**
- **Most Affordable**: OpenAI (free with tokens) → Anthropic ($10/1k) → Perplexity ($5/1k) → Google ($35/1k)
- **Significant cost differences** between providers
- **Not everyone needs web search** - premium feature opportunity

**Product Differentiation:**
- **Unique Value**: Consensus across web-enabled models
- **Real-time intelligence** vs knowledge cutoff models
- **Citation transparency** - all providers return source links

### Implementation Strategy

**Phase 1 (Current): No Web Search**
- ✅ Base models for consensus comparison
- ✅ Lower costs, simpler implementation
- ✅ Focus on core consensus mechanism

**Phase 2 (Future): Web-Enhanced Premium**
- Start with cheapest provider: **Anthropic Claude ($10/1k searches)**
- Market as "AI Council with Real-Time Intelligence"
- Premium tier pricing justified by web access costs
- Optional web search toggle per query

**Technical Feasibility**: ✅ **CONFIRMED** - Infrastructure exists, costs are transparent

## 🐛 Common Issues & Solutions

### TypeScript Errors
- Missing dependencies: Run `npm install`
- Type conflicts: Check import paths
- Module not found: Verify file structure

### API Connection Issues
- Check environment variables
- Verify API key validity
- Check network connectivity
- Review rate limiting

### Build Failures
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run type-check`

## 📈 Post-MVP Features

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

- **Platform Management**
  - Branding update: Change "Consensus AI" to "Council AI" throughout
  - GitHub license review and selection for commercial use
  - Vercel deployment management and understanding
  - Project cleanup and optimization

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

### Platform Audit & Optimization (Immediate)
- **Project Review**
  - Consolidate redundant markdown files
  - Apply best practices throughout codebase
  - Update README with current features
  - Clean up unused components and files

- **Deployment Management** ✅ COMPLETED
  - ✅ Current Vercel project: `ai-council-new` 
  - ✅ Production URLs: 
    - https://ai-council-bztsjoi55-ariels-projects-62f6e5f2.vercel.app (latest)
    - https://ai-council-emjyvz0ut-ariels-projects-62f6e5f2.vercel.app
    - https://ai-council-m1yiwc2wk-ariels-projects-62f6e5f2.vercel.app
  - ✅ Deployed by: `arielsoothy` (verified secure deployer)
  - ✅ Connected to GitHub: `https://github.com/ArielSoothy/AICouncil.git` (private repo)
  - ⚠️ Manual deployment required: `vercel --prod` (private repo limitation)
  - ✅ Security Note: Previous project "aicouncil" had unknown deployer - now using secure "ai-council-new"

- **Legal & Licensing**
  - Review GitHub license options for commercial use
  - Understand licensing implications for profit-based usage
  - Document compliance requirements

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com/)
- [Google AI API](https://ai.google.dev/docs)
