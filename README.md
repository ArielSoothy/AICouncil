# Consensus AI

A comprehensive multi-model AI decision engine that provides clear, actionable decision support by querying multiple AI providers and displaying ranked consensus analysis with full cost transparency and efficiency insights.

## ✨ Key Features

### 🎯 Smart Response Modes
- **Concise Mode**: Single-word/minimal-token ranked list (e.g., "1. MBA 2. MSc 3. BSc"). No sentences.
- **Normal Mode**: 100-150 words, balanced detail (~200 tokens) - comprehensive yet concise
- **Detailed Mode**: Full explanations with examples (~500 tokens) - in-depth analysis

### 🧠 Advanced Judge Analysis
- **Claude Opus 4** primary judge with structured JSON analysis
- **GPT-4o fallback** if Claude is unavailable  
- **Heuristic analysis** if both AI judges fail
- **Model weighting** based on expertise scores and tier classification
- Unified answer generation with confidence scoring (0-100%)
- Clear agreements/disagreements identification with actionable recommendations

### 💰 Complete Cost Transparency
- **Real-time cost display** in model selector with per-1K token pricing
- **Tier classification**: Free, Budget, Balanced, Premium, Flagship
- **Efficiency badges**: Visual indicators for cost-effectiveness
- **Total cost tracking** across all models and judge analysis
- **Smart cost optimization** with model mixing recommendations

### 📊 Enhanced Decision Interface
- **Unified Answer**: Clear, consolidated response from all models
- **Ranked Options Table**: Concise 1-liner alternatives with confidence scores
- **Model Agreement Indicators**: Visual consensus strength indicators  
- **Individual Model Responses**: Detailed per-model answers for deep analysis
- **Performance Metrics**: Response times, token usage, and cost breakdown

### 🔄 Multi-Provider Support
- **OpenAI**: GPT-5 family (gpt-5/mini/nano), GPT-4.1 (mini/nano), o-series (o3, o4-mini), GPT-4o (incl. realtime)
- **Anthropic**: Full Claude family (Claude 4, 3.7, 3.5, 3, 2 series)
- **Google**: Gemini Flash models are free (demo tier); Gemini Pro is paid and excluded from guest/free defaults
- **xAI**: Grok-4-0709, Grok-3, Grok-3-mini
- **Dynamic model selection** with real-time availability checking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd consensus-ai
npm install
```

2. **Set up environment variables:**
```bash
# If an example exists
[ -f .env.local.example ] && cp .env.local.example .env.local || ./setup.sh
```

If no example file exists, create `.env.local` with at least:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
XAI_API_KEY=
PERPLEXITY_API_KEY=
MISTRAL_API_KEY=
COHERE_API_KEY=
```

Fill in your API keys (placeholders for all supported providers):
- **ANTHROPIC_API_KEY** - Required for Claude models and primary judge analysis
- **OPENAI_API_KEY** - Required for GPT models and fallback judge analysis
- **GOOGLE_GENERATIVE_AI_API_KEY** - Required for Gemini models (free tier available)
- **GROQ_API_KEY** - Required for Groq (fast Llama/Gemma)
- **XAI_API_KEY** - Required for xAI Grok models
- **PERPLEXITY_API_KEY** - Required for Perplexity Sonar models
- **MISTRAL_API_KEY** - Required for Mistral models
- **COHERE_API_KEY** - Required for Cohere Command models

Additional providers supported (optional):
```
GROQ_API_KEY=
XAI_API_KEY=
PERPLEXITY_API_KEY=
MISTRAL_API_KEY=
COHERE_API_KEY=
```

You can add these to `.env.local`. The app works with any combination of keys; only configured providers/models are shown. Judge analysis works best with Anthropic or OpenAI keys.

3. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🎯 How to Use

### 1. Select Your Models
- Choose from 20+ available models across OpenAI, Anthropic, and Google
- See real-time cost per 1K tokens and efficiency badges
- Mix different tiers for balanced cost and performance

### 2. Choose Response Mode
- **Concise**: Single-word/minimal-token outputs (ranked) for fastest decisions
- **Normal**: Balanced analysis for most use cases  
- **Detailed**: Comprehensive analysis with examples

### 3. Ask Your Question
- Enter any decision-making question or prompt
- Get responses from all selected models simultaneously

