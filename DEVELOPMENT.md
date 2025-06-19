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

## 🏗️ MVP Implementation Plan (48 Hours)

### ✅ Phase 1: Foundation (6-8 hours)
- [x] Next.js 14 project setup
- [x] TypeScript configuration
- [x] Tailwind CSS + shadcn/ui setup
- [x] Basic project structure
- [x] Type definitions

### 🚧 Phase 2: Core Features (16-20 hours)
- [ ] AI provider integrations
  - [ ] Test OpenAI connection
  - [ ] Test Anthropic connection
  - [ ] Test Google AI connection
- [ ] API routes implementation
  - [ ] `/api/consensus` endpoint
  - [ ] `/api/models` endpoint
- [ ] UI components
  - [ ] Query interface
  - [ ] Model selector
  - [ ] Response display
  - [ ] Consensus analysis
- [ ] Rate limiting
- [ ] Error handling

### 🎯 Phase 3: Enhancement (12-16 hours)
- [ ] Consensus algorithm improvements
- [ ] Performance metrics
- [ ] Response caching
- [ ] Mobile responsive design
- [ ] Loading states
- [ ] Error boundaries

### 🚀 Phase 4: Deployment (4-8 hours)
- [ ] Environment variable validation
- [ ] Production build testing
- [ ] Vercel deployment
- [ ] Performance optimization
- [ ] Basic monitoring

## 🧪 Testing API Endpoints

### Test Models Endpoint
```bash
curl http://localhost:3000/api/models
```

### Test Consensus Endpoint
```bash
curl -X POST http://localhost:3000/api/consensus \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "models": [
      {"provider": "openai", "model": "gpt-3.5-turbo", "enabled": true},
      {"provider": "anthropic", "model": "claude-3-haiku-20240307", "enabled": true}
    ]
  }'
```

## 📁 Key Files to Focus On

### Core Logic
- `app/api/consensus/route.ts` - Main consensus logic
- `lib/ai-providers/` - AI provider integrations
- `components/consensus/` - UI components

### Configuration
- `.env.local` - API keys and configuration
- `tailwind.config.js` - Styling configuration
- `next.config.js` - Next.js configuration

## 🔧 Development Tips

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
