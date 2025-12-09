/**
 * Decision Memory System - Type Definitions
 *
 * Core types for storing and managing debate decisions.
 * This is the foundation for the data moat that tracks:
 * - Every decision made
 * - Models used and their performance
 * - Outcomes (good/bad/neutral)
 *
 * @see /scripts/create-decisions-table.sql for database schema
 */

import { DebateSession } from '@/lib/agents/types'

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Outcome status for decision tracking
 * - pending: Decision made, outcome unknown
 * - good: User confirmed positive outcome
 * - bad: User confirmed negative outcome
 * - neutral: Outcome was mixed or neither good nor bad
 * - unknown: User doesn't know the outcome yet
 */
export type OutcomeStatus = 'pending' | 'good' | 'bad' | 'neutral' | 'unknown'

/**
 * Domain classification for decisions
 * Used for analytics: "Which model is best for career decisions?"
 */
export type DecisionDomain =
  | 'general'
  | 'career'
  | 'trading'
  | 'apartment'
  | 'vacation'
  | 'technology'
  | 'finance'
  | 'health'
  | 'education'
  | 'relationship'
  | 'business'
  | 'other'

/**
 * Research mode used in the debate
 */
export type ResearchMode = 'centralized' | 'distributed' | 'hybrid'

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Decision record stored in Supabase
 * Mirrors the database schema
 */
export interface Decision {
  // Primary key
  id: string

  // User reference
  user_id: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Query & Context
  query: string
  domain: DecisionDomain
  tags: string[]
  title: string | null

  // Debate Data
  debate_session: DebateSession
  models_used: string[]
  research_mode: ResearchMode
  rounds_count: number

  // Result
  final_recommendation: string | null
  confidence_score: number | null
  key_agreements: string[] | null
  key_disagreements: string[] | null

  // Outcome Tracking
  outcome_status: OutcomeStatus
  outcome_notes: string | null
  outcome_recorded_at: string | null
  outcome_rating: number | null

  // Analytics
  total_tokens: number | null
  total_cost: number | null
  debate_duration_ms: number | null
  client_info: Record<string, unknown>
}

/**
 * Input for creating a new decision
 * Omits auto-generated fields
 */
export interface CreateDecisionInput {
  user_id?: string | null
  query: string
  domain?: DecisionDomain
  tags?: string[]
  title?: string
  debate_session: DebateSession
  models_used?: string[]
  research_mode?: ResearchMode
  rounds_count?: number
  final_recommendation?: string | null
  confidence_score?: number | null
  key_agreements?: string[]
  key_disagreements?: string[]
  total_tokens?: number
  total_cost?: number
  debate_duration_ms?: number | null
  client_info?: Record<string, unknown>
}

/**
 * Input for updating outcome
 */
