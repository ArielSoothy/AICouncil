'use client'

import { ModelConfig } from '@/types/consensus'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, DollarSign, Globe } from 'lucide-react'
import { getAvailableModels, getAllModelsWithTierInfo, canUseModel, hasInternetAccess } from '@/lib/user-tiers'
import { MODEL_COSTS_PER_1K, MODEL_POWER } from '@/lib/model-metadata'
import { useAuth } from '@/contexts/auth-context'

interface ModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
  usePremiumQuery?: boolean
}

const availableModels = {
  openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
  anthropic: [
    // Claude 4 Series (2025)
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    // Claude 3.7 Series (2025)
    'claude-3-7-sonnet-20250219',
    // Claude 3.5 Series (2024)
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    // Claude 3 Series (Legacy)
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    // Claude 2 Series
    'claude-2.1',
    'claude-2.0'
  ],
  google: [
    // Current Generation (Free)
    'gemini-2.5-pro',
    'gemini-2.5-flash', 
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    // Deprecated but still working
    'gemini-1.5-flash', 
    'gemini-1.5-flash-8b'
  ],
  groq: [
    // Tier 1 Models
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ],
  xai: ['grok-2-latest', 'grok-2-mini'],
  perplexity: ['sonar-pro', 'sonar-small'],
  mistral: ['mistral-large-latest', 'mistral-small-latest'],
  cohere: ['command-r-plus', 'command-r']
}

// Derive model pricing and tier from centralized metadata
const modelCosts: Record<string, { input: number; output: number; tier: 'free' | 'budget' | 'balanced' | 'premium' | 'flagship' }> = {} as any
Object.entries(MODEL_COSTS_PER_1K).forEach(([model, cost]) => {
  const input = cost.input
  const output = cost.output
  const avg = (input + output) / 2
  const tier = avg === 0
    ? 'free'
    : avg < 0.002
      ? 'budget'
      : avg < 0.01
        ? 'balanced'
        : avg < 0.05
          ? 'premium'
          : 'flagship'
  ;
  modelCosts[model] = { input, output, tier }
})

const tierColors = {
  free: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  budget: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  balanced: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  premium: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  flagship: 'text-red-600 bg-red-50 dark:bg-red-900/20'
}

const tierLabels = {
  free: 'FREE',
  budget: 'BUDGET',
  balanced: 'BALANCED',
  premium: 'PREMIUM',
  flagship: 'FLAGSHIP'
}

const providerNames = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  groq: 'Groq',
  xai: 'xAI (Grok)',
  perplexity: 'Perplexity',
  mistral: 'Mistral',
  cohere: 'Cohere'
}

// Cost efficiency calculation (lower is better, cost per token)
const getCostEfficiency = (model: string): number => {
  const cost = modelCosts[model as keyof typeof modelCosts]
  if (!cost) return 0
  if (cost.input === 0 && cost.output === 0) return 0
  // Average of input and output cost per token
  return (cost.input + cost.output) / 2
}

const getEfficiencyBadge = (model: string): string => {
  const efficiency = getCostEfficiency(model)
  if (efficiency === 0) return '🆓'
  if (efficiency < 0.002) return '💰'  // Great value
  if (efficiency < 0.01) return '⚖️'   // Balanced
  if (efficiency < 0.05) return '💎'   // Premium
  return '🏆' // Flagship
}

