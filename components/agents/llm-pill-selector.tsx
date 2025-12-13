'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Zap, X, ChevronDown, Check, Plus } from 'lucide-react'
import { canUseModel } from '@/lib/user-tiers'
import { MODEL_COSTS_PER_1K } from '@/lib/model-metadata'
import { getModelGrade, getModelTokenCost } from '@/lib/models/model-registry'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface LLMPillSelectorProps {
  selectedModels: Array<{ provider: string; model: string }>
  onModelsChange: (models: Array<{ provider: string; model: string }>) => void
  availableModels: { provider: string; models: string[] }[]
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
  label?: string
  minSelection?: number
}

// Provider colors and icons
const providerConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  openai: { color: 'text-green-400', bgColor: 'bg-green-900/20', label: 'OpenAI' },
  anthropic: { color: 'text-orange-400', bgColor: 'bg-orange-900/20', label: 'Anthropic' },
  google: { color: 'text-blue-400', bgColor: 'bg-blue-900/20', label: 'Google' },
  groq: { color: 'text-purple-400', bgColor: 'bg-purple-900/20', label: 'Groq' },
  xai: { color: 'text-red-400', bgColor: 'bg-red-900/20', label: 'xAI' },
  mistral: { color: 'text-yellow-400', bgColor: 'bg-yellow-900/20', label: 'Mistral' },
  cohere: { color: 'text-pink-400', bgColor: 'bg-pink-900/20', label: 'Cohere' },
  perplexity: { color: 'text-indigo-400', bgColor: 'bg-indigo-900/20', label: 'Perplexity' },
}

