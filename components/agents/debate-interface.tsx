'use client'

import { useCallback } from 'react'
import { AgentSelector } from './agent-selector'
import { ModelSelector } from '@/components/consensus/model-selector'
import { SingleModelBadgeSelector } from '@/components/trading/single-model-badge-selector'
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
import { DEBATE_CONFIG } from '@/lib/agents/types'
import { formatCost } from '@/lib/agents/cost-calculator'
import { useToast } from '@/hooks/use-toast'
import { ConversationHistoryDropdown } from '@/components/conversation/conversation-history-dropdown'
import { ShareButtons } from '@/components/conversation/share-buttons'
import { SaveDecisionButton } from '@/components/decisions'
import { useAuth } from '@/contexts/auth-context'
import { Send, Loader2, Settings, Users, MessageSquare, DollarSign, AlertTriangle, Zap, Brain, GitCompare, Globe, Sparkles, HelpCircle, Search } from 'lucide-react'
import { DebateFlowchart, PreDebateQuestions } from '@/components/debate'
import { AGENT_PRESETS } from './debate-presets'
import { useDebateSession } from './hooks/use-debate-session'
import { useDebateStreaming } from './hooks/use-debate-streaming'
import type { ModelProvider } from '@/types/consensus'
import type { AgentDebateInterfaceProps, PresetTier } from './debate-types'

