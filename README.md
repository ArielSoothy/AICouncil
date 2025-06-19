# Consensus AI

A multi-model AI decision engine that queries multiple AI providers and displays consensus analysis.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Fill in your API keys:
- OpenAI API key
- Anthropic API key  
- Google AI API key
- NextAuth secret

3. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🏗️ Project Structure

```
/app
  /api
    /auth/[...nextauth]/    # NextAuth configuration
    /consensus/             # Main orchestration endpoint
    /models/               # Individual model handlers
  /(auth)/                 # Auth pages (login, register)
  /(dashboard)/           # Protected dashboard pages
  /(public)/              # Public pages (landing, about)
  layout.tsx              # Root layout
  page.tsx               # Home page

/components
  /ui/                    # shadcn/ui components
  /consensus/            # App-specific components
    consensus-display.tsx
    model-response.tsx
    confidence-meter.tsx
    performance-chart.tsx

/lib
  /ai-providers/         # AI provider integrations
    openai.ts
    anthropic.ts
    google.ts
    types.ts
  /utils/               # Utility functions
    auth.ts
    rate-limit.ts
    cache.ts
  auth.ts               # NextAuth configuration

/types
  consensus.ts          # Type definitions
  models.ts
```

## 🔧 Key Features

- **Multi-Model Querying**: Simultaneous queries to OpenAI, Anthropic, Google AI
- **Consensus Analysis**: Real-time agreement/disagreement visualization
- **Performance Tracking**: Response times, success rates, confidence scores
- **Rate Limiting**: Built-in protection against API abuse
- **Caching**: Redis-based response caching for efficiency
- **Authentication**: Simple auth for beta users
- **Responsive Design**: Mobile-first UI with Tailwind CSS

## 🚦 MVP Roadmap (48 hours)

### Day 1 (24h)
- [x] Project setup and dependencies
- [ ] Basic UI layout with shadcn/ui
- [ ] AI provider integrations (OpenAI, Anthropic, Google)
- [ ] Consensus orchestration API
- [ ] Simple response display

### Day 2 (24h)  
- [ ] Confidence scoring algorithm
- [ ] Performance metrics tracking
- [ ] Rate limiting implementation
- [ ] Basic authentication
- [ ] Mobile responsive design
- [ ] Deployment setup

## 🔐 Environment Variables

```env
# AI Provider APIs
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  
GOOGLE_AI_API_KEY=your_google_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Optional: Redis for caching
REDIS_URL=your_redis_url
```

## 🧪 Development

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## 📦 Deployment

The app is configured for easy deployment on Vercel:

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

## 🤝 Contributing

This is an MVP built for rapid iteration. Focus on core functionality over perfect code.

## 📄 License

MIT License
