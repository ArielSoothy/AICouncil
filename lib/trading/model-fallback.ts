/**
 * Model Fallback System
 *
 * Provides automatic fallback when AI models fail due to:
 * - Rate limits / quota exceeded
 * - API errors / service unavailable
 * - Model deprecation / replacement
 *
 * Design principles:
 * - Every chain MUST end with free models (guarantee: always succeed)
 * - Show transparent fallback notices to users
 * - In-memory failure tracking (resets on deploy)
 *
 * @see docs/features/PRODUCTION_HARDENING.md (when created)
 */

import { getModelInfo } from '@/lib/models/model-registry'

/**
 * Fallback chains by model ID
 *
 * All chains MUST end with free models (Groq Llama/Gemma or Google free tier)
 * to guarantee every request succeeds.
 *
 * Chain priority: same-tier → lower-tier → free
 */
export const FALLBACK_CHAINS: Record<string, string[]> = {
  // ============================================
  // PREMIUM TIER ($$$ models)
  // ============================================

  // Anthropic Premium
  'claude-sonnet-4-5-20250929': [
    'gpt-4o',                      // OpenAI flagship
    'gemini-2.5-pro',              // Google flagship
    'gemini-2.0-flash',            // Google balanced (free)
    'llama-3.3-70b-versatile',     // Groq free
  ],
  'claude-opus-4-5-20251124': [
    'claude-sonnet-4-5-20250929',  // Same provider fallback
    'gpt-4o',
    'llama-3.3-70b-versatile',
  ],

  // OpenAI Premium
  'gpt-4o': [
    'claude-sonnet-4-5-20250929',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'llama-3.3-70b-versatile',
  ],
  'gpt-5-chat-latest': [
    'gpt-4o',
    'claude-sonnet-4-5-20250929',
    'llama-3.3-70b-versatile',
  ],

  // Google Premium
  'gemini-2.5-pro': [
    'gpt-4o',
    'claude-sonnet-4-5-20250929',
    'gemini-2.0-flash',
    'llama-3.3-70b-versatile',
  ],

  // xAI Premium
  'grok-4-0709': [
    'gpt-4o',
    'claude-sonnet-4-5-20250929',
    'llama-3.3-70b-versatile',
  ],

  // ============================================
  // BALANCED TIER ($$ models)
  // ============================================

  'gpt-4o-mini': [
    'gemini-1.5-flash',
    'claude-haiku-4-5-20251001',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ],
  'gemini-1.5-flash': [
    'gpt-4o-mini',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ],
  'gemini-2.0-flash': [
    'gemini-1.5-flash',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ],
  'claude-haiku-4-5-20251001': [
    'gpt-4o-mini',
    'gemini-1.5-flash',
    'llama-3.3-70b-versatile',
  ],

  // ============================================
  // FREE TIER (Groq + Google free)
  // ============================================

  'llama-3.3-70b-versatile': [
    'llama-3.1-8b-instant',
    'gemini-2.0-flash',         // Google free tier
  ],
  // NOTE: gemma2-9b-it REMOVED - Decommissioned by Groq Nov 2025
  'llama-3.1-8b-instant': [
    'llama-3.3-70b-versatile',
    'gemini-2.0-flash',
  ],

  // ============================================
  // DEFAULT (catch-all for unknown models)
  // ============================================
  'default': [
    'llama-3.3-70b-versatile',    // Best free model
    'llama-3.1-8b-instant',       // Fast free fallback
    'gemini-2.0-flash',           // Google free tier
  ],
}

/**
 * In-memory failure tracking
 * Resets on deploy (intentional - no DB persistence needed)
 */
interface FailureRecord {
  count: number
  lastFailed: Date
  lastError?: string
}

const modelFailures: Map<string, FailureRecord> = new Map()

// Configuration
const UNSTABLE_THRESHOLD = 3       // Failures before marking unstable
const UNSTABLE_WINDOW_MS = 60 * 60 * 1000  // 1 hour window
const FAILURE_DECAY_MS = 2 * 60 * 60 * 1000 // Reset after 2 hours of no failures

/**
 * Get the next fallback model for a failed model
 *
 * @param failedModel - The model that failed
 * @param attemptedModels - Models already tried (to avoid loops)
 * @returns Next fallback model ID or null if no more fallbacks
 */
export function getFallbackModel(
  failedModel: string,
  attemptedModels: string[] = []
): string | null {
  const chain = FALLBACK_CHAINS[failedModel] || FALLBACK_CHAINS['default']

  // Find first model in chain that hasn't been attempted
  for (const model of chain) {
    if (!attemptedModels.includes(model)) {
      return model
    }
  }

  // All fallbacks exhausted
  return null
}

/**
 * Record a model failure for instability tracking
 *
 * @param modelId - The model that failed
 * @param error - Optional error message
 */
