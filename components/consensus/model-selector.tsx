'use client'

import { ModelConfig } from '@/types/consensus'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, DollarSign } from 'lucide-react'

interface ModelSelectorProps {
  models: ModelConfig[]
  onChange: (models: ModelConfig[]) => void
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
  google: ['gemini-1.5-flash', 'gemini-1.5-flash-8b'],
}

// Model pricing per 1K tokens (input → output)
const modelCosts = {
  // OpenAI Models
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015, tier: 'budget' },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002, tier: 'budget' },
  'gpt-4': { input: 0.03, output: 0.06, tier: 'premium' },
  'gpt-4o': { input: 0.01, output: 0.03, tier: 'premium' },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03, tier: 'premium' },
  
  // Claude 4 Series (2025) - Flagship
  'claude-opus-4-20250514': { input: 0.015, output: 0.075, tier: 'flagship' },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015, tier: 'balanced' },
  
  // Claude 3.7 Series (2025)
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015, tier: 'balanced' },
  
  // Claude 3.5 Series (2024)
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015, tier: 'balanced' },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004, tier: 'budget' },
  
  // Claude 3 Series (Legacy)
  'claude-3-opus-20240229': { input: 0.015, output: 0.075, tier: 'flagship' },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015, tier: 'balanced' },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125, tier: 'budget' },
  
  // Claude 2 Series
  'claude-2.1': { input: 0.008, output: 0.024, tier: 'balanced' },
  'claude-2.0': { input: 0.008, output: 0.024, tier: 'balanced' },
  
  // Google Models (All FREE on free tier)
  'gemini-1.5-flash': { input: 0.0, output: 0.0, tier: 'free' },
  'gemini-1.5-flash-8b': { input: 0.0, output: 0.0, tier: 'free' },
}

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
  google: 'Google AI'
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

export function ModelSelector({ models, onChange }: ModelSelectorProps) {
  const toggleModel = (index: number) => {
    const updated = [...models]
    updated[index].enabled = !updated[index].enabled
    onChange(updated)
  }

  const changeModel = (index: number, model: string) => {
    const updated = [...models]
    updated[index].model = model
    onChange(updated)
  }

  const changeProvider = (index: number, provider: string) => {
    const updated = [...models]
    updated[index].provider = provider as 'openai' | 'anthropic' | 'google'
    updated[index].model = availableModels[provider as keyof typeof availableModels][0]
    onChange(updated)
  }

  const addModel = () => {
    const newModel: ModelConfig = {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      enabled: true
    }
    onChange([...models, newModel])
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
                  {Object.entries(providerNames).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
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
                  {availableModels[config.provider]?.map((model) => {
                    const cost = modelCosts[model as keyof typeof modelCosts]
                    const costDisplay = cost ? 
                      (cost.input === 0 && cost.output === 0 ? 'FREE' : 
                       `$${cost.input.toFixed(4)}/$${cost.output.toFixed(4)} per 1K`) : ''
                    return (
                      <option key={model} value={model}>
                        {model} {costDisplay && `(${costDisplay})`}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Cost and Tier Display */}
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
        <div>🏷️ Efficiency badges: 🆓 Free • 💰 Great Value • ⚖️ Balanced • 💎 Premium • 🏆 Flagship</div>
      </div>
    </div>
  )
}
