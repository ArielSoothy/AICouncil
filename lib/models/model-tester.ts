/**
 * MODEL TESTER - Individual Model Testing Logic
 *
 * Tests individual AI models with minimal prompts to verify availability
 * and categorize errors.
 */

import type { ModelInfo, Provider } from './model-registry'
import { OpenAIProvider } from '../ai-providers/openai'
import { AnthropicProvider } from '../ai-providers/anthropic'
import { GoogleProvider } from '../ai-providers/google'
import { GroqProvider } from '../ai-providers/groq'
import { XAIProvider } from '../ai-providers/xai'
import { PerplexityProvider } from '../ai-providers/perplexity'
import { MistralProvider } from '../ai-providers/mistral'
import { CohereProvider } from '../ai-providers/cohere'
import type { AIProvider } from '../ai-providers/types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ModelTestResult {
  modelId: string
  status: ModelInfo['status']
  responseTime?: number
  notes?: string
  testTimestamp: string
}

// ============================================================================
// MODEL TESTER CLASS
// ============================================================================

export class ModelTester {
  private readonly TEST_PROMPT = 'Hi'
  private readonly MAX_TOKENS = 10
  private readonly TIMEOUT_MS = 30000
  private readonly DELAY_BETWEEN_TESTS_MS = 2000

  /**
   * Test a single model with minimal prompt
   */
  async testModel(model: ModelInfo): Promise<ModelTestResult> {
    const startTime = Date.now()
    const testTimestamp = new Date().toISOString()

    try {
      // Get appropriate provider
      const provider = this.getProvider(model.provider)

      // Test the model with minimal prompt
      const response = await Promise.race([
        provider.query(this.TEST_PROMPT, {
          provider: model.provider as any,
          model: model.id,
          enabled: true,
          maxTokens: this.MAX_TOKENS,
          temperature: 0.7
        }),
        this.timeout(this.TIMEOUT_MS)
      ])

      const responseTime = Date.now() - startTime

      // Check for empty response
      if (!response || !response.response || response.response.trim().length === 0) {
        return {
          modelId: model.id,
          status: 'empty_response',
          responseTime,
          notes: 'Model returned empty response',
          testTimestamp
        }
      }

      // Success!
      return {
        modelId: model.id,
        status: 'working',
        responseTime,
        notes: `Response: "${response.response.slice(0, 50)}${response.response.length > 50 ? '...' : ''}"`,
        testTimestamp
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      const { status, notes } = this.categorizeError(error, model)

      return {
        modelId: model.id,
        status,
        responseTime,
        notes,
        testTimestamp
      }
    }
  }

  /**
   * Delay helper for rate limiting
   */
  async delay(ms: number = this.DELAY_BETWEEN_TESTS_MS): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get the appropriate provider instance
   */
  private getProvider(provider: Provider): AIProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider()
      case 'anthropic':
        return new AnthropicProvider()
      case 'google':
        return new GoogleProvider()
      case 'groq':
        return new GroqProvider()
      case 'xai':
        return new XAIProvider()
      case 'perplexity':
        return new PerplexityProvider()
      case 'mistral':
        return new MistralProvider()
      case 'cohere':
        return new CohereProvider()
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  }

  /**
   * Categorize errors into status types
   */
  private categorizeError(error: unknown, model: ModelInfo): {
    status: ModelInfo['status'],
    notes: string
  } {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorLower = errorMsg.toLowerCase()

    // Model not found / doesn't exist
    if (
      errorLower.includes('model_not_found') ||
      errorLower.includes('invalid_model') ||
      errorLower.includes('404') ||
      errorLower.includes('does not exist') ||
      errorLower.includes('not found')
    ) {
      return {
        status: 'unreleased',
        notes: `Model not available: ${errorMsg.slice(0, 200)}`
      }
    }

    // API key missing or invalid
    if (
      errorLower.includes('authentication') ||
      errorLower.includes('api key') ||
      errorLower.includes('401') ||
      errorLower.includes('403') ||
      errorLower.includes('unauthorized')
    ) {
      return {
        status: 'no_api_key',
        notes: `Authentication error: ${errorMsg.slice(0, 200)}`
      }
    }

    // Rate limiting
    if (
      errorLower.includes('rate') ||
      errorLower.includes('429') ||
      errorLower.includes('quota') ||
      errorLower.includes('limit')
    ) {
      return {
        status: 'rate_limited',
        notes: `Rate limit hit: ${errorMsg.slice(0, 200)}`
      }
    }

    // Parameter errors
    if (
      errorLower.includes('parameter') ||
      errorLower.includes('invalid_request') ||
      errorLower.includes('temperature') ||
      errorLower.includes('max_tokens')
    ) {
      return {
        status: 'parameter_error',
        notes: `Parameter error: ${errorMsg.slice(0, 200)}`
      }
    }

    // Timeout
    if (errorLower.includes('timeout')) {
      return {
        status: 'service_error',
        notes: `Request timeout (${this.TIMEOUT_MS}ms): ${errorMsg.slice(0, 200)}`
      }
    }

    // Service errors (500, 503, etc.)
    if (
      errorLower.includes('500') ||
      errorLower.includes('503') ||
      errorLower.includes('service') ||
      errorLower.includes('server error')
    ) {
      return {
        status: 'service_error',
        notes: `Service error: ${errorMsg.slice(0, 200)}`
      }
    }

    // Unknown error
    return {
      status: 'service_error',
      notes: `Unknown error: ${errorMsg.slice(0, 200)}`
    }
  }
}
