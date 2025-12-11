import { Sparkles, Zap, Gift } from 'lucide-react'
import { ModelConfig } from '@/types/consensus'
import { TRADING_MODELS } from '../trading/models-config'

/**
 * Global Model Tier Presets
 *
 * This file defines the Free/Pro/Max tier system used across the entire application.
 * All modes (Consensus, Agents, Trading, Ultra) use these presets for consistent
 * model selection based on the global tier selector in the header.
 *
 * USED BY:
 * - Consensus Mode (/) - Multi-model consensus analysis
 * - Agents Mode (/agents) - Agent debate with role-specific models
 * - Trading Modes (/trading) - Individual, Consensus Trade, Debate Trade
 * - Ultra Mode (/ultra) - Flagship model selection
 *
 * ARCHITECTURE:
 * - Global tier state managed by GlobalModelTierContext
 * - Tier selector in header with smart visibility
 * - Each mode auto-applies preset when tier changes via useEffect
 *
 * @see contexts/trading-preset-context.tsx - Global tier state management
 * @see components/trading/global-preset-selector.tsx - Header tier selector UI
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Available model tiers across the application
 * - free: All free models (no API costs)
 * - pro: Balanced/Budget tier models (good quality-to-cost ratio)
 * - max: Best flagship models (highest quality, higher costs)
 */
export type PresetTier = 'free' | 'pro' | 'max'

/**
 * Configuration for a multi-model preset
 * Used by Consensus, Trading Individual, Trading Consensus, and Ultra modes
 */
export interface PresetConfig {
  label: string
  icon: typeof Gift | typeof Zap | typeof Sparkles
  description: string
  color: string
  modelIds: string[]
}

/**
 * Debate role assignments for agent-based modes
 * Each role has a specific model assigned based on tier
 */
export interface DebateRolesConfig {
  analyst: string      // Data-driven analysis role
  critic: string       // Skeptical evaluation role
  synthesizer: string  // Consensus building role
}

/**
 * Configuration for debate mode presets
 * Used by Agents mode and Trading Debate mode
 */
export interface DebatePresetConfig {
  label: string
  icon: typeof Gift | typeof Zap | typeof Sparkles
  description: string
  color: string
  roles: DebateRolesConfig
}

// ============================================================================
// MULTI-MODEL PRESETS (Consensus, Trading, Ultra)
// ============================================================================

/**
 * Multi-model presets for modes that query multiple models in parallel
 *
 * DESIGN PHILOSOPHY (December 2025 - Data-Driven Rebuild):
 * - Free: Only $0 cost models (Google Gemini + Groq Llama)
 * - Pro: One mid-tier per working provider (best value models)
 * - Max: One flagship per working provider (highest AAII scores)
 *
 * MODEL SELECTION CRITERIA:
 * - Based on MODEL_COSTS_PER_1K and MODEL_BENCHMARKS (AAII scores)
 * - Provider diversity: one model per provider per tier
 * - Working providers only: OpenAI, Anthropic, Google, Groq, xAI
 * - NOT WORKING: Perplexity, Mistral, Cohere (no_api_key status)
 *
 * @see lib/model-metadata.ts - MODEL_COSTS_PER_1K, MODEL_BENCHMARKS
 */
export const PRESET_CONFIGS: Record<PresetTier, PresetConfig> = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'Free models only (4 models)',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    modelIds: [
      // Google FREE - Best free model (AAII 1280, A-tier)
      'gemini-2.5-flash',
      // Google FREE - Fallback (AAII 1250, A-tier)
      'gemini-2.0-flash',
      // Groq FREE - Best Groq (AAII 1250, 86% MMLU)
      'llama-3.3-70b-versatile',
      // Groq FREE - Fast option (AAII 1100)
      'llama-3.1-8b-instant',
    ]
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'One mid-tier per provider (5 models)',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    modelIds: [
      // Anthropic - Claude 4.5 Haiku ($0.006/1K, AAII 1200)
      'claude-haiku-4-5-20251001',
      // OpenAI - GPT-5 Mini ($0.000125/1K, AAII 1200) - INSANE value
      'gpt-5-mini',
      // Google - Gemini 2.5 Pro ($0.01125/1K, AAII 1350, S-tier)
      'gemini-2.5-pro',
      // Groq - Their best (FREE, AAII 1250)
      'llama-3.3-70b-versatile',
      // xAI - Grok 4.1 Fast ($0.00025/1K, AAII 1380, S-tier!) - INSANE value
      'grok-4-1-fast-reasoning',
    ]
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'One flagship per provider (5 models)',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    modelIds: [
      // Anthropic - Claude 4.5 Sonnet ($0.018/1K, AAII 1320) - Same price as 3.7, newer!
      'claude-sonnet-4-5-20250929',
      // OpenAI - GPT-5 Chat Latest ($0.01125/1K, AAII 1380)
      'gpt-5-chat-latest',
      // Google - Gemini 3 Pro ($0.014/1K, AAII 1420, #1 on LMArena)
      'gemini-3-pro-preview',
      // Groq - Their best (FREE, AAII 1250)
      'llama-3.3-70b-versatile',
      // xAI - Grok 4 0709 ($0.018/1K, AAII 1370, S-tier)
      'grok-4-0709',
    ]
  }
}

