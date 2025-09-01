'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Zap, ChevronDown, X, Check } from 'lucide-react'
import { canUseModel } from '@/lib/user-tiers'
import { MODEL_COSTS_PER_1K } from '@/lib/model-metadata'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface LLMMultiSelectProps {
  selectedModels: Array<{ provider: string; model: string }>
  onModelsChange: (models: Array<{ provider: string; model: string }>) => void
  availableModels: { provider: string; models: string[] }[]
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
  label?: string
  minSelection?: number
}

export function LLMMultiSelect({ 
  selectedModels, 
  onModelsChange, 
  availableModels,
  userTier,
  label = "Select LLM Models",
  minSelection = 2
}: LLMMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set())

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, provider) => {
    provider.models.forEach(model => {
      const key = `${provider.provider}:${model}`
      if (!acc[provider.provider]) {
        acc[provider.provider] = []
      }
      acc[provider.provider].push({
        model,
        key,
        canUse: canUseModel(userTier, provider.provider, model),
        cost: MODEL_COSTS_PER_1K[model]
      })
    })
    return acc
  }, {} as Record<string, Array<{ model: string; key: string; canUse: boolean; cost: any }>>)

  // Initialize with default selections
  useEffect(() => {
    const defaults = new Set<string>()
    
    // Select these 3 specific diverse models by default
    const preferredModels = [
      'llama-3.1-8b-instant',     // Groq - Fast
      'llama-3.3-70b-versatile',   // Groq - Powerful
      'gemini-2.5-flash'           // Google - Free & capable
    ]
    
    for (const provider of availableModels) {
      for (const model of provider.models) {
        const key = `${provider.provider}:${model}`
        if (preferredModels.includes(model) && canUseModel(userTier, provider.provider, model)) {
          defaults.add(key)
        }
      }
    }
    
    setInternalSelection(defaults)
  }, [availableModels, userTier])

  // Sync internal selection with props
  useEffect(() => {
    const models: Array<{ provider: string; model: string }> = []
    
    internalSelection.forEach(key => {
      const [provider, ...modelParts] = key.split(':')
      const model = modelParts.join(':')
      models.push({ provider, model })
    })
    
    onModelsChange(models)
  }, [internalSelection, onModelsChange])

  const toggleModel = (key: string) => {
    const newSelection = new Set(internalSelection)
    if (newSelection.has(key)) {
      newSelection.delete(key)
    } else {
      newSelection.add(key)
    }
    setInternalSelection(newSelection)
  }

  const getCostTier = (cost: any) => {
    if (!cost) return { tier: 'Unknown', emoji: '❓' }
    const avgCost = (cost.input + cost.output) / 2
    if (avgCost < 0.001) return { tier: 'Free', emoji: '🆓' }
    if (avgCost < 0.01) return { tier: 'Budget', emoji: '💰' }
    if (avgCost < 0.1) return { tier: 'Standard', emoji: '⚖️' }
    return { tier: 'Premium', emoji: '💎' }
  }

  const selectedCount = internalSelection.size

  // Get display text for selected models
  const getSelectionDisplay = () => {
    if (selectedCount === 0) return "Select models..."
    if (selectedCount === 1) {
      const key = Array.from(internalSelection)[0]
      const [, ...modelParts] = key.split(':')
      return modelParts.join(':')
    }
    return `${selectedCount} models selected`
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            {label}
          </Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose models to query directly for quick consensus
          </p>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              <span className="truncate">{getSelectionDisplay()}</span>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                {selectedCount > 0 && (
                  <Badge variant={selectedCount >= minSelection ? "default" : "secondary"}>
                    {selectedCount}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
            <div className="max-h-[400px] overflow-y-auto">
              {Object.entries(modelsByProvider).map(([providerName, models]) => (
                <div key={providerName}>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 sticky top-0">
                    {providerName.toUpperCase()}
                  </div>
                  {models.map(({ model, key, canUse, cost }) => {
                    const costInfo = getCostTier(cost)
                    const isSelected = internalSelection.has(key)
                    
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary/50",
                          !canUse && "opacity-50 cursor-not-allowed",
                          isSelected && "bg-primary/10"
                        )}
                        onClick={() => canUse && toggleModel(key)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-4 h-4 border rounded flex items-center justify-center",
                            isSelected ? "bg-primary border-primary" : "border-border"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm">{model}</span>
                          <Badge variant="outline" className="text-xs">
                            {costInfo.emoji} {costInfo.tier}
                          </Badge>
                        </div>
                        {!canUse && (
                          <Badge variant="secondary" className="text-xs">
                            {userTier === 'guest' ? 'Sign in' : 'Upgrade'}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            
            {selectedCount < minSelection && (
              <div className="p-3 border-t bg-amber-50 dark:bg-amber-900/20">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Select at least {minSelection} models for better consensus
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {Array.from(internalSelection).map(key => {
              const [provider, ...modelParts] = key.split(':')
              const model = modelParts.join(':')
              return (
                <Badge key={key} variant="secondary" className="text-xs">
                  {model}
                  <button
                    onClick={() => toggleModel(key)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}