export function ModelSelector({ models, onChange, usePremiumQuery = false }: ModelSelectorProps) {
  const { userTier, loading } = useAuth()
  
  // Show ALL models with tier info, using effective tier for premium queries
  const currentTier = loading ? 'free' : (userTier || 'free')
  // Disallow premium upgrade for free/guest tiers in UI
  const effectiveTier = currentTier
  const allModelsWithTierInfo = getAllModelsWithTierInfo(effectiveTier)
  
  // For provider dropdown, show all providers
  const availableProviders = allModelsWithTierInfo.map(p => p.provider)
  const toggleModel = (index: number) => {
    const updated = [...models]
    updated[index].enabled = !updated[index].enabled
    onChange(updated)
  }

  const changeModel = (index: number, model: string) => {
    const updated = [...models]
    
    // Check if user can use this model with effective tier
    if (!canUseModel(effectiveTier, updated[index].provider, model)) {
      // Show upgrade prompt instead
      alert(`This model requires a Pro subscription. Upgrade to access premium models like ${model}.`)
      return
    }
    
    updated[index].model = model
    onChange(updated)
  }

  const changeProvider = (index: number, provider: string) => {
    const updated = [...models]
    updated[index].provider = provider as '' | 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'perplexity' | 'mistral' | 'cohere'
    updated[index].model = '' // Don't auto-select first model
    onChange(updated)
  }

  const addModel = () => {
    const newModel: ModelConfig = {
      provider: '',
      model: '',
      enabled: true  // Auto-check new models for easier UX
    }
    onChange([...models, newModel]) // Add at the bottom
  }

  const removeModel = (index: number) => {
    if (models.length > 1) {
      const updated = models.filter((_, i) => i !== index)
      onChange(updated)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Select AI Models</h3>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={addModel}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Model
        </Button>
      </div>

      <div className="grid gap-3">
        {models.map((config, index) => (
          <div key={`${config.provider}-${config.model}-${index}`} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={() => toggleModel(index)}
              className="w-4 h-4 accent-primary"
            />
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                <select
                  value={config.provider}
                  onChange={(e) => changeProvider(index, e.target.value)}
                  disabled={!config.enabled}
                  className="w-full text-sm bg-background border border-input rounded px-2 py-1 disabled:opacity-50"
                >
                  <option value="">Choose Provider</option>
                   {availableProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {providerNames[provider as keyof typeof providerNames]}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => changeModel(index, e.target.value)}
                  disabled={!config.enabled}
                  className="w-full text-sm bg-background border border-input rounded px-2 py-1 disabled:opacity-50"
                >
                  <option value="">Choose Model</option>
                  {allModelsWithTierInfo.find(p => p.provider === config.provider)?.models?.map((modelInfo) => {
                    const cost = modelCosts[modelInfo.name as keyof typeof modelCosts]
                    const costDisplay = cost ? 
                      (cost.input === 0 && cost.output === 0 ? 'FREE' : 
                       `$${cost.input.toFixed(4)}/$${cost.output.toFixed(4)} per 1K`) : ''
                    
                    const internetIcon = hasInternetAccess(modelInfo.name) ? ' 🌐' : ''
                    const weight = MODEL_POWER[modelInfo.name as keyof typeof MODEL_POWER]
                    const weightTag = weight ? ` W:${weight.toFixed(2)}` : ''
                    const label = modelInfo.available 
                      ? `${modelInfo.name}${internetIcon} ${costDisplay ? `(${costDisplay})` : ''}${weightTag}`
                      : `${modelInfo.name}${internetIcon} (PRO ONLY) ${costDisplay ? `- ${costDisplay}` : ''}${weightTag}`
                    
                    return (
                      <option 
                        key={modelInfo.name} 
                        value={modelInfo.name}
                        disabled={!modelInfo.available}
                        style={!modelInfo.available ? { color: '#999', fontStyle: 'italic' } : {}}
                      >
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Cost, Tier and Weight Display */}
            {config.enabled && modelCosts[config.model as keyof typeof modelCosts] && (
              <div className="flex-shrink-0">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tierColors[modelCosts[config.model as keyof typeof modelCosts]?.tier || 'budget']
                    }`}>
                      {tierLabels[modelCosts[config.model as keyof typeof modelCosts]?.tier || 'budget']}
                    </div>
                    <span className="text-lg" title="Cost efficiency indicator">
                      {getEfficiencyBadge(config.model)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Weight:</span>
                    <span className="font-mono">{(MODEL_POWER[config.model as keyof typeof MODEL_POWER] || 0.7).toFixed(2)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {modelCosts[config.model as keyof typeof modelCosts]?.input === 0 && 
                     modelCosts[config.model as keyof typeof modelCosts]?.output === 0 ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium text-green-600">FREE</span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-mono">
                            ${modelCosts[config.model as keyof typeof modelCosts]?.input.toFixed(4)}/1K in
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3"></span>
                          <span className="font-mono">
                            ${modelCosts[config.model as keyof typeof modelCosts]?.output.toFixed(4)}/1K out
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Efficiency Badge */}
            {config.enabled && (
              <div className="flex-shrink-0">
                <div className="text-xs">
                  <span className="inline-flex items-center px-2 py-1 rounded-full font-medium 
                    {getEfficiencyBadge(config.model)}"
                  >
                    {getEfficiencyBadge(config.model)}
                  </span>
                </div>
              </div>
            )}

            {models.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeModel(index)}
                className="text-muted-foreground hover:text-destructive"
                disabled={!config.enabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div>💡 Tip: Add multiple models from the same provider to compare their responses directly!</div>
        <div>💰 Cost shown per 1K tokens (input/output). Flagship models offer best performance but cost more.</div>
        <div>🌐 Models with globe icon have internet access for real-time information.</div>
        <div>🏷️ Efficiency badges: 🆓 Free • 💰 Great Value • ⚖️ Balanced • 💎 Premium • 🏆 Flagship</div>
      </div>
    </div>
  )
}
