'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Plus, X, ChevronDown } from 'lucide-react'
import { PROVIDER_COLORS } from '@/lib/brand-colors'
import { TRADING_MODELS, MODELS_BY_PROVIDER, getModelDisplayName } from '@/lib/trading/models-config'
import { getModelGrade, getModelTokenCost, ModelGrade, ModelCostTier, getModelCostTier } from '@/lib/models/model-registry'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// Consistent styling
const COST_TIER_STYLES: Record<ModelCostTier, { bg: string; text: string }> = {
  'FREE': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  '$': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  '$$': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  '$$$': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' }
}

const GRADE_STYLES: Record<ModelGrade, { text: string }> = {
  'A+': { text: 'text-emerald-600 dark:text-emerald-400' },
  'A': { text: 'text-green-600 dark:text-green-400' },
  'B+': { text: 'text-blue-600 dark:text-blue-400' },
  'B': { text: 'text-sky-600 dark:text-sky-400' },
  'C+': { text: 'text-amber-600 dark:text-amber-400' },
  'C': { text: 'text-orange-600 dark:text-orange-400' }
}

interface ArenaModelSelectorProps {
  enabledModels: string[]
  onChange: (modelIds: string[]) => void
}

const providerNames = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  groq: 'Groq',
  xai: 'xAI',
  perplexity: 'Perplexity',
  mistral: 'Mistral',
  cohere: 'Cohere'
} as const

export function ArenaModelSelector({ enabledModels, onChange }: ArenaModelSelectorProps) {
  const [isAddingModel, setIsAddingModel] = useState(false)

  const swapModel = (oldModelId: string, newModelId: string) => {
    const updated = enabledModels.map(id => id === oldModelId ? newModelId : id)
    onChange(updated)
  }

  const removeModel = (modelId: string) => {
    if (enabledModels.length <= 1) return // Don't remove last model
    onChange(enabledModels.filter(id => id !== modelId))
  }

  const addModel = (provider: keyof typeof MODELS_BY_PROVIDER) => {
    const providerModels = MODELS_BY_PROVIDER[provider]
    if (providerModels.length === 0) return

    // Add the first free/budget model from this provider
    const freeModel = providerModels.find(m => m.tier === 'free')
    const budgetModel = providerModels.find(m => m.tier === 'budget')
    const firstModel = freeModel || budgetModel || providerModels[0]

    onChange([...enabledModels, firstModel.id])
    setIsAddingModel(false)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {enabledModels.map((modelId) => {
        const model = TRADING_MODELS.find(m => m.id === modelId)
        if (!model) return null

        const colorClass = PROVIDER_COLORS[model.provider] || PROVIDER_COLORS.openai
        const displayName = getModelDisplayName(modelId)
        const providerModels = MODELS_BY_PROVIDER[model.provider]
        const { grade, weight } = getModelGrade(modelId)
        const costTier = getModelCostTier(modelId)
        const tokenCost = getModelTokenCost(modelId)
        const gradeStyle = GRADE_STYLES[grade]
        const costStyle = COST_TIER_STYLES[costTier]

        return (
          <div key={modelId} className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`${colorClass} transition-colors cursor-pointer px-3 py-1 h-auto text-sm font-medium rounded-full flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                >
                  {displayName}
                  <span className={cn('text-xs font-semibold', gradeStyle.text)}>
                    {grade}({weight.toFixed(2)})
                  </span>
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', costStyle.bg, costStyle.text)}>
                    {costTier}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>{providerNames[model.provider]} Models</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {providerModels.map((availableModel) => {
                  const itemGrade = getModelGrade(availableModel.id)
                  const itemCostTier = getModelCostTier(availableModel.id)
                  const itemTokenCost = getModelTokenCost(availableModel.id)
                  const itemGradeStyle = GRADE_STYLES[itemGrade.grade]
                  const itemCostStyle = COST_TIER_STYLES[itemCostTier]

                  return (
                    <DropdownMenuItem
                      key={availableModel.id}
                      onClick={() => swapModel(modelId, availableModel.id)}
                      className={cn('flex justify-between', modelId === availableModel.id ? 'bg-accent' : '')}
                    >
                      <span className="flex items-center gap-2">
                        {availableModel.name}
                        {modelId === availableModel.id && <span className="text-primary">✓</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={cn('text-xs font-semibold', itemGradeStyle.text)}>
                          {itemGrade.grade}({itemGrade.weight.toFixed(2)})
                        </span>
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', itemCostStyle.bg, itemCostStyle.text)}>
                          {itemCostTier}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                          {itemTokenCost.isFree ? 'FREE' : `In:${itemTokenCost.inputDisplay} Out:${itemTokenCost.outputDisplay}`}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {enabledModels.length > 1 && (
              <button
                onClick={() => removeModel(modelId)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-full hover:bg-destructive/10"
                title="Remove model"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )
      })}

      {/* Add Model Dropdown */}
      <DropdownMenu open={isAddingModel} onOpenChange={setIsAddingModel}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-3 py-1 h-auto text-sm"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Model
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Select Provider</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.keys(MODELS_BY_PROVIDER).map((provider) => (
            <DropdownMenuItem
              key={provider}
              onClick={() => addModel(provider as keyof typeof MODELS_BY_PROVIDER)}
            >
              {providerNames[provider as keyof typeof providerNames]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
