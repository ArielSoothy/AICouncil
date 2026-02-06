import { Gift, Zap, Sparkles, Terminal, Crown } from 'lucide-react'
import type { AgentPreset, PresetTier } from './debate-types'

/**
 * Agent Presets - Synchronized with lib/config/model-presets.ts DEBATE_PRESETS
 *
 * TIER PHILOSOPHY (December 2025 Data-Driven Rebuild):
 * - Free: Only $0 cost models (Google Gemini + Groq Llama)
 * - Pro: One mid-tier per provider (best value models)
 * - Max: One flagship per provider (highest AAII scores)
 */
export const AGENT_PRESETS: Record<PresetTier, AgentPreset> = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'Free models only',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    roles: {
      'analyst-001': { provider: 'google', model: 'gemini-2.5-flash' },
      'critic-001': { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      'synthesizer-001': { provider: 'google', model: 'gemini-2.0-flash' }
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Mid-tier models (best value)',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    roles: {
      'analyst-001': { provider: 'xai', model: 'grok-4-1-fast-reasoning' },
      'critic-001': { provider: 'google', model: 'gemini-2.5-pro' },
      'synthesizer-001': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' }
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    roles: {
      'analyst-001': { provider: 'google', model: 'gemini-3-pro-preview' },
      'critic-001': { provider: 'openai', model: 'gpt-5-chat-latest' },
      'synthesizer-001': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' }
    }
  },
  'sub-pro': {
    label: 'Sub Pro',
    icon: Terminal,
    description: 'Subscription CLI models',
    color: 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-cyan-300 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
    roles: {
      'analyst-001': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
      'critic-001': { provider: 'openai', model: 'gpt-5-codex' },
      'synthesizer-001': { provider: 'google', model: 'gemini-2.5-pro' }
    }
  },
  'sub-max': {
    label: 'Sub Max',
    icon: Crown,
    description: 'Flagship subscription CLI models',
    color: 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    roles: {
      'analyst-001': { provider: 'anthropic', model: 'claude-opus-4-5-20251101' },
      'critic-001': { provider: 'openai', model: 'gpt-5.1-codex-max' },
      'synthesizer-001': { provider: 'google', model: 'gemini-3-pro-preview' }
    }
  }
}
