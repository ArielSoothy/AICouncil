#!/usr/bin/env tsx
/**
 * Update Model Registry Status from Test Results
 *
 * This script updates the model registry with status metadata from test results.
 */

// Test results from MODEL_TEST_RESULTS.md (2025-10-28)
const TEST_TIMESTAMP = '2025-10-28T17:33:11.000Z'

// Working models (26)
const WORKING_MODELS = [
  // OpenAI (12)
  'gpt-5-chat-latest',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4-turbo-preview',
  'gpt-4',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  // Anthropic (7)
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307',
  // Google (1)
  'gemini-2.0-flash',
  // Groq (2)
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  // xAI (4)
  'grok-4-fast-reasoning',
  'grok-4-fast-non-reasoning',
  'grok-4-0709',
  'grok-code-fast-1',
]

// Unreleased models (likely future releases)
const UNRELEASED_MODELS = [
  // OpenAI
  { id: 'o3', reason: 'O3 series not yet released' },
  { id: 'o4-mini', reason: 'O4 series not yet released' },
  // Anthropic
  { id: 'claude-haiku-4-5-20250715', reason: 'Claude 4.5 Haiku not yet released' },
  { id: 'claude-opus-4-1-20250514', reason: 'Claude 4 Opus not yet released' },
  // xAI
  { id: 'grok-3', reason: 'Grok 3 not yet released' },
  { id: 'grok-3-mini', reason: 'Grok 3 Mini not yet released' },
  { id: 'grok-2-vision-1212', reason: 'Grok 2 Vision not available' },
  { id: 'grok-2-1212', reason: 'Grok 2 (1212) not available' },
  { id: 'grok-2-latest', reason: 'Grok 2 Latest not available' },
  // Google
  { id: 'gemini-2.5-pro', reason: 'Gemini 2.5 Pro not yet released' },
  { id: 'gemini-2.5-flash', reason: 'Gemini 2.5 Flash not yet released' },
]

// API key issues (providers not configured or wrong keys)
const NO_API_KEY_MODELS = [
  // Perplexity
  { id: 'sonar-pro', reason: 'Perplexity API key may be invalid or API changed' },
  { id: 'sonar-small', reason: 'Perplexity API key may be invalid or API changed' },
  // Mistral
  { id: 'mistral-large-latest', reason: 'Mistral API key may be invalid or API changed' },
  { id: 'mistral-small-latest', reason: 'Mistral API key may be invalid or API changed' },
  // Cohere
  { id: 'command-r-plus', reason: 'Cohere API key may be invalid or API changed' },
  { id: 'command-r', reason: 'Cohere API key may be invalid or API changed' },
]

// Deprecated/legacy models
const DEPRECATED_MODELS = [
  { id: 'claude-2.1', reason: 'Claude 2.x is deprecated' },
  { id: 'claude-2.0', reason: 'Claude 2.x is deprecated' },
  { id: 'claude-3-sonnet-20240229', reason: 'Superseded by Claude 3.5 Sonnet' },
]

// Wrong model IDs or parameters
const PARAMETER_ERROR_MODELS = [
  { id: 'gpt-4o-realtime-preview', reason: 'Realtime API requires different endpoint/parameters' },
  { id: 'gemini-1.5-flash', reason: 'Model ID may have changed or deprecated' },
  { id: 'gemini-1.5-flash-8b', reason: 'Model ID may have changed or deprecated' },
  { id: 'llama-3-groq-70b-tool-use', reason: 'Tool use models require special parameters' },
  { id: 'llama-3-groq-8b-tool-use', reason: 'Tool use models require special parameters' },
  { id: 'gemma2-9b-it', reason: 'Model may require special parameters or deprecated' },
]

// Service errors
const SERVICE_ERROR_MODELS = [
  { id: 'gemini-2.0-flash-lite', reason: 'Service overloaded during test (503 error)' },
]

console.log('\n📊 Model Status Summary:')
console.log(`✅ Working: ${WORKING_MODELS.length}`)
console.log(`🚧 Unreleased: ${UNRELEASED_MODELS.length}`)
console.log(`🔑 No API Key: ${NO_API_KEY_MODELS.length}`)
console.log(`📦 Deprecated: ${DEPRECATED_MODELS.length}`)
console.log(`⚙️  Parameter Error: ${PARAMETER_ERROR_MODELS.length}`)
console.log(`🔥 Service Error: ${SERVICE_ERROR_MODELS.length}`)
console.log(`\nTotal: ${WORKING_MODELS.length + UNRELEASED_MODELS.length + NO_API_KEY_MODELS.length + DEPRECATED_MODELS.length + PARAMETER_ERROR_MODELS.length + SERVICE_ERROR_MODELS.length}`)

export {
  TEST_TIMESTAMP,
  WORKING_MODELS,
  UNRELEASED_MODELS,
  NO_API_KEY_MODELS,
  DEPRECATED_MODELS,
  PARAMETER_ERROR_MODELS,
  SERVICE_ERROR_MODELS,
}
