'use client'

import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import {
  RESEARCH_MODEL_PRESETS,
  type ResearchModelPreset,
} from '@/types/research-agents'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
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
 * Badge dropdown style - consistent with other model selectors
 * Shows grade + cost tier inline on badge button
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

// Provider colors for badge styling
const PRESET_COLORS: Record<ResearchModelPreset, string> = {
  'gpt-mini': 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300',
  'haiku': 'bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300',
  'sonnet': 'bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300',
  'gemini-flash': 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300',
  'gemini': 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300',
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
    description: 'Reliable, cheapest option',
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
  const colorClass = PRESET_COLORS[researchModel] || PRESET_COLORS['gpt-mini']

  // Get current label
  const currentOption = PRESET_OPTIONS.find(o => o.value === researchModel)
  const currentLabel = currentOption?.label || 'GPT-4.1 Mini'

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <span>Research Model</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          (for market data research)
        </span>
      </label>

      {/* Badge Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              colorClass,
              'transition-colors cursor-pointer px-4 py-2 h-auto text-sm font-medium rounded-full',
              'flex items-center gap-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
            )}
          >
            {currentLabel}
            <span className={cn('font-semibold text-xs', gradeStyle.text)}>
              {grade}({weight.toFixed(2)})
            </span>
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              costStyle.bg,
              costStyle.text
            )}>
              {costTier}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {PRESET_OPTIONS.map((option, index) => {
            const modelId = PRESET_MODEL_IDS[option.value]
            const optGrade = getModelGrade(modelId)
            const optCostTier = getModelCostTier(modelId)
            const optTokenCost = getModelTokenCost(modelId)
            const optGradeStyle = GRADE_STYLES[optGrade.grade]
            const optCostStyle = COST_TIER_STYLES[optCostTier]
            const isSelected = researchModel === option.value

            return (
              <div key={option.value}>
                {index > 0 && <DropdownMenuSeparator />}
                <button
                  onClick={() => setResearchModel(option.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm',
                    'hover:bg-accent rounded-md transition-colors',
                    isSelected && 'bg-accent'
                  )}
                >
                  <span className="flex flex-col items-start">
                    <span className="flex items-center gap-2">
                      {option.label}
                      {isSelected && <span className="text-primary">✓</span>}
                      {option.recommended && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold', optGradeStyle.text)}>
                      {optGrade.grade}({optGrade.weight.toFixed(2)})
                    </span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                      optCostStyle.bg,
                      optCostStyle.text
                    )}>
                      {optCostTier}
                    </span>
                  </span>
                </button>
              </div>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Token cost display */}
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
    </div>
  )
}

export default ResearchModelSelector
