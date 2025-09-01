'use client'

import { useState, useEffect } from 'react'
import { AgentSelector } from './agent-selector'
import { LLMSelector } from './llm-selector'
import { DebateDisplay } from './debate-display'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AgentConfig, DebateSession, DEBATE_CONFIG } from '@/lib/agents/types'
import { estimateDebateCost, formatCost, calculateDisagreementScore } from '@/lib/agents/cost-calculator'
import { Send, Loader2, Settings, Users, MessageSquare, DollarSign, AlertTriangle, Zap, Brain } from 'lucide-react'

interface AgentDebateInterfaceProps {
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
}

export function AgentDebateInterface({ userTier }: AgentDebateInterfaceProps) {
  const [query, setQuery] = useState('What\'s the best second-hand motorcycle or scooter up to 500cc to buy in Israel for daily commuting?')
  const [selectedAgents, setSelectedAgents] = useState<AgentConfig[]>([])
  const [selectedLLMs, setSelectedLLMs] = useState<Array<{ provider: string; model: string }>>([])
  const [rounds, setRounds] = useState(DEBATE_CONFIG.defaultRounds)
  const [isLoading, setIsLoading] = useState(false)
  const [debateSession, setDebateSession] = useState<DebateSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<{ provider: string; models: string[] }[]>([])
  const [activeTab, setActiveTab] = useState('setup')
  
  // New state for enhanced options
  const [round1Mode, setRound1Mode] = useState<'llm' | 'agents'>('llm')
  const [autoRound2, setAutoRound2] = useState(false)
  const [disagreementThreshold, setDisagreementThreshold] = useState(0.6)
  const [responseMode, setResponseMode] = useState<'concise' | 'normal' | 'detailed'>('concise')
  const [costEstimate, setCostEstimate] = useState<any>(null)
  const [showRound2Prompt, setShowRound2Prompt] = useState(false)

  // Fetch available models
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models) {
          setAvailableModels(data.models)
        }
      })
      .catch(err => console.error('Failed to fetch models:', err))
  }, [])
  
  // Calculate cost estimate when parameters change
  useEffect(() => {
    // Create agent configs from LLMs if in LLM mode
    const agentsForCost = round1Mode === 'llm' 
      ? selectedLLMs.map((llm, idx) => ({
          agentId: `llm-${idx}`,
          provider: llm.provider,
          model: llm.model,
          enabled: true,
          persona: {
            id: `llm-${idx}`,
            role: 'analyst' as const,
            name: llm.model,
            description: 'Direct LLM response',
            traits: [],
            focusAreas: [],
            systemPrompt: '',
            color: '#3B82F6'
          }
        }))
      : selectedAgents
      
    if ((round1Mode === 'llm' && selectedLLMs.length >= 2) || 
        (round1Mode === 'agents' && selectedAgents.length >= DEBATE_CONFIG.minAgents)) {
      const estimate = estimateDebateCost(
        agentsForCost,
        rounds,
        responseMode,
        round1Mode
      )
      setCostEstimate(estimate)
    }
  }, [selectedAgents, selectedLLMs, rounds, responseMode, round1Mode])

  const startDebate = async (continueRound2 = false) => {
    // Check query
    if (!continueRound2 && !query.trim()) {
      setError('Please enter a query')
      return
    }
    
    // Check model/agent selection based on mode
    if (!continueRound2) {
      if (round1Mode === 'llm' && selectedLLMs.length < 2) {
        setError('Please select at least 2 models for LLM consensus')
        return
      } else if (round1Mode === 'agents' && selectedAgents.length < DEBATE_CONFIG.minAgents) {
        setError(`Please select at least ${DEBATE_CONFIG.minAgents} agents`)
        return
      }
    }

    setIsLoading(true)
    setError(null)
    if (!continueRound2) {
      setDebateSession(null)
      setActiveTab('debate')
    }
    setShowRound2Prompt(false)

    try {
      const response = await fetch('/api/agents/debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          agents: round1Mode === 'llm' && !continueRound2 ? 
            // Convert LLMs to agent configs for LLM mode
            selectedLLMs.map((llm, idx) => ({
              agentId: `llm-${idx}`,
              provider: llm.provider,
              model: llm.model,
              enabled: true,
              persona: {
                id: `llm-${idx}`,
                role: 'analyst' as const,
                name: llm.model,
                description: 'Direct LLM response',
                traits: [],
                focusAreas: [],
                systemPrompt: '',
                color: '#3B82F6'
              }
            })) : selectedAgents,
          rounds: continueRound2 ? 2 : (autoRound2 ? 1 : rounds),
          responseMode,
          round1Mode,
          autoRound2,
          disagreementThreshold,
          isGuestMode: userTier === 'guest',
          continueSession: continueRound2 ? debateSession?.id : undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start debate')
      }

      const data = await response.json()
      
      if (data.success && data.session) {
        setDebateSession(data.session)
        
        // Check if we should prompt for Round 2
        if (!continueRound2 && data.session.rounds.length === 1 && 
            data.session.disagreementScore > disagreementThreshold && 
            !autoRound2) {
          setShowRound2Prompt(true)
        }
      } else {
        throw new Error(data.error || 'Debate failed')
      }
    } catch (err) {
      console.error('Debate error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const resetDebate = () => {
    setDebateSession(null)
    setActiveTab('setup')
    setError(null)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="debate" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Debate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="query" className="text-lg font-semibold mb-2">
                  Debate Query
                </Label>
                <Textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter a topic or question for the agents to debate..."
                  className="min-h-[100px] text-base"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-semibold mb-2">
                    Round 1 Mode
                  </Label>
                  <RadioGroup value={round1Mode} onValueChange={(v) => setRound1Mode(v as 'llm' | 'agents')}>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="llm" id="llm" />
                      <Label htmlFor="llm" className="flex items-center gap-2 cursor-pointer">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Fast LLM Mode
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="agents" id="agents" />
                      <Label htmlFor="agents" className="flex items-center gap-2 cursor-pointer">
                        <Brain className="w-4 h-4 text-blue-500" />
                        Agent Personas (Deep Analysis)
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground mt-2">
                    {round1Mode === 'llm' 
                      ? 'Models respond directly without agent personas' 
                      : 'Models adopt specialized agent roles and perspectives'}
                  </p>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2">
                    Response Length
                  </Label>
                  <RadioGroup value={responseMode} onValueChange={(v) => setResponseMode(v as any)}>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="concise" id="concise" />
                      <Label htmlFor="concise" className="cursor-pointer">Concise (50 words)</Label>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="normal" id="normal" />
                      <Label htmlFor="normal" className="cursor-pointer">Normal (150 words)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="detailed" id="detailed" />
                      <Label htmlFor="detailed" className="cursor-pointer">Detailed (300+ words)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-round2" className="text-base font-semibold">
                    Auto-trigger Round 2 on Disagreement
                  </Label>
                  <Switch
                    id="auto-round2"
                    checked={autoRound2}
                    onCheckedChange={setAutoRound2}
                  />
                </div>
                
                {!autoRound2 && (
                  <div>
                    <Label className="text-base font-semibold mb-2">
                      Manual Rounds: {rounds}
                    </Label>
                    <Slider
                      value={[rounds]}
                      onValueChange={(value) => setRounds(value[0])}
                      min={1}
                      max={DEBATE_CONFIG.maxRounds}
                      step={1}
                      className="mt-2"
                      disabled={isLoading || autoRound2}
                    />
                  </div>
                )}
                
                {autoRound2 && (
                  <div>
                    <Label className="text-base font-semibold mb-2">
                      Disagreement Threshold: {Math.round(disagreementThreshold * 100)}%
                    </Label>
                    <Slider
                      value={[disagreementThreshold]}
                      onValueChange={(value) => setDisagreementThreshold(value[0])}
                      min={0.3}
                      max={0.9}
                      step={0.1}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Round 2 triggers when disagreement exceeds this threshold
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Show LLM selector for LLM mode, Agent selector for agent mode */}
          {round1Mode === 'llm' ? (
            <LLMSelector
              selectedModels={selectedLLMs}
              onModelsChange={setSelectedLLMs}
              availableModels={availableModels}
              userTier={userTier}
            />
          ) : (
            <AgentSelector
              selectedAgents={selectedAgents}
              onAgentsChange={setSelectedAgents}
              availableModels={availableModels}
              userTier={userTier}
            />
          )}

          {/* Cost Estimation Card */}
          {costEstimate && ((round1Mode === 'llm' && selectedLLMs.length >= 2) || (round1Mode === 'agents' && selectedAgents.length >= DEBATE_CONFIG.minAgents)) && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Estimated Cost</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Round 1</p>
                      <p className="font-mono font-semibold">{formatCost(costEstimate.estimated.round1)}</p>
                    </div>
                    {rounds > 1 && (
                      <div>
                        <p className="text-muted-foreground">Round 2</p>
                        <p className="font-mono font-semibold">{formatCost(costEstimate.estimated.round2)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-mono font-semibold text-lg">{formatCost(costEstimate.estimated.total)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Range: {formatCost(costEstimate.minimum)} - {formatCost(costEstimate.maximum)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={startDebate}
              disabled={isLoading || 
                (round1Mode === 'llm' ? selectedLLMs.length < 2 : selectedAgents.length < DEBATE_CONFIG.minAgents)}
              size="lg"
              className="min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Starting Debate...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Start Debate
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="debate" className="space-y-6">
          {/* Round 2 Decision Prompt */}
          {showRound2Prompt && debateSession && (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-semibold mb-1">High Disagreement Detected!</p>
                  <p className="text-sm">
                    Disagreement Score: {Math.round((debateSession.disagreementScore || 0) * 100)}%
                    (Threshold: {Math.round(disagreementThreshold * 100)}%)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => startDebate(true)}
                    disabled={isLoading}
                    size="sm"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Continue to Round 2
                  </Button>
                  <Button 
                    onClick={() => setShowRound2Prompt(false)}
                    variant="outline"
                    size="sm"
                  >
                    Skip Round 2
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Est. Round 2 Cost: {costEstimate && formatCost(costEstimate.estimated.round2)}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">
                  {round1Mode === 'llm' ? 'Models are responding...' : 'Agents are debating...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {round1Mode === 'llm' 
                    ? 'Fast LLM mode - Getting quick consensus'
                    : 'Agent personas active - Conducting debate'}
                </p>
              </div>
            </Card>
          ) : debateSession ? (
            <>
              <DebateDisplay 
                session={debateSession} 
                onRefinedQuery={(refinedQuery) => {
                  // Start new debate with refined query
                  setQuery(refinedQuery)
                  setDebateSession(null)
                  setActiveTab('setup')
                  // Auto-start the debate
                  setTimeout(() => startDebate(false), 100)
                }}
              />
              <div className="flex justify-center">
                <Button onClick={resetDebate} variant="outline">
                  Start New Debate
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No Active Debate</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure your agents and query in the Setup tab to start
                </p>
                <Button onClick={() => setActiveTab('setup')}>
                  Go to Setup
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}