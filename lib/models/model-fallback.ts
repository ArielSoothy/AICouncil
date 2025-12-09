/**
 * Model Fallback Service
 *
 * Provides automatic fallback when models fail or return empty responses.
 * Falls back to models of the same tier, then lower tiers.
 *
 * Created: December 7, 2025
 */

import { MODEL_REGISTRY, ModelInfo, Provider, ModelTier, getModelInfo, isFreeModel } from './model-registry'

// ============================================================================
// FALLBACK CONFIGURATION
// ============================================================================

/**
 * Fallback chains by tier - ordered by preference
 * Each entry lists alternative models to try when the primary fails
 */
export const FALLBACK_CHAINS: Record<ModelTier, { provider: Provider; model: string }[]> = {
  free: [
    // Free tier fallbacks - mix providers for resilience
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'google', model: 'gemini-2.0-flash' },
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'google', model: 'gemini-2.0-flash-lite' },
  ],
  budget: [
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'openai', model: 'gpt-3.5-turbo' },
    { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
    // Fall down to free tier
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'google', model: 'gemini-2.0-flash' },
  ],
  balanced: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
    { provider: 'xai', model: 'grok-3-beta' },
    // Fall down to budget
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  ],
  premium: [
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    { provider: 'openai', model: 'gpt-5-mini' },
    // Fall down to balanced
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'xai', model: 'grok-4-fast-non-reasoning' },
  ],
  flagship: [
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    { provider: 'openai', model: 'gpt-5' },
    { provider: 'xai', model: 'grok-4-fast-reasoning' },
    { provider: 'google', model: 'gemini-2.5-pro' },
    // Fall down to premium/balanced
    { provider: 'openai', model: 'gpt-4o' },
  ],
}

/**
 * Provider-specific fallbacks - when a specific provider is down
 */
export const PROVIDER_FALLBACKS: Record<Provider, { provider: Provider; model: string }[]> = {
  google: [
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'openai', model: 'gpt-4.1-mini' },
  ],
  groq: [
    { provider: 'google', model: 'gemini-2.0-flash' },
    { provider: 'xai', model: 'grok-code-fast-1' },
  ],
  openai: [
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
    { provider: 'xai', model: 'grok-4-fast-non-reasoning' },
  ],
  anthropic: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'xai', model: 'grok-4-fast-reasoning' },
  ],
  xai: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  ],
  perplexity: [
    { provider: 'google', model: 'gemini-2.0-flash' }, // Has native search
    { provider: 'openai', model: 'gpt-4o' },
  ],
  mistral: [
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  ],
  cohere: [
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
    { provider: 'openai', model: 'gpt-4.1-mini' },
  ],
}

// ============================================================================
// TYPES
// ============================================================================

export interface FallbackResult {
  success: boolean
  usedFallback: boolean
  originalModel: string
  actualModel: string
  actualProvider: Provider
  response: string
  tokens: { input: number; output: number; total: number }
  error?: string
  fallbackChain?: string[] // Models tried before success
}

export interface ModelQueryOptions {
  provider: Provider
  model: string
  enabled?: boolean
  maxTokens?: number
  useWebSearch?: boolean
  persona?: {
    name: string
    role: string
  }
}

export type QueryFunction = (prompt: string, options: ModelQueryOptions) => Promise<{
  response: string
  tokens: { input: number; output: number; total: number }
}>

// ============================================================================
// FALLBACK SERVICE
// ============================================================================

/**
 * Get fallback models for a specific model
 */
export function getFallbacksForModel(modelId: string, excludeProviders: Provider[] = []): { provider: Provider; model: string }[] {
  const modelInfo = getModelInfo(modelId)
  if (!modelInfo) {
    // Unknown model - return generic free tier fallbacks
    return FALLBACK_CHAINS.free.filter(f => !excludeProviders.includes(f.provider))
  }

  // Start with provider-specific fallbacks
  const providerFallbacks = PROVIDER_FALLBACKS[modelInfo.provider] || []

  // Then tier-based fallbacks
  const tierFallbacks = FALLBACK_CHAINS[modelInfo.tier] || FALLBACK_CHAINS.free

  // Combine, dedupe, and filter
  const combined = [...providerFallbacks, ...tierFallbacks]
  const seen = new Set<string>()
  const unique: { provider: Provider; model: string }[] = []

  for (const fallback of combined) {
    const key = `${fallback.provider}/${fallback.model}`
    // Skip if already seen, is the original model, or provider is excluded
    if (seen.has(key) || fallback.model === modelId || excludeProviders.includes(fallback.provider)) {
      continue
    }
    seen.add(key)
    unique.push(fallback)
  }

  return unique
}

