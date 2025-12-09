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
 * DESIGN PHILOSOPHY:
 * - Free: 6 models, all free (Google Gemini + Groq Llama)
 * - Pro: 8 models, mix of premium + free (Anthropic + OpenAI + Google + Groq + xAI + Mistral)
 * - Max: 8 models, flagship only (Claude 4.5, GPT-5, Gemini 2.5, Grok 4, Llama 3.3, Sonar Pro)
 *
 * MODEL SELECTION CRITERIA:
 * - Provider diversity (avoid single-provider bias)
 * - Quality vs cost balance per tier
 * - Include at least one free model in Pro/Max for accessibility
 */
export const PRESET_CONFIGS: Record<PresetTier, PresetConfig> = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'All free models (4 models)',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    modelIds: [
      // Google free models - excellent quality for free tier
      'gemini-2.0-flash',
      // Groq free models - fast inference, good quality
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      // OpenAI budget - reliable
      'gpt-3.5-turbo',
    ]
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Balanced/Budget tier models (7 models)',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    modelIds: [
      // Anthropic balanced tier - strong reasoning
      'claude-3-7-sonnet-20250219',
      'claude-3-5-haiku-20241022',
      // OpenAI balanced tier - reliable performance
      'gpt-4o',
      'gpt-5-mini',
      // Google free - good value for money
      'gemini-2.0-flash',
      // Groq best free - excellent free option
      'llama-3.3-70b-versatile',
      // xAI balanced - unique perspective
      'grok-code-fast-1',
    ]
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models (8 models)',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    modelIds: [
      // Anthropic flagship - best overall reasoning (Sep 2025)
      'claude-sonnet-4-5-20250929',
      // OpenAI flagship - best general purpose (Aug 2025)
      'gpt-5-chat-latest',
      'gpt-5',
      // xAI flagship models - unique reasoning approaches
      'grok-4-fast-reasoning',
      'grok-4-fast-non-reasoning',
      'grok-4-0709',
      // Groq best free - still excellent quality
      'llama-3.3-70b-versatile',
      // Google free - good for web/current events
      'gemini-2.0-flash',
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
    description: 'All free models',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    roles: {
      analyst: 'gemini-2.0-flash',       // Google free (good reasoning, structured output)
      critic: 'llama-3.3-70b-versatile', // Groq free (best free model, critical analysis)
      synthesizer: 'llama-3.1-8b-instant', // Groq free (fast synthesis)
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Balanced tier models',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    roles: {
      analyst: 'claude-3-7-sonnet-20250219',  // Anthropic (strong analytical reasoning)
      critic: 'gpt-4o',                        // OpenAI balanced (excellent critical thinking)
      synthesizer: 'llama-3.3-70b-versatile', // Groq free (good synthesis, cost-effective)
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    roles: {
      analyst: 'claude-sonnet-4-5-20250929', // Anthropic flagship (best analytical depth)
      critic: 'gpt-5-chat-latest',            // OpenAI flagship (superior reasoning)
      synthesizer: 'grok-4-fast-reasoning',   // xAI flagship (comprehensive synthesis)
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
