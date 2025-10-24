/**
 * Centralized Trading Models Configuration
 * Single source of truth for all available AI models in trading modes
 */

export interface TradingModel {
  id: string
  name: string
  provider: 'anthropic' | 'openai' | 'google' | 'groq' | 'mistral' | 'perplexity' | 'cohere' | 'xai'
  tier: 'flagship' | 'balanced' | 'budget' | 'free'
  badge?: string
}

export const TRADING_MODELS: TradingModel[] = [
  // ===== ANTHROPIC =====
  // Claude 4.5 & 4 Series (Flagship)
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude 4 Opus',
    provider: 'anthropic',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4 Sonnet',
    provider: 'anthropic',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    tier: 'flagship',
    badge: '🌟'
  },
  // Claude 3.5 Series (Balanced)
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    tier: 'balanced',
    badge: '⚡'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    tier: 'balanced',
    badge: '⚡'
  },
  // Claude 3 Legacy (Budget)
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    tier: 'budget',
    badge: '💰'
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    tier: 'budget',
    badge: '💰'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    tier: 'budget',
    badge: '💰'
  },
  {
    id: 'claude-2.1',
    name: 'Claude 2.1',
    provider: 'anthropic',
    tier: 'budget',
    badge: '💰'
  },

  // ===== OPENAI =====
  // GPT-5 Series (Flagship)
  {
    id: 'gpt-5-chat-latest',
    name: 'GPT-5 Chat (Latest)',
    provider: 'openai',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'gpt-5-2025-08-07',
    name: 'GPT-5 (2025-08-07)',
    provider: 'openai',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    tier: 'balanced',
    badge: '⚡'
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    tier: 'balanced',
    badge: '⚡'
  },
  // GPT-4 Series (Balanced)
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'balanced',
    badge: '⚡'
  },
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    tier: 'balanced',
    badge: '⚡'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    tier: 'balanced',
    badge: '⚡'
  },
  // GPT-3.5 Series (Budget)
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    tier: 'budget',
    badge: '💰'
  },
  {
    id: 'gpt-3.5-turbo-16k',
    name: 'GPT-3.5 Turbo 16k',
    provider: 'openai',
    tier: 'budget',
    badge: '💰'
  },

  // ===== GOOGLE =====
  // Gemini 2.5 Series (Flagship & Free)
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    tier: 'free',
    badge: '🎁'
  },
  // Gemini 2.0 Series (Free)
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'free',
    badge: '🎁'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'google',
    tier: 'free',
    badge: '🎁'
  },
  // Gemini 1.5 Series (Free)
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    tier: 'free',
    badge: '🎁'
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    provider: 'google',
    tier: 'free',
    badge: '🎁'
  },

  // ===== GROQ (All Free) =====
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    tier: 'free',
    badge: '🎁'
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    tier: 'free',
    badge: '🎁'
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    provider: 'groq',
    tier: 'free',
    badge: '🎁'
  },
  {
    id: 'llama-3-groq-70b-tool-use',
    name: 'Llama 3 70B Tool Use',
    provider: 'groq',
    tier: 'free',
    badge: '🎁'
  },
  {
    id: 'llama-3-groq-8b-tool-use',
    name: 'Llama 3 8B Tool Use',
    provider: 'groq',
    tier: 'free',
    badge: '🎁'
  },

  // ===== MISTRAL =====
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    tier: 'balanced',
    badge: '⚡'
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    provider: 'mistral',
    tier: 'budget',
    badge: '💰'
  },

  // ===== PERPLEXITY =====
  {
    id: 'sonar-pro',
    name: 'Sonar Pro',
    provider: 'perplexity',
    tier: 'balanced',
    badge: '⚡'
  },
  {
    id: 'sonar-small',
    name: 'Sonar Small',
    provider: 'perplexity',
    tier: 'budget',
    badge: '💰'
  },

  // ===== COHERE =====
  {
    id: 'command-r-plus',
    name: 'Command R+',
    provider: 'cohere',
    tier: 'balanced',
    badge: '⚡'
  },
  {
    id: 'command-r',
    name: 'Command R',
    provider: 'cohere',
    tier: 'budget',
    badge: '💰'
  },

  // ===== XAI (Grok) =====
  {
    id: 'grok-2-latest',
    name: 'Grok 2 Latest',
    provider: 'xai',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'grok-2-1212',
    name: 'Grok 2 (Dec 12)',
    provider: 'xai',
    tier: 'flagship',
    badge: '🌟'
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: 'xai',
    tier: 'balanced',
    badge: '⚡'
  }
]

// Grouped by provider for dropdown optgroups
export const MODELS_BY_PROVIDER = {
  anthropic: TRADING_MODELS.filter(m => m.provider === 'anthropic'),
  openai: TRADING_MODELS.filter(m => m.provider === 'openai'),
  google: TRADING_MODELS.filter(m => m.provider === 'google'),
  groq: TRADING_MODELS.filter(m => m.provider === 'groq'),
  mistral: TRADING_MODELS.filter(m => m.provider === 'mistral'),
  perplexity: TRADING_MODELS.filter(m => m.provider === 'perplexity'),
  cohere: TRADING_MODELS.filter(m => m.provider === 'cohere'),
  xai: TRADING_MODELS.filter(m => m.provider === 'xai')
}

// Helper function to get model display name
export function getModelDisplayName(modelId: string): string {
  const model = TRADING_MODELS.find(m => m.id === modelId)
  return model ? `${model.badge ? model.badge + ' ' : ''}${model.name}` : modelId
}

// Helper function to get provider name
export function getProviderForModel(modelId: string): TradingModel['provider'] | null {
  const model = TRADING_MODELS.find(m => m.id === modelId)
  return model?.provider || null
}

// Get default model selections (best model from each provider)
export function getDefaultModelSelections(): string[] {
  const defaults: string[] = []

  // For each provider, select the best available model
  Object.entries(MODELS_BY_PROVIDER).forEach(([providerKey, models]) => {
    if (models.length === 0) return

    // Priority: flagship > balanced > free > budget
    const flagship = models.find(m => m.tier === 'flagship')
    const balanced = models.find(m => m.tier === 'balanced')
    const free = models.find(m => m.tier === 'free')

    const bestModel = flagship || balanced || free || models[0]
    defaults.push(bestModel.id)
  })

  return defaults
}

// Get default model for a specific provider
export function getDefaultModelForProvider(providerKey: string): string | null {
  const models = MODELS_BY_PROVIDER[providerKey as keyof typeof MODELS_BY_PROVIDER]
  if (!models || models.length === 0) return null

  // Priority: flagship > balanced > free > budget
  const flagship = models.find(m => m.tier === 'flagship')
  const balanced = models.find(m => m.tier === 'balanced')
  const free = models.find(m => m.tier === 'free')

  const bestModel = flagship || balanced || free || models[0]
  return bestModel.id
}