export function recordModelFailure(modelId: string, error?: string): void {
  const now = new Date()
  const existing = modelFailures.get(modelId)

  if (existing) {
    // Check if we should decay old failures
    const timeSinceLastFailure = now.getTime() - existing.lastFailed.getTime()
    if (timeSinceLastFailure > FAILURE_DECAY_MS) {
      // Reset counter after decay window
      modelFailures.set(modelId, {
        count: 1,
        lastFailed: now,
        lastError: error,
      })
    } else {
      // Increment counter
      modelFailures.set(modelId, {
        count: existing.count + 1,
        lastFailed: now,
        lastError: error,
      })
    }
  } else {
    // First failure
    modelFailures.set(modelId, {
      count: 1,
      lastFailed: now,
      lastError: error,
    })
  }

  // Log for monitoring
  const record = modelFailures.get(modelId)!
  console.warn(`[Model Fallback] ${modelId} failed (${record.count}x): ${error || 'unknown error'}`)
}

/**
 * Check if a model is currently unstable
 *
 * @param modelId - The model to check
 * @returns true if model has failed multiple times recently
 */
export function isModelUnstable(modelId: string): boolean {
  const record = modelFailures.get(modelId)
  if (!record) return false

  const now = new Date()
  const timeSinceLastFailure = now.getTime() - record.lastFailed.getTime()

  // Check if failures are within the unstable window
  if (timeSinceLastFailure > UNSTABLE_WINDOW_MS) {
    return false
  }

  return record.count >= UNSTABLE_THRESHOLD
}

/**
 * Get failure record for a model (for health dashboard)
 *
 * @param modelId - The model to check
 * @returns Failure record or null if no failures
 */
export function getModelFailureRecord(modelId: string): FailureRecord | null {
  return modelFailures.get(modelId) || null
}

/**
 * Get all models with recent failures (for health dashboard)
 *
 * @returns Map of model IDs to failure records
 */
export function getAllFailureRecords(): Map<string, FailureRecord> {
  return new Map(modelFailures)
}

/**
 * Clear failure history for a model (for manual reset)
 *
 * @param modelId - The model to clear, or undefined to clear all
 */
export function clearFailureHistory(modelId?: string): void {
  if (modelId) {
    modelFailures.delete(modelId)
  } else {
    modelFailures.clear()
  }
}

/**
 * Get health status for a model (for UI badges)
 *
 * @param modelId - The model to check
 * @returns 'healthy' | 'warning' | 'unhealthy'
 */
export function getModelHealthStatus(modelId: string): 'healthy' | 'warning' | 'unhealthy' {
  const record = modelFailures.get(modelId)
  if (!record) return 'healthy'

  const now = new Date()
  const timeSinceLastFailure = now.getTime() - record.lastFailed.getTime()

  // If last failure was long ago, consider healthy
  if (timeSinceLastFailure > UNSTABLE_WINDOW_MS) {
    return 'healthy'
  }

  // Check failure count
  if (record.count >= UNSTABLE_THRESHOLD) {
    return 'unhealthy'
  } else if (record.count >= 1) {
    return 'warning'
  }

  return 'healthy'
}

/**
 * Get display name for a model (for fallback notifications)
 *
 * @param modelId - The model ID
 * @returns Human-readable model name
 */
export function getModelDisplayName(modelId: string): string {
  const info = getModelInfo(modelId)
  return info?.name || modelId
}

/**
 * Check if a fallback chain has free models available
 *
 * @param modelId - The starting model
 * @returns true if at least one free model in chain
 */
export function hasFreeModelFallback(modelId: string): boolean {
  const chain = FALLBACK_CHAINS[modelId] || FALLBACK_CHAINS['default']
  // NOTE: gemma2-9b-it REMOVED - Decommissioned by Groq Nov 2025
  const freeModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemini-2.0-flash']

  return chain.some(model => freeModels.includes(model))
}

// ============================================================================
// ERROR CLASSIFICATION SYSTEM
// ============================================================================

/**
 * Error categories for model failures
 * Used for structured logging, UI display, and analytics
 */
export enum ModelErrorCategory {
  QUOTA_LIMIT = 'QUOTA_LIMIT',           // 429, rate limit, quota exceeded
  BUDGET_LIMIT = 'BUDGET_LIMIT',         // Billing/credit exhausted
  AUTH_ERROR = 'AUTH_ERROR',             // 401, 403, invalid API key
  DEPRECATED = 'DEPRECATED',             // Model removed/deprecated
  SERVICE_DOWN = 'SERVICE_DOWN',         // 500, 503, provider unavailable
  TIMEOUT = 'TIMEOUT',                   // Request timeout
  INVALID_RESPONSE = 'INVALID_RESPONSE', // Empty/malformed response
  UNKNOWN = 'UNKNOWN'                    // Catch-all
}

/**
 * Console color codes (ANSI escape codes)
 */
const CONSOLE_COLORS = {
  RED: '31',
  YELLOW: '33',
  CYAN: '36',
  MAGENTA: '35',
  GRAY: '90',
  WHITE: '37',
  RESET: '0'
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  category: ModelErrorCategory
  userMessage: string    // Friendly message for UI
  consoleColor: string   // ANSI color code for terminal
}

