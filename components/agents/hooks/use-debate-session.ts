import { useState, useEffect, useCallback, useMemo } from 'react'
import { AgentConfig, DebateSession, DEBATE_CONFIG } from '@/lib/agents/types'
import { ModelConfig, ModelProvider } from '@/types/consensus'
import { estimateDebateCost } from '@/lib/agents/cost-calculator'
import { useToast } from '@/hooks/use-toast'
import { useConversationPersistence } from '@/hooks/use-conversation-persistence'
import { SavedConversation } from '@/lib/types/conversation'
import { useGlobalModelTier } from '@/contexts/trading-preset-context'
import { AGENT_PRESETS } from '../debate-presets'
import type { PresetTier } from '../debate-types'

export function useDebateSession() {
  const { toast } = useToast()
  const { globalTier } = useGlobalModelTier()

  // ── Core query/session state ──────────────────────────────

  const [query, setQuery] = useState('Best Dubai hotel for a family: 2 couples (2 adults + 2 elderly) + 1 baby (14 months), 5 nights, first time in Dubai, 24-29 Nov, $400 max per night per couple')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [debateSession, setDebateSession] = useState<DebateSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('setup')
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)

  // ── Agent / model selection ───────────────────────────────

  const [selectedAgents, setSelectedAgents] = useState<AgentConfig[]>([])
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([
    { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true },
    { provider: 'groq', model: 'llama-3.1-8b-instant', enabled: true },
    { provider: 'groq', model: 'llama-3.3-70b-versatile', enabled: true }
  ])

  const selectedLLMs = useMemo(() =>
    modelConfigs
      .filter(config => config.enabled)
      .map(config => ({
        provider: config.provider,
        model: config.model
      })), [modelConfigs])

  const handleModelConfigChange = useCallback((newConfigs: ModelConfig[]) => {
    setModelConfigs(newConfigs)
  }, [])

  // ── Debate configuration ──────────────────────────────────

  const [rounds, setRounds] = useState(DEBATE_CONFIG.defaultRounds)
  const [round1Mode, setRound1Mode] = useState<'llm' | 'agents'>('agents')
  const [autoRound2, setAutoRound2] = useState(false)
  const [disagreementThreshold, setDisagreementThreshold] = useState(0.3)
  const [responseMode, setResponseMode] = useState<'concise' | 'normal' | 'detailed'>('concise')
  const [enableWebSearch, setEnableWebSearch] = useState(true)
  const [includeComparison, setIncludeComparison] = useState(true)
  const [comparisonModel, setComparisonModel] = useState<ModelConfig | null>({
    provider: 'openai',
    model: 'gpt-4.1-nano',
    enabled: true
  })
  const [includeConsensusComparison, setIncludeConsensusComparison] = useState(true)
  const [enablePreDebateQuestions, setEnablePreDebateQuestions] = useState(true)
  const [showPreDebateQuestions, setShowPreDebateQuestions] = useState(false)
  const [preDebateAnswers, setPreDebateAnswers] = useState<Record<number, string>>({})
  const [showRound2Prompt, setShowRound2Prompt] = useState(false)
  const [costEstimate, setCostEstimate] = useState<any>(null)
  const [availableModels, setAvailableModels] = useState<{ provider: string; models: string[] }[]>([])

  // ── Conversation persistence ──────────────────────────────

  const { saveConversation, isRestoring } = useConversationPersistence({
    storageKey: 'agent-debate-last-conversation',
    onRestored: (conversation: SavedConversation) => {
      setQuery(conversation.query)
      setDebateSession(conversation.responses as DebateSession)
      setConversationId(conversation.id)
      setActiveTab('results')

      toast({
        title: 'Conversation Restored',
        description: 'Your previous agent debate has been restored.',
      })
    },
    onError: () => {
      // Silent fail
    },
  })

  // ── Auto-apply global tier changes to agent roles ─────────

  useEffect(() => {
    const preset = AGENT_PRESETS[globalTier as PresetTier]
    if (preset) {
      const roles = preset.roles
      setModelConfigs([
        { provider: roles['analyst-001'].provider as ModelProvider, model: roles['analyst-001'].model, enabled: true },
        { provider: roles['critic-001'].provider as ModelProvider, model: roles['critic-001'].model, enabled: true },
        { provider: roles['synthesizer-001'].provider as ModelProvider, model: roles['synthesizer-001'].model, enabled: true }
      ])
    }
  }, [globalTier])

  // ── Fetch available models ────────────────────────────────

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models) {
          setAvailableModels(data.models)
        }
      })
      .catch(() => { /* Silent fail */ })
  }, [])

  // ── Calculate cost estimate ───────────────────────────────

  useEffect(() => {
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

  // ── Memoized radio handlers ───────────────────────────────

  const handleRound1ModeChange = useCallback((v: string) => {
    setRound1Mode(v as 'llm' | 'agents')
  }, [])

  const handleResponseModeChange = useCallback((v: string) => {
    setResponseMode(v as 'concise' | 'normal' | 'detailed')
  }, [])

  // ── Generate question ─────────────────────────────────────

  const handleGenerateQuestion = useCallback(async (userTier: string) => {
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
      } else {
        throw new Error(data.message || 'No question generated')
      }
    } catch {
      // Handle error silently
    } finally {
      setIsGeneratingQuestion(false)
    }
  }, [isGeneratingQuestion])

  // ── Reset ─────────────────────────────────────────────────

  const resetDebate = useCallback(() => {
    setDebateSession(null)
    setActiveTab('setup')
    setError(null)
  }, [])

  return {
    // Core state
    query, setQuery,
    conversationId, setConversationId,
    debateSession, setDebateSession,
    error, setError,
    activeTab, setActiveTab,
    isGeneratingQuestion,

    // Agent / model selection
    selectedAgents, setSelectedAgents,
    modelConfigs, setModelConfigs,
    selectedLLMs,
    handleModelConfigChange,

    // Configuration
    rounds, setRounds,
    round1Mode, setRound1Mode,
    autoRound2, setAutoRound2,
    disagreementThreshold, setDisagreementThreshold,
    responseMode, setResponseMode,
    enableWebSearch, setEnableWebSearch,
    includeComparison, setIncludeComparison,
    comparisonModel, setComparisonModel,
    includeConsensusComparison, setIncludeConsensusComparison,
    enablePreDebateQuestions, setEnablePreDebateQuestions,
    showPreDebateQuestions, setShowPreDebateQuestions,
    preDebateAnswers, setPreDebateAnswers,
    showRound2Prompt, setShowRound2Prompt,
    costEstimate,
    availableModels,

    // Persistence
    saveConversation,
    isRestoring,

    // Handlers
    handleRound1ModeChange,
    handleResponseModeChange,
    handleGenerateQuestion,
    resetDebate,

    // Global tier
    globalTier,
  }
}
