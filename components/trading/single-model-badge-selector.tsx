'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'
import { PROVIDER_COLORS } from '@/lib/brand-colors'
import {
  MODEL_REGISTRY,
  Provider,
  PROVIDER_NAMES,
  getModelInfo,
  getModelGrade,
  getModelCostTier
} from '@/lib/models/model-registry'
import { IS_PRODUCTION } from '@/lib/utils/environment'
import { ModelDropdownItem } from '@/components/shared/model-badge'
import { cn } from '@/lib/utils'

interface SingleModelBadgeSelectorProps {
  value: string // Model ID
  onChange: (modelId: string) => void
  label: string
  disabled?: boolean
  showPower?: boolean
  showCost?: boolean
}

// Cost tier styling
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

// Determine provider from model ID
function getProviderFromModel(modelId: string): Provider {
  for (const [provider, models] of Object.entries(MODEL_REGISTRY)) {
    if (models.some(m => m.id === modelId)) {
      return provider as Provider
    }
  }
  // Fallback detection by prefix
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

// Provider order for display (matching Ultra Mode priority)
const PROVIDER_ORDER: Provider[] = [
  'anthropic',
  'openai',
  'google',
  'xai',
  'groq',
  'perplexity',
  'mistral',
  'cohere'
]

export function SingleModelBadgeSelector({
  value,
  onChange,
  label,
  disabled,
  showPower = true,
  showCost = true
}: SingleModelBadgeSelectorProps) {
  const provider = getProviderFromModel(value)
  const colorClass = PROVIDER_COLORS[provider] || PROVIDER_COLORS.openai
  const modelInfo = getModelInfo(value)
  const displayName = modelInfo?.name || value
  const { grade, weight } = getModelGrade(value)
  const costTier = getModelCostTier(value)
  const costStyle = COST_TIER_STYLES[costTier]
  const gradeStyle = GRADE_STYLES[grade]

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            className={cn(
              colorClass,
              'transition-colors cursor-pointer px-4 py-2 h-auto text-sm font-medium rounded-full',
              'flex items-center gap-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {displayName}
            {showPower && (
              <span className={cn('font-semibold text-xs', gradeStyle.text)}>
                {grade}({weight.toFixed(2)})
              </span>
            )}
            {showCost && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                costStyle.bg,
                costStyle.text
              )}>
                {costTier}
              </span>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 max-h-[400px] overflow-y-auto">
          {PROVIDER_ORDER.map((providerKey, providerIndex) => {
            const providerModels = availableModels[providerKey]
            if (!providerModels || providerModels.length === 0) return null

            return (
              <div key={providerKey}>
                {providerIndex > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{PROVIDER_NAMES[providerKey]} Models</DropdownMenuLabel>
                {providerModels.map((modelId) => (
                  <ModelDropdownItem
                    key={modelId}
                    modelId={modelId}
                    selected={value === modelId}
                    showPower={showPower}
                    showCost={showCost}
                    onClick={() => onChange(modelId)}
                  />
                ))}
              </div>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
