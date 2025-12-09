'use client'

import { useState, useEffect } from 'react'
import { AGENT_PERSONAS, AgentPersona, AgentConfig } from '@/lib/agents/types'
import { ModelConfig } from '@/types/consensus'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, Target, Shield, Users, ChevronDown, Gift, Zap, Sparkles } from 'lucide-react'
import { canUseModel } from '@/lib/user-tiers'
import { IS_PRODUCTION } from '@/lib/utils/environment'
import { AgentAvatar } from '@/components/shared'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { PROVIDER_COLORS } from '@/lib/brand-colors'

interface AgentSelectorProps {
  selectedAgents: AgentConfig[]
  onAgentsChange: (agents: AgentConfig[]) => void
  availableModels: { provider: string; models: string[] }[]
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
  globalTier?: 'free' | 'pro' | 'max'  // Optional global tier from header selector
}

// Model display names for professional badges (same as Ultra Mode)
const modelDisplayNames: Record<string, string> = {
  'gpt-5.1': 'GPT-5.1',
  'gpt-5-chat-latest': 'GPT-5 Chat',
  'gpt-5': 'GPT-5',
  'gpt-5-mini': 'GPT-5 Mini',
  'gpt-5-nano': 'GPT-5 Nano',
  'gpt-4.1': 'GPT-4.1',
  'gpt-4.1-mini': 'GPT-4.1 Mini',
  'gpt-4.1-nano': 'GPT-4.1 Nano',
  'gpt-4-turbo-preview': 'GPT-4 Turbo',
  'gpt-4': 'GPT-4',
  'gpt-4o': 'GPT-4o',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
  'claude-opus-4-1-20250805': 'Claude Opus 4.1',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'gemini-3-pro-preview-11-2025': 'Gemini 3 Pro',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
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

// Agent Presets - Pre-selected models for each role (4 agents: analyst, critic, judge, synthesizer)
const AGENT_PRESETS = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'All free models',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    roles: {
      'analyst-001': { provider: 'groq', model: 'llama-3.1-8b-instant' },       // Fast analyst
      'critic-001': { provider: 'google', model: 'gemini-2.0-flash' },          // Different provider
      'judge-001': { provider: 'groq', model: 'llama-3.3-70b-versatile' },      // Best free for judging
      'synthesizer-001': { provider: 'google', model: 'gemini-2.0-flash' }      // Synthesis
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Cheapest paid models',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    roles: {
      'analyst-001': { provider: 'openai', model: 'gpt-4.1-mini' },            // Cheapest OpenAI ($0.0004/1K)
      'critic-001': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' }, // Haiku 3.5 ($0.80/$4 per 1M tokens)
      'judge-001': { provider: 'google', model: 'gemini-2.0-flash-lite' },     // Free, fast judge
      'synthesizer-001': { provider: 'xai', model: 'grok-code-fast-1' }        // Cheapest xAI ($0.0002/1K)
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    roles: {
      'analyst-001': { provider: 'openai', model: 'gpt-5.1' },                         // GPT-5.1 for analysis
      'critic-001': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },   // Claude 4.5 for critique
      'judge-001': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },    // Claude 4.5 for judging
      'synthesizer-001': { provider: 'xai', model: 'grok-4-fast-reasoning' } // Grok 4 for synthesis (gemini-3-pro untested)
    }
  }
} as const

