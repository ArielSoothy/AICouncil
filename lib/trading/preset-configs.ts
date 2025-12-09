import { Sparkles, Zap, Gift } from 'lucide-react'
import { ModelConfig } from '@/types/consensus'
import { TRADING_MODELS } from './models-config'

/**
 * Centralized Trading Preset Configurations
 *
 * This file contains all Free/Pro/Max preset definitions for:
 * - Individual Mode (multi-model analysis)
 * - Consensus Mode (judge-based consensus)
 * - Debate Mode (role-based debate system)
 *
 * Single source of truth to prevent duplication and ensure consistency.
 */

// ============================================================================
// TYPES
// ============================================================================

export type PresetTier = 'free' | 'pro' | 'max'

export interface PresetConfig {
  label: string
  icon: typeof Gift | typeof Zap | typeof Sparkles
  description: string
  color: string
  modelIds: string[]
}

export interface DebateRolesConfig {
  analyst: string
  critic: string
  synthesizer: string
}

export interface DebatePresetConfig {
  label: string
  icon: typeof Gift | typeof Zap | typeof Sparkles
  description: string
  color: string
  roles: DebateRolesConfig
}

// ============================================================================
// INDIVIDUAL & CONSENSUS MODE PRESETS
// ============================================================================

/**
 * Multi-model presets for Individual and Consensus modes
 * Each tier selects multiple models across different providers
 */
export const PRESET_CONFIGS: Record<PresetTier, PresetConfig> = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'All free models (6 models)',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    modelIds: [
      // Google free models
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      // Groq free models
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
    ]
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Balanced/Budget tier models (8 models)',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    modelIds: [
      // Anthropic balanced
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      // OpenAI balanced
      'gpt-4o',
      'gpt-5-mini',
      // Google flagship (good value)
      'gemini-2.5-pro',
      // Groq best free
      'llama-3.3-70b-versatile',
      // xAI balanced
      'grok-3',
      // Mistral balanced
      'mistral-large-latest',
    ]
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models (8 models)',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    modelIds: [
      // Anthropic flagship
      'claude-sonnet-4-5-20250929',
      // OpenAI flagship
      'gpt-5-chat-latest',
      // Google flagship
      'gemini-2.5-pro',
      // xAI flagship
      'grok-4-fast-reasoning',
      'grok-4-fast-non-reasoning',
      'grok-4-0709',
      // Groq best free (still excellent)
      'llama-3.3-70b-versatile',
      // Perplexity premium
      'sonar-pro',
    ]
  }
}

// ============================================================================
// DEBATE MODE PRESETS
// ============================================================================

/**
 * Role-specific presets for Debate Mode
 * Each tier assigns specific models to Analyst, Critic, and Synthesizer roles
 */
export const DEBATE_PRESETS: Record<PresetTier, DebatePresetConfig> = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'All free models',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300',
    roles: {
      analyst: 'gemini-2.0-flash',      // Google free (good reasoning)
      critic: 'llama-3.3-70b-versatile', // Groq free (best free model)
      synthesizer: 'gemini-1.5-flash',   // Google free (fast synthesis)
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Balanced tier models',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300',
    roles: {
      analyst: 'claude-3-5-sonnet-20241022',  // Anthropic balanced (strong analysis)
      critic: 'gpt-4o',                        // OpenAI balanced (critical thinking)
      synthesizer: 'llama-3.3-70b-versatile', // Groq free (good synthesis)
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
    roles: {
      analyst: 'claude-sonnet-4-5-20250929', // Anthropic flagship (best analysis)
      critic: 'gpt-5-chat-latest',            // OpenAI flagship (best reasoning)
      synthesizer: 'gemini-2.5-pro',          // Google flagship (comprehensive synthesis)
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert preset model IDs to ModelConfig array for Individual/Consensus modes
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
 */
export function getDebateRolesForPreset(presetKey: PresetTier): DebateRolesConfig {
  const preset = DEBATE_PRESETS[presetKey]
  return preset.roles
}

/**
 * Get preset config by tier (for UI rendering)
 */
export function getPresetConfig(presetKey: PresetTier): PresetConfig {
  return PRESET_CONFIGS[presetKey]
}

/**
 * Get debate preset config by tier (for UI rendering)
 */
export function getDebatePresetConfig(presetKey: PresetTier): DebatePresetConfig {
  return DEBATE_PRESETS[presetKey]
}

/**
 * Get all preset tier keys
 */
export function getAllPresetTiers(): PresetTier[] {
  return ['free', 'pro', 'max']
}