### 4. Review Results
- **Unified Answer**: Consensus response from judge analysis
- **Ranked Options**: Quick 1-liner alternatives with confidence scores
- **Individual Responses**: Detailed per-model answers
- **Cost & Performance**: Full transparency on usage and costs

## 🏗️ Project Structure

```
/app
  /api
    /consensus/             # Main orchestration endpoint with judge analysis
    /consensus/normalize/   # Semantic normalization for ranked options (groups similar answers)
    /consensus/why/         # AI one-liner per model: why its #1 pick
    /models/               # Available models endpoint
  layout.tsx              # Root layout with Tailwind and fonts
  page.tsx               # Main query interface

/components
  /ui/                    # shadcn/ui components (Button, Card, etc.)
  /consensus/            # Core app components
    query-interface.tsx           # Main query form and model selection
    model-selector.tsx           # Model selection with cost display
    enhanced-consensus-display-v3.tsx  # Results display with ranking (consolidated)
    response-modes-selector.tsx   # Concise/Normal/Detailed selector

/lib
  /ai-providers/         # AI provider integrations
    openai.ts            # OpenAI GPT models
    anthropic.ts         # Claude model family
    google.ts            # Gemini models
    index.ts             # Unified provider interface
  /utils.ts              # Utility functions

/types
  consensus.ts          # TypeScript definitions for all interfaces
```

## 🔧 Key Features Deep Dive

### 💎 Model Selector with Cost Transparency
- **Real-time Pricing**: See exact cost per 1K tokens (input/output) for each model
- **Tier Badges**: Visual classification (Free 🆓, Budget 💰, Balanced ⚖️, Premium 💎, Flagship 🏆)
- **Smart Recommendations**: Efficiency indicators help choose optimal models
- **Mix & Match**: Combine different tiers for balanced performance and cost

### 📊 Enhanced Results Display
- **Unified Answer**: AI judge synthesizes all responses into clear consensus
- **Ranked Options Table**: Quick-scan 1-liner alternatives with confidence scores
- **Model Influence**: Visible model weights (0.5–1.0) and how they affect rankings
- **Model Agreement**: Visual indicators show how much models agree/disagree
- **Individual Responses**: Per-model cards with minimal tokens and an AI one-line rationale for the top pick
- **Performance Metrics**: Response times, token usage, and costs per model

### 🧠 Intelligent Judge Analysis
- **Primary Judge**: Claude Opus 4 with structured JSON analysis
- **Fallback Judge**: GPT-4o if Claude is unavailable
- **Heuristic Fallback**: Basic analysis if both AI judges fail
- **Model Weighting**: Accounts for model expertise and tier when generating consensus; weights surfaced in UI
- **Normalization**: `/api/consensus/normalize` merges semantically equivalent options for accurate counts
- **Top-pick Rationale**: `/api/consensus/why` returns a concise reason per model for its first choice
- **Confidence Scoring**: 0-100% confidence in the unified answer

## 🚦 Development Status

### ✅ Completed Features
- [x] Complete Next.js 14 setup with TypeScript and Tailwind CSS
- [x] Multi-provider AI integrations (OpenAI, Anthropic, Google)
- [x] Enhanced model selector with cost transparency and tier classification
- [x] Advanced consensus analysis with Claude Opus 4 judge
- [x] Unified answer generation with confidence scoring
- [x] Ranked options table with 1-liner alternatives
- [x] Individual model responses section for detailed analysis
- [x] Three response modes (Concise/Normal/Detailed)
- [x] Real-time cost tracking and performance metrics
- [x] Responsive design optimized for desktop and mobile
- [x] Error handling and graceful fallbacks
- [x] Production-ready build and deployment configuration

### 🔄 Future Enhancements
- [ ] User authentication and query history
- [ ] Response caching for improved performance
- [ ] Advanced filtering and export capabilities
- [ ] Team collaboration features
- [ ] API rate limiting and usage analytics

## 🔐 Environment Variables

```env
# AI Provider APIs (get from respective provider dashboards)
OPENAI_API_KEY=your_openai_key           # https://platform.openai.com/api-keys
ANTHROPIC_API_KEY=your_anthropic_key     # https://console.anthropic.com/
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key  # https://makersuite.google.com/app/apikey
```