/**
 * Check if a response is considered "failed" (empty or error)
 */
export function isResponseFailed(response: string | null | undefined): boolean {
  if (!response) return true
  if (response.trim().length === 0) return true
  if (response.toLowerCase().includes('error:')) return true
  if (response.length < 10) return true // Suspiciously short
  return false
}

/**
 * Query with automatic fallback
 *
 * @param prompt - The prompt to send
 * @param options - Model configuration
 * @param queryFn - Function to actually query the model
 * @param maxRetries - Maximum fallback attempts (default 3)
 * @returns FallbackResult with success status and response
 */
export async function queryWithFallback(
  prompt: string,
  options: ModelQueryOptions,
  queryFn: QueryFunction,
  maxRetries = 3
): Promise<FallbackResult> {
  const originalModel = options.model
  const fallbackChain: string[] = []
  let lastError: string | undefined

  // First, try the original model
  try {
    console.log(`[Fallback] Trying primary: ${options.provider}/${options.model}`)
    const result = await queryFn(prompt, options)

    if (!isResponseFailed(result.response)) {
      return {
        success: true,
        usedFallback: false,
        originalModel,
        actualModel: options.model,
        actualProvider: options.provider,
        response: result.response,
        tokens: result.tokens,
      }
    }

    console.log(`[Fallback] Primary model returned empty/failed response`)
    lastError = 'Empty response from primary model'
    fallbackChain.push(`${options.provider}/${options.model} (empty)`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`[Fallback] Primary model failed: ${errorMsg}`)
    lastError = errorMsg
    fallbackChain.push(`${options.provider}/${options.model} (error: ${errorMsg.substring(0, 50)})`)
  }

  // Get fallback models
  const failedProviders: Provider[] = [options.provider]
  const fallbacks = getFallbacksForModel(originalModel, failedProviders)

  // Try fallbacks
  for (let i = 0; i < Math.min(maxRetries, fallbacks.length); i++) {
    const fallback = fallbacks[i]

    try {
      console.log(`[Fallback] Trying fallback ${i + 1}/${maxRetries}: ${fallback.provider}/${fallback.model}`)

      const fallbackOptions: ModelQueryOptions = {
        ...options,
        provider: fallback.provider,
        model: fallback.model,
      }

      const result = await queryFn(prompt, fallbackOptions)

      if (!isResponseFailed(result.response)) {
        console.log(`[Fallback] Success with fallback: ${fallback.provider}/${fallback.model}`)
        return {
          success: true,
          usedFallback: true,
          originalModel,
          actualModel: fallback.model,
          actualProvider: fallback.provider,
          response: result.response,
          tokens: result.tokens,
          fallbackChain,
        }
      }

      fallbackChain.push(`${fallback.provider}/${fallback.model} (empty)`)
      failedProviders.push(fallback.provider)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.log(`[Fallback] Fallback ${i + 1} failed: ${errorMsg}`)
      lastError = errorMsg
      fallbackChain.push(`${fallback.provider}/${fallback.model} (error)`)
      failedProviders.push(fallback.provider)
    }
  }

  // All fallbacks failed
  console.log(`[Fallback] All ${fallbackChain.length} attempts failed`)
  return {
    success: false,
    usedFallback: true,
    originalModel,
    actualModel: originalModel,
    actualProvider: options.provider,
    response: '',
    tokens: { input: 0, output: 0, total: 0 },
    error: lastError || 'All fallback models failed',
    fallbackChain,
  }
}

/**
 * Get a working model for a specific tier
 * Useful for preemptive selection of a reliable model
 */
export function getReliableModelForTier(tier: ModelTier, preferFree = false): { provider: Provider; model: string } | null {
  if (preferFree && tier !== 'free') {
    // User prefers free but requested higher tier - still use free
    tier = 'free'
  }

  const chain = FALLBACK_CHAINS[tier]
  if (chain && chain.length > 0) {
    // Return first model in chain (most reliable)
    return chain[0]
  }

  // Fallback to any free model
  return FALLBACK_CHAINS.free[0] || null
}

/**
 * Check if we have a working fallback available
 */
export function hasFallbackAvailable(modelId: string): boolean {
  const fallbacks = getFallbacksForModel(modelId)
  return fallbacks.length > 0
}
