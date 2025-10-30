# 🤖 AI Models & API Keys Setup Guide

**Complete configuration for all AI providers and models used in Verdict AI**

## 📋 Quick Setup Checklist

Copy this `.env` file to your project and fill in your API keys:

```bash
# === REQUIRED API KEYS ===

# OpenAI (Premium Models)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Anthropic (Claude Models)
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here

# Google AI (Gemini Models - FREE)
GOOGLE_API_KEY=AIza_your_google_api_key_here

# Groq (Llama Models - FREE)
GROQ_API_KEY=gsk_your_groq_api_key_here

# === OPTIONAL API KEYS ===

# xAI (Grok Models)
XAI_API_KEY=xai-your_xai_api_key_here

# Perplexity (Sonar Models)
PERPLEXITY_API_KEY=pplx-your_perplexity_api_key_here

# Mistral (Mistral Models)
MISTRAL_API_KEY=your_mistral_api_key_here

# Cohere (Command Models)
COHERE_API_KEY=your_cohere_api_key_here

# === SUPABASE (Database) ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ_your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJ_your_supabase_service_role_key_here
```

## 🎯 Core Models Configuration

### **FREE Models (Essential for MVP)**

#### **Google AI (FREE - No API cost)**
```javascript
provider: 'google'
models: [
  'gemini-2.5-pro',        // Latest pro model
  'gemini-2.5-flash',      // Fast & efficient
  'gemini-2.0-flash',      // Balanced
  'gemini-2.0-flash-lite', // Lightweight
  'gemini-1.5-flash',      // Legacy but reliable
  'gemini-1.5-flash-8b'    // Ultra-fast
]
```

#### **Groq (FREE - No API cost)**
```javascript
provider: 'groq'
models: [
  'llama-3.3-70b-versatile',    // Best free model
  'llama-3.1-8b-instant',       // Ultra-fast
  'gemma2-9b-it',               // Google model on Groq
  'llama-3-groq-70b-tool-use',  // #1 Function Calling
  'llama-3-groq-8b-tool-use'    // #3 Function Calling
]
```

### **Premium Models (Paid)**

#### **OpenAI (Premium)**
```javascript
provider: 'openai'
models: [
  'gpt-4-turbo-preview',  // Latest GPT-4
  'gpt-4',                // Standard GPT-4
  'gpt-3.5-turbo',        // Fast & cheap
  'gpt-3.5-turbo-16k'     // Large context
]
```

#### **Anthropic (Premium)**
```javascript
provider: 'anthropic'
models: [
  // Claude 4 (Latest)
  'claude-opus-4-1-20250514',
  'claude-sonnet-4-20250514',
  // Claude 3.7
  'claude-3-7-sonnet-20250219',
  // Claude 3.5
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  // Claude 3 (Legacy)
  'claude-3-opus-20240229'
]
```

### **Specialized Models (Optional)**

#### **xAI (Grok Models)**
```javascript
provider: 'xai'
models: [
  'grok-4-0709',    // Latest
  'grok-3',         // Standard
  'grok-3-mini',    // Fast
  'grok-2-latest',  // Legacy
  'grok-2-mini'     // Legacy mini
]
```

#### **Perplexity (Search-Enhanced)**
```javascript
provider: 'perplexity'
models: [
  'sonar-pro',    // Premium search
  'sonar-small'   // Fast search
]
```

#### **Mistral (European AI)**
```javascript
provider: 'mistral'
models: [
  'mistral-large-latest',  // Best model
  'mistral-small-latest'   // Fast model
]
```

#### **Cohere (Enterprise)**
```javascript
provider: 'cohere'
models: [
  'command-r-plus',  // Advanced
  'command-r'        // Standard
]
```

## 🔧 API Key Format Validation

Each provider has specific key formats that are validated:

```javascript
// OpenAI
OPENAI_API_KEY.startsWith('sk-')

// Anthropic
ANTHROPIC_API_KEY.startsWith('sk-ant-')

// Groq
GROQ_API_KEY.startsWith('gsk_')

// Google
GOOGLE_API_KEY.startsWith('AIza')

// Others: No specific format validation
```

## 🎛️ Default Model Configurations

### **Guest Mode (6 FREE models)**
```javascript
[
  { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
  { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
  { provider: 'groq', model: 'gemma2-9b-it', enabled: true },
  { provider: 'google', model: 'gemini-2.5-flash', enabled: true },
  { provider: 'google', model: 'gemini-2.0-flash', enabled: true },
  { provider: 'google', model: 'gemini-1.5-flash', enabled: true }
]
```

### **Pro Tier (3 Premium + 3 FREE)**
```javascript
[
  // Premium
  { provider: 'openai', model: 'gpt-4o', enabled: true },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', enabled: true },
  { provider: 'google', model: 'gemini-1.5-pro', enabled: true },
  // Best Free
  { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
  { provider: 'google', model: 'gemini-2.5-flash', enabled: true },
  { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true }
]
```

### **Current Agent Configuration**
```javascript
// Default for Agent Debates
agents: [
  {
    role: 'analyst',
    model: 'llama-3.1-8b-instant',
    provider: 'groq'
  },
  {
    role: 'critic',
    model: 'gemini-1.5-flash-8b',
    provider: 'google'
  },
  {
    role: 'synthesizer',
    model: 'llama-3.3-70b-versatile',
    provider: 'groq'
  }
]
```

## 📦 Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@ai-sdk/anthropic": "^1.2.12",
    "@ai-sdk/google": "^1.2.22",
    "@ai-sdk/groq": "^1.2.9",
    "@ai-sdk/openai": "^1.3.23",
    "@google/generative-ai": "^0.24.1",
    "ai": "^4.3.19"
  }
}
```

## 🚀 Quick Start Commands

```bash
# 1. Copy this setup to your project
cp AI_MODELS_SETUP.md /path/to/your/project/

# 2. Create .env file with your API keys
cp .env.example .env

# 3. Install AI SDK dependencies
npm install @ai-sdk/anthropic @ai-sdk/google @ai-sdk/groq @ai-sdk/openai @google/generative-ai ai

# 4. Copy AI providers directory
cp -r lib/ai-providers /path/to/your/project/lib/

# 5. Copy consensus types
cp types/consensus.ts /path/to/your/project/types/
```

## 🔍 Testing API Keys

Use this simple test script to verify your API keys:

```javascript
// test-api-keys.js
import { providerRegistry } from './lib/ai-providers';

async function testProviders() {
  const providers = providerRegistry.getAllProviders();

  for (const provider of providers) {
    console.log(`${provider.name}: ${provider.isConfigured() ? '✅' : '❌'}`);
  }

  console.log('\nConfigured providers:',
    providerRegistry.getConfiguredProviders().map(p => p.name)
  );
}

testProviders();
```

## 🎯 Recommended Minimal Setup

**For MVP/Testing (FREE only):**
```bash
GOOGLE_API_KEY=your_google_key     # FREE Gemini models
GROQ_API_KEY=your_groq_key         # FREE Llama models
```

**For Production:**
```bash
GOOGLE_API_KEY=your_google_key     # FREE models
GROQ_API_KEY=your_groq_key         # FREE models
OPENAI_API_KEY=your_openai_key     # Premium GPT models
ANTHROPIC_API_KEY=your_claude_key  # Premium Claude models
```

## 📝 Notes

- **FREE models** (Google + Groq) provide 6 high-quality models at no cost
- **Premium models** offer cutting-edge performance for Pro tier users
- **Rate limiting** is handled with automatic fallbacks in Groq provider
- **Model weights** are configured for optimal consensus results
- **Guest mode** uses only FREE models for cost control

Copy this entire configuration to your new project and update the API keys to get the same AI model setup as Verdict AI.