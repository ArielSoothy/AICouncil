import { MODEL_REGISTRY, Provider, type UserAccessTier as RegistryUserAccessTier } from './models/model-registry'

export type UserTier = 'guest' | 'free' | 'pro' | 'enterprise'

export interface TierConfig {
  name: string
  price: string
  queryLimit: number
  premiumCredits?: number // For free tier premium sampling
  availableProviders: Provider[]
  judgeModel: string
  features: string[]
}

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  guest: {
    name: 'Guest',
    price: '$0',
    queryLimit: 999, // Unlimited queries with free models
    availableProviders: ['google', 'groq'],
    judgeModel: 'gemini-2.0-flash',
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
    judgeModel: 'gemini-2.0-flash', // Fast free judge model
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
    availableProviders: ['openai', 'anthropic', 'google', 'groq', 'xai'], // All models
    judgeModel: 'claude-opus-4-1-20250514', // Premium judge
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
    availableProviders: ['openai', 'anthropic', 'google', 'groq', 'xai'], // All models
    judgeModel: 'claude-sonnet-4-20250514', // Claude Sonnet 4.5 for quality/cost balance (per FEATURES.md line 409)
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

// Guest/Free tier models: Only free working models from registry
const FREE_MODELS_FROM_REGISTRY = Object.entries(MODEL_REGISTRY)
  .filter(([provider]) => provider === 'google' || provider === 'groq')
  .reduce((acc, [provider, models]) => {
    acc[provider as Provider] = models
      .filter(m => m.tier === 'free' && m.status === 'working')
      .map(m => m.id)
    return acc
  }, {} as Record<Provider, string[]>)

// Guest tier model whitelist (same as free tier)
export const GUEST_TIER_MODELS = FREE_MODELS_FROM_REGISTRY

// Free tier model whitelist
export const FREE_TIER_MODELS = FREE_MODELS_FROM_REGISTRY

// All available working models (from registry)
export const ALL_MODELS: Record<Provider, string[]> = Object.entries(MODEL_REGISTRY).reduce(
  (acc, [provider, models]) => {
    acc[provider as Provider] = models
      .filter(m => m.status === 'working')
      .map(m => m.id)
    return acc
  },
  {} as Record<Provider, string[]>
)

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

// Models with internet access capabilities (from registry)
export const MODELS_WITH_INTERNET = Object.values(MODEL_REGISTRY)
  .flat()
  .filter(m => m.hasInternet)
  .map(m => m.id)

export function hasInternetAccess(model: string): boolean {
  return MODELS_WITH_INTERNET.includes(model)
}