'use client'

import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import {
  RESEARCH_MODEL_PRESETS,
  type ResearchModelPreset,
} from '@/types/research-agents'

/**
 * Research Model Selector Component
 *
 * Allows users to select which AI model to use for research agents.
 * Options:
 * - Claude 4.5 Sonnet ($$$) - Default, best tool-calling
 * - Claude 4.5 Haiku ($) - 3x cheaper
 * - Gemini 2.0 Flash (Free) - No tool support (disabled)
 *
 * NOTE: Llama 70B removed - Groq AI SDK doesn't reliably enforce tool calling
 */

const PRESET_OPTIONS: {
  value: ResearchModelPreset
  label: string
  description: string
  cost: 'FREE' | '$' | '$$$'
  disabled?: boolean
  disabledReason?: string
}[] = [
  {
    value: 'sonnet',
    label: 'Claude 4.5 Sonnet',
    description: 'Best tool-calling for research',
    cost: '$$$',
  },
  {
    value: 'haiku',
    label: 'Claude 4.5 Haiku',
    description: '3x cheaper, good reliability',
    cost: '$',
  },
  {
    value: 'gemini',
    label: 'Gemini 2.0 Flash',
    description: 'No tool support',
    cost: 'FREE',
    disabled: true,
    disabledReason: 'Tool calling not supported',
  },
]

const COST_BADGE_COLORS: Record<string, string> = {
  FREE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  $: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  $$$: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export function ResearchModelSelector() {
  const { researchModel, setResearchModel } = useGlobalModelTier()

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <span>Research Model</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          (for market data research)
        </span>
      </label>
      <select
        value={researchModel}
        onChange={(e) => setResearchModel(e.target.value as ResearchModelPreset)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {PRESET_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label} ({option.cost})
            {option.disabled ? ` - ${option.disabledReason}` : ''}
          </option>
        ))}
      </select>

      {/* Current selection info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {RESEARCH_MODEL_PRESETS[researchModel]?.displayName || researchModel}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            COST_BADGE_COLORS[
              PRESET_OPTIONS.find((o) => o.value === researchModel)?.cost || '$'
            ]
          }`}
        >
          {PRESET_OPTIONS.find((o) => o.value === researchModel)?.cost}
        </span>
      </div>

      {/* Warning for Gemini selection (shouldn't happen since disabled) */}
      {researchModel === 'gemini' && (
        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-400">
          Gemini doesn't support tool calling. Using Claude Sonnet as fallback.
        </div>
      )}
    </div>
  )
}

export default ResearchModelSelector
