/**
 * Decision Memory System - Public API
 *
 * Export all public types and functions for the Decision Memory System.
 *
 * Usage:
 * import { saveDecision, getRecentDecisions, updateOutcome } from '@/lib/decisions'
 */

// Types
export type {
  OutcomeStatus,
  DecisionDomain,
  ResearchMode,
  Decision,
  CreateDecisionInput,
  UpdateOutcomeInput,
  DecisionFilters,
  PaginationOptions,
  PaginatedResponse,
  ModelPerformance,
  DomainStats,
  UserDecisionSummary,
  SaveDecisionResponse,
  ListDecisionsResponse,
  GetDecisionResponse,
  UpdateOutcomeResponse,
  ModelAnalyticsResponse,
} from './decision-types'

// Helper functions
export {
  extractModelsUsed,
  extractFinalRecommendation,
  extractKeyAgreements,
  extractKeyDisagreements,
  detectDomain,
  generateTitle,
} from './decision-types'

// Service
export {
  DecisionService,
  getDecisionService,
  saveDecision,
  getRecentDecisions,
  updateOutcome,
  getModelPerformance,
} from './decision-service'
