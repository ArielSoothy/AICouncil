'use client'

// Focused component for debate configuration
// Only handles setup UI, no API calls or complex state

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { AgentSelector } from '@/components/agents/agent-selector'
import { ModelSelector } from '@/components/consensus/model-selector'
import { DebateConfig, DebateMode, ResponseMode, AgentConfig, ModelConfig } from '../types'
import { Brain, Zap, Send, Globe } from 'lucide-react'

interface DebateSetupProps {
  onSubmit: (config: DebateConfig) => void
  isLoading?: boolean
  userTier?: 'guest' | 'free' | 'pro' | 'enterprise'
}

export function DebateSetup({ onSubmit, isLoading = false, userTier = 'free' }: DebateSetupProps) {
  // Local state only for UI configuration
  const [query, setQuery] = useState('What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?')
  const [mode, setMode] = useState<DebateMode>('agents')
  const [responseMode, setResponseMode] = useState<ResponseMode>('concise')
  const [rounds, setRounds] = useState(2)
  const [autoRound2, setAutoRound2] = useState(false)
  const [disagreementThreshold, setDisagreementThreshold] = useState(0.3)
  const [selectedAgents, setSelectedAgents] = useState<AgentConfig[]>([])
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([
    { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
    { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
    { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true }
  ])
  
  // Comparison settings
  const [comparisonEnabled, setComparisonEnabled] = useState(false)
  const [comparisonModel, setComparisonModel] = useState<ModelConfig>({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    enabled: true
  })
  
  // Consensus settings
  const [consensusEnabled, setConsensusEnabled] = useState(false)
  
  // Web search settings
  const [enableWebSearch, setEnableWebSearch] = useState(false)

  const handleSubmit = () => {
    // Validate before submitting
    if (!query.trim()) return
    
    const agents = mode === 'agents' ? selectedAgents : 
      selectedModels.filter(m => m.enabled).map((m, idx) => ({
        agentId: `llm-${idx}`,
        provider: m.provider,
        model: m.model,
        enabled: true,
        persona: {
          id: `llm-${idx}`,
          name: `Model ${idx + 1}`,
          role: 'analyst' as const,
          description: 'Direct model response without persona',
          traits: [],
          focusAreas: [],
          systemPrompt: '',
          color: '#666666'
        }
      }))

    if (agents.length < 2) return

    const config: DebateConfig = {
      query,
      mode,
      responseMode,
      rounds,
      autoRound2,
      disagreementThreshold,
      agents,
      enableWebSearch,
      comparison: comparisonEnabled ? {
        enabled: true,
        model: comparisonModel
      } : undefined,
      consensus: consensusEnabled ? {
        enabled: true,
        models: selectedModels.filter(m => m.enabled)
      } : undefined
    }

    onSubmit(config)
  }

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="query" className="text-lg font-semibold mb-2">
              Your Question
            </Label>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your query..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-base font-semibold mb-2">Debate Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as DebateMode)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="llm" id="mode-llm" />
                  <Label htmlFor="mode-llm" className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Fast LLM Mode
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agents" id="mode-agents" />
                  <Label htmlFor="mode-agents" className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-500" />
                    Agent Personas
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-semibold mb-2">Response Length</Label>
              <RadioGroup value={responseMode} onValueChange={(v) => setResponseMode(v as ResponseMode)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="concise" id="resp-concise" />
                  <Label htmlFor="resp-concise">Concise</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="resp-normal" />
                  <Label htmlFor="resp-normal">Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="resp-detailed" />
                  <Label htmlFor="resp-detailed">Detailed</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-round2">Auto Round 2 on Disagreement</Label>
              <Switch
                id="auto-round2"
                checked={autoRound2}
                onCheckedChange={setAutoRound2}
              />
            </div>

            {autoRound2 && (
              <div>
                <Label>Disagreement Threshold: {Math.round(disagreementThreshold * 100)}%</Label>
                <Slider
                  value={[disagreementThreshold]}
                  onValueChange={(v) => setDisagreementThreshold(v[0])}
                  min={0.1}
                  max={0.9}
                  step={0.1}
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label>Number of Rounds: {rounds}</Label>
              <Slider
                value={[rounds]}
                onValueChange={(v) => setRounds(v[0])}
                min={1}
                max={3}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                More rounds = deeper debate, but higher cost
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Model/Agent Selection */}
      {mode === 'agents' ? (
        <AgentSelector
          selectedAgents={selectedAgents}
          onAgentsChange={setSelectedAgents}
          availableModels={[
            {
              provider: 'openai',
              models: [
                'gpt-5-chat-latest',
                'gpt-5',
                'gpt-5-mini',
                'gpt-5-nano',
                'gpt-4.1',
                'gpt-4.1-mini',
                'gpt-4o',
                'gpt-4-turbo-preview',
                'gpt-4',
                'gpt-3.5-turbo'
              ]
            },
            {
              provider: 'anthropic',
              models: [
                'claude-sonnet-4-5-20250929',
                'claude-sonnet-4-20250514',
                'claude-3-7-sonnet-20250219',
                'claude-3-5-haiku-20241022',
                'claude-3-opus-20240229',
                'claude-3-haiku-20240307'
              ]
            },
            {
              provider: 'google',
              models: [
                'gemini-2.0-flash'
              ]
            },
            {
              provider: 'groq',
              models: [
                'llama-3.3-70b-versatile',
                'llama-3.1-8b-instant'
              ]
            },
            {
              provider: 'xai',
              models: [
                'grok-4-fast-reasoning',
                'grok-4-fast-non-reasoning',
                'grok-4-0709',
                'grok-code-fast-1'
              ]
            }
          ]}
          userTier={userTier}
        />
      ) : (
        <Card className="p-6">
          <Label className="text-base font-semibold mb-4">Select Models</Label>
          <ModelSelector
            models={selectedModels}
            onChange={setSelectedModels}
          />
        </Card>
      )}

      {/* Optional Features */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="comparison">Enable Comparison</Label>
          <Switch
            id="comparison"
            checked={comparisonEnabled}
            onCheckedChange={setComparisonEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="consensus">Enable Consensus</Label>
          <Switch
            id="consensus"
            checked={consensusEnabled}
            onCheckedChange={setConsensusEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <Label htmlFor="websearch">Web Search</Label>
          </div>
          <Switch
            id="websearch"
            checked={enableWebSearch}
            onCheckedChange={setEnableWebSearch}
          />
        </div>
        {enableWebSearch && (
          <div className="pl-6">
            <p className="text-xs text-muted-foreground">
              🆓 FREE web search using DuckDuckGo! Enriches agent responses with real-time web information. 
              Perfect for current events, prices, and recent developments. No API key required!
            </p>
          </div>
        )}
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !query.trim() || 
          (mode === 'agents' ? selectedAgents.length < 2 : selectedModels.filter(m => m.enabled).length < 2)}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>Loading...</>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Start Debate
          </>
        )}
      </Button>
    </div>
  )
}