'use client'

import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import {
  RESEARCH_MODEL_PRESETS,
  type ResearchModelPreset,
} from '@/types/research-agents'
import {
  getModelGrade,
  getModelCostTier,
  getModelTokenCost,
} from '@/lib/models/model-registry'
import { COST_TIER_STYLES, GRADE_STYLES } from '@/components/shared/model-badge'
import { cn } from '@/lib/utils'

/**
 * Research Model Selector Component
 *
 * Allows users to select which AI model to use for research agents.
 * Now uses consistent styling with other model selectors (grade + cost tier)
 *
 * DEFAULT: GPT-4.1 Mini (reliable, cheapest paid option)
 */

// Map preset keys to their actual model IDs for grade lookup
const PRESET_MODEL_IDS: Record<ResearchModelPreset, string> = {
  'gpt-mini': 'gpt-4.1-mini',
  'haiku': 'claude-haiku-4-5-20251001',
  'sonnet': 'claude-sonnet-4-5-20250929',
  'gemini-flash': 'gemini-2.5-flash',
  'gemini': 'gemini-2.5-flash', // Legacy alias
}

const PRESET_OPTIONS: {
  value: ResearchModelPreset
  label: string
  description: string
  recommended?: boolean
}[] = [
  {
    value: 'gpt-mini',
    label: 'GPT-4.1 Mini',
    description: 'Reliable, cheapest option with good tool support',
    recommended: true,
  },
  {
    value: 'haiku',
    label: 'Claude 4.5 Haiku',
    description: 'Good for Anthropic users',
  },
  {
    value: 'sonnet',
    label: 'Claude 4.5 Sonnet',
    description: 'Best quality, highest cost',
  },
  // Gemini 2.5 Flash REMOVED: 5 req/min limit too low for 4 parallel research agents
  // Keep in PRESET_MODEL_IDS for backward compatibility if users have it selected
]


export function ResearchModelSelector() {
  const { researchModel, setResearchModel } = useGlobalModelTier()

  // Get grade and cost for current selection
  const currentModelId = PRESET_MODEL_IDS[researchModel] || 'gpt-4.1-mini'
  const { grade, weight } = getModelGrade(currentModelId)
  const costTier = getModelCostTier(currentModelId)
  const tokenCost = getModelTokenCost(currentModelId)
  const gradeStyle = GRADE_STYLES[grade]
  const costStyle = COST_TIER_STYLES[costTier]

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
        {PRESET_OPTIONS.map((option) => {
          const modelId = PRESET_MODEL_IDS[option.value]
          const optGrade = getModelGrade(modelId)
          const optTokenCost = getModelTokenCost(modelId)
          return (
            <option key={option.value} value={option.value}>
              {option.label} - {optGrade.grade}({optGrade.weight.toFixed(2)}) | {optTokenCost.isFree ? 'FREE' : `In: ${optTokenCost.inputDisplay} Out: ${optTokenCost.outputDisplay}`}
            </option>
          )
        })}
      </select>

      {/* Current selection info with grade and cost details */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {RESEARCH_MODEL_PRESETS[researchModel]?.displayName || researchModel}
          </span>
          {/* Grade badge */}
          <span className={cn('text-xs font-semibold', gradeStyle.text)}>
            {grade}({weight.toFixed(2)})
          </span>
        </div>
        {/* Cost tier badge */}
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          costStyle.bg,
          costStyle.text
        )}>
          {costTier}
        </span>
      </div>

      {/* Exact token costs per 1K */}
      <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-3">
        <span>Cost per 1K tokens:</span>
        {tokenCost.isFree ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">FREE</span>
        ) : (
          <>
            <span>Input: <span className="font-mono text-gray-700 dark:text-gray-300">{tokenCost.inputDisplay}</span></span>
            <span>Output: <span className="font-mono text-gray-700 dark:text-gray-300">{tokenCost.outputDisplay}</span></span>
          </>
        )}
      </div>

      {/* Info for recommended option */}
      {researchModel === 'gpt-mini' && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-400">
          GPT-4.1 Mini is the most cost-effective option with reliable tool support.
        </div>
      )}
      {/* Gemini warning removed - option no longer available in selector */}
    </div>
  )
}

export default ResearchModelSelector
