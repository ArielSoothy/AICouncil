import { AgentConfig, DebateSession, DEBATE_CONFIG } from '@/lib/agents/types'
import { ModelConfig } from '@/types/consensus'
import { DebateStepProgress } from '@/components/debate'
import { LucideIcon } from 'lucide-react'

// ── Preset Types ──────────────────────────────────────────────

export interface AgentPresetRole {
  provider: string
  model: string
}

export interface AgentPreset {
  label: string
  icon: LucideIcon
  description: string
  color: string
  roles: {
    'analyst-001': AgentPresetRole
    'critic-001': AgentPresetRole
    'synthesizer-001': AgentPresetRole
  }
}

export type PresetTier = 'free' | 'pro' | 'max' | 'sub-pro' | 'sub-max'

// ── Streaming / Status Types ──────────────────────────────────

export interface WebSearchStatus {
  isSearching: boolean
  searchQuery?: string
  provider?: string
  resultsCount?: number
  sources?: string[]
  error?: string
  agent?: string
  role?: string
}

export interface AgentSearchHistoryEntry {
  agent: string
  role: string
  status: 'searching' | 'completed' | 'error'
  searchQuery?: string
  provider?: string
  resultsCount?: number
  sources?: string[]
  error?: string
  timestamp: number
}

export interface MemoryStatus {
  isSearching: boolean
  foundCount?: number
  relevantMemories?: any[]
  isStoring: boolean
  stored?: boolean
}

export interface PreResearchStatus {
  isSearching: boolean
  searchesExecuted?: number
  sourcesFound?: number
  sources?: string[]
  cacheHit?: boolean
  researchTime?: number
  queryType?: string
  forModels?: string[]
  searchResults?: Array<{
    role: string
    searchQuery: string
    resultsCount: number
    success: boolean
  }>
}

export interface SearchCapability {
  role: string
  model: string
  provider: string
  hasNativeSearch: boolean
  searchProvider: string
}

export interface ModelStatus {
  status: 'waiting' | 'thinking' | 'completed' | 'error'
  startTime?: number
  endTime?: number
  message?: string
  duration?: number
  responsePreview?: string
  keyPoints?: string
  tokensUsed?: number
  model?: string
  provider?: string
  agentName?: string
  agentRole?: string
  hasReceivedResponse?: boolean
  promptPreview?: string
}

export interface PostAgentStep {
  step: string
  status: 'pending' | 'in_progress' | 'completed'
  startTime?: number
  endTime?: number
  description: string
}

// ── Props Types ───────────────────────────────────────────────

export interface AgentDebateInterfaceProps {
  userTier: 'guest' | 'free' | 'pro' | 'enterprise'
}

// Re-export commonly used types for convenience
export type { AgentConfig, DebateSession, ModelConfig, DebateStepProgress }
export { DEBATE_CONFIG }