export function LLMPillSelector({ 
  selectedModels, 
  onModelsChange, 
  availableModels,
  userTier,
  label = "Round 1: Fast LLM Models",
  minSelection = 2
}: LLMPillSelectorProps) {
  const [internalSelection, setInternalSelection] = useState<Array<{ provider: string; model: string }>>(selectedModels)

  // Initialize with default selections
  useEffect(() => {
    if (selectedModels.length === 0) {
      const defaults: Array<{ provider: string; model: string }> = []
      const preferredModels = [
        { model: 'llama-3.1-8b-instant', provider: 'groq' },
        { model: 'llama-3.3-70b-versatile', provider: 'groq' },
        { model: 'gemini-2.5-flash', provider: 'google' }
      ]
      
      for (const pref of preferredModels) {
        const providerData = availableModels.find(p => p.provider === pref.provider)
        if (providerData && providerData.models.includes(pref.model) && 
            canUseModel(userTier, pref.provider, pref.model)) {
          defaults.push(pref)
        }
      }
      
      if (defaults.length > 0) {
        setInternalSelection(defaults)
        onModelsChange(defaults)
      }
    }
  }, [availableModels, userTier, selectedModels.length, onModelsChange])

  // Sync with parent
  useEffect(() => {
    if (JSON.stringify(internalSelection) !== JSON.stringify(selectedModels)) {
      onModelsChange(internalSelection)
    }
  }, [internalSelection, selectedModels, onModelsChange])

  const addModel = (provider: string, model: string) => {
    const exists = internalSelection.some(m => m.provider === provider && m.model === model)
    if (!exists) {
      setInternalSelection([...internalSelection, { provider, model }])
    }
  }

  const removeModel = (provider: string, model: string) => {
    setInternalSelection(internalSelection.filter(m => !(m.provider === provider && m.model === model)))
  }

  // Get formatted cost display for dropdown items
  const getModelCostDisplay = (model: string) => {
    const tokenCost = getModelTokenCost(model)
    const { grade, weight } = getModelGrade(model)

    if (tokenCost.isFree) {
      return `${grade}(${weight.toFixed(2)}) FREE`
    }
    return `${grade}(${weight.toFixed(2)}) In:${tokenCost.inputDisplay} Out:${tokenCost.outputDisplay}`
  }

  // Group ALL models by provider (not just available ones)
  const allModelsByProvider = availableModels.reduce((acc, provider) => {
    acc[provider.provider] = provider.models.map(model => ({
      model,
      canUse: canUseModel(userTier, provider.provider, model),
      isSelected: internalSelection.some(m => m.provider === provider.provider && m.model === model)
    }))
    return acc
  }, {} as Record<string, Array<{ model: string; canUse: boolean; isSelected: boolean }>>)

  // Get unselected models for a provider
  const getUnselectedModelsForProvider = (provider: string) => {
    return (allModelsByProvider[provider] || []).filter(m => !m.isSelected)
  }
  
  // Check if provider has any available models for user
  const providerHasAvailableModels = (provider: string) => {
    return (allModelsByProvider[provider] || []).some(m => m.canUse && !m.isSelected)
  }

  return (
    <Card className="p-6 bg-black/40 border-zinc-800">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            {label}
          </Label>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs",
              internalSelection.length >= minSelection ? "bg-green-900/30 text-green-400" : ""
            )}
          >
            {internalSelection.length} {internalSelection.length === 1 ? 'model' : 'models'} selected
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Choose models to query directly for quick consensus
        </p>

        {/* Selected Models Pills */}
        <div className="flex flex-wrap gap-2 min-h-[38px]">
          {internalSelection.length === 0 ? (
            <span className="text-sm text-muted-foreground py-2">No models selected</span>
          ) : (
            internalSelection.map(({ provider, model }) => {
              const config = providerConfig[provider] || { color: 'text-gray-400', bgColor: 'bg-gray-900/20', label: provider }
              return (
                <Badge 
                  key={`${provider}:${model}`}
                  variant="secondary" 
                  className={cn(
                    "pl-3 pr-1 py-1.5 text-sm font-normal",
                    config.bgColor,
                    "border-zinc-700"
                  )}
                >
                  <span className="mr-1">{model}</span>
                  <button
                    onClick={() => removeModel(provider, model)}
                    className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              )
            })
          )}
        </div>

        {/* Provider Dropdown Buttons - Show ALL providers */}
        <div className="flex flex-wrap gap-2">
          {['openai', 'anthropic', 'google', 'groq', 'xai', 'mistral', 'cohere', 'perplexity'].map(providerName => {
            const models = getUnselectedModelsForProvider(providerName)
            const hasAvailable = providerHasAvailableModels(providerName)
            const config = providerConfig[providerName] || { color: 'text-gray-400', bgColor: 'bg-gray-900/20', label: providerName }
            
            return (
              <DropdownMenu key={providerName}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      "h-8 px-3 border-zinc-700",
                      hasAvailable 
                        ? "bg-zinc-900/50 hover:bg-zinc-800/50" 
                        : "bg-zinc-950/50 opacity-50 hover:opacity-70",
                      hasAvailable ? config.color : "text-gray-500"
                    )}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {config.label}
                    {!hasAvailable && userTier === 'guest' && (
                      <span className="ml-1 text-xs">(Sign in)</span>
                    )}
                    {!hasAvailable && userTier !== 'guest' && models.length > 0 && (
                      <span className="ml-1 text-xs">(Pro)</span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-64 bg-zinc-900 border-zinc-800"
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {config.label} Models
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  {models.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      No models available
                    </div>
                  ) : (
                    models.map(({ model, canUse }) => (
                      <DropdownMenuItem
                        key={model}
                        onClick={() => canUse && addModel(providerName, model)}
                        className={cn(
                          canUse
                            ? "cursor-pointer hover:bg-zinc-800"
                            : "cursor-not-allowed opacity-50"
                        )}
                        disabled={!canUse}
                      >
                        <span className="flex-1 truncate">{model}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 font-mono whitespace-nowrap">
                          {canUse ? getModelCostDisplay(model) : userTier === 'guest' ? 'Sign in' : 'Upgrade'}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })}
        </div>

        {internalSelection.length < minSelection && (
          <p className="text-xs text-amber-400">
            Select at least {minSelection} models for better consensus results
          </p>
        )}
      </div>
    </Card>
  )
}