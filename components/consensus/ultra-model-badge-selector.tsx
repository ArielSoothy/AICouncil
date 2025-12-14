'use client'

import { ModelConfig } from '@/types/consensus'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Plus, X, ChevronDown } from 'lucide-react'
import { PROVIDER_COLORS } from '@/lib/brand-colors'
import { useState, useEffect, useMemo } from 'react'
import {
  MODEL_REGISTRY,
  Provider,
  PROVIDER_NAMES,
  getModelInfo,
  getModelGrade,
  getModelCostTier
} from '@/lib/models/model-registry'
import { checkIsProduction } from '@/lib/utils/environment'
import { ModelDropdownItem } from '@/components/shared/model-badge'
import { cn } from '@/lib/utils'

interface UltraModelBadgeSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
  showPower?: boolean
  showCost?: boolean
  isSubscriptionMode?: boolean  // When true, show SUB badge instead of cost tier
}

// Cost tier styling (duplicated here for inline badge styling)
const COST_TIER_STYLES = {
  'FREE': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  '$': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  '$$': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  '$$$': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' }
} as const

const GRADE_STYLES = {
  'A+': { text: 'text-emerald-600 dark:text-emerald-400' },
  'A': { text: 'text-green-600 dark:text-green-400' },
  'B+': { text: 'text-blue-600 dark:text-blue-400' },
  'B': { text: 'text-sky-600 dark:text-sky-400' },
  'C+': { text: 'text-amber-600 dark:text-amber-400' },
  'C': { text: 'text-orange-600 dark:text-orange-400' }
} as const

// 🔒 PRODUCTION LOCK: Only free models in production
// Generate available models from registry (only working models, excluding legacy)
// Sort by power (weight) - highest power first
function getAvailableModels(isProduction: boolean): Record<Provider, string[]> {
  return Object.entries(MODEL_REGISTRY).reduce((acc, [provider, models]) => {
    acc[provider as Provider] = models
      .filter(m => !m.isLegacy && m.status === 'working')
      .filter(m => {
        // In production, only allow free tier models
        if (isProduction) {
          return m.tier === 'free' && (provider === 'google' || provider === 'groq')
        }
        return true
      })
      .map(m => ({ id: m.id, weight: getModelGrade(m.id).weight }))
      .sort((a, b) => b.weight - a.weight) // Sort by power (highest first)
      .map(m => m.id)
    return acc
  }, {} as Record<Provider, string[]>)
}

export function UltraModelBadgeSelector({
  models,
  onChange,
  showPower = true,
  showCost = true,
  isSubscriptionMode = false
}: UltraModelBadgeSelectorProps) {
  const [isAddingModel, setIsAddingModel] = useState(false)

  // Check production status on client (hostname-based detection)
  const [isProduction, setIsProduction] = useState(false)
  useEffect(() => {
    setIsProduction(checkIsProduction())
  }, [])

  // Compute available models based on environment
  const availableModels = useMemo(() => getAvailableModels(isProduction), [isProduction])

  const enabledModels = models.filter(m => m.enabled)

  const swapModel = (index: number, newModel: string) => {
    const updated = [...models]
    const modelIndex = models.findIndex((m, i) => m.enabled && enabledModels.indexOf(m) === index)
    if (modelIndex >= 0) {
      updated[modelIndex].model = newModel
      onChange(updated)
    }
  }

  const removeModel = (index: number) => {
    if (enabledModels.length <= 1) return // Don't remove last model

    const updated = [...models]
    const modelIndex = models.findIndex((m, i) => m.enabled && enabledModels.indexOf(m) === index)
    if (modelIndex >= 0) {
      updated[modelIndex].enabled = false
      onChange(updated)
    }
  }

  const addModel = (provider: keyof typeof availableModels) => {
    const updated = [...models]

    // Check if there's a disabled model we can enable
    const disabledIndex = updated.findIndex(m => !m.enabled && m.provider === provider)
    if (disabledIndex >= 0) {
      updated[disabledIndex].enabled = true
    } else {
      // Add new model
      const firstModel = availableModels[provider][0]
      updated.push({
        provider,
        model: firstModel,
        enabled: true
      })
    }

    onChange(updated)
    setIsAddingModel(false)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {enabledModels.map((model, index) => {
        const colorClass = PROVIDER_COLORS[model.provider as keyof typeof PROVIDER_COLORS] || PROVIDER_COLORS.openai
        const modelInfo = getModelInfo(model.model)
        const displayName = modelInfo?.name || model.model
        const { grade, weight } = getModelGrade(model.model)
        const costTier = getModelCostTier(model.model)
        const costStyle = COST_TIER_STYLES[costTier]
        const gradeStyle = GRADE_STYLES[grade]

        return (
          <div key={`${model.provider}-${index}`} className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    colorClass,
                    'transition-colors cursor-pointer px-3 py-1 h-auto text-sm font-medium rounded-full',
                    'flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                  )}
                >
                  {displayName}
                  {showPower && (
                    <span className={cn('font-semibold text-xs', gradeStyle.text)}>
                      {grade}({weight.toFixed(2)})
                    </span>
                  )}
                  {/* Show SUB badge if in subscription mode, otherwise show cost tier */}
                  {showCost && (
                    isSubscriptionMode ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-sm">
                        SUB
                      </span>
                    ) : (
                      <span className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                        costStyle.bg,
                        costStyle.text
                      )}>
                        {costTier}
                      </span>
                    )
                  )}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel>
                  {PROVIDER_NAMES[model.provider as Provider]} Models
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableModels[model.provider as keyof typeof availableModels]?.map((availableModel) => (
                  <ModelDropdownItem
                    key={availableModel}
                    modelId={availableModel}
                    selected={model.model === availableModel}
                    showPower={showPower}
                    showCost={showCost}
                    isSubscriptionMode={isSubscriptionMode}
                    onClick={() => swapModel(index, availableModel)}
                  />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {enabledModels.length > 1 && (
              <button
                onClick={() => removeModel(index)}
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
          {Object.entries(availableModels)
            .filter(([_, models]) => models.length > 0)
            .map(([provider]) => (
              <button
                key={provider}
                onClick={() => addModel(provider as Provider)}
                className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
              >
                {PROVIDER_NAMES[provider as Provider]}
              </button>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
