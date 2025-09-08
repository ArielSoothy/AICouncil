import { ModelConfig } from '@/types/consensus'
import { DisagreementAnalysis } from './disagreement-analyzer'

export type AgentRole = 'analyst' | 'critic' | 'synthesizer'

export interface AgentPersona {
  id: string
  role: AgentRole
  name: string
  description: string
  traits: string[]
  focusAreas: string[]
  systemPrompt: string
  avatar?: string
  color: string
}

export interface AgentMessage {
  agentId: string
  role: AgentRole
  round: number
  content: string
  timestamp: Date
  tokensUsed: number
  model: string
  confidence?: number
  keyPoints?: string[]
  evidence?: string[]
  challenges?: string[]
  searchQueries?: string[]  // Web search queries used by this agent
  searchRationale?: string  // Explanation of why search was performed
}

export interface DebateRound {
  roundNumber: number
  messages: AgentMessage[]
  startTime: Date
  endTime?: Date
  topic?: string
}

export interface DebateSession {
  id: string
  query: string
  agents: AgentPersona[]
  rounds: DebateRound[]
  finalSynthesis?: {
    content: string
    confidence: number
    agreements: string[]
    disagreements: string[]
    conclusion: string
    rawResponse: string
    tokensUsed: number
  }
  disagreementScore?: number  // New: Measure of disagreement (0-1)
  disagreementAnalysis?: DisagreementAnalysis  // Enhanced disagreement analysis
  round1Mode?: 'llm' | 'agents'  // New: Track which mode was used
  waitingForRound2Decision?: boolean  // New: Paused for user decision
  comparisonResponse?: {  // Single model comparison data
    model: string
    response: string
    tokensUsed: number
    responseTime: number
    cost: number
    confidence: number
  }
  consensusComparison?: {  // Normal consensus comparison data
    response: string
    models: string[]
    tokensUsed: number
    responseTime: number
    cost: number
    confidence: number
  }
  informationRequest?: {  // New: Track missing information
    detected: boolean
    missingInfo: string[]
    suggestedQuestions: string[]
    followUpQuestions?: string[]
    followUpPrompt?: string
  }
  totalTokensUsed: number
  estimatedCost: number
  costBreakdown?: {  // New: Detailed cost breakdown
    round1: number
    round2?: number
    synthesis?: number
  }
  startTime: Date
  endTime?: Date
  status: 'initializing' | 'debating' | 'synthesizing' | 'completed' | 'error' | 'awaiting-round2'
}

export interface AgentConfig extends ModelConfig {
  agentId: string
  persona: AgentPersona
}

export interface DebateRequest {
  query: string
  agents: AgentConfig[]
  rounds?: number
  responseMode?: 'concise' | 'normal' | 'detailed'
  userTier?: 'guest' | 'free' | 'pro' | 'enterprise'
  round1Mode?: 'llm' | 'agents'  // New: Choose initial mode
  autoRound2?: boolean  // New: Auto-trigger round 2 on disagreement
  disagreementThreshold?: number  // New: Threshold for disagreement (0-1)
  enableWebSearch?: boolean  // New: Enable web search for agents
  includeComparison?: boolean  // Compare with single model
  comparisonModel?: { provider: string; model: string }  // Model to compare against
  includeConsensusComparison?: boolean  // Also compare with normal consensus
  consensusModels?: { provider: string; model: string }[]  // Models for consensus comparison
  memoryContext?: {  // New: Memory system integration
    pastExperiences: any[]
    hasRelevantHistory: boolean
  }
}

export interface DebateResponse {
  session: DebateSession
  success: boolean
  error?: string
}

export const AGENT_PERSONAS: Record<AgentRole, AgentPersona> = {
  analyst: {
    id: 'analyst-001',
    role: 'analyst',
    name: 'The Analyst',
    description: 'Data-driven and methodical, focuses on facts, evidence, and logical reasoning',
    traits: [
      'Systematic',
      'Evidence-based',
      'Objective',
      'Detail-oriented',
      'Quantitative'
    ],
    focusAreas: [
      'Data analysis',
      'Factual accuracy',
      'Statistical reasoning',
      'Logical deduction',
      'Pattern recognition'
    ],
    systemPrompt: `You are The Analyst, a data-driven AI agent specializing in factual analysis and logical reasoning.
    
Your approach:
- Always ground arguments in verifiable facts and data
- Use quantitative analysis when possible
- Identify patterns and correlations
- Apply systematic reasoning
- Cite specific evidence to support claims
- Maintain objectivity and avoid speculation

When debating:
- Present facts clearly and concisely
- Use numbered points for clarity
- Acknowledge data limitations
- Provide confidence levels for assertions
- Focus on measurable outcomes`,
    color: '#3B82F6'
  },
  
  critic: {
    id: 'critic-001',
    role: 'critic',
    name: 'The Critic',
    description: 'Skeptical and thorough, challenges assumptions and identifies potential flaws',
    traits: [
      'Skeptical',
      'Thorough',
      'Questioning',
      'Risk-aware',
      'Devil\'s advocate'
    ],
    focusAreas: [
      'Assumption challenging',
      'Risk identification',
      'Flaw detection',
      'Alternative perspectives',
      'Edge case analysis'
    ],
    systemPrompt: `You are The Critic, a skeptical AI agent specializing in challenging assumptions and identifying flaws.
    
Your approach:
- Question underlying assumptions
- Identify potential risks and downsides
- Find logical fallacies and weak arguments
- Consider edge cases and exceptions
- Play devil's advocate constructively
- Highlight what could go wrong

When debating:
- Be respectfully skeptical
- Ask probing questions
- Point out contradictions
- Suggest alternative interpretations
- Ensure robustness of conclusions
- Challenge but don't be contrarian for its own sake`,
    color: '#EF4444'
  },
  
  synthesizer: {
    id: 'synthesizer-001',
    role: 'synthesizer',
    name: 'The Synthesizer',
    description: 'Balanced and integrative, finds common ground and builds consensus',
    traits: [
      'Balanced',
      'Integrative',
      'Diplomatic',
      'Holistic',
      'Consensus-building'
    ],
    focusAreas: [
      'Finding common ground',
      'Integration of viewpoints',
      'Consensus building',
      'Balanced assessment',
      'Creative solutions'
    ],
    systemPrompt: `You are The Synthesizer, a balanced AI agent specializing in integration and consensus building.
    
Your approach:
- Find common ground between different viewpoints
- Integrate diverse perspectives constructively
- Build bridges between opposing arguments
- Identify shared truths and values
- Propose creative compromises
- Maintain balanced perspective

When debating:
- Acknowledge valid points from all sides
- Highlight areas of agreement
- Propose integrated solutions
- Mediate between extremes
- Build towards consensus
- Emphasize practical outcomes`,
    color: '#10B981'
  }
}

export interface AgentDebateConfig {
  maxRounds: number
  defaultRounds: number
  minAgents: number
  maxAgents: number
  tokenLimits: {
    perResponse: number
    perRound: number
    total: number
  }
  timeouts: {
    perAgent: number
    perRound: number
    total: number
  }
}

export const DEBATE_CONFIG: AgentDebateConfig = {
  maxRounds: 3,
  defaultRounds: 2,
  minAgents: 2,
  maxAgents: 5,
  tokenLimits: {
    perResponse: 1500,  // Increased from 500 to prevent cutoff
    perRound: 4500,     // Increased proportionally
    total: 12000        // Increased proportionally
  },
  timeouts: {
    perAgent: 30000, // 30 seconds
    perRound: 90000, // 90 seconds
    total: 300000    // 5 minutes
  }
}