// ============================================================================
// DEBATE MODE PRESETS (Agents, Trading Debate)
// ============================================================================

/**
 * Role-specific model assignments for agent debate modes
 *
 * ROLE PHILOSOPHY:
 * - Analyst: Data-driven, methodical, evidence-based
 * - Critic: Skeptical, thorough, identifies flaws
 * - Synthesizer: Balanced, integrative, builds consensus
 *
 * MODEL ASSIGNMENT STRATEGY:
 * - Different providers per role to maximize perspective diversity
 * - Match model strengths to role requirements
 * - Synthesizer gets strongest model per tier for final synthesis quality
 */
export const DEBATE_PRESETS: Record<PresetTier, DebatePresetConfig> = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'Free models only',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    roles: {
      // All free models with best AAII scores
      analyst: 'gemini-2.5-flash',        // Google FREE (AAII 1280, A-tier) - Best free for analysis
      critic: 'llama-3.3-70b-versatile',  // Groq FREE (AAII 1250, 86% MMLU) - Best free critic
      synthesizer: 'gemini-2.0-flash',    // Google FREE (AAII 1250) - Good synthesis
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Mid-tier models (best value)',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    roles: {
      // One mid-tier per provider - best price/performance ratio
      analyst: 'grok-4-1-fast-reasoning',     // xAI ($0.00025/1K, AAII 1380, S-tier!) - INSANE value
      critic: 'gemini-2.5-pro',               // Google ($0.01125/1K, AAII 1350, S-tier) - Strong critic
      synthesizer: 'claude-haiku-4-5-20251001', // Anthropic ($0.006/1K, AAII 1200) - Good balance
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    roles: {
      // One flagship per provider - highest AAII scores
      analyst: 'gemini-3-pro-preview',        // Google ($0.014/1K, AAII 1420, #1 LMArena!) - Best analyst
      critic: 'gpt-5-chat-latest',            // OpenAI ($0.01125/1K, AAII 1380) - Strong reasoning
      synthesizer: 'claude-sonnet-4-5-20250929', // Anthropic ($0.018/1K, AAII 1320) - Best synthesis
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert preset tier to ModelConfig array for multi-model modes
 *
 * @param presetKey - The tier to get models for ('free' | 'pro' | 'max')
 * @returns Array of ModelConfig objects with all models enabled
 *
 * @example
 * ```typescript
 * const proModels = getModelsForPreset('pro')
 * // Returns 8 models: claude-3-5-sonnet, gpt-4o, gemini-2.5-pro, etc.
 * ```
 */
export function getModelsForPreset(presetKey: PresetTier): ModelConfig[] {
  const preset = PRESET_CONFIGS[presetKey]

  const models: ModelConfig[] = preset.modelIds.map(modelId => {
    const tradingModel = TRADING_MODELS.find(m => m.id === modelId)
    if (!tradingModel) {
      console.warn(`Model ${modelId} not found in TRADING_MODELS`)
      return null
    }

    return {
      provider: tradingModel.provider as any,
      model: modelId,
      enabled: true
    }
  }).filter(Boolean) as ModelConfig[]

  return models
}

/**
 * Get debate role assignments for a preset tier
 *
 * @param presetKey - The tier to get role assignments for
 * @returns Object with analyst, critic, synthesizer model IDs
 *
 * @example
 * ```typescript
 * const maxRoles = getDebateRolesForPreset('max')
 * // Returns { analyst: 'claude-sonnet-4-5-20250929', critic: 'gpt-5-chat-latest', synthesizer: 'gemini-2.5-pro' }
 * ```
 */
export function getDebateRolesForPreset(presetKey: PresetTier): DebateRolesConfig {
  const preset = DEBATE_PRESETS[presetKey]
  return preset.roles
}

/**
 * Get preset configuration for UI rendering
 *
 * @param presetKey - The tier to get config for
 * @returns Preset config with label, icon, description, color, modelIds
 *
 * Used by tier indicator components to show current tier with proper styling
 */
export function getPresetConfig(presetKey: PresetTier): PresetConfig {
  return PRESET_CONFIGS[presetKey]
}

/**
 * Get debate preset configuration for UI rendering
 *
 * @param presetKey - The tier to get debate config for
 * @returns Debate preset config with label, icon, description, color, roles
 *
 * Used by debate mode UI to display role assignments
 */
export function getDebatePresetConfig(presetKey: PresetTier): DebatePresetConfig {
  return DEBATE_PRESETS[presetKey]
}

/**
 * Get all available preset tier keys
 *
 * @returns Array of tier keys: ['free', 'pro', 'max']
 *
 * Used for iterating over tiers in selector UI
 */
export function getAllPresetTiers(): PresetTier[] {
  return ['free', 'pro', 'max']
}
