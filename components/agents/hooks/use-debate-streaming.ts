import { useState, useEffect, useRef, useCallback } from 'react'
import { AgentConfig, DebateSession, DEBATE_CONFIG } from '@/lib/agents/types'
import { ModelConfig } from '@/types/consensus'
import { useToast } from '@/hooks/use-toast'
import { DebateStepProgress, createDebateSteps, updateStepStatus as updateFlowchartStep } from '@/components/debate'
import type {
  WebSearchStatus,
  AgentSearchHistoryEntry,
  MemoryStatus,
  PreResearchStatus,
  SearchCapability,
  ModelStatus,
  PostAgentStep,
} from '../debate-types'

interface UseDebateStreamingOptions {
  query: string
  debateSession: DebateSession | null
  setDebateSession: (s: DebateSession | null) => void
  setConversationId: (id: string | null) => void
  setActiveTab: (tab: string) => void
  setError: (err: string | null) => void
  saveConversation: (id: string) => void
  toast: ReturnType<typeof useToast>['toast']
}

export function useDebateStreaming(options: UseDebateStreamingOptions) {
  const {
    query,
    debateSession,
    setDebateSession,
    setConversationId,
    setActiveTab,
    setError,
    saveConversation,
    toast,
  } = options

  // ── Loading state ─────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  // ── Streaming updates ─────────────────────────────────────

  const [streamingUpdates, setStreamingUpdates] = useState<any[]>([])
  const [currentPhase, setCurrentPhase] = useState<string>('')

  // ── Web search tracking ───────────────────────────────────

  const [webSearchStatus, setWebSearchStatus] = useState<WebSearchStatus>({ isSearching: false })
  const [agentSearchHistory, setAgentSearchHistory] = useState<AgentSearchHistoryEntry[]>([])

  // ── Memory system tracking ────────────────────────────────

  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus>({ isSearching: false, isStoring: false })

  // ── Pre-research tracking ─────────────────────────────────

  const [preResearchStatus, setPreResearchStatus] = useState<PreResearchStatus>({ isSearching: false })

  // ── Search capabilities ───────────────────────────────────

  const [searchCapabilities, setSearchCapabilities] = useState<SearchCapability[]>([])
  const [allModelsHaveNativeSearch, setAllModelsHaveNativeSearch] = useState(false)

  // ── Model status tracking ─────────────────────────────────

  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({})
  const [debateStartTime, setDebateStartTime] = useState<number | null>(null)

  // ── Synthesis phase ───────────────────────────────────────

  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)

  // ── Post-agent steps ──────────────────────────────────────

  const [postAgentSteps, setPostAgentSteps] = useState<PostAgentStep[]>([])

  // ── Flowchart ─────────────────────────────────────────────

  const [flowchartSteps, setFlowchartSteps] = useState<DebateStepProgress[]>([])
  const [flowchartStartTime, setFlowchartStartTime] = useState<number | null>(null)

  // ── Timer for elapsed time and phase detection ────────────

  useEffect(() => {
    if (!isLoading || !debateStartTime) {
      setIsSynthesizing(false)
      return
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - debateStartTime) / 1000
      if (elapsed > 5 && !isSynthesizing) {
        setIsSynthesizing(true)
      }
      setModelStatuses(prev => ({...prev}))
    }, 100)

    return () => clearInterval(interval)
  }, [isLoading, debateStartTime, isSynthesizing])

  // ── Post-agent step helpers ───────────────────────────────

  const initializePostAgentSteps = useCallback(() => {
    const steps: PostAgentStep[] = [
      { step: 'collection', status: 'pending', description: 'Collecting agent responses' },
      { step: 'comparison', status: 'pending', description: 'Comparing with single model baseline' },
      { step: 'analysis', status: 'pending', description: 'Analyzing response differences' },
      { step: 'consensus', status: 'pending', description: 'Building consensus framework' },
      { step: 'synthesis', status: 'pending', description: 'Synthesizing unified response' },
      { step: 'validation', status: 'pending', description: 'Validating final conclusions' },
      { step: 'formatting', status: 'pending', description: 'Formatting structured output' }
    ]
    setPostAgentSteps(steps)
  }, [])

  const updateStepStatus = useCallback((stepName: string, status: 'pending' | 'in_progress' | 'completed') => {
    setPostAgentSteps(prev => prev.map(step => {
      if (step.step === stepName) {
        const now = Date.now()
        return {
          ...step,
          status,
          ...(status === 'in_progress' ? { startTime: now } : {}),
          ...(status === 'completed' ? { endTime: now } : {})
        }
      }
      return step
    }))
  }, [])

  // ── Start debate with streaming (SSE) ─────────────────────

  const startDebateWithStreaming = useCallback(async (params: {
    continueRound2?: boolean
    followUpAnswers?: Record<number, string>
    round1Mode: 'llm' | 'agents'
    selectedLLMs: Array<{ provider: string; model: string }>
    selectedAgents: AgentConfig[]
    rounds: number
    responseMode: 'concise' | 'normal' | 'detailed'
    autoRound2: boolean
    disagreementThreshold: number
    enableWebSearch: boolean
    userTier: string
    includeComparison: boolean
    comparisonModel: ModelConfig | null
    includeConsensusComparison: boolean
    modelConfigs: ModelConfig[]
  }) => {
    const {
      continueRound2 = false,
      followUpAnswers,
      round1Mode,
      selectedLLMs,
      selectedAgents,
      rounds,
      responseMode,
      autoRound2,
      disagreementThreshold,
      enableWebSearch,
      userTier,
      includeComparison,
      comparisonModel,
      includeConsensusComparison,
      modelConfigs,
    } = params

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
    isLoadingRef.current = true
    setError(null)
    setStreamingUpdates([])
    setMemoryStatus({ isSearching: false, isStoring: false })
    setCurrentPhase('Connecting...')

    if (!continueRound2) {
      setDebateSession(null)
      setActiveTab('debate')

      // Initialize model statuses
      const statuses: Record<string, ModelStatus> = {}
      if (round1Mode === 'llm') {
        selectedLLMs.forEach((llm, idx) => {
          const modelId = `${llm.provider}-${llm.model}-${idx}`
          statuses[modelId] = {
            status: 'waiting',
            message: 'Waiting to start...',
            model: llm.model,
            provider: llm.provider
          }
        })
      } else {
        selectedAgents.forEach((agent) => {
          statuses[agent.agentId] = {
            status: 'waiting',
            message: 'Waiting to start...',
            model: agent.model,
            provider: agent.provider
          }
        })
      }
      setModelStatuses(statuses)
      setDebateStartTime(Date.now())

      // Initialize flowchart steps
      const agentSteps = round1Mode === 'agents'
        ? selectedAgents.map(agent => ({
            id: agent.persona?.role || agent.agentId,
            label: agent.persona?.name || agent.model,
            model: agent.model,
            provider: agent.provider
          }))
        : selectedLLMs.map((llm, idx) => ({
            id: `model-${idx}`,
            label: `Model ${idx + 1}`,
            model: llm.model,
            provider: llm.provider
          }))
      const initialSteps = createDebateSteps(enableWebSearch, agentSteps)
      setFlowchartSteps(initialSteps)
      setFlowchartStartTime(Date.now())

      // Timeout to check if ANY model started (connection check)
      setTimeout(() => {
        setModelStatuses(prev => {
          const anyStarted = Object.values(prev).some(
            status => status.status === 'thinking' || status.status === 'completed'
          )
          if (!anyStarted) {
            const updated = { ...prev }
            Object.keys(updated).forEach(key => {
              if (updated[key].status === 'waiting') {
                updated[key] = {
                  ...updated[key],
                  status: 'error',
                  message: 'Failed to connect - check API connection'
                }
              }
            })
            return updated
          }
          return prev
        })
      }, 15000)
      setIsSynthesizing(false)
    }

    // Generate the full query
    const fullQuery = followUpAnswers
      ? `Original question: ${query}\n\n` +
        `Previous conclusion: ${debateSession?.finalSynthesis?.content || 'Analysis in progress...'}\n\n` +
        `Follow-up context:\n${Object.entries(followUpAnswers)
          .filter(([, answer]) => answer && answer.trim())
          .map(([key, answer]) => {
            if (key === 'custom') {
              return `Additional request: ${answer}`
            }
            const questionIndex = parseInt(key)
            if (!isNaN(questionIndex)) {
              const question = debateSession?.informationRequest?.followUpQuestions?.[questionIndex]
              return question ? `Q: ${question}\nA: ${answer}` : `Answer ${questionIndex + 1}: ${answer}`
            }
            return `${key}: ${answer}`
          }).join('\n')}\n\n` +
        `Please provide an updated analysis that builds upon the previous conclusion with this new information.`
      : query

    // Store the generated prompt for display only for follow-ups
    if (followUpAnswers && Object.keys(followUpAnswers).length > 0) {
      setGeneratedPrompt(fullQuery)
    } else {
      setGeneratedPrompt(null)
    }

    try {
      // Convert agents for API
      const apiAgents = round1Mode === 'llm' && !continueRound2
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
              traits: [] as string[],
              focusAreas: [] as string[],
              systemPrompt: '',
              color: '#3B82F6'
            }
          }))
        : selectedAgents

      // Use fetch with SSE
      const response = await fetch('/api/agents/debate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: fullQuery,
          agents: apiAgents,
          rounds: continueRound2 ? 2 : rounds,
          responseMode,
          round1Mode,
          autoRound2,
          disagreementThreshold,
          enableWebSearch,
          isGuestMode: userTier === 'guest',
          includeComparison: includeComparison && !continueRound2,
          comparisonModel: includeComparison && !continueRound2 && comparisonModel
            ? { provider: comparisonModel.provider, model: comparisonModel.model } : null,
          includeConsensusComparison: includeComparison && includeConsensusComparison && !continueRound2,
          consensusModels: includeComparison && includeConsensusComparison && !continueRound2
            ? (round1Mode === 'agents'
              ? selectedAgents.map(a => ({ provider: a.provider, model: a.model }))
              : modelConfigs.filter(m => m.enabled).map(m => ({ provider: m.provider, model: m.model }))
            ) : []
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Failed to start debate stream')
      }

      // Process SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const allResponses: any[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              setStreamingUpdates(prev => [...prev, data])

              switch (data.type) {
                case 'connected':
                  setCurrentPhase('Connected. Starting debate...')
                  break

                case 'round_started':
                  setCurrentPhase(`Round ${data.round} of ${data.totalRounds}`)
                  break

                case 'research_started':
                  setWebSearchStatus({
                    isSearching: true,
                    searchQuery: data.query,
                    provider: 'research'
                  })
                  setCurrentPhase('🔬 Conducting research to gather factual data...')
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'research', { status: 'active' }))
                  break

                case 'research_progress':
                  setCurrentPhase(data.status || data.message || 'Research in progress...')
                  break

                case 'research_complete':
                  setWebSearchStatus({
                    isSearching: false,
                    searchQuery: data.query,
                    provider: 'research',
                    resultsCount: data.sourcesFound,
                    sources: data.sources || []
                  })
                  setCurrentPhase(`✅ Research complete: ${data.sourcesFound} sources, ${data.evidenceQuality || 'good'} quality`)
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'research', {
                    status: 'complete',
                    duration: data.duration ? data.duration / 1000 : undefined,
                    preview: `Found ${data.sourcesFound} sources (${data.evidenceQuality || 'good'} quality)`
                  }))
                  break

                case 'search_capabilities':
                  setSearchCapabilities(data.agents || [])
                  setAllModelsHaveNativeSearch(data.duckDuckGoCount === 0)
                  setCurrentPhase(`🔍 Search analysis: ${data.nativeSearchCount} native, ${data.duckDuckGoCount} DuckDuckGo`)
                  break

                case 'pre_research_started':
                  setPreResearchStatus({ isSearching: true, forModels: data.forModels })
                  setCurrentPhase(`🦆 DuckDuckGo: Gathering evidence for ${data.forModels?.length || 0} model(s)...`)
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'research', {
                    status: 'active',
                    preview: `DuckDuckGo for ${data.forModels?.length || 0} models...`
                  }))
                  break

                case 'pre_research_skipped':
                  setPreResearchStatus({ isSearching: false })
                  setAllModelsHaveNativeSearch(true)
                  setCurrentPhase('✅ All models using native search')
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'research', {
                    status: 'complete',
                    preview: 'All models have native search'
                  }))
                  break

                case 'pre_research_completed':
                  setPreResearchStatus({
                    isSearching: false,
                    searchesExecuted: data.searchesExecuted,
                    sourcesFound: data.sourcesFound,
                    sources: data.sources,
                    cacheHit: data.cacheHit,
                    researchTime: data.researchTime,
                    queryType: data.queryType,
                    forModels: data.forModels,
                    searchResults: data.searchResults
                  })
                  setCurrentPhase(`📚 Pre-research complete: ${data.sourcesFound} sources found${data.cacheHit ? ' (cached)' : ''}`)
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'research', {
                    status: 'complete',
                    duration: data.researchTime ? data.researchTime / 1000 : undefined,
                    preview: `${data.sourcesFound} sources (${data.queryType || 'general'})`
                  }))
                  break

                case 'web_search_started':
                  setWebSearchStatus({
                    isSearching: true,
                    searchQuery: data.query,
                    provider: data.provider,
                    agent: data.agent,
                    role: data.role
                  })
                  if (data.agent && data.role) {
                    setAgentSearchHistory(prev => [
                      ...prev.filter(s => s.role !== data.role),
                      {
                        agent: data.agent,
                        role: data.role,
                        status: 'searching',
                        searchQuery: data.query,
                        provider: data.provider,
                        timestamp: Date.now()
                      }
                    ])
                  }
                  setCurrentPhase(`🔍 ${data.agent || 'Agent'} searching web...`)
                  if (data.role) {
                    setFlowchartSteps(prev => updateFlowchartStep(prev, data.role, {
                      status: 'active',
                      preview: 'Researching...'
                    }))
                  }
                  break

                case 'web_search_completed':
                  setWebSearchStatus({
                    isSearching: false,
                    searchQuery: data.query,
                    provider: data.provider,
                    resultsCount: data.resultsCount,
                    sources: data.sources,
                    agent: data.agent,
                    role: data.role
                  })
                  if (data.agent && data.role) {
                    setAgentSearchHistory(prev => prev.map(s =>
                      s.role === data.role
                        ? { ...s, status: 'completed' as const, resultsCount: data.resultsCount, sources: data.sources }
                        : s
                    ))
                  }
                  setCurrentPhase(`✅ ${data.agent || 'Agent'} found ${data.resultsCount || 0} sources`)
                  if (data.role) {
                    setFlowchartSteps(prev => updateFlowchartStep(prev, data.role, {
                      preview: `${data.resultsCount || 0} sources found`
                    }))
                  }
                  break

                case 'web_search_failed':
                  setWebSearchStatus({
                    isSearching: false,
                    searchQuery: data.query,
                    provider: data.provider,
                    error: data.reason
                  })
                  if (data.agent && data.role) {
                    setAgentSearchHistory(prev => prev.map(s =>
                      s.role === data.role
                        ? { ...s, status: 'error' as const, error: data.reason }
                        : s
                    ))
                  }
                  setCurrentPhase('Web search failed. Continuing with analysis...')
                  break

                case 'memory_search_started':
                  setMemoryStatus(prev => ({ ...prev, isSearching: true, stored: false }))
                  setCurrentPhase('🧠 Searching for relevant past experiences...')
                  break

                case 'memory_found':
                  setMemoryStatus(prev => ({
                    ...prev,
                    isSearching: false,
                    foundCount: data.count,
                    relevantMemories: data.memories
                  }))
                  setCurrentPhase(`🧠 Found ${data.count} relevant memories from past debates`)
                  break

                case 'memory_empty':
                  setMemoryStatus(prev => ({ ...prev, isSearching: false, foundCount: 0 }))
                  setCurrentPhase(`🧠 ${data.message || 'No past experiences found - this is a fresh discussion'}`)
                  break

                case 'memory_storage_started':
                  setMemoryStatus(prev => ({ ...prev, isStoring: true }))
                  break

                case 'memory_stored':
                  setMemoryStatus(prev => ({ ...prev, isStoring: false, stored: true }))
                  setCurrentPhase(`💾 ${data.message || 'Experience saved to memory for future debates'}`)
                  break

                case 'model_started':
                  setModelStatuses(prev => ({
                    ...prev,
                    [data.modelId]: {
                      ...prev[data.modelId],
                      status: 'thinking',
                      startTime: data.timestamp,
                      message: `${data.agentName || 'Agent'} analyzing query and formulating ${data.agentRole || 'response'}...`,
                      agentName: data.agentName,
                      agentRole: data.agentRole
                    }
                  }))
                  setCurrentPhase(`🔄 ${data.agentName || 'Agent'} (${data.agentRole || 'analyst'}) analyzing...`)
                  if (data.agentRole) {
                    setFlowchartSteps(prev => updateFlowchartStep(prev, data.agentRole, { status: 'active' }))
                  }
                  break

                case 'model_thinking':
                  setModelStatuses(prev => ({
                    ...prev,
                    [data.modelId]: {
                      ...prev[data.modelId],
                      message: `${prev[data.modelId]?.agentName || 'Agent'} formulating detailed response...`,
                      promptPreview: data.promptPreview
                    }
                  }))
                  break

                case 'model_completed':
                  setModelStatuses(prev => ({
                    ...prev,
                    [data.modelId]: {
                      ...prev[data.modelId],
                      status: 'completed',
                      endTime: data.timestamp,
                      duration: data.duration,
                      responsePreview: data.responsePreview,
                      keyPoints: data.keyPoints,
                      tokensUsed: data.tokensUsed,
                      message: `Completed in ${(data.duration / 1000).toFixed(1)}s`
                    }
                  }))
                  if (data.agentRole) {
                    setFlowchartSteps(prev => updateFlowchartStep(prev, data.agentRole, {
                      status: 'complete',
                      duration: data.duration / 1000,
                      preview: data.responsePreview?.substring(0, 150)
                    }))
                  }
                  setCurrentPhase(`✅ ${data.agentName || 'Agent'} (${data.agentRole || 'analyst'}) completed in ${(data.duration / 1000).toFixed(1)}s`)
                  allResponses.push({
                    ...data,
                    agentName: data.agentName,
                    agentRole: data.agentRole,
                    searchQueries: data.searchQueries || [],
                    searchRationale: data.searchRationale || null
                  })

                  // Check if all agents completed -> start post-processing
                  setModelStatuses(currentStatuses => {
                    const updated = {
                      ...currentStatuses,
                      [data.modelId]: {
                        ...currentStatuses[data.modelId],
                        status: 'completed' as const,
                        endTime: data.timestamp,
                        duration: data.duration,
                        responsePreview: data.responsePreview,
                        keyPoints: data.keyPoints,
                        tokensUsed: data.tokensUsed,
                        message: `Completed in ${(data.duration / 1000).toFixed(1)}s`
                      }
                    }

                    const allCompleted = Object.values(updated).every((s: any) =>
                      s.status === 'completed' || s.status === 'error'
                    )

                    if (allCompleted && includeComparison) {
                      initializePostAgentSteps()
                      updateStepStatus('collection', 'completed')
                      updateStepStatus('comparison', 'in_progress')
                    } else if (allCompleted) {
                      const synthesisSteps: PostAgentStep[] = [
                        { step: 'collection', status: 'completed', description: 'Agent responses collected' },
                        { step: 'synthesis', status: 'in_progress', description: 'Synthesizing agent consensus' },
                        { step: 'validation', status: 'pending', description: 'Validating conclusions' },
                        { step: 'formatting', status: 'pending', description: 'Formatting final response' }
                      ]
                      setPostAgentSteps(synthesisSteps)
                    }

                    return updated
                  })
                  break

                case 'model_error':
                  setModelStatuses(prev => ({
                    ...prev,
                    [data.modelId]: {
                      ...prev[data.modelId],
                      status: 'error',
                      message: data.error
                    }
                  }))
                  break

                case 'consensus_comparison_completed':
                  if (data.consensus) {
                    window.tempConsensusData = data.consensus
                  }
                  updateStepStatus('comparison', 'completed')
                  updateStepStatus('analysis', 'completed')
                  updateStepStatus('consensus', 'completed')
                  updateStepStatus('synthesis', 'in_progress')
                  break

                case 'synthesis_started':
                  setIsSynthesizing(true)
                  setCurrentPhase('Synthesizing unified response from agent debate...')
                  updateStepStatus('synthesis', 'in_progress')
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'synthesis', { status: 'active' }))
                  break

                case 'synthesis_completed': {
                  setCurrentPhase('Debate analysis complete - presenting unified conclusions')
                  updateStepStatus('synthesis', 'completed')
                  updateStepStatus('validation', 'completed')
                  updateStepStatus('formatting', 'completed')
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'synthesis', {
                    status: 'complete',
                    preview: data.synthesis?.conclusion?.substring(0, 150)
                  }))

                  const consensusComparisonData = data.consensusComparison || window.tempConsensusData || null
                  const debateStartTimeVal = debateStartTime || Date.now()

                  const session = {
                    id: crypto.randomUUID(),
                    query: fullQuery,
                    agents: apiAgents.map(a => a.persona),
                    comparisonResponse: data.comparisonResponse || null,
                    consensusComparison: consensusComparisonData,
                    rounds: (() => {
                      const roundGroups: { [key: number]: any[] } = {}
                      allResponses.forEach(r => {
                        const roundNum = r.round || 1
                        if (!roundGroups[roundNum]) roundGroups[roundNum] = []
                        roundGroups[roundNum].push(r)
                      })

                      return Object.keys(roundGroups).map(roundNum => ({
                        roundNumber: parseInt(roundNum),
                        startTime: new Date(debateStartTimeVal),
                        endTime: new Date(),
                        messages: roundGroups[parseInt(roundNum)].map(r => {
                          const agent = apiAgents.find(a => a.agentId === r.modelId)
                          const role = r.agentRole || agent?.persona?.role || 'analyst'

                          return {
                            agentId: r.modelId,
                            role: role,
                            agentName: r.agentName || agent?.persona?.name,
                            round: parseInt(roundNum),
                            content: r.fullResponse || r.responsePreview || '',
                            timestamp: new Date(r.timestamp),
                            tokensUsed: r.tokensUsed,
                            model: r.modelName,
                            keyPoints: [],
                            evidence: [],
                            challenges: [],
                            searchQueries: r.searchQueries || [],
                            searchRationale: r.searchRationale || null
                          }
                        })
                      })).sort((a, b) => a.roundNumber - b.roundNumber)
                    })(),
                    finalSynthesis: {
                      content: data.synthesis?.content || data.synthesis?.conclusion || 'Synthesis completed',
                      tokensUsed: data.synthesis?.tokensUsed || 0,
                      agreements: data.synthesis?.agreements || [],
                      disagreements: data.synthesis?.disagreements || [],
                      conclusion: data.synthesis?.conclusion || data.synthesis?.content || '',
                      rawResponse: data.synthesis?.rawResponse || data.synthesis?.content || '',
                      confidence: data.synthesis?.confidence || 0
                    },
                    startTime: new Date(debateStartTimeVal),
                    endTime: new Date(),
                    totalTokensUsed: allResponses.reduce((sum, r) => sum + r.tokensUsed, 0) + (data.synthesis?.tokensUsed || 0),
                    estimatedCost: 0,
                    disagreementScore: data.synthesis?.disagreementScore || data.disagreementScore || 0,
                    status: 'completed' as const,
                    informationRequest: data.synthesis?.informationRequest || {
                      detected: false,
                      followUpQuestions: []
                    }
                  }
                  setDebateSession(session as unknown as DebateSession)

                  // Save conversation
                  try {
                    const saveResponse = await fetch('/api/conversations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        query: fullQuery,
                        responses: session,
                        isGuestMode: userTier === 'guest',
                      }),
                    })

                    if (saveResponse.ok) {
                      const conversation = await saveResponse.json()
                      setConversationId(conversation.id)
                      saveConversation(conversation.id)
                    }
                  } catch {
                    toast({
                      variant: "default",
                      title: "Save Warning",
                      description: "Failed to save debate conversation. Results will be shown but not stored.",
                    })
                  }
                  break
                }

                case 'debate_completed':
                  setIsLoading(false)
                  isLoadingRef.current = false
                  setGeneratedPrompt(null)
                  break

                case 'error':
                  setError(data.message || 'An error occurred')
                  setIsLoading(false)
                  isLoadingRef.current = false
                  setModelStatuses(prev => {
                    const updated = { ...prev }
                    Object.keys(updated).forEach(key => {
                      if (updated[key].status === 'waiting' || updated[key].status === 'thinking') {
                        updated[key] = {
                          ...updated[key],
                          status: 'error',
                          message: data.message || 'Failed to process'
                        }
                      }
                    })
                    return updated
                  })
                  break
              }
            } catch {
              // Silent fail for SSE parsing errors
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
      isLoadingRef.current = false
      setGeneratedPrompt(null)
    }
  }, [query, debateSession, setDebateSession, setConversationId, setActiveTab, setError, saveConversation, toast, debateStartTime, initializePostAgentSteps, updateStepStatus])

  // ── Fallback to regular (non-streaming) debate ────────────

  const startDebate = useCallback(async (params: {
    continueRound2?: boolean
    followUpAnswers?: Record<number, string>
    round1Mode: 'llm' | 'agents'
    selectedLLMs: Array<{ provider: string; model: string }>
    selectedAgents: AgentConfig[]
    rounds: number
    responseMode: 'concise' | 'normal' | 'detailed'
    autoRound2: boolean
    disagreementThreshold: number
    userTier: string
    includeComparison: boolean
    comparisonModel: ModelConfig | null
    includeConsensusComparison: boolean
    modelConfigs: ModelConfig[]
    setShowRound2Prompt: (v: boolean) => void
  }) => {
    const {
      continueRound2 = false,
      followUpAnswers,
      round1Mode,
      selectedLLMs,
      selectedAgents,
      rounds,
      responseMode,
      autoRound2,
      disagreementThreshold,
      userTier,
      includeComparison,
      comparisonModel,
      includeConsensusComparison,
      modelConfigs,
      setShowRound2Prompt,
    } = params

    if (!continueRound2 && !query.trim()) {
      setError('Please enter a query')
      return
    }

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
    isLoadingRef.current = true
    setError(null)
    if (!continueRound2) {
      setDebateSession(null)
      setActiveTab('debate')

      const statuses: Record<string, any> = {}
      if (round1Mode === 'llm') {
        selectedLLMs.forEach((llm, idx) => {
          const modelId = `${llm.provider}-${llm.model}-${idx}`
          statuses[modelId] = {
            status: 'thinking',
            startTime: Date.now(),
            message: `${llm.model} analyzing query and preparing response...`
          }
        })
      } else {
        selectedAgents.forEach((agent) => {
          statuses[agent.agentId] = {
            status: 'thinking',
            startTime: Date.now(),
            message: `${agent.persona?.name || 'Agent'} preparing ${agent.persona?.role || 'analysis'}...`,
            agentName: agent.persona?.name,
            agentRole: agent.persona?.role
          }
        })
      }
      setModelStatuses(statuses)
      setDebateStartTime(Date.now())
    }

    const fullQuery = followUpAnswers
      ? `Original question: ${query}\n\n` +
        `Previous conclusion: ${debateSession?.finalSynthesis?.content || 'Analysis in progress...'}\n\n` +
        `Follow-up context:\n${Object.entries(followUpAnswers)
          .filter(([, answer]) => answer && answer.trim())
          .map(([key, answer]) => {
            if (key === 'custom') return `Additional request: ${answer}`
            const questionIndex = parseInt(key)
            if (!isNaN(questionIndex)) {
              const question = debateSession?.informationRequest?.followUpQuestions?.[questionIndex]
              return question ? `Q: ${question}\nA: ${answer}` : `Answer ${questionIndex + 1}: ${answer}`
            }
            return `${key}: ${answer}`
          }).join('\n')}\n\n` +
        `Please provide an updated analysis that builds upon the previous conclusion with this new information.`
      : query

    if (followUpAnswers && Object.keys(followUpAnswers).length > 0) {
      setGeneratedPrompt(fullQuery)
    } else {
      setGeneratedPrompt(null)
    }

    try {
      const response = await fetch('/api/agents/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: fullQuery,
          agents: round1Mode === 'llm' && !continueRound2
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
            : selectedAgents,
          rounds: continueRound2 ? 2 : rounds,
          responseMode,
          round1Mode,
          autoRound2,
          disagreementThreshold,
          isGuestMode: userTier === 'guest',
          continueSession: continueRound2 || followUpAnswers ? debateSession?.id : undefined,
          isFollowUp: !!followUpAnswers,
          includeComparison: includeComparison && !continueRound2,
          comparisonModel: includeComparison && !continueRound2 && comparisonModel
            ? { provider: comparisonModel.provider, model: comparisonModel.model } : undefined,
          includeConsensusComparison: includeComparison && includeConsensusComparison && !continueRound2,
          consensusModels: includeComparison && includeConsensusComparison && !continueRound2
            ? modelConfigs.filter(m => m.enabled).map(m => ({ provider: m.provider, model: m.model })) : undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start debate')
      }

      const data = await response.json()

      if (data.success && data.session) {
        setDebateSession(data.session)

        try {
          const saveResponse = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: fullQuery,
              responses: data.session,
              isGuestMode: userTier === 'guest',
            }),
          })

          if (saveResponse.ok) {
            const conversation = await saveResponse.json()
            setConversationId(conversation.id)
            saveConversation(conversation.id)
          }
        } catch {
          toast({
            variant: "default",
            title: "Save Warning",
            description: "Failed to save debate conversation. Results will be shown but not stored.",
          })
        }

        const completedStatuses: Record<string, any> = {}
        Object.keys(modelStatuses).forEach(modelId => {
          completedStatuses[modelId] = {
            ...modelStatuses[modelId],
            status: 'completed',
            endTime: Date.now(),
            message: 'Completed'
          }
        })
        setModelStatuses(completedStatuses)

        if (!continueRound2 && data.session.rounds.length === 1 &&
            data.session.disagreementScore > disagreementThreshold &&
            !autoRound2) {
          setShowRound2Prompt(true)
        }
      } else {
        throw new Error(data.error || 'Debate failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      setGeneratedPrompt(null)
    }
  }, [query, debateSession, setDebateSession, setConversationId, setActiveTab, setError, saveConversation, toast, modelStatuses])

  // ── Reset streaming state ─────────────────────────────────

  const resetStreamingState = useCallback(() => {
    setWebSearchStatus({ isSearching: false })
    setAgentSearchHistory([])
    setMemoryStatus({ isSearching: false, isStoring: false })
  }, [])

  return {
    // Loading
    isLoading,

    // Streaming
    streamingUpdates,
    currentPhase,

    // Web search
    webSearchStatus,
    agentSearchHistory,

    // Memory
    memoryStatus,

    // Pre-research
    preResearchStatus,

    // Search capabilities
    searchCapabilities,
    allModelsHaveNativeSearch,

    // Model statuses
    modelStatuses,
    debateStartTime,

    // Synthesis
    isSynthesizing,
    generatedPrompt,

    // Post-agent steps
    postAgentSteps,

    // Flowchart
    flowchartSteps,
    flowchartStartTime,

    // Actions
    startDebateWithStreaming,
    startDebate,
    resetStreamingState,
  }
}