/**
 * Classify an error into a category for structured logging and UI display
 *
 * @param error - Error message string or Error object
 * @returns Classification with category, user message, and console color
 */
export function classifyError(error: string | Error): ErrorClassification {
  const errorStr = (error instanceof Error ? error.message : error).toLowerCase()

  // QUOTA_LIMIT: Rate limits, quota exceeded
  if (
    errorStr.includes('429') ||
    errorStr.includes('rate limit') ||
    errorStr.includes('ratelimit') ||
    errorStr.includes('quota') ||
    errorStr.includes('too many requests') ||
    errorStr.includes('requests per minute')
  ) {
    return {
      category: ModelErrorCategory.QUOTA_LIMIT,
      userMessage: 'rate limit',
      consoleColor: CONSOLE_COLORS.YELLOW
    }
  }

  // BUDGET_LIMIT: Billing/credit issues
  if (
    errorStr.includes('billing') ||
    errorStr.includes('credit') ||
    errorStr.includes('payment') ||
    errorStr.includes('insufficient') ||
    errorStr.includes('exceeded') && (errorStr.includes('budget') || errorStr.includes('limit'))
  ) {
    return {
      category: ModelErrorCategory.BUDGET_LIMIT,
      userMessage: 'billing limit',
      consoleColor: CONSOLE_COLORS.RED
    }
  }

  // AUTH_ERROR: Authentication failures
  if (
    errorStr.includes('401') ||
    errorStr.includes('403') ||
    errorStr.includes('unauthorized') ||
    errorStr.includes('invalid') && errorStr.includes('key') ||
    errorStr.includes('api key') ||
    errorStr.includes('authentication') ||
    errorStr.includes('forbidden')
  ) {
    return {
      category: ModelErrorCategory.AUTH_ERROR,
      userMessage: 'auth failed',
      consoleColor: CONSOLE_COLORS.RED
    }
  }

  // DEPRECATED: Model no longer available
  if (
    errorStr.includes('deprecated') ||
    errorStr.includes('removed') ||
    errorStr.includes('not found') && errorStr.includes('model') ||
    errorStr.includes('does not exist') ||
    errorStr.includes('no longer available') ||
    errorStr.includes('discontinued')
  ) {
    return {
      category: ModelErrorCategory.DEPRECATED,
      userMessage: 'model unavailable',
      consoleColor: CONSOLE_COLORS.MAGENTA
    }
  }

  // SERVICE_DOWN: Provider unavailable
  if (
    errorStr.includes('500') ||
    errorStr.includes('502') ||
    errorStr.includes('503') ||
    errorStr.includes('504') ||
    errorStr.includes('unavailable') ||
    errorStr.includes('service') && errorStr.includes('down') ||
    errorStr.includes('internal server error') ||
    errorStr.includes('bad gateway') ||
    errorStr.includes('overloaded')
  ) {
    return {
      category: ModelErrorCategory.SERVICE_DOWN,
      userMessage: 'service down',
      consoleColor: CONSOLE_COLORS.RED
    }
  }

  // TIMEOUT: Request timeout
  if (
    errorStr.includes('timeout') ||
    errorStr.includes('etimedout') ||
    errorStr.includes('timed out') ||
    errorStr.includes('deadline exceeded')
  ) {
    return {
      category: ModelErrorCategory.TIMEOUT,
      userMessage: 'timeout',
      consoleColor: CONSOLE_COLORS.CYAN
    }
  }

  // INVALID_RESPONSE: Empty or malformed response
  if (
    errorStr.includes('empty response') ||
    errorStr.includes('empty') && errorStr.includes('response') ||
    errorStr.includes('parse error') ||
    errorStr.includes('json') && (errorStr.includes('parse') || errorStr.includes('invalid')) ||
    errorStr.includes('malformed') ||
    errorStr.includes('unexpected token')
  ) {
    return {
      category: ModelErrorCategory.INVALID_RESPONSE,
      userMessage: 'invalid response',
      consoleColor: CONSOLE_COLORS.GRAY
    }
  }

  // UNKNOWN: Catch-all for unclassified errors
  return {
    category: ModelErrorCategory.UNKNOWN,
    userMessage: 'unknown error',
    consoleColor: CONSOLE_COLORS.WHITE
  }
}

/**
 * Log a fallback event with colored console output
 *
 * @param originalModel - The model that failed
 * @param fallbackModel - The fallback model being used
 * @param classification - Error classification result
 */
export function logFallbackWithColor(
  originalModel: string,
  fallbackModel: string,
  classification: ErrorClassification
): void {
  const { category, userMessage, consoleColor } = classification
  const originalName = getModelDisplayName(originalModel)
  const fallbackName = getModelDisplayName(fallbackModel)

  // Colored console output (only works in Node.js terminal)
  console.log(
    `\x1b[${consoleColor}m🔄 [${category}] ${originalName} → ${fallbackName}: ${userMessage}\x1b[${CONSOLE_COLORS.RESET}m`
  )
}
