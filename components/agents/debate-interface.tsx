'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AgentSelector } from './agent-selector'
import { LLMPillSelector } from './llm-pill-selector'
import { ModelSelector } from '@/components/consensus/model-selector'
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
import { ModelConfig } from '@/types/consensus'
import { estimateDebateCost, formatCost, calculateDisagreementScore } from '@/lib/agents/cost-calculator'
import { useToast } from '@/hooks/use-toast'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { ConversationHistoryDropdown } from '@/components/conversation/conversation-history-dropdown'
import { ShareButtons } from '@/components/conversation/share-buttons'
import { SavedConversation } from '@/lib/types/conversation'
import { Send, Loader2, Settings, Users, MessageSquare, DollarSign, AlertTriangle, Zap, Brain, GitCompare, Globe, Sparkles, Gift, HelpCircle } from 'lucide-react'
import { DebateFlowchart, createDebateSteps, updateStepStatus as updateFlowchartStep, DebateStepProgress, PreDebateQuestions } from '@/components/debate'
import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AgentDebateInterfaceProps {
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
}

// Agent Debate Presets - Pre-selected models for each role
const AGENT_PRESETS = {
  free: {
    label: 'Free',
    icon: Gift,
    description: 'All free models',
    color: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    roles: {
      'analyst-001': { provider: 'groq', model: 'llama-3.1-8b-instant' },       // Fast analyst
      'critic-001': { provider: 'google', model: 'gemini-2.0-flash-lite' },      // Different provider
      'synthesizer-001': { provider: 'groq', model: 'llama-3.3-70b-versatile' }  // Best free model
    }
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    description: 'Balanced tier models',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    roles: {
      'analyst-001': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },  // Strong analysis
      'critic-001': { provider: 'openai', model: 'gpt-4o' },                           // Critical thinking
      'synthesizer-001': { provider: 'groq', model: 'llama-3.3-70b-versatile' }       // Good synthesis
    }
  },
  max: {
    label: 'Max',
    icon: Sparkles,
    description: 'Best flagship models',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    roles: {
      'analyst-001': { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },  // Flagship analysis
      'critic-001': { provider: 'openai', model: 'gpt-5-chat-latest' },               // Flagship reasoning
      'synthesizer-001': { provider: 'google', model: 'gemini-2.5-pro' }              // Comprehensive synthesis
    }
  }
} as const

