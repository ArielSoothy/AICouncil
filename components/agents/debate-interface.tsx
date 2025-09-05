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
import { Send, Loader2, Settings, Users, MessageSquare, DollarSign, AlertTriangle, Zap, Brain, GitCompare } from 'lucide-react'
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

export function AgentDebateInterface({ userTier }: AgentDebateInterfaceProps) {
  const [query, setQuery] = useState('What are the best value for money top 3 scooters (automatic) up to 500cc, 2nd hand up to 20k shekels, drive from tlv to jerusalem but can get to eilat comfortably?')
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
  const [round1Mode, setRound1Mode] = useState<'llm' | 'agents'>('llm')
  const [autoRound2, setAutoRound2] = useState(true)
  const [disagreementThreshold, setDisagreementThreshold] = useState(0.3)
  const [responseMode, setResponseMode] = useState<'concise' | 'normal' | 'detailed'>('concise')
  const [costEstimate, setCostEstimate] = useState<any>(null)
  const [showRound2Prompt, setShowRound2Prompt] = useState(false)
  
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
    provider?: string
  }>>({})
  const [debateStartTime, setDebateStartTime] = useState<number | null>(null)
  
  // Use ref to track loading state for setTimeout callbacks
  const isLoadingRef = useRef(false)
  
  // State to track synthesis phase
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  // State to store the generated prompt for display
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  
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
      
      // Set a timeout to check if models actually start
      setTimeout(() => {
        setModelStatuses(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(key => {
            // If still waiting after 10 seconds, mark as error
            if (updated[key].status === 'waiting') {
              updated[key] = {
                ...updated[key],
                status: 'error',
                message: 'Failed to start - check API connection'
              }
            }
          })
          return updated
        })
      }, 10000) // 10 second timeout
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
          rounds: continueRound2 ? 2 : (autoRound2 ? 1 : rounds),
          responseMode,
          round1Mode,
          autoRound2,
          disagreementThreshold,
          isGuestMode: userTier === 'guest',
          includeComparison: includeComparison && !continueRound2,
          comparisonModel: includeComparison && !continueRound2 && comparisonModel ? 
            { provider: comparisonModel.provider, model: comparisonModel.model } : null,
          includeConsensusComparison: includeComparison && includeConsensusComparison && !continueRound2,
          consensusModels: includeComparison && includeConsensusComparison && !continueRound2 ? 
            modelConfigs.filter(m => m.enabled).map(m => ({ provider: m.provider, model: m.model })) : []
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
                  
                case 'model_started':
                  setModelStatuses(prev => ({
                    ...prev,
                    [data.modelId]: {
                      ...prev[data.modelId],
                      status: 'thinking',
                      startTime: data.timestamp,
                      message: 'Analyzing query...'
                    }
                  }))
                  break
                  
                case 'model_thinking':
                  setModelStatuses(prev => ({
                    ...prev,
                    [data.modelId]: {
                      ...prev[data.modelId],
                      message: 'Generating response...',
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
                  allResponses.push(data)
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
                  break
                  
                case 'synthesis_started':
                  setIsSynthesizing(true)
                  setCurrentPhase('Creating synthesis...')
                  break
                  
                case 'synthesis_completed':
                  setCurrentPhase('Debate completed')
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
                    agents: apiAgents,
                    comparisonResponse: data.comparisonResponse || null,
                    consensusComparison: consensusComparisonData,
                    rounds: [{
                      roundNumber: 1,
                      startTime: new Date(debateStartTime || Date.now()),
                      endTime: new Date(),
                      messages: allResponses.map(r => ({
                        agentId: r.modelId,
                        role: 'analyst',
                        round: r.round || 1,
                        content: r.fullResponse || r.responsePreview || '',
                        timestamp: new Date(r.timestamp),
                        tokensUsed: r.tokensUsed,
                        model: r.modelName,
                        keyPoints: [],
                        evidence: [],
                        challenges: []
                      }))
                    }],
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
                    disagreementScore: data.synthesis?.disagreementScore || 0,
                    status: 'completed' as const,
                    informationRequest: data.synthesis?.informationRequest || {
                      detected: false,
                      followUpQuestions: []
                    }
                  }
                  console.log('Setting debate session with consensusComparison:', {
                    hasConsensus: !!session.consensusComparison,
                    consensusData: session.consensusComparison
                  })
                  setDebateSession(session as any)
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
            message: 'Processing...'
          }
        })
      } else {
        selectedAgents.forEach((agent) => {
          statuses[agent.agentId] = {
            status: 'thinking',
            startTime: Date.now(),
            message: 'Processing...'
          }
        })
      }
      setModelStatuses(statuses)
      setDebateStartTime(Date.now())
      
      // Set a timeout to check if models actually start
      setTimeout(() => {
        setModelStatuses(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(key => {
            // If still waiting after 10 seconds, mark as error
            if (updated[key].status === 'waiting') {
              updated[key] = {
                ...updated[key],
                status: 'error',
                message: 'Failed to start - check API connection'
              }
            }
          })
          return updated
        })
      }, 10000) // 10 second timeout
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
          rounds: continueRound2 ? 2 : (autoRound2 ? 1 : rounds),
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
              <div className="space-y-3">
                <Label htmlFor="query" className="text-lg font-semibold">
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
                {/* Start Debate button right-aligned with the query */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => startDebateWithStreaming()}
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
                {/* Show generated prompt for follow-ups */}
                {generatedPrompt && (
                  <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <h4 className="text-sm font-semibold mb-2 text-blue-400">📝 Enhanced Follow-Up Prompt:</h4>
                    <div className="text-xs text-foreground/80 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto bg-black/30 p-3 rounded">
                      {generatedPrompt}
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
                      {!isSynthesizing && (
                        <p className="text-green-400">● Phase 1: Collecting model responses...</p>
                      )}
                      {isSynthesizing && ((Date.now() - debateStartTime) / 1000) <= 20 && (
                        <p className="text-blue-400">● Phase 2: Synthesizing consensus...</p>
                      )}
                      {isSynthesizing && ((Date.now() - debateStartTime) / 1000) > 20 && (
                        <p className="text-yellow-400">● Phase 3: Finalizing consensus...</p>
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