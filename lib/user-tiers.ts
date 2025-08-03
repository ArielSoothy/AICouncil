export type UserTier = 'guest' | 'free' | 'pro' | 'enterprise'

export interface TierConfig {
  name: string
  price: string
  queryLimit: number
  premiumCredits?: number // For free tier premium sampling
  availableProviders: ('openai' | 'anthropic' | 'google' | 'groq')[]
  judgeModel: string
  features: string[]
}

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  guest: {
    name: 'Guest',
    price: '$0',
    queryLimit: 999, // Unlimited queries with free models
    availableProviders: ['google', 'groq'],
    judgeModel: 'gemini-1.5-flash',
    features: [
      '3 free AI models (unlimited)',
      'Basic consensus analysis',
      'No signup required',
      'Instant access'
    ]
  },
  free: {
    name: 'Free',
    price: '$0',
    queryLimit: 100, // queries per day with free models
    premiumCredits: 5, // Premium queries to sample ALL models
    availableProviders: ['google', 'groq'], // Free models unlimited
    judgeModel: 'gemini-1.5-flash', // Fast free judge model (gemini-2.0-flash not available yet)
    features: [
      '6 free AI models (unlimited)',
      '5 premium credits (try ALL models)',
      'Earn +2 credits per feedback',
      'Basic consensus analysis',
      'Community support'
    ]
  },
  pro: {
    name: 'Pro',
    price: '$9/month',
    queryLimit: 100, // queries per day
    availableProviders: ['openai', 'anthropic', 'google', 'groq'], // All models
    judgeModel: 'claude-opus-4-20250514', // Premium judge
    features: [
      'All AI models (25+ models)',
      '100 queries per day',
      'Advanced consensus analysis',
      'Priority support',
      'Export conversations',
      'Query history'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: '$29/month',
    queryLimit: 500, // queries per day
    availableProviders: ['openai', 'anthropic', 'google', 'groq'], // All models
    judgeModel: 'claude-opus-4-20250514', // Premium judge
    features: [
      'All AI models (25+ models)',
      '500 queries per day',
      'Advanced consensus analysis',
      'Priority support',
      'Export conversations',
      'Query history',
      'API access',
      'Custom integrations',
      'Dedicated account manager'
    ]
  }
}

// Guest tier model whitelist (same as free tier for impressive demo)
export const GUEST_TIER_MODELS = {
  google: [
    'gemini-2.5-pro',
    'gemini-2.5-flash', 
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash', 
    'gemini-1.5-flash-8b'
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ]
}

// Free tier model whitelist
export const FREE_TIER_MODELS = {
  google: [
    'gemini-2.5-pro',
    'gemini-2.5-flash', 
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash', 
    'gemini-1.5-flash-8b'
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ]
}

// All available models (for display purposes)
export const ALL_MODELS = {
  openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
  anthropic: [
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-2.1',
    'claude-2.0'
  ],
  google: FREE_TIER_MODELS.google,
  groq: FREE_TIER_MODELS.groq
}

export function getAvailableModels(userTier: UserTier | null): { provider: string; models: string[] }[] {
  // Default to free tier if no tier specified
  const tier = userTier || 'free'
  const config = TIER_CONFIGS[tier]
  
  if (tier === 'guest') {
    return Object.entries(GUEST_TIER_MODELS).map(([provider, models]) => ({
      provider,
      models
    }))
  }
  
  if (tier === 'free') {
    return Object.entries(FREE_TIER_MODELS).map(([provider, models]) => ({
      provider,
      models
    }))
  }
  
  // Pro and Enterprise get all models
  return Object.entries(ALL_MODELS).map(([provider, models]) => ({
    provider,
    models
  }))
}

export function getAllModelsWithTierInfo(userTier: UserTier | null): { provider: string; models: { name: string; available: boolean; tier: string }[] }[] {
  const tier = userTier || 'free'
  
  return Object.entries(ALL_MODELS).map(([provider, models]) => ({
    provider,
    models: models.map(model => ({
      name: model,
      available: canUseModel(tier, provider, model),
      tier: canUseModel(tier, provider, model) ? 'free' : 'pro'
    }))
  }))
}

export function canUseModel(userTier: UserTier | null, provider: string, model: string): boolean {
  const tier = userTier || 'free'
  const config = TIER_CONFIGS[tier]
  
  // Check if provider is allowed
  if (!config.availableProviders.includes(provider as any)) {
    return false
  }
  
  // For guest tier, check guest model whitelist
  if (tier === 'guest') {
    const guestModels = GUEST_TIER_MODELS[provider as keyof typeof GUEST_TIER_MODELS]
    return guestModels ? guestModels.includes(model) : false
  }
  
  // For free tier, check specific model whitelist
  if (tier === 'free') {
    const freeModels = FREE_TIER_MODELS[provider as keyof typeof FREE_TIER_MODELS]
    return freeModels ? freeModels.includes(model) : false
  }
  
  // Pro and Enterprise can use all models
  return true
}

export function getJudgeModel(userTier: UserTier | null): string {
  const tier = userTier || 'free'
  return TIER_CONFIGS[tier].judgeModel
}

export function getQueryLimit(userTier: UserTier | null): number {
  const tier = userTier || 'free'
  return TIER_CONFIGS[tier].queryLimit
}

export function getTierFeatures(userTier: UserTier | null): string[] {
  const tier = userTier || 'free'
  return TIER_CONFIGS[tier].features
}

// Models with internet access capabilities
export const MODELS_WITH_INTERNET = [
  'gpt-4o',
  'gpt-4-turbo-preview',
  'claude-3-5-sonnet-20241022',
  'gemini-2.5-pro',
  'gemini-2.5-flash'
]

export function hasInternetAccess(model: string): boolean {
  return MODELS_WITH_INTERNET.includes(model)
}