export function AgentDebateInterface({ userTier }: AgentDebateInterfaceProps) {
  const { toast } = useToast()
  const { globalTier } = useGlobalModelTier()
  const [query, setQuery] = useState('What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<AgentConfig[]>([])
  // For ModelSelector compatibility
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([
    { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
    { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
    { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true }
  ])
  
  // Derive selectedLLMs from modelConfigs for the debate API
  const selectedLLMs = useMemo(() => 
    modelConfigs
      .filter(config => config.enabled)
      .map(config => ({
        provider: config.provider,
        model: config.model
      })), [modelConfigs])
  
  // Memoize the model config handler to prevent re-renders
  const handleModelConfigChange = useCallback((newConfigs: ModelConfig[]) => {
    setModelConfigs(newConfigs)
  }, [])
  const [selectedLLMsRound2, setSelectedLLMsRound2] = useState<Array<{ provider: string; model: string }>>([])
  const [rounds, setRounds] = useState(DEBATE_CONFIG.defaultRounds)
  const [isLoading, setIsLoading] = useState(false)
  const [debateSession, setDebateSession] = useState<DebateSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<{ provider: string; models: string[] }[]>([])
  const [includeComparison, setIncludeComparison] = useState(true)
  const [comparisonModel, setComparisonModel] = useState<ModelConfig | null>({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    enabled: true
  })
  const [includeConsensusComparison, setIncludeConsensusComparison] = useState(true)
  const [comparisonSelectorKey, setComparisonSelectorKey] = useState(0)
  const [activeTab, setActiveTab] = useState('setup')
  
  // New state for enhanced options
  const [round1Mode, setRound1Mode] = useState<'llm' | 'agents'>('agents')
  const [autoRound2, setAutoRound2] = useState(false)
  const [disagreementThreshold, setDisagreementThreshold] = useState(0.3)
  const [responseMode, setResponseMode] = useState<'concise' | 'normal' | 'detailed'>('concise')
  const [enableWebSearch, setEnableWebSearch] = useState(true) // Default ON - research always happens
  const [costEstimate, setCostEstimate] = useState<any>(null)
  const [showRound2Prompt, setShowRound2Prompt] = useState(false)
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)
  
  // Web search tracking (per-agent) - single status for current search
  const [webSearchStatus, setWebSearchStatus] = useState<{
    isSearching: boolean;
    searchQuery?: string;
    provider?: string;
    resultsCount?: number;
    sources?: string[];
    error?: string;
    agent?: string;  // Which agent is searching
    role?: string;   // Agent role (analyst, critic, etc.)
  }>({ isSearching: false })

  // Accumulated agent search history - shows ALL agent searches
  const [agentSearchHistory, setAgentSearchHistory] = useState<Array<{
    agent: string;
    role: string;
    status: 'searching' | 'completed' | 'error';
    searchQuery?: string;
    provider?: string;
    resultsCount?: number;
    sources?: string[];
    error?: string;
    timestamp: number;
  }>>([])
  
  // Memory system tracking
  const [memoryStatus, setMemoryStatus] = useState<{
    isSearching: boolean;
    foundCount?: number;
    relevantMemories?: any[];
    isStoring: boolean;
    stored?: boolean;
  }>({ isSearching: false, isStoring: false })
  
  // Model status tracking
  const [modelStatuses, setModelStatuses] = useState<Record<string, {
    status: 'waiting' | 'thinking' | 'completed' | 'error',
    startTime?: number,
    endTime?: number,
    message?: string,
    duration?: number,
    responsePreview?: string,
    keyPoints?: string,
    tokensUsed?: number,
    model?: string,
    provider?: string,
    agentName?: string,
    agentRole?: string,
    hasReceivedResponse?: boolean
  }>>({})
  const [debateStartTime, setDebateStartTime] = useState<number | null>(null)

  // Conversation persistence: restore results on page refresh/URL sharing
  const { saveConversation, isRestoring } = useConversationPersistence({
    storageKey: 'agent-debate-last-conversation',
    onRestored: (conversation: SavedConversation) => {
      // Restore the full conversation state
      setQuery(conversation.query)
      setDebateSession(conversation.responses as DebateSession)
      setConversationId(conversation.id)
      setActiveTab('results')

      toast({
        title: 'Conversation Restored',
        description: 'Your previous agent debate has been restored.',
      })
    },
    onError: (error: Error) => {
      console.error('Failed to restore conversation:', error)
      // Silent fail - user can just start a new debate
    },
  })

  // Use ref to track loading state for setTimeout callbacks
  const isLoadingRef = useRef(false)
  
  // State to track synthesis phase
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  // State to store the generated prompt for display
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  
  // Detailed post-agent step tracking
  const [postAgentSteps, setPostAgentSteps] = useState<Array<{
    step: string;
    status: 'pending' | 'in_progress' | 'completed';
    startTime?: number;
    endTime?: number;
    description: string;
  }>>([])

  // Visual flowchart tracking
  const [flowchartSteps, setFlowchartSteps] = useState<DebateStepProgress[]>([])
  const [flowchartStartTime, setFlowchartStartTime] = useState<number | null>(null)

  // Pre-debate clarifying questions
  const [enablePreDebateQuestions, setEnablePreDebateQuestions] = useState(true)
  const [showPreDebateQuestions, setShowPreDebateQuestions] = useState(false)
  const [preDebateAnswers, setPreDebateAnswers] = useState<Record<number, string>>({})

  // Auto-apply global tier changes to agent roles
  useEffect(() => {
    const preset = AGENT_PRESETS[globalTier]
    if (preset) {
      const roles = preset.roles
      // Update model configs to match preset roles
      setModelConfigs([
        { provider: roles['analyst-001'].provider as any, model: roles['analyst-001'].model, enabled: true },
        { provider: roles['critic-001'].provider as any, model: roles['critic-001'].model, enabled: true },
        { provider: roles['synthesizer-001'].provider as any, model: roles['synthesizer-001'].model, enabled: true }
      ])
    }
  }, [globalTier])

  // Initialize post-agent steps when agents complete
  const initializePostAgentSteps = () => {
    const steps = [
      { step: 'collection', status: 'pending' as const, description: 'Collecting agent responses' },
      { step: 'comparison', status: 'pending' as const, description: 'Comparing with single model baseline' },
      { step: 'analysis', status: 'pending' as const, description: 'Analyzing response differences' },
      { step: 'consensus', status: 'pending' as const, description: 'Building consensus framework' },
      { step: 'synthesis', status: 'pending' as const, description: 'Synthesizing unified response' },
      { step: 'validation', status: 'pending' as const, description: 'Validating final conclusions' },
      { step: 'formatting', status: 'pending' as const, description: 'Formatting structured output' }
    ]
    setPostAgentSteps(steps)
  }
  
  // Update step status
  const updateStepStatus = (stepName: string, status: 'pending' | 'in_progress' | 'completed') => {
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
  }
  
  // Timer for updating elapsed time and phase detection
  useEffect(() => {
    if (!isLoading || !debateStartTime) {
      setIsSynthesizing(false)
      return
    }
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - debateStartTime) / 1000
      // Detect synthesis phase after 5 seconds
      if (elapsed > 5 && !isSynthesizing) {
        setIsSynthesizing(true)
      }
      // Force re-render to update timers
      setModelStatuses(prev => ({...prev}))
    }, 100) // Update every 100ms for smooth timer
    
    return () => clearInterval(interval)
  }, [isLoading, debateStartTime, isSynthesizing])
  
  // Update ref when isLoading changes
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])
  
  // Memoize radio handlers to prevent re-render loops
  const handleRound1ModeChange = useCallback((v: string) => {
    setRound1Mode(v as 'llm' | 'agents')
  }, [])
  
  const handleResponseModeChange = useCallback((v: string) => {
    setResponseMode(v as 'concise' | 'normal' | 'detailed')
  }, [])

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
          provider: llm.provider as '' | 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'perplexity' | 'mistral' | 'cohere',
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

  const handleGenerateQuestion = async () => {
    if (isGeneratingQuestion) return

    setIsGeneratingQuestion(true)
    try {
      const response = await fetch('/api/question-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: 'high',
          useAI: userTier === 'pro' || userTier === 'enterprise',
          avoidRecent: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate question')
      }

      const data = await response.json()
      if (data.success && data.question) {
        setQuery(data.question.question)
        // You could add a toast notification here if the useToast hook is available
      } else {
        throw new Error(data.message || 'No question generated')
      }
    } catch (error) {
      console.error('Question generation error:', error)
      // Handle error - could show a toast or set an error state
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  // Add state for tracking streaming updates
  const [streamingUpdates, setStreamingUpdates] = useState<any[]>([])
  const [currentPhase, setCurrentPhase] = useState<string>('')
  
  const startDebateWithStreaming = async (continueRound2 = false, followUpAnswers?: Record<number, string>) => {
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
      const statuses: Record<string, {
        status: 'waiting' | 'thinking' | 'completed' | 'error',
        message?: string,
        model?: string,
        provider?: string,
        responsePreview?: string,
        keyPoints?: string,
        duration?: number,
        startTime?: number,
        endTime?: number
      }> = {}
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

      // Initialize flowchart steps based on mode
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

      // Set a timeout to check if ANY model started (connection check)
      // Only show error if NO models have started after 15 seconds (true connection issue)
      // Don't mark individual models as error since they run sequentially
      setTimeout(() => {
        setModelStatuses(prev => {
          // Check if at least one model has started or completed
          const anyStarted = Object.values(prev).some(
            status => status.status === 'thinking' || status.status === 'completed'
          )
          // Only mark as error if nothing has started at all (connection issue)
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
      }, 15000) // 15 second timeout for connection check only
      setIsSynthesizing(false)
    }
    setShowRound2Prompt(false)

    // Generate the full query
    const fullQuery = followUpAnswers ? 
      `Original question: ${query}\n\n` +
      `Previous conclusion: ${debateSession?.finalSynthesis?.content || 'Analysis in progress...'}\n\n` +
      `Follow-up context:\n${Object.entries(followUpAnswers)
        .filter(([key, answer]) => answer && answer.trim())
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
      const apiAgents = round1Mode === 'llm' && !continueRound2 ? 
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
        })) : selectedAgents

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
          comparisonModel: includeComparison && !continueRound2 && comparisonModel ? 
            { provider: comparisonModel.provider, model: comparisonModel.model } : null,
          includeConsensusComparison: includeComparison && includeConsensusComparison && !continueRound2,
          consensusModels: includeComparison && includeConsensusComparison && !continueRound2 ? 
            (round1Mode === 'agents' 
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
      let allResponses: any[] = []
      
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
              
              // Update streaming updates list
              setStreamingUpdates(prev => [...prev, data])
              
              switch (data.type) {
                case 'connected':
                  setCurrentPhase('Connected. Starting debate...')
                  break
                  
                case 'round_started':
                  setCurrentPhase(`Round ${data.round} of ${data.totalRounds}`)
                  break

                // Centralized research phase events (before agents run)
                case 'research_started':
                  setWebSearchStatus({
                    isSearching: true,
                    searchQuery: data.query,
                    provider: 'research'
                  })
                  setCurrentPhase('🔬 Conducting research to gather factual data...')
                  // Update flowchart - research step active
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
                    sources: data.sources || [] // Include source URLs from backend
                  })
                  setCurrentPhase(`✅ Research complete: ${data.sourcesFound} sources, ${data.evidenceQuality || 'good'} quality`)
                  // Update flowchart - research step complete
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'research', {
                    status: 'complete',
                    duration: data.duration ? data.duration / 1000 : undefined,
                    preview: `Found ${data.sourcesFound} sources (${data.evidenceQuality || 'good'} quality)`
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
                  // Add to agent search history
                  if (data.agent && data.role) {
                    setAgentSearchHistory(prev => [
                      ...prev.filter(s => s.role !== data.role), // Remove any existing entry for this role
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
                  // Show which agent is researching
                  const agentSearchingName = data.agent || 'Agent'
                  setCurrentPhase(`🔍 ${agentSearchingName} searching web...`)
                  // Update flowchart - mark agent as researching
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
                  // Update agent search history - mark as completed
                  if (data.agent && data.role) {
                    setAgentSearchHistory(prev => prev.map(s =>
                      s.role === data.role
                        ? { ...s, status: 'completed' as const, resultsCount: data.resultsCount, sources: data.sources }
                        : s
                    ))
                  }
                  // Show which agent completed research
                  const agentCompletedName = data.agent || 'Agent'
                  setCurrentPhase(`✅ ${agentCompletedName} found ${data.resultsCount || 0} sources`)
                  // Update flowchart - mark agent research complete
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
                  // Update agent search history - mark as error
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
                  setMemoryStatus(prev => ({
                    ...prev,
                    isSearching: true,
                    stored: false
                  }))
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
                  setMemoryStatus(prev => ({
                    ...prev,
                    isSearching: false,
                    foundCount: 0
                  }))
                  setCurrentPhase(`🧠 ${data.message || 'No past experiences found - this is a fresh discussion'}`)
                  break
                  
                case 'memory_storage_started':
                  setMemoryStatus(prev => ({
                    ...prev,
                    isStoring: true
                  }))
                  break
                  
                case 'memory_stored':
                  setMemoryStatus(prev => ({
                    ...prev,
                    isStoring: false,
                    stored: true
                  }))
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
                  // Update verbal status to match flowchart
                  setCurrentPhase(`🔄 ${data.agentName || 'Agent'} (${data.agentRole || 'analyst'}) analyzing...`)
                  // Update flowchart - agent step active
                  if (data.agentRole) {
                    setFlowchartSteps(prev => updateFlowchartStep(prev, data.agentRole, { status: 'active' }))
                  }
                  break
                  
                case 'model_thinking':
                  setModelStatuses(prev => ({
                    ...prev,
                    [data.modelId]: {
                      ...prev[data.modelId],
                      message: `${prev[data.modelId].agentName || 'Agent'} formulating detailed response...`,
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
                  // Update flowchart - agent step complete
                  if (data.agentRole) {
                    setFlowchartSteps(prev => updateFlowchartStep(prev, data.agentRole, {
                      status: 'complete',
                      duration: data.duration / 1000,
                      preview: data.responsePreview?.substring(0, 150)
                    }))
                  }
                  // Update verbal status to match flowchart
                  setCurrentPhase(`✅ ${data.agentName || 'Agent'} (${data.agentRole || 'analyst'}) completed in ${(data.duration / 1000).toFixed(1)}s`)
                  // Include agent information and search data in the response
                  allResponses.push({
                    ...data,
                    agentName: data.agentName,
                    agentRole: data.agentRole,
                    searchQueries: data.searchQueries || [],
                    searchRationale: data.searchRationale || null
                  })
                  
                  // Check if all agents are completed to start post-processing
                  setModelStatuses(currentStatuses => {
                    const updated = {
                      ...currentStatuses,
                      [data.modelId]: {
                        ...currentStatuses[data.modelId],
                        status: 'completed',
                        endTime: data.timestamp,
                        duration: data.duration,
                        responsePreview: data.responsePreview,
                        keyPoints: data.keyPoints,
                        tokensUsed: data.tokensUsed,
                        message: `Completed in ${(data.duration / 1000).toFixed(1)}s`
                      }
                    }
                    
                    // Check if all models are completed
                    const allCompleted = Object.values(updated).every((status: any) => 
                      status.status === 'completed' || status.status === 'error'
                    )
                    
                    if (allCompleted && includeComparison) {
                      // Initialize post-agent steps when all agents complete
                      initializePostAgentSteps()
                      updateStepStatus('collection', 'completed')
                      updateStepStatus('comparison', 'in_progress')
                    } else if (allCompleted) {
                      // Even without comparison, show synthesis steps
                      const synthesisSteps = [
                        { step: 'collection', status: 'completed' as const, description: 'Agent responses collected' },
                        { step: 'synthesis', status: 'in_progress' as const, description: 'Synthesizing agent consensus' },
                        { step: 'validation', status: 'pending' as const, description: 'Validating conclusions' },
                        { step: 'formatting', status: 'pending' as const, description: 'Formatting final response' }
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
                  console.log('Consensus comparison completed:', JSON.stringify(data.consensus, null, 2))
                  // Store consensus comparison data temporarily
                  if (data.consensus) {
                    (window as any).tempConsensusData = data.consensus
                  }
                  // Update step tracking with more detailed progression
                  updateStepStatus('comparison', 'completed')
                  updateStepStatus('analysis', 'completed')
                  updateStepStatus('consensus', 'completed')
                  updateStepStatus('synthesis', 'in_progress')
                  break
                  
                case 'synthesis_started':
                  setIsSynthesizing(true)
                  setCurrentPhase('Synthesizing unified response from agent debate...')
                  updateStepStatus('synthesis', 'in_progress')
                  // Update flowchart - synthesis step active
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'synthesis', { status: 'active' }))
                  break

                case 'synthesis_completed':
                  setCurrentPhase('Debate analysis complete - presenting unified conclusions')
                  updateStepStatus('synthesis', 'completed')
                  updateStepStatus('validation', 'completed')
                  updateStepStatus('formatting', 'completed')
                  // Update flowchart - synthesis step complete
                  setFlowchartSteps(prev => updateFlowchartStep(prev, 'synthesis', {
                    status: 'complete',
                    preview: data.synthesis?.conclusion?.substring(0, 150)
                  }))
                  // Use stored consensus data if not in synthesis event
                  const consensusComparisonData = data.consensusComparison || (window as any).tempConsensusData || null
                  
                  console.log('Synthesis completed data:', {
                    hasComparison: !!data.comparisonResponse,
                    hasConsensus: !!consensusComparisonData,
                    consensusData: JSON.stringify(consensusComparisonData, null, 2),
                    tempConsensusData: JSON.stringify((window as any).tempConsensusData, null, 2)
                  })
                  // Create debate session from collected data
                  const session = {
                    id: crypto.randomUUID(),
                    query: fullQuery,
                    agents: apiAgents.map(a => a.persona),
                    comparisonResponse: data.comparisonResponse || null,
                    consensusComparison: consensusComparisonData,
                    rounds: (() => {
                      // Group responses by round number to create proper round objects
                      const roundGroups: { [key: number]: any[] } = {}
                      allResponses.forEach(r => {
                        const roundNum = r.round || 1
                        if (!roundGroups[roundNum]) roundGroups[roundNum] = []
                        roundGroups[roundNum].push(r)
                      })
                      
                      // Create round objects for each round that has messages
                      return Object.keys(roundGroups).map(roundNum => ({
                        roundNumber: parseInt(roundNum),
                        startTime: new Date(debateStartTime || Date.now()),
                        endTime: new Date(),
                        messages: roundGroups[parseInt(roundNum)].map(r => {
                          // Use agent information from the response or find from apiAgents
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
                      confidence: data.synthesis?.confidence || 0
                    },
                    startTime: new Date(debateStartTime || Date.now()),
                    endTime: new Date(),
                    totalTokensUsed: allResponses.reduce((sum, r) => sum + r.tokensUsed, 0) + (data.synthesis?.tokensUsed || 0),
                    estimatedCost: 0,
                    disagreementScore: data.synthesis?.disagreementScore || data.disagreementScore || 0,
                    // disagreementAnalysis: removed - using simple frontend indicators
                    status: 'completed' as const,
                    informationRequest: data.synthesis?.informationRequest || {
                      detected: false,
                      followUpQuestions: []
                    }
                  }
                  console.log('Setting debate session with consensusComparison:', {
                    hasConsensus: !!session.consensusComparison,
                    consensusData: session.consensusComparison,
                    // hasDisagreementAnalysis: removed - using simple frontend indicators
                    // disagreementAnalysis: removed - using simple frontend indicators
                  })
                  setDebateSession(session as any)

                  // Save conversation to database if user is authenticated
                  try {
                    const saveResponse = await fetch('/api/conversations', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        query: fullQuery,
                        responses: session,
                        isGuestMode: userTier === 'guest',
                      }),
                    })

                    if (saveResponse.ok) {
                      const conversation = await saveResponse.json()
                      setConversationId(conversation.id)

                      // Enable persistence: update URL and localStorage
                      saveConversation(conversation.id)

                      console.log('Debate conversation saved:', conversation.id)
                    }
                  } catch (saveError) {
                    console.error('Failed to save debate conversation:', saveError)
                    toast({
                      variant: "default",
                      title: "Save Warning",
                      description: "Failed to save debate conversation. Results will be shown but not stored.",
                    })
                  }
                  break
                  
                case 'debate_completed':
                  setIsLoading(false)
                  isLoadingRef.current = false
                  setGeneratedPrompt(null)
                  break
                  
                case 'error':
                  setError(data.message || 'An error occurred')
                  setIsLoading(false)
                  isLoadingRef.current = false
                  // Mark all waiting models as error
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
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (err) {
      console.error('Debate streaming error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
      isLoadingRef.current = false
      setGeneratedPrompt(null)
    }
  }
  
  // Fallback to regular debate if streaming fails
  const startDebate = async (continueRound2 = false, followUpAnswers?: Record<number, string>) => {
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
    if (!continueRound2) {
      setDebateSession(null)
      // Switch to debate tab immediately
      console.log('Switching to debate tab')
      setActiveTab('debate')
      
      // Initialize model statuses - all start as "thinking"
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

      // Non-streaming mode: No timeout needed since models start immediately as "thinking"
      // The API call will handle errors directly
    }
    setShowRound2Prompt(false)

    // Generate the full prompt
    const fullQuery = followUpAnswers ? 
      `Original question: ${query}\n\n` +
      `Previous conclusion: ${debateSession?.finalSynthesis?.content || 'Analysis in progress...'}\n\n` +
      `Follow-up context:\n${Object.entries(followUpAnswers)
        .filter(([key, answer]) => answer && answer.trim())
        .map(([key, answer]) => {
          if (key === 'custom') {
            return `Additional request: ${answer}`
          }
          const questionIndex = parseInt(key)
          if (!isNaN(questionIndex)) {
            // Include the actual follow-up question from the session if available
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
      const response = await fetch('/api/agents/debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: fullQuery,
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
          rounds: continueRound2 ? 2 : rounds,
          responseMode,
          round1Mode,
          autoRound2,
          disagreementThreshold,
          isGuestMode: userTier === 'guest',
          continueSession: continueRound2 || followUpAnswers ? debateSession?.id : undefined,
          isFollowUp: !!followUpAnswers,
          includeComparison: includeComparison && !continueRound2,
          comparisonModel: includeComparison && !continueRound2 && comparisonModel ? 
            { provider: comparisonModel.provider, model: comparisonModel.model } : undefined,
          includeConsensusComparison: includeComparison && includeConsensusComparison && !continueRound2,
          consensusModels: includeComparison && includeConsensusComparison && !continueRound2 ? 
            modelConfigs.filter(m => m.enabled).map(m => ({ provider: m.provider, model: m.model })) : undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start debate')
      }

      const data = await response.json()
      
      if (data.success && data.session) {
        setDebateSession(data.session)

        // Save conversation to database if user is authenticated
        try {
          const saveResponse = await fetch('/api/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: fullQuery,
              responses: data.session,
              isGuestMode: userTier === 'guest',
            }),
          })

          if (saveResponse.ok) {
            const conversation = await saveResponse.json()
            setConversationId(conversation.id)

            // Enable persistence: update URL and localStorage
            saveConversation(conversation.id)

            console.log('Debate conversation saved:', conversation.id)
          }
        } catch (saveError) {
          console.error('Failed to save debate conversation:', saveError)
          toast({
            variant: "default",
            title: "Save Warning",
            description: "Failed to save debate conversation. Results will be shown but not stored.",
          })
        }

        // Mark all models as completed
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
      isLoadingRef.current = false
      setGeneratedPrompt(null) // Clear prompt after completion
    }
  }

  const resetDebate = () => {
    setDebateSession(null)
    setActiveTab('setup')
    setError(null)
    setWebSearchStatus({ isSearching: false })
    setAgentSearchHistory([]) // Reset agent search history
    setMemoryStatus({ isSearching: false, isStoring: false })
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
          {/* Global Tier Indicator */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
            <div>
              <div className="text-sm font-medium">Global Model Tier</div>
              <div className="text-xs text-muted-foreground">
                Change tier using the selector in the header to update agent models
              </div>
            </div>
            {(() => {
              const preset = AGENT_PRESETS[globalTier]
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
                      onClick={handleGenerateQuestion}
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
                {/* Start Debate button right-aligned with the query */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      // If pre-debate questions enabled and not already showing, show them first
                      if (enablePreDebateQuestions && !showPreDebateQuestions) {
                        setShowPreDebateQuestions(true)
                      } else {
                        startDebateWithStreaming()
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
                      setPreDebateAnswers(answers)
                      setShowPreDebateQuestions(false)
                      // Start debate with answers included in context
                      const contextWithAnswers = Object.keys(answers).length > 0
                        ? `${query}\n\nAdditional context from user:\n${Object.entries(answers).map(([idx, answer]) => `- ${answer}`).join('\n')}`
                        : query
                      // Store original query and update with context
                      const originalQuery = query
                      setQuery(contextWithAnswers)
                      // Use setTimeout to ensure state update before starting
                      setTimeout(() => {
                        startDebateWithStreaming()
                        // Restore original query after starting
                        setQuery(originalQuery)
                      }, 100)
                    }}
                    onSkip={() => {
                      setShowPreDebateQuestions(false)
                      startDebateWithStreaming()
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
                      // Set default comparison model when enabled
                      if (checked && !comparisonModel) {
                        // Set Google Gemini 2.5 Flash as default
                        setComparisonModel({
                          provider: 'google',
                          model: 'gemini-2.5-flash',
                          enabled: true
                        })
                      } else if (!checked) {
                        // Clear comparison model when disabled
                        setComparisonModel(null)
                      }
                    }}
                  />
                </div>
                
                {includeComparison && (
                  <div className="pl-7 space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        Select model for comparison:
                      </Label>
                      <ModelSelector
                        models={comparisonModel ? [comparisonModel] : [{
                          provider: 'google',
                          model: 'gemini-2.5-flash',
                          enabled: false
                        }]}
                        onChange={(models) => {
                          // ModelSelector returns an array, we just need the first one
                          if (models.length > 0) {
                            const newModel = models[0]
                            setComparisonModel({
                              provider: newModel.provider,
                              model: newModel.model,
                              enabled: true
                            })
                          } else {
                            // If no models selected, but keep the default available
                            setComparisonModel(null)
                          }
                        }}
                        maxModels={1}
                        userTier={userTier}
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
                      🆓 FREE web search using DuckDuckGo! Enriches agent responses with real-time web information.
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

              {/* Round Selection Section - Prominent and Separated */}
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
                      💡 Manual control - exactly this many rounds will run
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-trigger Section - Separate and Less Prominent */}
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

          {/* Show LLM selector for LLM mode Round 1, Agent selector for agent mode */}
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
          
          {/* Round 2 Agent Selection - Always use agents for deeper debate */}
          {(autoRound2 || rounds > 1) && (
            <Card className="p-6 bg-black/40 border-zinc-800">
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Round 2: Agent Personas (if disagreement detected)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Agents will debate with specialized personas for deeper analysis
                </p>
                <AgentSelector
                  selectedAgents={selectedAgents}
                  onAgentsChange={setSelectedAgents}
                  availableModels={availableModels}
                  userTier={userTier}
                  globalTier={globalTier}
                />
              </div>
            </Card>
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
                    <h4 className="text-sm font-semibold mb-2 text-blue-400">📝 Enhanced Follow-Up Prompt:</h4>
                    <div className="text-xs text-foreground/80 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto bg-black/30 p-3 rounded">
                      {generatedPrompt}
                    </div>
                  </div>
                )}

                {/* Memory Status - Persistent Display */}
                {/* Memory UI disabled - on backlog */}
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
                          {memoryStatus.isSearching ? '🧠 Searching Memory...' :
                           memoryStatus.isStoring ? '💾 Storing Experience...' :
                           memoryStatus.stored ? '✅ Experience Saved' :
                           memoryStatus.foundCount !== undefined ? `🧠 Memory Retrieved (${memoryStatus.foundCount})` :
                           '🧠 Memory System Active'}
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

                {/* Per-Agent Web Search Status - Accumulated View */}
                {enableWebSearch && agentSearchHistory.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg border bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-600/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-5 w-5 text-blue-400" />
                      <h4 className="text-sm font-semibold">Agent Research Progress</h4>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {agentSearchHistory.filter(s => s.status === 'completed').length}/{agentSearchHistory.length} complete
                      </span>
                    </div>
                    <div className="space-y-2">
                      {agentSearchHistory.map((search, idx) => (
                        <div
                          key={`${search.role}-${idx}`}
                          className={`flex items-center gap-3 p-2 rounded-md transition-all ${
                            search.status === 'searching'
                              ? 'bg-blue-500/10 border border-blue-500/30'
                              : search.status === 'completed'
                                ? 'bg-green-500/10 border border-green-500/30'
                                : 'bg-red-500/10 border border-red-500/30'
                          }`}
                        >
                          {/* Status icon */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                            search.status === 'searching'
                              ? 'bg-blue-500/20 animate-pulse'
                              : search.status === 'completed'
                                ? 'bg-green-500/20'
                                : 'bg-red-500/20'
                          }`}>
                            {search.status === 'searching' ? '🔍' : search.status === 'completed' ? '✅' : '❌'}
                          </div>

                          {/* Agent info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{search.agent}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-muted-foreground">
                                {search.role}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {search.status === 'searching'
                                ? `Searching: "${search.searchQuery?.substring(0, 50)}${(search.searchQuery?.length || 0) > 50 ? '...' : ''}"`
                                : search.status === 'completed'
                                  ? `Found ${search.resultsCount || 0} sources via ${search.provider}`
                                  : `Error: ${search.error}`}
                            </p>
                          </div>

                          {/* Results count badge */}
                          {search.status === 'completed' && search.resultsCount !== undefined && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                              <span>{search.resultsCount}</span>
                              <span className="text-green-400/60">sources</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
                        <p className="text-green-400">● Phase 1: Agent debate in progress...</p>
                      )}
                      {/* Post-Agent Step Timeline */}
                      {postAgentSteps.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground">Post-Agent Processing:</p>
                          {postAgentSteps.map((step, idx) => {
                            const isActive = step.status === 'in_progress'
                            const isCompleted = step.status === 'completed'
                            const duration = step.startTime && step.endTime ? 
                              ((step.endTime - step.startTime) / 1000).toFixed(1) + 's' : 
                              step.startTime ? `${((Date.now() - step.startTime) / 1000).toFixed(1)}s` : ''
                            
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
                      {/* Enhanced fallback phases with timing details */}
                      {postAgentSteps.length === 0 && isSynthesizing && (
                        <>
                          {((Date.now() - debateStartTime) / 1000) <= 15 && (
                            <p className="text-blue-400">● Phase 2: Processing agent responses ({Math.floor((Date.now() - debateStartTime) / 1000)}s)</p>
                          )}
                          {((Date.now() - debateStartTime) / 1000) > 15 && ((Date.now() - debateStartTime) / 1000) <= 30 && (
                            <p className="text-yellow-400">● Phase 3: Building consensus framework ({Math.floor((Date.now() - debateStartTime) / 1000)}s)</p>
                          )}
                          {((Date.now() - debateStartTime) / 1000) > 30 && (
                            <p className="text-orange-400">● Phase 4: Finalizing unified response ({Math.floor((Date.now() - debateStartTime) / 1000)}s)</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Show real-time model status */}
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
                      
                      {/* Show response preview when available */}
                      {status.responsePreview && (
                        <div className="mt-2 p-2 bg-black/20 rounded text-xs text-muted-foreground">
                          <p className="font-mono line-clamp-3">{status.responsePreview}</p>
                        </div>
                      )}
                      
                      {/* Show key points if available */}
                      {status.keyPoints && (
                        <div className="mt-2 text-xs text-blue-400">
                          <pre className="whitespace-pre-wrap">{status.keyPoints}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Show streaming updates log */}
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
                  // Continue the same session with follow-up round
                  startDebateWithStreaming(false, answers)
                }}
                onRefinedQuery={(refinedQuery) => {
                  // Start new debate with refined query
                  setQuery(refinedQuery)
                  setDebateSession(null)
                  setActiveTab('setup')
                  // Auto-start the debate
                  setTimeout(() => startDebate(false), 100)
                }}
              />
              {conversationId && query && (
                <Card className="p-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Share this debate</h3>
                    <ShareButtons
                      conversationId={conversationId}
                      query={query}
                      mode="agent-debate"
                    />
                  </div>
                </Card>
              )}
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