export function AgentSelector({
  selectedAgents,
  onAgentsChange,
  availableModels,
  userTier,
  globalTier
}: AgentSelectorProps) {
  const [agentStates, setAgentStates] = useState<Record<string, {
    enabled: boolean
    model: string
    provider: string
  }>>({})

  // Initialize agent states
  useEffect(() => {
    const initialStates: Record<string, any> = {}
    
    // Assign different default models to each agent for diversity
    // Using different providers (Groq + Google) for heterogeneous agent debate
    const agentDefaults: Record<string, { model: string; provider: string }> = {
      'analyst-001': { model: 'llama-3.1-8b-instant', provider: 'groq' },     // Fast, good for initial analysis
      'critic-001': { model: 'gemini-2.0-flash', provider: 'google' },        // Different provider for diversity
      'judge-001': { model: 'llama-3.3-70b-versatile', provider: 'groq' },    // Best free model for judging
      'synthesizer-001': { model: 'gemini-2.0-flash', provider: 'google' }    // Synthesis
    }
    
    Object.values(AGENT_PERSONAS).forEach(persona => {
      // Try to use the specific default for this agent
      let defaultModel = agentDefaults[persona.id]?.model || ''
      let defaultProvider = agentDefaults[persona.id]?.provider || ''
      
      // Check if user can use the preferred model
      // In development mode, all models are available
      let canUsePreferred = !IS_PRODUCTION
      if (IS_PRODUCTION) {
        for (const providerInfo of availableModels) {
          if (providerInfo.provider === defaultProvider) {
            for (const model of providerInfo.models) {
              if (model === defaultModel && canUseModel(userTier, providerInfo.provider, model)) {
                canUsePreferred = true
                break
              }
            }
          }
        }
      }

      // If can't use preferred, find any suitable model
      if (!canUsePreferred) {
        for (const providerInfo of availableModels) {
          for (const model of providerInfo.models) {
            if (!IS_PRODUCTION || canUseModel(userTier, providerInfo.provider, model)) {
              defaultModel = model
              defaultProvider = providerInfo.provider
              break
            }
          }
          if (defaultModel) break
        }
      }
      
      // Enable all three agents by default
      initialStates[persona.id] = {
        enabled: true, // Always enable all agents by default for proper debate
        model: defaultModel,
        provider: defaultProvider
      }
    })
    
    setAgentStates(initialStates)
  }, [availableModels, userTier])

  // Update selected agents when states change
  useEffect(() => {
    const agents: AgentConfig[] = []
    
    Object.entries(agentStates).forEach(([agentId, state]) => {
      if (state.enabled && state.model && state.provider) {
        const persona = Object.values(AGENT_PERSONAS).find(p => p.id === agentId)
        if (persona) {
          agents.push({
            agentId,
            persona,
            provider: state.provider as '' | 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'perplexity' | 'mistral' | 'cohere',
            model: state.model,
            enabled: true
          })
        }
      }
    })
    
    onAgentsChange(agents)
  }, [agentStates, onAgentsChange])

  // Auto-apply preset when global tier changes
  useEffect(() => {
    if (globalTier && AGENT_PRESETS[globalTier]) {
      const preset = AGENT_PRESETS[globalTier]
      const newStates: Record<string, { enabled: boolean; model: string; provider: string }> = {}

      Object.values(AGENT_PERSONAS).forEach(persona => {
        const roleConfig = preset.roles[persona.id as keyof typeof preset.roles]
        if (roleConfig) {
          newStates[persona.id] = {
            enabled: true,
            model: roleConfig.model,
            provider: roleConfig.provider
          }
        }
      })

      setAgentStates(newStates)
    }
  }, [globalTier])

  const toggleAgent = (agentId: string) => {
    setAgentStates(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        enabled: !prev[agentId]?.enabled
      }
    }))
  }

  const updateAgentModel = (agentId: string, provider: string, model: string) => {
    setAgentStates(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        provider,
        model
      }
    }))
  }

  // Apply preset function
  const applyPreset = (presetKey: 'free' | 'pro' | 'max') => {
    const preset = AGENT_PRESETS[presetKey]
    const newStates = { ...agentStates }

    Object.entries(preset.roles).forEach(([agentId, config]) => {
      newStates[agentId] = {
        enabled: true,
        provider: config.provider,
        model: config.model
      }
    })

    setAgentStates(newStates)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Select AI Agents</h3>
        <Badge variant="outline">
          {Object.values(agentStates).filter(s => s.enabled).length} agents selected
        </Badge>
      </div>

      {/* Preset Buttons */}
      <div className="mb-4">
        <label className="text-sm font-medium text-muted-foreground block mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(AGENT_PRESETS) as Array<keyof typeof AGENT_PRESETS>).map((key) => {
            const preset = AGENT_PRESETS[key]
            const Icon = preset.icon

            return (
              <Button
                key={key}
                onClick={() => applyPreset(key)}
                variant="outline"
                className={`flex flex-col items-center gap-2 h-auto py-4 border-2 ${preset.color} transition-all`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-semibold">{preset.label}</div>
                  <div className="text-xs opacity-80 mt-1">{preset.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4">
        {Object.values(AGENT_PERSONAS).map(persona => {
          const state = agentStates[persona.id] || { enabled: false, model: '', provider: '' }
          
          return (
            <Card 
              key={persona.id}
              className={`p-4 transition-all ${state.enabled ? 'ring-2 ring-primary' : 'opacity-70'}`}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={state.enabled}
                    onCheckedChange={() => toggleAgent(persona.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AgentAvatar 
                        role={persona.role}
                        name={persona.name}
                        size="md"
                        showName={true}
                      />
                      <Badge variant="secondary" className="text-xs">
                        {persona.role}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {persona.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {persona.traits.slice(0, 3).map(trait => (
                        <Badge key={trait} variant="outline" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                    
                    {state.enabled && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Model:
                        </label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {/* Current Model Badge with Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={`${PROVIDER_COLORS[state.provider as keyof typeof PROVIDER_COLORS] || PROVIDER_COLORS.openai} transition-colors cursor-pointer px-3 py-1.5 h-auto text-sm font-medium rounded-full flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                              >
                                {modelDisplayNames[state.model] || state.model}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
                              <DropdownMenuLabel>Select Provider & Model</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {availableModels.map(providerInfo => {
                                // In development, show all models; in production, filter by tier
                                const availableProviderModels = IS_PRODUCTION
                                  ? providerInfo.models.filter(model =>
                                      canUseModel(userTier, providerInfo.provider, model)
                                    )
                                  : providerInfo.models

                                if (availableProviderModels.length === 0) return null

                                return (
                                  <div key={providerInfo.provider}>
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                      {providerNames[providerInfo.provider as keyof typeof providerNames] || providerInfo.provider}
                                    </DropdownMenuLabel>
                                    {availableProviderModels.map(model => (
                                      <DropdownMenuItem
                                        key={`${providerInfo.provider}/${model}`}
                                        onClick={() => updateAgentModel(persona.id, providerInfo.provider, model)}
                                        className={state.provider === providerInfo.provider && state.model === model ? 'bg-accent' : ''}
                                      >
                                        <span className="flex items-center gap-2">
                                          {modelDisplayNames[model] || model}
                                          {state.provider === providerInfo.provider && state.model === model && ' ✓'}
                                        </span>
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                  </div>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      
      {selectedAgents.length < 2 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Select at least 2 agents to start a debate
          </p>
        </div>
      )}
    </div>
  )
}