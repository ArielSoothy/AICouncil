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

interface SingleModelBadgeSelectorProps {
  value: string // Model ID
  onChange: (modelId: string) => void
  label: string
  disabled?: boolean
}

// Available models per provider (matching Ultra Mode)
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
