/**
 * MODEL REGISTRY - Single Source of Truth
 *
 * This is the ONLY place where models should be defined.
 * All other files should import from this registry.
 *
 * Last Updated: 2026-02-07
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
 * - gemini-3-flash-preview:       Free tier available | Gemini 3 Flash
 * - gemini-2.5-flash:             $0.30/M input, $2.50/M output | Free tier available
 * - gemini-2.0-flash-lite:        $0.075/M input, $0.30/M output | Free tier available
 *
 * LEGACY (deprecated):
 * - gemini-2.0-flash:             DEPRECATED - shutdown March 31, 2026
 * - gemini-1.5-flash:             Use 2.5+ instead
 *
 * Source: https://ai.google.dev/gemini-api/docs/models/gemini
 * ============================================================================
 */

import { MODEL_COSTS_PER_1K, MODEL_BENCHMARKS, MODEL_POWER, getModelRank, getMaxRank } from '../model-metadata'

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
  isSubscription?: boolean  // True for CLI/subscription-only models (Codex, Grok Code)
  // Testing metadata
  status?: 'working' | 'unreleased' | 'no_api_key' | 'rate_limited' |
           'parameter_error' | 'service_error' | 'empty_response' | 'untested' |
           'decommissioned' | 'deprecated' | 'responses_api_only' | 'not_supported'
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
  'gpt-5.2', 'gpt-5.2-chat-latest', 'gpt-5.2-pro', 'gpt-5.2-codex',
  'gpt-5.1', 'gpt-5.1-mini',
  'gpt-5-chat-latest', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4o', 'gpt-4-turbo-preview', 'gpt-4',
  // Anthropic - Claude has web search since March 2025 (FIXED Nov 2025)
  'claude-opus-4-6',
  'claude-opus-4-5-20251101', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001',
  'claude-opus-4-1-20250805', 'claude-opus-4-20250514', 'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022',
  // Google - Gemini has Google Search grounding
  'gemini-3-flash-preview',
  'gemini-3-pro-preview', 'gemini-3-pro-image-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
  'gemini-2.0-flash', 'gemini-2.0-flash-lite',
  // xAI - Grok 4 has Live Search API
  'grok-4-1-fast-reasoning', 'grok-4-fast-reasoning', 'grok-4-fast-non-reasoning', 'grok-4-0709',
  'grok-3-beta', 'grok-3-mini-beta', 'grok-code-fast-1',
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
    // GPT-5.2 Series (NEW - Feb 2026)
    { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Latest GPT-5 series. $1.75/M input, $14/M output. Improved reasoning over GPT-5.1' },
    { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Chat (Latest)', provider: 'openai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Alias for latest GPT-5.2 chat model' },
    { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'openai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Premium GPT-5.2 with extended reasoning. $21/M input, $168/M output' },
    { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', provider: 'openai', tier: 'flagship', badge: '🌟', isSubscription: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Code-optimized GPT-5.2. Available via Responses API' },
    // GPT-5.1 Series (Nov 2025)
    { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'GPT-5 series. Improved reasoning and performance over GPT-5' },
    { id: 'gpt-5.1-mini', name: 'GPT-5.1 Mini', provider: 'openai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Smaller, faster version of GPT-5.1' },
    // GPT-5 Series (2025 Flagship)
    { id: 'gpt-5-chat-latest', name: 'GPT-5 Chat (Latest)', provider: 'openai', tier: 'flagship', badge: '🌟', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-5', name: 'GPT-5', provider: 'openai', tier: 'flagship', badge: '🌟', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai', tier: 'balanced', badge: '⚡', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    // GPT-5 Codex Series (Code-optimized, Subscription/CLI models)
    { id: 'gpt-5-codex', name: 'GPT-5 Codex', provider: 'openai', tier: 'flagship', badge: '🌟', isSubscription: true, status: 'working', lastTested: '2025-12-12T00:00:00.000Z', notes: 'Code-optimized GPT-5. Available via Responses API. Same price as GPT-5' },
    { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini', provider: 'openai', tier: 'balanced', badge: '⚡', isSubscription: true, status: 'working', lastTested: '2025-12-14T00:00:00.000Z', notes: 'Succeeded gpt-5-codex-mini. Available via Responses API. 4x more usage vs gpt-5-codex' },
    { id: 'codex-mini-latest', name: 'Codex Mini (Latest)', provider: 'openai', tier: 'balanced', badge: '⚡', isSubscription: true, status: 'responses_api_only', lastTested: '2025-12-14T00:00:00.000Z', notes: 'REQUIRES RESPONSES API (not Chat Completions). $1.50/M input, $6/M output. 75% prompt caching discount' },
    // GPT-5.1 Codex Max (Flagship subscription model)
    { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max', provider: 'openai', tier: 'flagship', badge: '🌟', isSubscription: true, status: 'working', lastTested: '2025-12-12T00:00:00.000Z', notes: 'Flagship code model. OpenAI Codex Max/Pro+ subscription. Multi-million token context via compaction' },
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
    { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', provider: 'openai', tier: 'budget', badge: '💰', status: 'deprecated', lastTested: '2025-12-14T00:00:00.000Z', notes: 'DEPRECATED: Model ID no longer exists. Use gpt-3.5-turbo which now has 16k context by default' }
  ],

  // ===== ANTHROPIC (Web search available since March 2025) =====
  anthropic: [
    // Claude 4.6 Series (2026 Flagship) - Newest
    { id: 'claude-opus-4-6', name: 'Claude 4.6 Opus', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Released Feb 5, 2026. Latest Anthropic flagship. $5/$25 per M tokens. 200K context' },
    // Claude 4.5 Series (2025) - All have web search
    { id: 'claude-opus-4-5-20251101', name: 'Claude 4.5 Opus', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-12-14T00:00:00.000Z', notes: 'Released Nov 24, 2025. Model ID uses 20251101. Best coding model (80.9% SWE-bench). $5/$25 per M tokens' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude 4.5 Sonnet', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working. Has web search capability' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude 4.5 Haiku', provider: 'anthropic', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'working', lastTested: '2025-11-23T00:00:00.000Z', notes: 'Fast, cost-effective model released October 2025. $1/$5 per million tokens' },
    // Claude 4.1 Series - Opus 4.1 (August 2025)
    { id: 'claude-opus-4-1-20250805', name: 'Claude 4.1 Opus', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-11-23T00:00:00.000Z', notes: 'Released August 5, 2025. Premium agentic tasks and reasoning' },
    // Claude 4 Series (May 2025) - All have web search
    { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus', provider: 'anthropic', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-11-23T00:00:00.000Z', notes: 'Released May 22, 2025. Previous flagship model' },
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

  // ===== GOOGLE (Updated Feb 2026 from official docs) =====
  google: [
    // Gemini 3 Series (Flagship)
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Free tier available. Fast Gemini 3 model' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'google', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-12-14T00:00:00.000Z', notes: 'PAID ONLY: Works with paid API. Returns empty on free tier. $2/M input, $12/M output' },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', provider: 'google', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'empty_response', lastTested: '2025-12-14T00:00:00.000Z', notes: 'PREVIEW: No free tier. Image generation model with reasoning-enhanced composition' },
    // Gemini 2.5 Series (Stable - Available)
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-12-14T00:00:00.000Z', notes: 'PAID ONLY: Works with paid API. Returns empty on free tier. $1.25/M input, $10/M output' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'working', lastTested: '2025-12-09T00:00:00.000Z', notes: 'Tested and working. Free tier available.' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'working', lastTested: '2025-12-09T00:00:00.000Z', notes: 'Tested and working. Free tier available.' },
    // Gemini 2.0 Series (DEPRECATED - shutdown March 31, 2026)
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (DEPRECATED)', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'deprecated', lastTested: '2026-02-07T00:00:00.000Z', notes: 'DEPRECATED: Shutdown March 31, 2026. Use gemini-2.5-flash or gemini-3-flash-preview instead', isLegacy: true },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'google', tier: 'free', badge: '🎁', hasInternet: true, status: 'working', lastTested: '2025-12-09T00:00:00.000Z', notes: 'Free tier available. May hit quota limits.' },
    // Gemini 1.5 Series (Legacy)
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', tier: 'free', badge: '🎁', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Deprecated - use 2.0 or 2.5', isLegacy: true }
  ],

  // ===== GROQ (Mixed free/paid - NO native web search, needs DuckDuckGo fallback) =====
  groq: [
    // Llama 4 Series (NEW - Feb 2026) - Preview models
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', provider: 'groq', tier: 'budget', badge: '💰', hasInternet: false, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Llama 4 Scout MoE (16 experts). $0.11/M input, $0.34/M output' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', provider: 'groq', tier: 'budget', badge: '💰', hasInternet: false, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Llama 4 Maverick MoE (128 experts). $0.20/M input, $0.60/M output' },
    // GPT-OSS on Groq (NEW - Feb 2026)
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', provider: 'groq', tier: 'budget', badge: '💰', hasInternet: false, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'OpenAI open-source 120B on Groq. $0.15/M input, $0.60/M output' },
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', provider: 'groq', tier: 'budget', badge: '💰', hasInternet: false, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'OpenAI open-source 20B on Groq. $0.075/M input, $0.30/M output' },
    // Llama 3.x Models (NOW PAID as of Jan 2026)
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', tier: 'budget', badge: '💰', hasInternet: false, status: 'working', lastTested: '2026-02-07T00:00:00.000Z', notes: 'Now PAID: $0.59/M input, $0.79/M output (was free). No native web search' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq', tier: 'free', badge: '🎁', status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tested and confirmed working' },
    // Tool-Use Specialists (#1 and #3 on Berkeley Function Calling Leaderboard)
    { id: 'llama-3-groq-70b-tool-use', name: 'Llama 3 70B Tool Use', provider: 'groq', tier: 'free', badge: '🎁', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tool use models require special parameters - returns empty response with standard query' },
    { id: 'llama-3-groq-8b-tool-use', name: 'Llama 3 8B Tool Use', provider: 'groq', tier: 'free', badge: '🎁', status: 'parameter_error', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Tool use models require special parameters - returns empty response with standard query' },
    // Gemma (DECOMMISSIONED as of Nov 2025)
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq', tier: 'free', badge: '🎁', status: 'decommissioned', lastTested: '2025-11-23T00:00:00.000Z', notes: 'DECOMMISSIONED by Groq Nov 2025. Do not use.', isLegacy: true }
  ],

  // ===== XAI (Grok) - Has Live Search / Agent Tools API =====
  xai: [
    // Grok 4.1 Series (Newest - Nov 2025)
    { id: 'grok-4-1-fast-reasoning', name: 'Grok 4.1 Fast Reasoning', provider: 'xai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-11-23T00:00:00.000Z', notes: 'Released Nov 17-18, 2025. Best tool-calling model with 2M context' },
    // Grok 4 Series (Flagship) - All have Live Search API
    { id: 'grok-4-fast-reasoning', name: 'Grok 4 Fast Reasoning', provider: 'xai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Has Live Search API for real-time web/X data' },
    { id: 'grok-4-fast-non-reasoning', name: 'Grok 4 Fast', provider: 'xai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Has Live Search API' },
    { id: 'grok-4-0709', name: 'Grok 4 (0709)', provider: 'xai', tier: 'flagship', badge: '🌟', hasInternet: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: 'Has Live Search API' },
    // Grok 3 Series (Balanced) - Beta versions
    { id: 'grok-3-beta', name: 'Grok 3 Beta', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'working', lastTested: '2025-11-23T00:00:00.000Z', notes: '131K context. Has Live Search API' },
    { id: 'grok-3-mini-beta', name: 'Grok 3 Mini Beta', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, status: 'working', lastTested: '2025-11-23T00:00:00.000Z', notes: '131K context. Fast, efficient model' },
    // Grok 2 Series (Deprecated - superseded by Grok 4)
    { id: 'grok-2-image-1212', name: 'Grok 2 Image', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: false, status: 'not_supported', lastTested: '2025-12-14T00:00:00.000Z', notes: 'IMAGE GENERATION MODEL - not compatible with Chat Completions API. Requires different endpoint' },
    // Grok Code (Specialized)
    { id: 'grok-code-fast-1', name: 'Grok Code Fast', provider: 'xai', tier: 'balanced', badge: '⚡', hasInternet: true, isSubscription: true, status: 'working', lastTested: '2025-10-28T17:33:11.000Z', notes: '256K context. Optimized for code generation. xAI subscription model.' }
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
      models: MODEL_REGISTRY.groq
        .filter(m => m.tier === 'free')
        .map(m => m.id)
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

// ============================================================================
// POWER/WEIGHT & COST DISPLAY HELPERS
// ============================================================================

export type ModelGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C'
export type ModelCostTier = 'FREE' | '$' | '$$' | '$$$'

/**
 * Convert weight (0.5-1.0) to letter grade
 */
function weightToGrade(weight: number): ModelGrade {
  if (weight >= 0.95) return 'A+'
  if (weight >= 0.85) return 'A'
  if (weight >= 0.75) return 'B+'
  if (weight >= 0.65) return 'B'
  if (weight >= 0.55) return 'C+'
  return 'C'
}

/**
 * Get model grade with both letter and numeric weight
 * Format: "A+ (0.98)" or "B (0.72)"
 */
export function getModelGrade(modelId: string): { grade: ModelGrade; weight: number; display: string } {
  const weight = MODEL_POWER[modelId] || 0.7
  const grade = weightToGrade(weight)
  return {
    grade,
    weight,
    display: `${grade} (${weight.toFixed(2)})`
  }
}

/**
 * Get model cost tier (FREE, $, $$, $$$)
 */
export function getModelCostTier(modelId: string): ModelCostTier {
  const cost = MODEL_COSTS_PER_1K[modelId]
  if (!cost || (cost.input === 0 && cost.output === 0)) return 'FREE'
  const total = cost.input + cost.output // per 1K tokens
  if (total < 0.005) return '$'      // Budget: <$5/M
  if (total < 0.02) return '$$'      // Balanced: <$20/M
  return '$$$'                        // Premium: >$20/M
}

/**
 * Get full model metadata for display (grade, cost, provider info)
 */
export function getModelDisplayMetadata(modelId: string): {
  name: string
  provider: Provider | null
  grade: ModelGrade
  weight: number
  gradeDisplay: string
  costTier: ModelCostTier
  hasInternet: boolean
  status: ModelInfo['status']
} | null {
  const model = getModelInfo(modelId)
  if (!model) return null

  const { grade, weight, display: gradeDisplay } = getModelGrade(modelId)
  const costTier = getModelCostTier(modelId)

  return {
    name: model.name,
    provider: model.provider,
    grade,
    weight,
    gradeDisplay,
    costTier,
    hasInternet: model.hasInternet || false,
    status: model.status
  }
}

/**
 * Get only selectable models (working, non-legacy)
 */
export function getSelectableModels(): ModelInfo[] {
  return Object.values(MODEL_REGISTRY)
    .flat()
    .filter(m => m.status === 'working' && !m.isLegacy)
}

/**
 * Get selectable models grouped by provider
 */
export function getSelectableModelsByProvider(): Record<Provider, ModelInfo[]> {
  const result: Partial<Record<Provider, ModelInfo[]>> = {}

  for (const [provider, models] of Object.entries(MODEL_REGISTRY)) {
    const selectable = models.filter(m => m.status === 'working' && !m.isLegacy)
    if (selectable.length > 0) {
      result[provider as Provider] = selectable
    }
  }

  return result as Record<Provider, ModelInfo[]>
}

/**
 * Check if a model is selectable (working + not legacy)
 */
export function isModelSelectable(modelId: string): boolean {
  const model = getModelInfo(modelId)
  return model !== null && model.status === 'working' && !model.isLegacy
}

// ============================================================================
// PRESET TIER FILTERING (for Global AI Model Tier selector)
// ============================================================================

/**
 * PresetTier matches the global tier selector in the header
 * - free: Only free models (Groq + Google free tier)
 * - pro/sub-pro: Free + budget + balanced models
 * - max/sub-max: All models including flagship/premium
 */
export type PresetTier = 'free' | 'pro' | 'max' | 'sub-pro' | 'sub-max'

/**
 * Get models available for a specific preset tier
 * This is the main function for tier-based filtering across the app
 */
export function getModelsForPresetTier(tier: PresetTier): ModelInfo[] {
  const allSelectable = getSelectableModels()

  switch (tier) {
    case 'free':
      // Only free models from groq and google
      return allSelectable.filter(m =>
        m.tier === 'free' && (m.provider === 'groq' || m.provider === 'google')
      )

    case 'pro':
    case 'sub-pro':
      // Free + budget + balanced (excludes flagship/premium)
      return allSelectable.filter(m =>
        m.tier === 'free' || m.tier === 'budget' || m.tier === 'balanced'
      )

    case 'max':
    case 'sub-max':
      // All models including flagship/premium
      return allSelectable

    default:
      return allSelectable
  }
}

/**
 * Get models grouped by provider for a preset tier
 */
export function getModelsForPresetTierByProvider(tier: PresetTier): Record<Provider, ModelInfo[]> {
  const models = getModelsForPresetTier(tier)
  const result: Partial<Record<Provider, ModelInfo[]>> = {}

  for (const model of models) {
    if (!result[model.provider]) {
      result[model.provider] = []
    }
    result[model.provider]!.push(model)
  }

  return result as Record<Provider, ModelInfo[]>
}

/**
 * Check if a model is available for a given preset tier
 */
export function isModelAvailableForTier(modelId: string, tier: PresetTier): boolean {
  const availableModels = getModelsForPresetTier(tier)
  return availableModels.some(m => m.id === modelId)
}

/**
 * Check if a model is a subscription/CLI model (Codex, Grok Code, etc.)
 */
export function isSubscriptionModel(modelId: string): boolean {
  const model = getModelInfo(modelId)
  return model?.isSubscription ?? false
}

/**
 * Estimate the cost of a model call given a token count.
 * Splits tokens into ~70% input / 30% output (rough heuristic for debate messages).
 * Falls back to a conservative default if the model is not in MODEL_COSTS_PER_1K.
 */
export function estimateModelCallCost(modelId: string, totalTokens: number): number {
  const costs = MODEL_COSTS_PER_1K[modelId]
  const input = costs?.input ?? 0.001
  const output = costs?.output ?? 0.003
  const inputTokens = totalTokens * 0.7
  const outputTokens = totalTokens * 0.3
  return (inputTokens / 1000 * input) + (outputTokens / 1000 * output)
}

/**
 * Get exact token costs for a model (per 1K tokens)
 * Returns { input, output, total } in USD
 */
export function getModelTokenCost(modelId: string): {
  input: number
  output: number
  total: number
  inputDisplay: string
  outputDisplay: string
  isFree: boolean
} {
  const cost = MODEL_COSTS_PER_1K[modelId]
  const input = cost?.input ?? 0
  const output = cost?.output ?? 0
  const total = input + output
  const isFree = input === 0 && output === 0

  // Format display strings (show 4 decimal places for small values)
  const formatCost = (val: number): string => {
    if (val === 0) return 'FREE'
    if (val < 0.001) return `$${val.toFixed(5)}`
    if (val < 0.01) return `$${val.toFixed(4)}`
    return `$${val.toFixed(3)}`
  }

  return {
    input,
    output,
    total,
    inputDisplay: formatCost(input),
    outputDisplay: formatCost(output),
    isFree
  }
}