export function AgentDebateInterface({ userTier }: AgentDebateInterfaceProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  // ── Session state (query, config, agents, presets) ────────
  const session = useDebateSession()

  // ── Streaming state (loading, SSE, model statuses) ────────
  const streaming = useDebateStreaming({
    query: session.query,
    debateSession: session.debateSession,
    setDebateSession: session.setDebateSession,
    setConversationId: session.setConversationId,
    setActiveTab: session.setActiveTab,
    setError: session.setError,
    saveConversation: session.saveConversation,
    toast,
  })

  // ── Compose reset ─────────────────────────────────────────
  const resetDebate = useCallback(() => {
    session.resetDebate()
    streaming.resetStreamingState()
  }, [session, streaming])

  // ── Helper to call streaming with all current params ──────
  const triggerStreaming = useCallback((continueRound2 = false, followUpAnswers?: Record<number, string>) => {
    streaming.startDebateWithStreaming({
      continueRound2,
      followUpAnswers,
      round1Mode: session.round1Mode,
      selectedLLMs: session.selectedLLMs,
      selectedAgents: session.selectedAgents,
      rounds: session.rounds,
      responseMode: session.responseMode,
      autoRound2: session.autoRound2,
      disagreementThreshold: session.disagreementThreshold,
      enableWebSearch: session.enableWebSearch,
      userTier,
      includeComparison: session.includeComparison,
      comparisonModel: session.comparisonModel,
      includeConsensusComparison: session.includeConsensusComparison,
      modelConfigs: session.modelConfigs,
    })
  }, [streaming, session, userTier])

  const triggerFallbackDebate = useCallback((continueRound2 = false, followUpAnswers?: Record<number, string>) => {
    streaming.startDebate({
      continueRound2,
      followUpAnswers,
      round1Mode: session.round1Mode,
      selectedLLMs: session.selectedLLMs,
      selectedAgents: session.selectedAgents,
      rounds: session.rounds,
      responseMode: session.responseMode,
      autoRound2: session.autoRound2,
      disagreementThreshold: session.disagreementThreshold,
      userTier,
      includeComparison: session.includeComparison,
      comparisonModel: session.comparisonModel,
      includeConsensusComparison: session.includeConsensusComparison,
      modelConfigs: session.modelConfigs,
      setShowRound2Prompt: session.setShowRound2Prompt,
    })
  }, [streaming, session, userTier])

  // Destructure for readability in JSX
  const {
    query, setQuery,
    conversationId,
    debateSession,
    error,
    activeTab, setActiveTab,
    isGeneratingQuestion,
    selectedAgents, setSelectedAgents,
    modelConfigs,
    selectedLLMs,
    handleModelConfigChange,
    rounds, setRounds,
    round1Mode,
    autoRound2, setAutoRound2,
    disagreementThreshold, setDisagreementThreshold,
    responseMode,
    enableWebSearch, setEnableWebSearch,
    includeComparison, setIncludeComparison,
    comparisonModel, setComparisonModel,
    includeConsensusComparison, setIncludeConsensusComparison,
    enablePreDebateQuestions, setEnablePreDebateQuestions,
    showPreDebateQuestions, setShowPreDebateQuestions,
    showRound2Prompt, setShowRound2Prompt,
    costEstimate,
    availableModels,
    isRestoring,
    handleRound1ModeChange,
    handleResponseModeChange,
    handleGenerateQuestion,
    globalTier,
  } = session

  const {
    isLoading,
    currentPhase,
    streamingUpdates,
    webSearchStatus,
    agentSearchHistory,
    memoryStatus,
    preResearchStatus,
    searchCapabilities,
    allModelsHaveNativeSearch,
    modelStatuses,
    debateStartTime,
    isSynthesizing,
    generatedPrompt,
    postAgentSteps,
    flowchartSteps,
    flowchartStartTime,
  } = streaming

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
          {/* Global Tier Indicator */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
            <div>
              <div className="text-sm font-medium">Global Model Tier</div>
              <div className="text-xs text-muted-foreground">
                Change tier using the selector in the header to update agent models
              </div>
            </div>
            {(() => {
              const preset = AGENT_PRESETS[globalTier as PresetTier]
              const Icon = preset.icon
              return (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border-2 ${preset.color}`}>
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{preset.label}</span>
                </div>
              )
            })()}
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="query" className="text-lg font-semibold">
                    Debate Query
                  </Label>
                  <div className="flex items-center gap-2">
                    <ConversationHistoryDropdown mode="agent-debate" limit={5} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateQuestion(userTier)}
                      disabled={isGeneratingQuestion}
                      className="text-xs gap-1"
                    >
                      {isGeneratingQuestion ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          Generate Question
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter a topic or question for the agents to debate..."
                  className="min-h-[100px] text-base"
                  disabled={isLoading}
                />
                {/* Start Debate button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (enablePreDebateQuestions && !showPreDebateQuestions) {
                        setShowPreDebateQuestions(true)
                      } else {
                        triggerStreaming()
                      }
                    }}
                    disabled={isLoading || isRestoring || showPreDebateQuestions ||
                      (round1Mode === 'llm' ? selectedLLMs.length < 2 : selectedAgents.length < DEBATE_CONFIG.minAgents)}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Restoring...
                      </>
                    ) : isLoading ? (
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

                {/* Pre-Debate Questions Modal */}
                {showPreDebateQuestions && (
                  <PreDebateQuestions
                    query={query}
                    onSubmit={(answers) => {
                      setShowPreDebateQuestions(false)
                      const contextWithAnswers = Object.keys(answers).length > 0
                        ? `${query}\n\nAdditional context from user:\n${Object.entries(answers).map(([, answer]) => `- ${answer}`).join('\n')}`
                        : query
                      const originalQuery = query
                      setQuery(contextWithAnswers)
                      setTimeout(() => {
                        triggerStreaming()
                        setQuery(originalQuery)
                      }, 100)
                    }}
                    onSkip={() => {
                      setShowPreDebateQuestions(false)
                      triggerStreaming()
                    }}
                    onCancel={() => {
                      setShowPreDebateQuestions(false)
                    }}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-semibold mb-2">
                    Round 1 Mode
                  </Label>
                  <RadioGroup
                    value={round1Mode}
                    onValueChange={handleRound1ModeChange}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="llm" id="round1-llm" />
                      <Label htmlFor="round1-llm" className="flex items-center gap-2 cursor-pointer">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Fast LLM Mode
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="agents" id="round1-agents" />
                      <Label htmlFor="round1-agents" className="flex items-center gap-2 cursor-pointer">
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
                  <RadioGroup
                    value={responseMode}
                    onValueChange={handleResponseModeChange}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="concise" id="response-concise" />
                      <Label htmlFor="response-concise" className="cursor-pointer">Concise (50 words)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normal" id="response-normal" />
                      <Label htmlFor="response-normal" className="cursor-pointer">Normal (150 words)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="detailed" id="response-detailed" />
                      <Label htmlFor="response-detailed" className="cursor-pointer">Detailed (300+ words)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Comparison Mode Toggle */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-primary" />
                    <Label htmlFor="comparison-mode-debate" className="font-medium">
                      Compare with Single Model
                    </Label>
                  </div>
                  <Switch
                    id="comparison-mode-debate"
                    checked={includeComparison}
                    onCheckedChange={(checked) => {
                      setIncludeComparison(checked)
                      if (checked && !comparisonModel) {
                        setComparisonModel({
                          provider: 'google',
                          model: 'gemini-2.5-flash',
                          enabled: true
                        })
                      } else if (!checked) {
                        setComparisonModel(null)
                      }
                    }}
                  />
                </div>

                {includeComparison && (
                  <div className="pl-7 space-y-4">
                    <div>
                      <SingleModelBadgeSelector
                        value={comparisonModel?.model || 'gpt-4.1-nano'}
                        onChange={(modelId) => {
                          let provider = 'openai'
                          if (modelId.startsWith('claude')) provider = 'anthropic'
                          else if (modelId.startsWith('gemini')) provider = 'google'
                          else if (modelId.startsWith('llama') || modelId.startsWith('gemma')) provider = 'groq'
                          else if (modelId.startsWith('grok')) provider = 'xai'
                          else if (modelId.startsWith('sonar')) provider = 'perplexity'
                          else if (modelId.startsWith('mistral')) provider = 'mistral'
                          else if (modelId.startsWith('command')) provider = 'cohere'

                          setComparisonModel({
                            provider: provider as ModelProvider,
                            model: modelId,
                            enabled: true
                          })
                        }}
                        label="Select model for comparison:"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="consensus-comparison" className="text-sm font-medium">
                        Also compare with normal consensus (3-way comparison)
                      </Label>
                      <Switch
                        id="consensus-comparison"
                        checked={includeConsensusComparison}
                        onCheckedChange={setIncludeConsensusComparison}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {includeConsensusComparison
                        ? "Compare single model vs normal consensus vs agent debate"
                        : "See how a single model response compares to the agent debate consensus"}
                    </p>
                  </div>
                )}
              </div>

              {/* Web Search Toggle */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <Label htmlFor="web-search-debate" className="font-medium">
                      Web Search
                    </Label>
                  </div>
                  <Switch
                    id="web-search-debate"
                    checked={enableWebSearch}
                    onCheckedChange={setEnableWebSearch}
                  />
                </div>

                {enableWebSearch && (
                  <div className="pl-7">
                    <p className="text-xs text-muted-foreground">
                      FREE web search using DuckDuckGo! Enriches agent responses with real-time web information.
                      Perfect for current events, prices, and recent developments. No API key required!
                    </p>
                  </div>
                )}
              </div>

              {/* Pre-Debate Questions Toggle */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-500" />
                    <Label htmlFor="pre-debate-questions" className="font-medium">
                      Clarifying Questions
                    </Label>
                  </div>
                  <Switch
                    id="pre-debate-questions"
                    checked={enablePreDebateQuestions}
                    onCheckedChange={setEnablePreDebateQuestions}
                  />
                </div>

                {enablePreDebateQuestions && (
                  <div className="pl-7">
                    <p className="text-xs text-muted-foreground">
                      AI will analyze your query and ask clarifying questions before the debate starts.
                      This helps agents provide more relevant and accurate responses.
                    </p>
                  </div>
                )}
              </div>

              {/* Round Selection Section */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-primary">Debate Rounds Configuration</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Number of Rounds: {rounds}
                    </Label>
                    <Slider
                      value={[rounds]}
                      onValueChange={(value) => setRounds(value[0])}
                      min={1}
                      max={DEBATE_CONFIG.maxRounds}
                      step={1}
                      className="mt-2"
                      disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground mt-2 px-2 py-1 bg-muted/50 rounded">
                      Manual control - exactly this many rounds will run
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-trigger Section */}
              <div className="space-y-4 pt-4 border-t border-muted">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-round2" className="text-base font-semibold">
                      Auto-trigger Round 2 on Disagreement
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically adds rounds when agents strongly disagree
                    </p>
                  </div>
                  <Switch
                    id="auto-round2"
                    checked={autoRound2}
                    onCheckedChange={setAutoRound2}
                  />
                </div>

                {autoRound2 && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
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
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Show LLM selector or Agent selector */}
          {round1Mode === 'llm' ? (
            <Card className="p-6 bg-black/40 border-zinc-800">
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Round 1: Fast LLM Models
                </Label>
                <p className="text-sm text-muted-foreground">
                  Select at least 2 models for direct consensus
                </p>
                <ModelSelector
                  models={modelConfigs}
                  onChange={handleModelConfigChange}
                />
                {selectedLLMs.length < 2 && (
                  <p className="text-xs text-amber-400">
                    Select at least 2 models for better consensus results
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <AgentSelector
              selectedAgents={selectedAgents}
              onAgentsChange={setSelectedAgents}
              availableModels={availableModels}
              userTier={userTier}
              globalTier={globalTier}
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
                    onClick={() => triggerFallbackDebate(true)}
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
            <Card className="p-8">
              <div className="space-y-6">
                {/* Visual Flowchart Progress */}
                {flowchartSteps.length > 0 && (
                  <DebateFlowchart
                    steps={flowchartSteps}
                    round={1}
                    isComplete={false}
                    totalDuration={flowchartStartTime ? (Date.now() - flowchartStartTime) / 1000 : undefined}
                    className="mb-4"
                  />
                )}

                {/* Show generated prompt for follow-ups */}
                {generatedPrompt && (
                  <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <h4 className="text-sm font-semibold mb-2 text-blue-400">Enhanced Follow-Up Prompt:</h4>
                    <div className="text-xs text-foreground/80 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto bg-black/30 p-3 rounded">
                      {generatedPrompt}
                    </div>
                  </div>
                )}

                {/* Memory Status - Persistent Display (disabled - on backlog) */}
                {false && (memoryStatus.isSearching || memoryStatus.foundCount !== undefined || memoryStatus.isStoring || memoryStatus.stored) && (
                  <div className={`mb-4 p-4 rounded-lg border ${
                    memoryStatus.isStoring || memoryStatus.isSearching ? 'bg-blue-500/10 border-blue-500/30' :
                    memoryStatus.stored ? 'bg-green-500/10 border-green-500/30' :
                    'bg-purple-500/10 border-purple-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      <Brain className={`h-5 w-5 ${
                        memoryStatus.isStoring || memoryStatus.isSearching ? 'text-blue-400 animate-pulse' :
                        memoryStatus.stored ? 'text-green-400' :
                        'text-purple-400'
                      }`} />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold mb-1">
                          {memoryStatus.isSearching ? 'Searching Memory...' :
                           memoryStatus.isStoring ? 'Storing Experience...' :
                           memoryStatus.stored ? 'Experience Saved' :
                           memoryStatus.foundCount !== undefined ? `Memory Retrieved (${memoryStatus.foundCount})` :
                           'Memory System Active'}
                        </h4>

                        {memoryStatus.isSearching && (
                          <p className="text-xs text-blue-400">
                            Looking for relevant past debates and experiences...
                          </p>
                        )}

                        {memoryStatus.foundCount !== undefined && !memoryStatus.isSearching && (
                          <div>
                            <p className="text-xs text-purple-400 mb-1">
                              Found {memoryStatus.foundCount} relevant memories from past debates
                            </p>
                            {memoryStatus.foundCount === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                This is a fresh discussion - no past experiences found
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Agents will use these experiences to provide better insights
                              </p>
                            )}
                          </div>
                        )}

                        {memoryStatus.isStoring && (
                          <p className="text-xs text-blue-400">
                            Saving this debate experience for future reference...
                          </p>
                        )}

                        {memoryStatus.stored && (
                          <p className="text-xs text-green-400">
                            Debate experience saved - will help improve future discussions
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Capabilities - Per-Agent Search Provider Display */}
                {enableWebSearch && searchCapabilities.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg border bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-600/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="h-5 w-5 text-blue-400" />
                      <h4 className="text-sm font-semibold">Research Progress</h4>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {agentSearchHistory.filter(a => a.status === 'completed').length}/{searchCapabilities.length} complete
                      </span>
                    </div>
                    <div className="space-y-2">
                      {searchCapabilities.map((agent, idx) => {
                        const searchStatus = agentSearchHistory.find(s => s.role === agent.role)
                        const isSearching = searchStatus?.status === 'searching'
                        const isComplete = searchStatus?.status === 'completed'
                        const hasError = searchStatus?.status === 'error'

                        return (
                          <div
                            key={`cap-${agent.role}-${idx}`}
                            className={`flex items-center gap-3 p-2 rounded-md transition-all ${
                              isSearching ? 'bg-blue-500/20 border border-blue-500/50 animate-pulse' :
                              isComplete ? 'bg-green-500/10 border border-green-500/30' :
                              hasError ? 'bg-red-500/10 border border-red-500/30' :
                              agent.hasNativeSearch
                                ? 'bg-blue-500/10 border border-blue-500/30'
                                : 'bg-yellow-500/10 border border-yellow-500/30'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                              isSearching ? 'bg-blue-500/30' :
                              isComplete ? 'bg-green-500/20' :
                              hasError ? 'bg-red-500/20' :
                              agent.hasNativeSearch ? 'bg-blue-500/20' : 'bg-yellow-500/20'
                            }`}>
                              {isSearching ? '?' : isComplete ? 'v' : hasError ? 'x' : agent.hasNativeSearch ? 'G' : 'D'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm capitalize">{agent.role}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-muted-foreground">
                                  {agent.model}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {isSearching ? 'Searching web...' :
                                 isComplete && searchStatus?.resultsCount !== undefined ? `${searchStatus.resultsCount} sources found` :
                                 hasError ? searchStatus?.error || 'Search failed' :
                                 agent.searchProvider}
                              </p>
                              {isComplete && searchStatus?.sources && searchStatus.sources.length > 0 && (
                                <details className="mt-1">
                                  <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">
                                    View {searchStatus.sources.length} sources
                                  </summary>
                                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground pl-2">
                                    {searchStatus.sources.slice(0, 5).map((source, i) => (
                                      <li key={i} className="truncate">
                                        <a href={source} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                                          {new URL(source).hostname}
                                        </a>
                                      </li>
                                    ))}
                                    {searchStatus.sources.length > 5 && (
                                      <li className="text-muted-foreground">+{searchStatus.sources.length - 5} more</li>
                                    )}
                                  </ul>
                                </details>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              isSearching ? 'bg-blue-500/30 text-blue-300' :
                              isComplete ? 'bg-green-500/20 text-green-400' :
                              hasError ? 'bg-red-500/20 text-red-400' :
                              agent.hasNativeSearch ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {isSearching ? 'Searching...' :
                               isComplete ? `${searchStatus?.resultsCount || 0} sources` :
                               hasError ? 'Error' :
                               agent.hasNativeSearch ? 'Native' : 'Fallback'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* DuckDuckGo Pre-Research */}
                {enableWebSearch && !allModelsHaveNativeSearch && (preResearchStatus.isSearching || preResearchStatus.sourcesFound !== undefined) && (
                  <div className="mb-4 p-4 rounded-lg border bg-gradient-to-br from-yellow-900/20 to-slate-900/50 border-yellow-600/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">D</span>
                      <h4 className="text-sm font-semibold">DuckDuckGo Fallback Research</h4>
                      {preResearchStatus.cacheHit && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          cached
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {preResearchStatus.isSearching
                          ? 'searching...'
                          : `${preResearchStatus.searchResults?.filter(s => s.success).length || 0}/${preResearchStatus.searchResults?.length || 0} complete`}
                        {preResearchStatus.researchTime && ` (${(preResearchStatus.researchTime / 1000).toFixed(1)}s)`}
                      </span>
                    </div>
                    {preResearchStatus.forModels && preResearchStatus.forModels.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-2">
                        For models without native search: {preResearchStatus.forModels.join(', ')}
                      </p>
                    )}

                    {preResearchStatus.isSearching ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Gathering DuckDuckGo evidence for fallback models...</span>
                      </div>
                    ) : preResearchStatus.searchResults && preResearchStatus.searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {preResearchStatus.searchResults.map((search, idx) => {
                          const roleLabels: Record<string, string> = {
                            'general': 'General Research',
                            'analyst': 'The Analyst',
                            'critic': 'The Critic',
                            'synthesizer': 'The Synthesizer'
                          }
                          return (
                            <div
                              key={`${search.role}-${idx}`}
                              className={`flex items-center gap-3 p-2 rounded-md transition-all ${
                                search.success
                                  ? 'bg-green-500/10 border border-green-500/30'
                                  : 'bg-red-500/10 border border-red-500/30'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                                search.success ? 'bg-green-500/20' : 'bg-red-500/20'
                              }`}>
                                {search.success ? 'v' : 'x'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{roleLabels[search.role] || search.role}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-muted-foreground">
                                    {search.role}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {search.success
                                    ? `Found ${search.resultsCount} sources via DuckDuckGo`
                                    : 'No results found'}
                                </p>
                              </div>
                              {search.success && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                                  <span>{search.resultsCount}</span>
                                  <span className="text-green-400/60">sources</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No search results available
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center space-y-2">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-lg font-medium">
                    {isSynthesizing
                      ? 'Creating synthesis...'
                      : round1Mode === 'llm'
                        ? 'Models are responding...'
                        : 'Agents are debating...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isSynthesizing
                      ? 'Analyzing all responses and creating consensus'
                      : round1Mode === 'llm'
                        ? 'Fast LLM mode - Getting quick consensus'
                        : 'Agent personas active - Conducting debate'}
                  </p>
                  {debateStartTime && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                      {!isSynthesizing && postAgentSteps.length === 0 && (
                        <p className="text-green-400">Phase 1: Agent debate in progress...</p>
                      )}
                      {/* Post-Agent Step Timeline */}
                      {postAgentSteps.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground">Post-Agent Processing:</p>
                          {postAgentSteps.map((step) => {
                            const isActive = step.status === 'in_progress'
                            const isCompleted = step.status === 'completed'
                            const duration = step.startTime && step.endTime
                              ? ((step.endTime - step.startTime) / 1000).toFixed(1) + 's'
                              : step.startTime ? `${((Date.now() - step.startTime) / 1000).toFixed(1)}s` : ''

                            return (
                              <div key={step.step} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    isCompleted ? 'bg-green-500' :
                                    isActive ? 'bg-blue-500 animate-pulse' :
                                    'bg-gray-500'
                                  }`} />
                                  <span className={`text-xs ${
                                    isCompleted ? 'text-green-400' :
                                    isActive ? 'text-blue-400' :
                                    'text-muted-foreground'
                                  }`}>
                                    {step.description}
                                  </span>
                                </div>
                                {duration && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {duration}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {/* Enhanced fallback phases */}
                      {postAgentSteps.length === 0 && isSynthesizing && (
                        <>
                          {((Date.now() - debateStartTime) / 1000) <= 15 && (
                            <p className="text-blue-400">Phase 2: Processing agent responses ({Math.floor((Date.now() - debateStartTime) / 1000)}s)</p>
                          )}
                          {((Date.now() - debateStartTime) / 1000) > 15 && ((Date.now() - debateStartTime) / 1000) <= 30 && (
                            <p className="text-yellow-400">Phase 3: Building consensus framework ({Math.floor((Date.now() - debateStartTime) / 1000)}s)</p>
                          )}
                          {((Date.now() - debateStartTime) / 1000) > 30 && (
                            <p className="text-orange-400">Phase 4: Finalizing unified response ({Math.floor((Date.now() - debateStartTime) / 1000)}s)</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Real-time model status */}
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <p className="text-sm font-medium text-muted-foreground">{currentPhase}</p>
                  </div>

                  {Object.entries(modelStatuses).map(([modelId, status]) => (
                    <div key={modelId} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            {status.status === 'thinking' && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            )}
                            {status.status === 'completed' && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                            {status.status === 'error' && (
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                            )}
                            {status.status === 'waiting' && (
                              <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{status.model || modelId}</p>
                            <p className="text-xs text-muted-foreground">{status.provider}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{status.message}</p>
                          {status.duration && (
                            <p className="text-xs text-green-400 font-mono">
                              {(status.duration / 1000).toFixed(1)}s
                            </p>
                          )}
                        </div>
                      </div>

                      {status.responsePreview && (
                        <div className="mt-2 p-2 bg-black/20 rounded text-xs text-muted-foreground">
                          <p className="font-mono line-clamp-3">{status.responsePreview}</p>
                        </div>
                      )}

                      {status.keyPoints && (
                        <div className="mt-2 text-xs text-blue-400">
                          <pre className="whitespace-pre-wrap">{status.keyPoints}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Streaming updates log */}
                {streamingUpdates.length > 0 && (
                  <div className="mt-4 p-2 bg-black/30 rounded-lg max-h-32 overflow-y-auto">
                    <p className="text-xs font-semibold mb-1 text-muted-foreground">Activity Log:</p>
                    {streamingUpdates.slice(-5).map((update, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground font-mono">
                        [{new Date(update.timestamp).toLocaleTimeString()}] {update.type}: {update.modelName || update.message || ''}
                      </p>
                    ))}
                  </div>
                )}

                {/* Total elapsed time */}
                {debateStartTime && (
                  <div className="text-center pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Total time elapsed: <span className="font-mono">
                        {((Date.now() - debateStartTime) / 1000).toFixed(1)}s
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : debateSession ? (
            <>
              <DebateDisplay
                session={debateSession}
                webSearchUsed={enableWebSearch && webSearchStatus.resultsCount !== undefined && !webSearchStatus.error}
                onFollowUpRound={(answers) => {
                  triggerStreaming(false, answers)
                }}
                onRefinedQuery={(refinedQuery) => {
                  setQuery(refinedQuery)
                  session.setDebateSession(null)
                  setActiveTab('setup')
                  setTimeout(() => triggerFallbackDebate(false), 100)
                }}
              />
              {/* Save Decision & Share Card */}
              <Card className="p-4 mt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <SaveDecisionButton
                      session={debateSession}
                      userId={user?.id}
                      variant="compact"
                    />
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      Save to your Decision Memory
                    </span>
                  </div>
                  {conversationId && query && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Share:</span>
                      <ShareButtons
                        conversationId={conversationId}
                        query={query}
                        mode="agent-debate"
                      />
                    </div>
                  )}
                </div>
              </Card>
              <div className="flex justify-center mt-6">
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
