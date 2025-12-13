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
 * Priority order (fallback): gemini-flash → gpt-mini → haiku → sonnet
 *
 * Cost comparison per 1M tokens:
 * - Gemini 2.5 Flash: $0.30/$2.50 (FREE tier available!)
 * - GPT-4.1 Mini: $0.15/$0.60 (cheapest paid, 4x cheaper than Gemini)
 * - Claude 4.5 Haiku: $1.00/$5.00
 * - Claude 4.5 Sonnet: $3.00/$15.00
 *
 * NOTE: Llama 70B removed - Groq AI SDK doesn't reliably enforce tool calling
 */

const PRESET_OPTIONS: {
  value: ResearchModelPreset
  label: string
  description: string
  cost: 'FREE' | '$' | '$$' | '$$$'
  disabled?: boolean
  disabledReason?: string
  recommended?: boolean
}[] = [
  {
    value: 'gemini-flash',
    label: 'Gemini 2.5 Flash',
    description: 'FREE tier available, good tool support',
    cost: 'FREE',
    recommended: true,
  },
  {
    value: 'gpt-mini',
    label: 'GPT-4.1 Mini',
    description: 'Cheapest paid (4x cheaper than Gemini)',
    cost: '$',
  },
  {
    value: 'haiku',
    label: 'Claude 4.5 Haiku',
    description: 'Reliable, good for Anthropic users',
    cost: '$$',
  },
  {
    value: 'sonnet',
    label: 'Claude 4.5 Sonnet',
    description: 'Best quality, highest cost',
    cost: '$$$',
  },
  // Legacy option - kept for backward compatibility
  {
    value: 'gemini',
    label: 'Gemini 2.5 Flash (Legacy)',
    description: 'Alias for gemini-flash',
    cost: 'FREE',
    disabled: false,
  },
]

const COST_BADGE_COLORS: Record<string, string> = {
  FREE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  $: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  $$: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
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

      {/* Info for recommended option */}
      {(researchModel === 'gemini-flash' || researchModel === 'gemini') && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-400">
          Gemini 2.5 Flash has a FREE tier! Falls back to GPT-4.1 Mini if rate limited.
        </div>
      )}
    </div>
  )
}

export default ResearchModelSelector
