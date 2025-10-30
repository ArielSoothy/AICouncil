'use client'

import { ModelConfig } from '@/types/consensus'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useState } from 'react'
import { MODEL_REGISTRY, Provider } from '@/lib/models/model-registry'
import { IS_PRODUCTION } from '@/lib/utils/environment'

interface UltraModelBadgeSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
}

// 🔒 PRODUCTION LOCK: Only free models in production
// Generate available models from registry (only working models, excluding legacy)
const availableModels = Object.entries(MODEL_REGISTRY).reduce((acc, [provider, models]) => {
  acc[provider as Provider] = models
    .filter(m => !m.isLegacy && m.status === 'working')
    .filter(m => {
      // In production, only allow free tier models
      if (IS_PRODUCTION) {
        return m.tier === 'free' && (provider === 'google' || provider === 'groq')
      }
      return true
    })
    .map(m => m.id)
  return acc
}, {} as Record<Provider, string[]>)

// Generate model display names from registry
const modelDisplayNames: Record<string, string> = Object.values(MODEL_REGISTRY)
  .flat()
  .reduce((acc, model) => {
    acc[model.id] = model.name
    return acc
  }, {} as Record<string, string>)

const providerNames = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  xai: 'xAI',
  perplexity: 'Perplexity',
  mistral: 'Mistral',
  cohere: 'Cohere'
} as const

export function UltraModelBadgeSelector({ models, onChange }: UltraModelBadgeSelectorProps) {
  const [isAddingModel, setIsAddingModel] = useState(false)

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
        const displayName = modelDisplayNames[model.model] || model.model

        return (
          <div key={`${model.provider}-${index}`} className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`${colorClass} transition-colors cursor-pointer px-3 py-1 h-auto text-sm font-medium rounded-full flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                >
                  {displayName}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{providerNames[model.provider as keyof typeof providerNames]} Models</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableModels[model.provider as keyof typeof availableModels]?.map((availableModel) => (
                  <DropdownMenuItem
                    key={availableModel}
                    onClick={() => swapModel(index, availableModel)}
                    className={model.model === availableModel ? 'bg-accent' : ''}
                  >
                    {modelDisplayNames[availableModel] || availableModel}
                    {model.model === availableModel && ' ✓'}
                  </DropdownMenuItem>
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
          {Object.keys(availableModels).map((provider) => (
            <DropdownMenuItem
              key={provider}
              onClick={() => addModel(provider as keyof typeof availableModels)}
            >
              {providerNames[provider as keyof typeof providerNames]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
