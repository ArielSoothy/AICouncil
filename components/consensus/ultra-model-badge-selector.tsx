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

interface UltraModelBadgeSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
}

// Available models per provider (same as model-selector.tsx)
const availableModels = {
  openai: [
    'gpt-5-chat-latest',
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-4o',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022'
  ],
  google: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash'
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ],
  xai: [
    'grok-code-fast-1',
    'grok-4-fast-reasoning',
    'grok-4-fast-non-reasoning',
    'grok-4-0709',
    'grok-3',
    'grok-3-mini'
  ],
  perplexity: ['sonar-pro', 'sonar-small'],
  mistral: ['mistral-large-latest', 'mistral-small-latest'],
  cohere: ['command-r-plus', 'command-r']
} as const

const modelDisplayNames: Record<string, string> = {
  'gpt-5-chat-latest': 'GPT-5 Chat',
  'gpt-5': 'GPT-5',
  'gpt-5-mini': 'GPT-5 Mini',
  'gpt-5-nano': 'GPT-5 Nano',
  'gpt-4-turbo-preview': 'GPT-4 Turbo',
  'gpt-4': 'GPT-4',
  'gpt-4o': 'GPT-4o',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-8b-instant': 'Llama 3.1 8B',
  'gemma2-9b-it': 'Gemma 2 9B',
  'grok-code-fast-1': 'Grok Code Fast',
  'grok-4-fast-reasoning': 'Grok 4 Fast Reasoning',
  'grok-4-fast-non-reasoning': 'Grok 4 Fast',
  'grok-4-0709': 'Grok 4',
  'grok-3': 'Grok 3',
  'grok-3-mini': 'Grok 3 Mini',
  'sonar-pro': 'Perplexity Sonar Pro',
  'sonar-small': 'Perplexity Sonar Small',
  'mistral-large-latest': 'Mistral Large',
  'mistral-small-latest': 'Mistral Small',
  'command-r-plus': 'Cohere Command R+',
  'command-r': 'Cohere Command R'
}

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
                  className={`${colorClass} transition-colors cursor-pointer px-3 py-1 h-auto text-sm font-medium rounded-full flex items-center gap-1.5 border-0 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
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