**API Key Requirements:**
- **Anthropic**: Required for Claude models and primary judge analysis
- **OpenAI**: Required for GPT models and fallback judge analysis  
- **Google**: Required for free Gemini models
- At least one API key is required; the app adapts to available providers

## 🧪 Development

```bash
# Run development server
npm run dev                    # Starts on http://localhost:3000

# Type checking
npm run type-check            # Validates TypeScript

# Build for production
npm run build                 # Creates optimized production build

# Start production server
npm start                     # Runs production build
```

## 📦 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 💡 Usage Tips

### Cost Optimization
1. **Mix Model Tiers**: Combine flagship models with budget options for balanced insights
2. **Use Concise Mode**: Reduces token usage and costs for quick decisions
3. **Free Models First**: Start with Google's Gemini models (completely free)
4. **Monitor Costs**: Check the cost breakdown for each query

### Best Practices
1. **Clear Questions**: Ask specific, actionable questions for better consensus
2. **Model Selection**: Choose 3-5 models from different providers for diverse perspectives
3. **Response Modes**: Match mode to your needs (Concise for quick answers, Detailed for analysis)
4. **Review Individual Responses**: Check per-model answers for nuanced insights

##  API Reference

### Enhanced Response Structure

The `/api/consensus` endpoint returns a comprehensive response with all analysis:

```json
{
  "query": "What are the benefits of exercise?",
  "mode": "normal", 
  "responses": [
    {
      "model": "anthropic/claude-3-haiku-20240307",
      "response": "Exercise provides numerous health benefits including improved cardiovascular health, enhanced mood through endorphin release, better sleep quality, increased strength and flexibility, weight management, and reduced risk of chronic diseases.",
      "tokensUsed": 145,
      "responseTime": 1200,
      "success": true
    }
  ],
  "consensus": {
    "unifiedAnswer": "All models strongly agree that exercise provides significant physical and mental health benefits...",
    "confidence": 95,
    "agreements": [
      "Improved cardiovascular health",
      "Enhanced mental well-being and mood", 
      "Better weight management",
      "Reduced disease risk"
    ],
    "disagreements": [],
    "judgeModel": "claude-opus-4-20250514",
    "judgeTokensUsed": 87,
    "modelWeights": {
      "claude-3-haiku-20240307": 0.7,
      "gpt-4o": 0.9
    }
  },
  "options": [
    {
      "option": "Focus on cardiovascular exercise for heart health",
      "confidence": 92,
      "modelAgreement": 0.95,
      "reasoning": "Strongly supported by all models with scientific evidence"
    }
  ],
  "totalTokensUsed": 1247,
  "estimatedCost": 0.00089,
  "performance": {
    "totalTime": 3200,
    "successRate": 1.0,
    "averageResponseTime": 1600
  }
}
```

### Model Pricing Reference (Per 1K Tokens)

| Model Family | Input Cost | Output Cost | Tier |
|-------------|------------|-------------|------|
| **Claude 4 Series** ||||
| Claude Opus 4 | $0.015 | $0.075 | � Flagship |
| Claude Sonnet 4 | $0.003 | $0.015 | ⚖️ Balanced |
| **Claude 3.5 Series** ||||
| Claude 3.5 Sonnet | $0.003 | $0.015 | ⚖️ Balanced |
| Claude 3.5 Haiku | $0.0008 | $0.004 | 💰 Budget |
| **OpenAI Models** ||||
| GPT-4o | $0.01 | $0.03 | 💎 Premium |
| GPT-4 | $0.03 | $0.06 | 💎 Premium |
| GPT-3.5 Turbo | $0.0005 | $0.0015 | 💰 Budget |
| **Google Models** ||||
| Gemini Flash (1.5/2.0/2.5) | $0.00 | $0.00 | 🆓 Free (demo tier) |
| Gemini 2.5 Pro | varies | varies | 💎 Paid |

## 🤝 Contributing

This project is built for rapid iteration and improvement. Key areas for contribution:

1. **New AI Providers**: Add support for additional model providers
2. **Enhanced Analysis**: Improve consensus algorithms and confidence scoring
3. **UI/UX**: Enhance the user interface and experience
4. **Performance**: Optimize response times and caching
5. **Features**: Add new capabilities like query history, team collaboration

## 📄 License

MIT License - see LICENSE file for details.
// Test deployment reconnection
