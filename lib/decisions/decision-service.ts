/**
 * Decision Service - Core CRUD Operations
 *
 * Handles all database operations for the Decision Memory System.
 * This service is the foundation of the data moat.
 *
 * Key Features:
 * - Save debate decisions with full context
 * - Retrieve decisions with filtering and search
 * - Update outcomes for feedback tracking
 * - Analytics for model performance
 *
 * @see /lib/decisions/decision-types.ts for type definitions
 * @see /scripts/create-decisions-table.sql for database schema
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { DebateSession } from '@/lib/agents/types'
import {
  Decision,
  CreateDecisionInput,
  UpdateOutcomeInput,
  DecisionFilters,
  PaginationOptions,
  PaginatedResponse,
  ModelPerformance,
  UserDecisionSummary,
  extractModelsUsed,
  extractFinalRecommendation,
  extractKeyAgreements,
  extractKeyDisagreements,
  detectDomain,
  generateTitle,
} from './decision-types'

// ============================================================================
// DECISION SERVICE CLASS
// ============================================================================

export class DecisionService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = getSupabaseAdmin()
  }

  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  /**
   * Save a new decision from a debate session
   *
   * @param session - The completed DebateSession
   * @param userId - Optional user ID (null for anonymous)
   * @param metadata - Optional additional metadata
   */
  async saveDecision(
    session: DebateSession,
    userId?: string | null,
    metadata?: Partial<CreateDecisionInput>
  ): Promise<Decision> {
    // Auto-extract data from session
    const modelsUsed = extractModelsUsed(session)
    const finalRecommendation = extractFinalRecommendation(session)
    const keyAgreements = extractKeyAgreements(session)
    const keyDisagreements = extractKeyDisagreements(session)
    const domain = metadata?.domain || detectDomain(session.query)
    const title = metadata?.title || generateTitle(session.query)

    // Calculate duration
    const duration =
      session.startTime && session.endTime
        ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
        : null

    const decisionData: CreateDecisionInput = {
      user_id: userId || null,
      query: session.query,
      domain,
      tags: metadata?.tags || [],
      title,
      debate_session: session,
      models_used: modelsUsed,
      research_mode: session.round1Mode === 'agents' ? 'centralized' : 'centralized',
      rounds_count: session.rounds.length,
      final_recommendation: finalRecommendation,
      confidence_score: session.finalSynthesis?.confidence || null,
      key_agreements: keyAgreements,
      key_disagreements: keyDisagreements,
      total_tokens: session.totalTokensUsed,
      total_cost: session.estimatedCost,
      debate_duration_ms: duration,
      client_info: metadata?.client_info || {},
    }

    const { data, error } = await this.supabase
      .from('decisions')
      .insert(decisionData)
      .select()
      .single()

    if (error) {
      console.error('[DecisionService] Error saving decision:', error)
      throw new Error(`Failed to save decision: ${error.message}`)
    }

    console.log(`[DecisionService] Decision saved: ${data.id}`)
    return data as Decision
  }

  /**
   * Quick save - minimal input version
   */
  async quickSave(
    query: string,
    session: DebateSession,
    userId?: string | null
  ): Promise<Decision> {
    return this.saveDecision(session, userId)
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get a single decision by ID
   */
  async getDecision(id: string, userId?: string | null): Promise<Decision | null> {
    let query = this.supabase.from('decisions').select('*').eq('id', id)

    // Filter by user if provided (for RLS)
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      console.error('[DecisionService] Error getting decision:', error)
      throw new Error(`Failed to get decision: ${error.message}`)
    }

    return data as Decision
  }

  /**
   * List decisions with filtering and pagination
   */
  async listDecisions(
    userId: string,
    filters?: DecisionFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Decision>> {
    const page = pagination?.page || 1
    const limit = pagination?.limit || 20
    const offset = (page - 1) * limit
    const orderBy = pagination?.order_by || 'created_at'
    const orderDir = pagination?.order_direction || 'desc'

    // Build query
    let query = this.supabase
      .from('decisions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Apply filters
    if (filters?.domain) {
      query = query.eq('domain', filters.domain)
    }
    if (filters?.outcome_status) {
      query = query.eq('outcome_status', filters.outcome_status)
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }
    if (filters?.models_used && filters.models_used.length > 0) {
      query = query.contains('models_used', filters.models_used)
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    // Apply search if provided
    if (filters?.search_query) {
      query = query.or(
        `query.ilike.%${filters.search_query}%,title.ilike.%${filters.search_query}%`
      )
    }

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDir === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[DecisionService] Error listing decisions:', error)
      throw new Error(`Failed to list decisions: ${error.message}`)
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: (data || []) as Decision[],
      total,
      page,
      limit,
      total_pages: totalPages,
      has_more: page < totalPages,
    }
  }

  /**
   * Search decisions by text query
   */
  async searchDecisions(
    userId: string,
    searchQuery: string,
    limit: number = 20
  ): Promise<Decision[]> {
    // Use full-text search
    const { data, error } = await this.supabase.rpc('search_decisions', {
      search_query: searchQuery,
      user_uuid: userId,
      limit_count: limit,
    })

    if (error) {
      // Fallback to ILIKE if function doesn't exist
      console.warn('[DecisionService] RPC search failed, using fallback:', error)
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from('decisions')
        .select('*')
        .eq('user_id', userId)
        .or(`query.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fallbackError) {
        throw new Error(`Failed to search decisions: ${fallbackError.message}`)
      }
      return (fallbackData || []) as Decision[]
    }

    return (data || []) as Decision[]
  }

  /**
   * Get recent decisions for quick access
   */
  async getRecentDecisions(userId: string, limit: number = 5): Promise<Decision[]> {
    const { data, error } = await this.supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[DecisionService] Error getting recent decisions:', error)
      throw new Error(`Failed to get recent decisions: ${error.message}`)
    }

    return (data || []) as Decision[]
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  /**
   * Update the outcome of a decision
   * This is the key feedback mechanism for building the data moat
   */
  async updateOutcome(
    id: string,
    userId: string,
    outcome: UpdateOutcomeInput
  ): Promise<Decision> {
    const updateData = {
      outcome_status: outcome.outcome_status,
      outcome_notes: outcome.outcome_notes || null,
      outcome_rating: outcome.outcome_rating || null,
      outcome_recorded_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('decisions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user owns the decision
      .select()
      .single()

    if (error) {
      console.error('[DecisionService] Error updating outcome:', error)
      throw new Error(`Failed to update outcome: ${error.message}`)
    }

    console.log(`[DecisionService] Outcome updated for decision ${id}: ${outcome.outcome_status}`)
    return data as Decision
  }

  /**
   * Update decision tags
   */
  async updateTags(id: string, userId: string, tags: string[]): Promise<Decision> {
    const { data, error } = await this.supabase
      .from('decisions')
      .update({ tags })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update tags: ${error.message}`)
    }

    return data as Decision
  }

  /**
   * Update decision title
   */
  async updateTitle(id: string, userId: string, title: string): Promise<Decision> {
    const { data, error } = await this.supabase
      .from('decisions')
      .update({ title })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update title: ${error.message}`)
    }

    return data as Decision
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  /**
   * Delete a decision
   */
  async deleteDecision(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('decisions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('[DecisionService] Error deleting decision:', error)
      throw new Error(`Failed to delete decision: ${error.message}`)
    }

    console.log(`[DecisionService] Decision deleted: ${id}`)
  }

  // ==========================================================================
  // ANALYTICS OPERATIONS
  // ==========================================================================

  /**
   * Get model performance statistics
   * This is the foundation for the model leaderboard
   */
  async getModelPerformance(userId?: string): Promise<ModelPerformance[]> {
    // Try to use the database function first
    const { data, error } = await this.supabase.rpc('get_model_performance', {
      user_uuid: userId || null,
    })

    if (error) {
      console.warn('[DecisionService] RPC get_model_performance failed:', error)
      // Fallback: manual aggregation
      return this.calculateModelPerformanceManually(userId)
    }

    return (data || []) as ModelPerformance[]
  }

  /**
   * Manual calculation fallback for model performance
   */
  private async calculateModelPerformanceManually(
    userId?: string
  ): Promise<ModelPerformance[]> {
    let query = this.supabase.from('decisions').select('models_used, outcome_status')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to calculate model performance: ${error.message}`)
    }

    // Aggregate by model
    const modelStats: Record<string, {
      total: number
      good: number
      bad: number
      pending: number
    }> = {}

    for (const decision of data || []) {
      for (const model of decision.models_used || []) {
        if (!modelStats[model]) {
          modelStats[model] = { total: 0, good: 0, bad: 0, pending: 0 }
        }
        modelStats[model].total++
        if (decision.outcome_status === 'good') modelStats[model].good++
        else if (decision.outcome_status === 'bad') modelStats[model].bad++
        else modelStats[model].pending++
      }
    }

    // Convert to array
    return Object.entries(modelStats)
      .map(([model, stats]) => ({
        model,
        total_decisions: stats.total,
        good_outcomes: stats.good,
        bad_outcomes: stats.bad,
        pending_outcomes: stats.pending,
        success_rate:
          stats.good + stats.bad > 0
            ? Math.round((stats.good / (stats.good + stats.bad)) * 100)
            : null,
      }))
      .sort((a, b) => b.total_decisions - a.total_decisions)
  }

  /**
   * Get user decision summary
   */
  async getUserSummary(userId: string): Promise<UserDecisionSummary> {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await this.supabase
      .from('decisions')
      .select('domain, outcome_status, models_used, confidence_score, created_at')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to get user summary: ${error.message}`)
    }

    const decisions = data || []

    // Aggregate statistics
    const byDomain: Record<string, number> = {}
    const byOutcome: Record<string, number> = {}
    const modelUsage: Record<string, number> = {}
    let totalConfidence = 0
    let confidenceCount = 0
    let thisWeek = 0
    let thisMonth = 0

    for (const d of decisions) {
      // By domain
      byDomain[d.domain] = (byDomain[d.domain] || 0) + 1

      // By outcome
      byOutcome[d.outcome_status] = (byOutcome[d.outcome_status] || 0) + 1

      // Models
      for (const model of d.models_used || []) {
        modelUsage[model] = (modelUsage[model] || 0) + 1
      }

      // Confidence
      if (d.confidence_score != null) {
        totalConfidence += d.confidence_score
        confidenceCount++
      }

      // Time-based counts
      if (d.created_at >= oneWeekAgo) thisWeek++
      if (d.created_at >= oneMonthAgo) thisMonth++
    }

    // Get top models
    const topModels = Object.entries(modelUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model]) => model)

    return {
      total_decisions: decisions.length,
      decisions_by_domain: byDomain as any,
      decisions_by_outcome: byOutcome as any,
      most_used_models: topModels,
      avg_confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      decisions_this_week: thisWeek,
      decisions_this_month: thisMonth,
    }
  }

  /**
   * Get decisions needing outcome feedback
   * Returns decisions that are still "pending" and old enough to evaluate
   */
  async getPendingOutcomes(userId: string, daysOld: number = 7): Promise<Decision[]> {
    const cutoffDate = new Date(
      Date.now() - daysOld * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data, error } = await this.supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .eq('outcome_status', 'pending')
      .lte('created_at', cutoffDate)
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) {
      throw new Error(`Failed to get pending outcomes: ${error.message}`)
    }

    return (data || []) as Decision[]
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let decisionServiceInstance: DecisionService | null = null

/**
 * Get singleton instance of DecisionService
 */
export function getDecisionService(): DecisionService {
  if (!decisionServiceInstance) {
    decisionServiceInstance = new DecisionService()
  }
  return decisionServiceInstance
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Save a decision (convenience wrapper)
 */
export async function saveDecision(
  session: DebateSession,
  userId?: string | null,
  metadata?: Partial<CreateDecisionInput>
): Promise<Decision> {
  return getDecisionService().saveDecision(session, userId, metadata)
}

/**
 * Get user's recent decisions (convenience wrapper)
 */
export async function getRecentDecisions(
  userId: string,
  limit?: number
): Promise<Decision[]> {
  return getDecisionService().getRecentDecisions(userId, limit)
}

/**
 * Update outcome (convenience wrapper)
 */
export async function updateOutcome(
  id: string,
  userId: string,
  outcome: UpdateOutcomeInput
): Promise<Decision> {
  return getDecisionService().updateOutcome(id, userId, outcome)
}

/**
 * Get model performance (convenience wrapper)
 */
export async function getModelPerformance(
  userId?: string
): Promise<ModelPerformance[]> {
  return getDecisionService().getModelPerformance(userId)
}
