/**
 * MODEL REGISTRY - Single Source of Truth
 *
 * This is the ONLY place where models should be defined.
 * All other files should import from this registry.
 *
 * Last Updated: 2025-11-22
 *
 * ============================================================================
 * GOOGLE GEMINI MODELS - Official Pricing (ai.google.dev, Nov 2025)
 * ============================================================================
 *
 * FLAGSHIP TIER:
 * - gemini-3-pro-preview-11-2025: $2.00/M input (≤200k), $12.00/M output | #1 on LMArena
 * - gemini-2.5-pro:               $1.25/M input, $10.00/M output | Best reasoning
 *
 * BUDGET TIER:
 * - gemini-2.5-flash-lite:        $0.10/M input, $0.40/M output | CHEAPEST PAID Google model
 *
 * FREE TIER (with free API quota):
 * - gemini-2.5-flash:             $0.30/M input, $2.50/M output | Free tier available
 * - gemini-2.0-flash:             Free tier only | Tested and working
 * - gemini-2.0-flash-lite:        $0.075/M input, $0.30/M output | Free tier available
 *
 * LEGACY (deprecated):
 * - gemini-1.5-flash:             Use 2.0+ instead
 *
 * Source: https://ai.google.dev/gemini-api/docs/models/gemini
 * ============================================================================
 */

import { MODEL_COSTS_PER_1K, MODEL_BENCHMARKS, MODEL_POWER } from '../model-metadata'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'perplexity' | 'mistral' | 'cohere'

export type ModelTier = 'free' | 'budget' | 'balanced' | 'premium' | 'flagship'

export type UserAccessTier = 'guest' | 'free' | 'pro' | 'enterprise'

export interface ModelInfo {
  id: string
  name: string
  provider: Provider
  tier: ModelTier
  badge?: string
  hasInternet?: boolean
  isLegacy?: boolean
  // Testing metadata
  status?: 'working' | 'unreleased' | 'no_api_key' | 'rate_limited' |
           'parameter_error' | 'service_error' | 'empty_response' | 'untested'
  lastTested?: string  // ISO 8601 timestamp
  notes?: string  // Human-readable error details
  testResponseTime?: number  // milliseconds
}

export interface ProviderInfo {
  key: Provider
  name: string
  models: ModelInfo[]
}

// ============================================================================
// PROVIDER DISPLAY NAMES
// ============================================================================

export const PROVIDER_NAMES: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  groq: 'Groq',
  xai: 'xAI (Grok)',
  perplexity: 'Perplexity',
  mistral: 'Mistral',
  cohere: 'Cohere'
}

// ============================================================================
// INTERNET ACCESS MODELS (Updated November 2025)
// ============================================================================
// Research findings:
// - Anthropic: Claude has web search since March 2025 (global May 2025)
// - OpenAI: GPT-4o, GPT-5, GPT-5.1 all have web search via API
// - Google: Gemini has Google Search grounding
// - xAI: Grok 4 has Live Search / Agent Tools API
// - Perplexity: Sonar models are built for search (best at this)
// - Mistral: Agents API with web search (uses Brave Search)
// - Cohere: RAG connectors with web search
// - Groq: NO native search (open-source models) - needs DuckDuckGo fallback

const MODELS_WITH_INTERNET = new Set([
  // OpenAI - All GPT-4o and GPT-5 series have web search
  'gpt-5.1', 'gpt-5.1-mini',
  'gpt-5-chat-latest', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4o', 'gpt-4-turbo-preview', 'gpt-4',
  // Anthropic - Claude has web search since March 2025
  'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20250715',
  'claude-opus-4-1-20250514', 'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022',
  // Google - Gemini has Google Search grounding
  'gemini-3-pro-preview-11-2025', 'gemini-3-deep-think',
  'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
  'gemini-2.0-flash', 'gemini-2.0-flash-lite',
  // xAI - Grok 4 has Live Search API
  'grok-4-fast-reasoning', 'grok-4-fast-non-reasoning', 'grok-4-0709',
  'grok-code-fast-1',
  // Perplexity - Built for search
  'sonar-pro', 'sonar-small',
  // Mistral - Agents API with Brave Search
  'mistral-large-latest', 'mistral-small-latest',
  // Cohere - RAG with web search
  'command-r-plus', 'command-r'
  // NOTE: Groq/Llama models do NOT have native web search
])

// ============================================================================
// MODEL REGISTRY - SINGLE SOURCE OF TRUTH
// ============================================================================

