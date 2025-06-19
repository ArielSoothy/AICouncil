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

### V2 Features (Future)
- User authentication with NextAuth.js
- Response history and saved queries
- Advanced consensus algorithms
- Custom model configurations
- Team collaboration features
- API usage analytics

### Scaling Considerations
- Redis for caching and rate limiting
- Database for user data and history
- CDN for static assets
- Monitoring and logging
- Load balancing for high traffic

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com/)
- [Google AI API](https://ai.google.dev/docs)
