'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { PROVIDER_COLORS } from '@/lib/brand-colors'
import { MODEL_REGISTRY, Provider } from '@/lib/models/model-registry'

interface SingleModelBadgeSelectorProps {
  value: string // Model ID
  onChange: (modelId: string) => void
  label: string
  disabled?: boolean
}

// Generate available models from registry (only working models, excluding legacy)
const availableModels = Object.entries(MODEL_REGISTRY).reduce((acc, [provider, models]) => {
  acc[provider as Provider] = models
    .filter(m => !m.isLegacy && m.status === 'working')
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

// Determine provider from model ID
function getProviderFromModel(modelId: string): keyof typeof availableModels {
  if (modelId.startsWith('gpt')) return 'openai'
  if (modelId.startsWith('claude')) return 'anthropic'
  if (modelId.startsWith('gemini')) return 'google'
  if (modelId.startsWith('llama') || modelId.startsWith('gemma')) return 'groq'
  if (modelId.startsWith('grok')) return 'xai'
  if (modelId.startsWith('sonar')) return 'perplexity'
  if (modelId.startsWith('mistral')) return 'mistral'
  if (modelId.startsWith('command')) return 'cohere'
  return 'openai' // fallback
}

export function SingleModelBadgeSelector({ value, onChange, label, disabled }: SingleModelBadgeSelectorProps) {
  const provider = getProviderFromModel(value)
  const colorClass = PROVIDER_COLORS[provider] || PROVIDER_COLORS.openai
  const displayName = modelDisplayNames[value] || value

  // Provider order for display (matching Ultra Mode priority)
  const providerOrder: (keyof typeof availableModels)[] = [
    'anthropic',
    'openai',
    'google',
    'xai',
    'groq',
    'perplexity',
    'mistral',
    'cohere'
  ]

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            className={`${colorClass} transition-colors cursor-pointer px-4 py-2 h-auto text-sm font-medium rounded-full flex items-center gap-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {displayName}
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[400px] overflow-y-auto">
          {providerOrder.map((providerKey, providerIndex) => (
            <div key={providerKey}>
              {providerIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{providerNames[providerKey]} Models</DropdownMenuLabel>
              {availableModels[providerKey]?.map((modelId) => (
                <DropdownMenuItem
                  key={modelId}
                  onClick={() => onChange(modelId)}
                  className={value === modelId ? 'bg-accent' : ''}
                >
                  {modelDisplayNames[modelId] || modelId}
                  {value === modelId && ' ✓'}
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
