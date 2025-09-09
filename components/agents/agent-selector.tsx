'use client'

import { useState, useEffect } from 'react'
import { AGENT_PERSONAS, AgentPersona, AgentConfig } from '@/lib/agents/types'
import { ModelConfig } from '@/types/consensus'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Brain, Target, Shield, Users } from 'lucide-react'
import { canUseModel } from '@/lib/user-tiers'
import { AgentAvatar } from '@/components/shared'

interface AgentSelectorProps {
  selectedAgents: AgentConfig[]
  onAgentsChange: (agents: AgentConfig[]) => void
  availableModels: { provider: string; models: string[] }[]
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
}


export function AgentSelector({ 
  selectedAgents, 
  onAgentsChange, 
  availableModels,
  userTier 
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
      'critic-001': { model: 'gemini-1.5-flash-8b', provider: 'google' },     // Different provider for diversity
      'synthesizer-001': { model: 'llama-3.3-70b-versatile', provider: 'groq' } // Best model for final synthesis
    }
    
    Object.values(AGENT_PERSONAS).forEach(persona => {
      // Try to use the specific default for this agent
      let defaultModel = agentDefaults[persona.id]?.model || ''
      let defaultProvider = agentDefaults[persona.id]?.provider || ''
      
      // Check if user can use the preferred model
      let canUsePreferred = false
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
      
      // If can't use preferred, find any suitable model
      if (!canUsePreferred) {
        for (const providerInfo of availableModels) {
          for (const model of providerInfo.models) {
            if (canUseModel(userTier, providerInfo.provider, model)) {
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

  const getModelLabel = (provider: string, model: string) => {
    const isFree = ['groq', 'google'].includes(provider.toLowerCase()) ||
                   model.includes('gemini') || model.includes('llama') || model.includes('gemma')
    return `${provider}/${model}${isFree ? ' (Free)' : ''}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Select AI Agents</h3>
        <Badge variant="outline">
          {Object.values(agentStates).filter(s => s.enabled).length} agents selected
        </Badge>
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
                          Model for this agent:
                        </label>
                        <Select
                          value={`${state.provider}/${state.model}`}
                          onValueChange={(value) => {
                            const [provider, ...modelParts] = value.split('/')
                            const model = modelParts.join('/')
                            updateAgentModel(persona.id, provider, model)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map(providerInfo => (
                              <div key={providerInfo.provider}>
                                {providerInfo.models.filter(model => 
                                  canUseModel(userTier, providerInfo.provider, model)
                                ).map(model => (
                                  <SelectItem 
                                    key={`${providerInfo.provider}/${model}`}
                                    value={`${providerInfo.provider}/${model}`}
                                  >
                                    {getModelLabel(providerInfo.provider, model)}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
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