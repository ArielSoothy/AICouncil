'use client'

import { useState, useEffect } from 'react'
import { AGENT_PERSONAS, AgentPersona, AgentConfig } from '@/lib/agents/types'
import { ModelConfig } from '@/types/consensus'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, Target, Shield, Users, ChevronDown, Gift, Zap, Sparkles, Terminal, Crown } from 'lucide-react'
import { canUseModel } from '@/lib/user-tiers'
import { IS_PRODUCTION } from '@/lib/utils/environment'
import { AgentAvatar } from '@/components/shared'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { PROVIDER_COLORS } from '@/lib/brand-colors'
import {
  getModelInfo,
  getModelGrade,
  getModelCostTier,
  PROVIDER_NAMES,
  Provider
} from '@/lib/models/model-registry'
import { ModelDropdownItem, COST_TIER_STYLES, GRADE_STYLES } from '@/components/shared/model-badge'
import { cn } from '@/lib/utils'

interface AgentSelectorProps {
  selectedAgents: AgentConfig[]
  onAgentsChange: (agents: AgentConfig[]) => void
  availableModels: { provider: string; models: string[] }[]
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
  globalTier?: 'free' | 'pro' | 'max' | 'sub-pro' | 'sub-max'  // Optional global tier from header selector
}

// Agent Presets - Pre-selected models for each role (4 agents: analyst, critic, judge, synthesizer)
// IMPORTANT: Only use models with status: 'working' in MODEL_REGISTRY
/**
 * Agent Presets - Synchronized with lib/config/model-presets.ts DEBATE_PRESETS
 *
 * TIER PHILOSOPHY (December 2025 Data-Driven Rebuild):
 * - Free: Only $0 cost models (Google Gemini + Groq Llama)
 * - Pro: One mid-tier per provider (best value models)
 * - Max: One flagship per provider (highest AAII scores)
 */
const AGENT_PRESETS = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'Free models only',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    roles: {
      // All free models with best AAII scores
      // NOTE: gemini-2.5-flash removed due to known truncation/JSON bugs
      'analyst-001': { provider: 'google', model: 'gemini-2.0-flash' },        // AAII 1250 - Most stable free
      'critic-001': { provider: 'groq', model: 'llama-3.3-70b-versatile' },    // AAII 1250, 86% MMLU
      'judge-001': { provider: 'groq', model: 'llama-3.3-70b-versatile' },     // AAII 1250 (best free for judgment)
      'synthesizer-001': { provider: 'groq', model: 'llama-3.1-8b-instant' }   // AAII 1100 (fast synthesis)
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Mid-tier models (best value)',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    roles: {
      // One mid-tier per provider - best price/performance ratio
      'analyst-001': { provider: 'xai', model: 'grok-4-1-fast-reasoning' },      // AAII 1380, S-tier, $0.00025/1K - INSANE value!
      'critic-001': { provider: 'google', model: 'gemini-2.5-pro' },             // AAII 1350, S-tier
      'judge-001': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' }, // AAII 1200, good judgment
      'synthesizer-001': { provider: 'openai', model: 'gpt-5-mini' }             // AAII 1200, good synthesis
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    roles: {
      // One flagship per provider - highest AAII scores
      // NOTE: gemini-3-pro-preview removed due to tool call failures and temperature issues
      'analyst-001': { provider: 'google', model: 'gemini-2.5-pro' },             // AAII 1350, S-tier - Most stable flagship
      'critic-001': { provider: 'openai', model: 'gpt-5-chat-latest' },           // AAII 1380, flagship
      'judge-001': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' }, // AAII 1320, best reasoning
      'synthesizer-001': { provider: 'xai', model: 'grok-4-0709' }                // AAII 1370, S-tier flagship
    }
  },
  'sub-pro': {
    label: 'Sub Pro',
    icon: Terminal,
    description: 'Subscription CLI models',
    color: 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-cyan-300 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
    roles: {
      // Subscription-based CLI models
      'analyst-001': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
      'critic-001': { provider: 'openai', model: 'gpt-5-codex' },
      'judge-001': { provider: 'google', model: 'gemini-2.5-pro' },
      'synthesizer-001': { provider: 'xai', model: 'grok-code-fast-1' }
    }
  },
  'sub-max': {
    label: 'Sub Max',
    icon: Crown,
    description: 'Flagship subscription CLI models',
    color: 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    roles: {
      // Top-tier subscription models
      'analyst-001': { provider: 'anthropic', model: 'claude-opus-4-5-20251101' },
      'critic-001': { provider: 'openai', model: 'gpt-5.1-codex-max' },
      'judge-001': { provider: 'google', model: 'gemini-3-pro-preview' },
      'synthesizer-001': { provider: 'xai', model: 'grok-4-0709' }
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

  // Note: applyPreset removed - Use global tier selector in header instead
  // Agent models are updated automatically via useEffect when globalTier changes

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Select AI Agents</h3>
        <Badge variant="outline">
          {Object.values(agentStates).filter(s => s.enabled).length} agents selected
        </Badge>
      </div>

      {/* Preset Buttons removed - Use global tier selector in header instead */}

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
                              {(() => {
                                const modelInfo = getModelInfo(state.model)
                                const { grade, weight } = getModelGrade(state.model)
                                const costTier = getModelCostTier(state.model)
                                const costStyle = COST_TIER_STYLES[costTier]
                                const gradeStyle = GRADE_STYLES[grade]
                                const colorClass = PROVIDER_COLORS[state.provider as keyof typeof PROVIDER_COLORS] || PROVIDER_COLORS.openai
                                const displayName = modelInfo?.name || state.model

                                return (
                                  <button
                                    className={cn(
                                      colorClass,
                                      'transition-colors cursor-pointer px-3 py-1.5 h-auto text-sm font-medium rounded-full',
                                      'flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                                    )}
                                  >
                                    {displayName}
                                    <span className={cn('font-semibold text-xs', gradeStyle.text)}>
                                      {grade}({weight.toFixed(2)})
                                    </span>
                                    <span className={cn(
                                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                                      costStyle.bg,
                                      costStyle.text
                                    )}>
                                      {costTier}
                                    </span>
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                )
                              })()}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
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
                                      {PROVIDER_NAMES[providerInfo.provider as Provider] || providerInfo.provider}
                                    </DropdownMenuLabel>
                                    {availableProviderModels.map(model => (
                                      <ModelDropdownItem
                                        key={`${providerInfo.provider}/${model}`}
                                        modelId={model}
                                        selected={state.provider === providerInfo.provider && state.model === model}
                                        showPower={true}
                                        showCost={true}
                                        onClick={() => updateAgentModel(persona.id, providerInfo.provider, model)}
                                      />
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