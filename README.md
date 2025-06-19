# Consensus AI

A multi-model AI decision engine that queries multiple AI providers and displays consensus analysis with smart minimization, judge analysis, and cost tracking.

## ✨ Features

### 🎯 Smart Minimization
- **Concise Mode**: Max 50 words, direct answers (~75 tokens)
- **Normal Mode**: 100-150 words, balanced detail (~200 tokens)  
- **Detailed Mode**: Comprehensive with examples (~500 tokens)

### 🧠 Judge Model Analysis
- **Claude Opus 4** primary judge with structured JSON analysis
- **GPT-4o fallback** if Claude is unavailable  
- **Heuristic analysis** if both AI judges fail
- **Model weighting** based on expertise scores
- Unified answer generation with confidence scoring
- Agreements and disagreements identification with recommendations

### 💰 Cost Tracking
- Real-time token usage monitoring
- **Claude Opus 4**: $15/MTok input, $75/MTok output
- **Claude Sonnet 4/3.7/3.5**: $3/MTok input, $15/MTok output  
- **Claude Haiku 3.5**: $0.80/MTok input, $4/MTok output
- **Claude Haiku 3**: $0.25/MTok input, $1.25/MTok output
- GPT models: $0.5-30/MTok depending on model
- Total cost calculation across all models and judge

### 🔄 Multi-Provider Support
- OpenAI (GPT-3.5, GPT-4, GPT-4o)
- Anthropic (Claude 3 family)
- Google (Gemini models)
- Dynamic model selection

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
- **ANTHROPIC_API_KEY** - Required for Claude models
- **OPENAI_API_KEY** - Required for GPT models and judge analysis
- **GOOGLE_API_KEY** - Required for Gemini models
- **NEXTAUTH_SECRET** - Required for authentication

**Note**: The judge analysis feature requires an OpenAI API key. Without it, you'll still get individual model responses with smart minimization and cost tracking.

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

## 📝 API Example

### Enhanced Response Structure

```json
{
  "query": "What are the benefits of exercise?",
  "mode": "normal",
  "responses": [
    {
      "model": "anthropic/claude-3-haiku-20240307",
      "response": "Exercise provides numerous benefits including improved cardiovascular health, enhanced mood through endorphin release, better sleep quality, increased strength and flexibility, weight management, and reduced risk of chronic diseases like diabetes and heart disease.",
      "tokensUsed": 145,
      "responseTime": 1200
    }
  ],
  "consensus": {
    "unifiedAnswer": "All models agree that exercise provides significant health benefits...",
    "confidence": 95,
    "agreements": [
      "Improved cardiovascular health",
      "Better mental well-being",
      "Weight management benefits"
    ],
    "disagreements": [],
    "judgeTokensUsed": 87
  },
  "totalTokensUsed": 232,
  "estimatedCost": 0.00034
}
```

## Cost Transparency Features

### Model Selection Cost Display
- **Real-time Cost Visibility**: See exact input/output costs per 1K tokens for each model
- **Tier Classification**: Models are categorized as Free, Budget, Balanced, Premium, or Flagship
- **Efficiency Badges**: Visual indicators help you understand cost-effectiveness at a glance
  - 🆓 Free models (Google's Gemini)
  - 💰 Great Value (budget-friendly options)
  - ⚖️ Balanced (good performance-to-cost ratio)
  - 💎 Premium (high-performance, higher cost)
  - 🏆 Flagship (top-tier models, highest cost)

### Cost Analysis in Results
- **Individual Model Costs**: Each response shows its estimated cost
- **Detailed Breakdown**: Technical metrics include cost per model and judge analysis
- **Total Cost Tracking**: See overall spending for your consensus query
- **Transparent Pricing**: All costs based on 2025 pricing from official APIs

### Cost-Efficient Querying Tips
1. **Mix Tiers**: Combine flagship models with budget options for balanced insights
2. **Smart Mode Selection**: Use "concise" mode to reduce token usage and costs
3. **Model Expertise**: The system weighs model strengths for better judge analysis
4. **Free Models**: Google's Gemini models are completely free to use