export interface UpdateOutcomeInput {
  outcome_status: OutcomeStatus
  outcome_notes?: string
  outcome_rating?: number // 1-5 stars
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Filters for querying decisions
 */
export interface DecisionFilters {
  domain?: DecisionDomain
  outcome_status?: OutcomeStatus
  tags?: string[]
  models_used?: string[]
  date_from?: string
  date_to?: string
  search_query?: string
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number
  limit?: number
  order_by?: 'created_at' | 'updated_at' | 'outcome_recorded_at'
  order_direction?: 'asc' | 'desc'
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
  has_more: boolean
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Model performance statistics
 */
export interface ModelPerformance {
  model: string
  total_decisions: number
  good_outcomes: number
  bad_outcomes: number
  pending_outcomes: number
  success_rate: number | null // Percentage (0-100)
}

/**
 * Domain statistics
 */
export interface DomainStats {
  domain: DecisionDomain
  total_decisions: number
  good_outcomes: number
  bad_outcomes: number
  avg_confidence: number | null
  top_models: string[]
}

/**
 * User decision summary
 */
export interface UserDecisionSummary {
  total_decisions: number
  decisions_by_domain: Record<DecisionDomain, number>
  decisions_by_outcome: Record<OutcomeStatus, number>
  most_used_models: string[]
  avg_confidence: number
  decisions_this_week: number
  decisions_this_month: number
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * API response for saving a decision
 */
export interface SaveDecisionResponse {
  success: boolean
  decision?: Decision
  error?: string
}

/**
 * API response for listing decisions
 */
export interface ListDecisionsResponse {
  success: boolean
  decisions?: PaginatedResponse<Decision>
  error?: string
}

/**
 * API response for getting a single decision
 */
export interface GetDecisionResponse {
  success: boolean
  decision?: Decision
  error?: string
}

/**
 * API response for updating outcome
 */
export interface UpdateOutcomeResponse {
  success: boolean
  decision?: Decision
  error?: string
}

/**
 * API response for model analytics
 */
export interface ModelAnalyticsResponse {
  success: boolean
  performance?: ModelPerformance[]
  error?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract models used from a DebateSession
 */
export function extractModelsUsed(session: DebateSession): string[] {
  const models = new Set<string>()

  // Extract from debate rounds
  session.rounds.forEach((round) => {
    round.messages.forEach((message) => {
      if (message.model) {
        models.add(message.model)
      }
    })
  })

  // Extract from comparison responses
  if (session.comparisonResponse?.model) {
    models.add(session.comparisonResponse.model)
  }

  if (session.consensusComparison?.models) {
    session.consensusComparison.models.forEach((m) => models.add(m))
  }

  return Array.from(models)
}

/**
 * Extract final recommendation from synthesis
 */
export function extractFinalRecommendation(session: DebateSession): string | null {
  if (session.finalSynthesis?.conclusion) {
    return session.finalSynthesis.conclusion
  }
  if (session.finalSynthesis?.content) {
    // Take first 500 chars as summary
    return session.finalSynthesis.content.substring(0, 500)
  }
  return null
}

/**
 * Extract key agreements from synthesis
 */
export function extractKeyAgreements(session: DebateSession): string[] {
  return session.finalSynthesis?.agreements || []
}

/**
 * Extract key disagreements from synthesis
 */
export function extractKeyDisagreements(session: DebateSession): string[] {
  return session.finalSynthesis?.disagreements || []
}

/**
 * Auto-detect domain from query text
 */
export function detectDomain(query: string): DecisionDomain {
  const queryLower = query.toLowerCase()

  const domainKeywords: Record<DecisionDomain, string[]> = {
    career: ['job', 'career', 'salary', 'interview', 'resume', 'promotion', 'work', 'employer', 'hire', 'quit'],
    trading: ['stock', 'trade', 'buy', 'sell', 'invest', 'market', 'portfolio', 'ticker', '$', 'crypto', 'bitcoin'],
    apartment: ['apartment', 'rent', 'lease', 'housing', 'flat', 'bedroom', 'landlord', 'tenant', 'move'],
    vacation: ['trip', 'vacation', 'travel', 'hotel', 'flight', 'destination', 'itinerary', 'tourism', 'holiday'],
    technology: ['tech', 'software', 'app', 'code', 'programming', 'computer', 'device', 'gadget'],
    finance: ['money', 'budget', 'loan', 'mortgage', 'bank', 'credit', 'debt', 'savings', 'financial'],
    health: ['health', 'doctor', 'medical', 'exercise', 'diet', 'fitness', 'symptom', 'treatment'],
    education: ['school', 'university', 'college', 'course', 'degree', 'study', 'learn', 'education'],
    relationship: ['relationship', 'dating', 'marriage', 'partner', 'family', 'friend'],
    business: ['business', 'startup', 'company', 'entrepreneur', 'client', 'customer', 'product'],
    general: [],
    other: [],
  }

  let bestMatch: DecisionDomain = 'general'
  let bestScore = 0

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (domain === 'general' || domain === 'other') continue

    const matchCount = keywords.filter((k) => queryLower.includes(k)).length
    if (matchCount > bestScore) {
      bestScore = matchCount
      bestMatch = domain as DecisionDomain
    }
  }

  return bestMatch
}

/**
 * Generate a title from a query
 */
export function generateTitle(query: string): string {
  // Take first 100 chars, trim at word boundary
  if (query.length <= 100) return query

  const truncated = query.substring(0, 100)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 50) {
    return truncated.substring(0, lastSpace) + '...'
  }
  return truncated + '...'
}