export const MODEL_REGISTRY: Record<Provider, ModelInfo[]> = {
  // ===== OPENAI =====
  openai: [
    // GPT-5.1 Series (NEW - Nov 2025)
    { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai', tier: 'flagship', badge: '🌟', status: 'untested', lastTested: '2025-11-19T00:00:00.000Z', notes: 'Latest GPT-5 series release. Improved reasoning and performance over GPT-5' },
    { id: 'gpt-5.1-mini', name: 'GPT-5.1 Mini', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'untested', lastTested: '2025-11-19T00:00:00.000Z', notes: 'Smaller, faster version of GPT-5.1' },
    // GPT-5 Series (2025 Flagship)
    { id: 'gpt-5-chat-latest', name: 'GPT-5 Chat (Latest)', provider: 'openai', tier: 'flagship', badge: '🌟', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-5', name: 'GPT-5', provider: 'openai', tier: 'flagship', badge: '🌟', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    // GPT-4.1 Series
    { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', tier: 'budget', badge: '💰', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'openai', tier: 'budget', badge: '💰', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    // O-Series
    { id: 'o3', name: 'O3', provider: 'openai', tier: 'flagship', badge: '🌟', status: 'unreleased', lastTested: '2025-10-28T17:33:11.000Z', notes: 'O3 series not yet released via API' },
    { id: 'o4-mini', name: 'O4 Mini', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'unreleased', lastTested: '2025-10-28T17:33:11.000Z', notes: 'O4 series not yet released via API' },
    // GPT-4 Series
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-4o-realtime-preview', name: 'GPT-4o Realtime', provider: 'openai', tier: 'premium', badge: '💎', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Realtime API requires different endpoint/parameters (not standard chat completion)' },
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'openai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    // GPT-3.5 Series (Budget)
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', tier: 'budget', badge: '💰', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', provider: 'openai', tier: 'budget', badge: '💰', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' }
  ],

  // ===== ANTHROPIC (Web search available since March 2025) =====
  anthropic: [
    // Claude 4.5 Series (2025 Flagship) - All have web search
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude 4.5 Sonnet', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. Has web search capability' },
    { id: 'claude-haiku-4-5-20250715', name: 'Claude 4.5 Haiku', provider: 'anthropic', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'unreleased', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Claude 4.5 Haiku not yet released via API' },
    // Claude 4 Series - All have web search
    { id: 'claude-opus-4-1-20250514', name: 'Claude 4 Opus', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'unreleased', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Claude 4 Opus not yet released via API' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. Has web search capability' },
    // Claude 3.7 Series - Has web search (first Claude with browsing)
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. First Claude model with web search (March 2025)' },
    // Claude 3.5 Series (Haiku only - Sonnet was replaced by 3.7)
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. Has web search capability' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (DEPRECATED)', provider: 'anthropic', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'service_error', isLegacy: true, lastTested: '2025-01-30T00:00:00.000Z', notes: 'Claude 3.5 Sonnet does not exist - replaced by Claude 3.7 Sonnet. Use claude-3-7-sonnet-20250219 instead.' },
    // Claude 3 Series (Budget)
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', tier: 'budget', badge: '💰', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic', tier: 'budget', badge: '💰', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Superseded by Claude 3.5 Sonnet - model may have been deprecated', isLegacy: true },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', tier: 'budget', badge: '💰', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    // Claude 2 Series (Legacy)
    { id: 'claude-2.1', name: 'Claude 2.1', provider: 'anthropic', tier: 'budget', badge: '💰', isLegacy: true, status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Claude 2.x is deprecated - no longer available via API' },
    { id: 'claude-2.0', name: 'Claude 2.0', provider: 'anthropic', tier: 'budget', badge: '💰', isLegacy: true, status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Claude 2.x is deprecated - no longer available via API' }
  ],

  // ===== GOOGLE (Updated Nov 2025 from official docs) =====
  google: [
    // Gemini 3 Series (Flagship - Nov 2025)
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'google', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'untested', lastTested: '2025-11-22T00:00:00.000Z', notes: 'Flagship. $2/M input (≤200k), $12/M output. #1 on LMArena' },
    // Gemini 2.5 Series (Stable - Available)
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'untested', lastTested: '2025-11-22T00:00:00.000Z', notes: 'Flagship. $1.25/M input, $10/M output. Best reasoning' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'untested', lastTested: '2025-11-22T00:00:00.000Z', notes: 'Free tier available. Paid: $0.30/M input, $2.50/M output' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'google', tier: 'budget', badge: '💰', hasInternet: true, status: 'untested', lastTested: '2025-11-22T00:00:00.000Z', notes: 'CHEAPEST PAID: $0.10/M input, $0.40/M output. High throughput' },
    // Gemini 2.0 Series (Free)
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Free tier. Tested and working' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'untested', lastTested: '2025-11-22T00:00:00.000Z', notes: 'Free tier. Paid: $0.075/M input, $0.30/M output' },
    // Gemini 1.5 Series (Legacy)
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', tier: 'free', badge: '🎁', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Deprecated - use 2.0 or 2.5', isLegacy: true }
  ],

  // ===== GROQ (All Free - NO native web search, needs DuckDuckGo fallback) =====
  groq: [
    // Llama Models - NO native internet access (open-source models)
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', tier: 'free', badge: '🎁', hasInternet: false, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. No native web search - use DuckDuckGo fallback' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq', tier: 'free', badge: '🎁', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    // Tool-Use Specialists (#1 and #3 on Berkeley Function Calling Leaderboard)
    { id: 'llama-3-groq-70b-tool-use', name: 'Llama 3 70B Tool Use', provider: 'groq', tier: 'free', badge: '🎁', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tool use models require special parameters - returns empty response with standard query' },
    { id: 'llama-3-groq-8b-tool-use', name: 'Llama 3 8B Tool Use', provider: 'groq', tier: 'free', badge: '🎁', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tool use models require special parameters - returns empty response with standard query' },
    // Gemma
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq', tier: 'free', badge: '🎁', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Model may require special parameters or deprecated - returns empty response' }
  ],

  // ===== XAI (Grok) - Has Live Search / Agent Tools API =====
  xai: [
    // Grok 4 Series (Flagship) - All have Live Search API
    { id: 'grok-4-fast-reasoning', name: 'Grok 4 Fast Reasoning', provider: 'xai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. Has Live Search API for real-time web/X data' },
    { id: 'grok-4-fast-non-reasoning', name: 'Grok 4 Fast', provider: 'xai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. Has Live Search API' },
    { id: 'grok-4-0709', name: 'Grok 4 (0709)', provider: 'xai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. Has Live Search API' },
    // Grok 3 Series (Balanced)
    { id: 'grok-3', name: 'Grok 3', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'unreleased', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Grok 3 not yet released via API' },
    { id: 'grok-3-mini', name: 'Grok 3 Mini', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'unreleased', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Grok 3 Mini not yet released via API' },
    // Grok 2 Series
    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Grok 2 Vision not available - may have been superseded by Grok 4' },
    { id: 'grok-2-1212', name: 'Grok 2 (1212)', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Grok 2 (1212) not available - may have been superseded by Grok 4' },
    { id: 'grok-2-latest', name: 'Grok 2 Latest', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Grok 2 Latest not available - may have been superseded by Grok 4' },
    // Grok Code (Specialized)
    { id: 'grok-code-fast-1', name: 'Grok Code Fast', provider: 'xai', tier: 'balanced', badge: '⚡', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' }
  ],

  // ===== PERPLEXITY =====
  perplexity: [
    { id: 'sonar-pro', name: 'Sonar Pro', provider: 'perplexity', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'no_api_key', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Perplexity API key may be invalid or API endpoint changed - returns empty response' },
    { id: 'sonar-small', name: 'Sonar Small', provider: 'perplexity', tier: 'budget', badge: '💰', hasInternet: true, status: 'no_api_key', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Perplexity API key may be invalid or API endpoint changed - returns empty response' }
  ],

  // ===== MISTRAL (Agents API with Brave Search - May 2025) =====
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'no_api_key', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Has web search via Agents API (Brave Search). API key may be invalid' },
    { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral', tier: 'budget', badge: '💰', hasInternet: true, status: 'no_api_key', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Has web search via Agents API. API key may be invalid' }
  ],

  // ===== COHERE (RAG connectors with web search) =====
  cohere: [
    { id: 'command-r-plus', name: 'Command R+', provider: 'cohere', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'no_api_key', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Has RAG connectors with web search grounding. API key may be invalid' },
    { id: 'command-r', name: 'Command R', provider: 'cohere', tier: 'budget', badge: '💰', hasInternet: true, status: 'no_api_key', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Has RAG connectors with web search. API key may be invalid' }
  ]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all models for a specific provider
 */
export function getModelsByProvider(provider: Provider): ModelInfo[] {
  return MODEL_REGISTRY[provider] || []
}

/**
 * Get all providers with their models
 */
export function getAllProviders(): ProviderInfo[] {
  return Object.entries(MODEL_REGISTRY).map(([key, models]) => ({
    key: key as Provider,
    name: PROVIDER_NAMES[key as Provider],
    models
  }))
}

/**
 * Get model information by ID
 */
export function getModelInfo(modelId: string): ModelInfo | null {
  for (const provider of Object.values(MODEL_REGISTRY)) {
    const model = provider.find(m => m.id === modelId)
    if (model) return model
  }
  return null
}

/**
 * Get display name for a model
 */
export function getModelDisplayName(modelId: string): string {
  const model = getModelInfo(modelId)
  if (!model) return modelId
  return model.badge ? `${model.badge} ${model.name}` : model.name
}

/**
 * Check if model has internet access
 */
export function hasInternetAccess(modelId: string): boolean {
  const model = getModelInfo(modelId)
  return model?.hasInternet || MODELS_WITH_INTERNET.has(modelId)
}

/**
 * Get model cost information
 */
export function getModelCost(modelId: string) {
  return MODEL_COSTS_PER_1K[modelId] || null
}

/**
 * Get model benchmark information
 */
export function getModelBenchmark(modelId: string) {
  return MODEL_BENCHMARKS[modelId] || null
}

/**
 * Get model influence weight (for consensus voting)
 */
export function getModelWeight(modelId: string): number {
  return MODEL_POWER[modelId] || 0.7
}

/**
 * Check if model is free tier
 */
export function isFreeModel(modelId: string): boolean {
  const model = getModelInfo(modelId)
  return model?.tier === 'free'
}

/**
 * Get all models as a flat list (for backwards compatibility)
 */
export function getAllModels(): string[] {
  return Object.values(MODEL_REGISTRY)
    .flat()
    .map(m => m.id)
}

/**
 * Get models by tier
 */
export function getModelsByTier(tier: ModelTier): ModelInfo[] {
  return Object.values(MODEL_REGISTRY)
    .flat()
    .filter(m => m.tier === tier)
}

/**
 * Get free models for guest/free tier users
 */
export function getFreeModels(): { provider: Provider; models: string[] }[] {
  return [
    {
      provider: 'google',
      models: MODEL_REGISTRY.google
        .filter(m => m.tier === 'free')
        .map(m => m.id)
    },
    {
      provider: 'groq',
      models: MODEL_REGISTRY.groq.map(m => m.id)
    }
  ]
}

/**
 * Get models available to a user tier
 */
export function getModelsForUserTier(userTier: UserAccessTier): ProviderInfo[] {
  // Guest and Free users: Only free models
  if (userTier === 'guest' || userTier === 'free') {
    return [
      {
        key: 'google',
        name: PROVIDER_NAMES.google,
        models: MODEL_REGISTRY.google.filter(m => m.tier === 'free')
      },
      {
        key: 'groq',
        name: PROVIDER_NAMES.groq,
        models: MODEL_REGISTRY.groq
      }
    ]
  }

  // Pro and Enterprise: All models
  return getAllProviders()
}

/**
 * Check if user can access a model based on their tier
 */
export function canUserAccessModel(userTier: UserAccessTier, modelId: string): boolean {
  const model = getModelInfo(modelId)
  if (!model) return false

  // Free/guest users can only access free models
  if (userTier === 'guest' || userTier === 'free') {
    return model.tier === 'free'
  }

  // Pro and Enterprise can access all models
  return true
}

/**
 * Get all untested models
 */
export function getUntestedModels(): ModelInfo[] {
  return Object.values(MODEL_REGISTRY)
    .flat()
    .filter(m => !m.status || m.status === 'untested')
}

/**
 * Get models by status
 */
export function getModelsByStatus(status: ModelInfo['status']): ModelInfo[] {
  return Object.values(MODEL_REGISTRY)
    .flat()
    .filter(m => m.status === status)
}

/**
 * Get only working models (for UI selectors)
 */
export function getWorkingModels(): ModelInfo[] {
  return getModelsByStatus('working')
}

/**
 * Get working models for a specific provider
 */
export function getWorkingModelsByProvider(provider: Provider): ModelInfo[] {
  return MODEL_REGISTRY[provider].filter(m => m.status === 'working')
}

/**
 * Check if a model is working
 */
export function isModelWorking(modelId: string): boolean {
  const model = getModelInfo(modelId)
  return model?.status === 'working'
}

// ============================================================================
// LEGACY EXPORTS (for backwards compatibility during migration)
// ============================================================================

/**
 * @deprecated Use MODEL_REGISTRY instead
 */
export const ALL_MODELS: Record<Provider, string[]> = Object.entries(MODEL_REGISTRY).reduce(
  (acc, [provider, models]) => {
    acc[provider as Provider] = models.map(m => m.id)
    return acc
  },
  {} as Record<Provider, string[]>
)
