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
import { useState } from 'react'

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

        return (
          <div key={modelId} className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`${colorClass} transition-colors cursor-pointer px-3 py-1 h-auto text-sm font-medium rounded-full flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                >
                  {displayName}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>{providerNames[model.provider]} Models</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {providerModels.map((availableModel) => (
                  <DropdownMenuItem
                    key={availableModel.id}
                    onClick={() => swapModel(modelId, availableModel.id)}
                    className={modelId === availableModel.id ? 'bg-accent' : ''}
                  >
                    {availableModel.badge} {availableModel.name}
                    {modelId === availableModel.id && ' ✓'}
                  </DropdownMenuItem>
                ))}
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
