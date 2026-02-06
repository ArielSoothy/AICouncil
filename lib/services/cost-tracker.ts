/**
 * Cost Tracker Service
 *
 * Tracks actual token usage and calculates costs using REAL pricing data
 * from lib/model-metadata.ts (MODEL_COSTS_PER_1K)
 *
 * All costs are calculated from actual API responses, not estimates.
 */

import { MODEL_COSTS_PER_1K } from '@/lib/model-metadata';
import type {
  CostRecord,
  CostEstimate,
  EstimateBreakdown,
  AnalysisType,
  AnalysisSession,
  SessionAggregate,
  CostStorageSchema,
  SessionStorageSchema,
  TokenUsage,
} from '@/types/cost-tracking';

const STORAGE_KEY = 'ai-council-cost-tracker';
const SESSION_KEY = 'ai-council-cost-session';
const SCHEMA_VERSION = 1;

/**
 * Calculate actual cost from token usage using real pricing
 */
export function calculateCost(modelId: string, tokens: TokenUsage): number {
  const pricing = MODEL_COSTS_PER_1K[modelId];
  if (!pricing) {
    return 0;
  }

  const inputCost = (tokens.prompt / 1000) * pricing.input;
  const outputCost = (tokens.completion / 1000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Check if a model is free
 */
export function isModelFree(modelId: string): boolean {
  const pricing = MODEL_COSTS_PER_1K[modelId];
  if (!pricing) return false;
  return pricing.input === 0 && pricing.output === 0;
}

/**
 * Get model pricing info
 */
export function getModelPricing(modelId: string): { input: number; output: number } | null {
  return MODEL_COSTS_PER_1K[modelId] || null;
}

/**
 * Estimate cost for an analysis before running
 * Uses historical averages for token estimates
 */
export function estimateAnalysisCost(
  analysisType: AnalysisType,
  models: Array<{ modelId: string; provider: string }>,
  options?: {
    includeResearch?: boolean;
    rounds?: number;
  }
): CostEstimate {
  // Token estimates based on actual observed usage patterns
  const TOKEN_ESTIMATES: Record<
    AnalysisType,
    { prompt: number; completion: number }
  > = {
    'trading-consensus': { prompt: 1800, completion: 600 },
    'trading-debate': { prompt: 1200, completion: 500 },
    'trading-individual': { prompt: 1500, completion: 700 },
    'trading-research': { prompt: 2500, completion: 1000 },
    'ultra-consensus': { prompt: 800, completion: 400 },
    'ultra-debate': { prompt: 1000, completion: 450 },
    'vacation-planner': { prompt: 1200, completion: 600 },
    'apartment-planner': { prompt: 1000, completion: 500 },
    general: { prompt: 800, completion: 400 },
  };

  const baseEstimate = TOKEN_ESTIMATES[analysisType] || TOKEN_ESTIMATES.general;
  const breakdown: EstimateBreakdown[] = [];
  let expectedTotal = 0;
  let freeCount = 0;
  let paidCount = 0;

  for (const model of models) {
    const pricing = MODEL_COSTS_PER_1K[model.modelId];
    const isFree = isModelFree(model.modelId);

    if (isFree) {
      freeCount++;
    } else {
      paidCount++;
    }

    let estimatedCost = 0;
    if (pricing) {
      estimatedCost =
        (baseEstimate.prompt / 1000) * pricing.input +
        (baseEstimate.completion / 1000) * pricing.output;
    }

    breakdown.push({
      modelId: model.modelId,
      provider: model.provider,
      estimatedTokens: {
        prompt: baseEstimate.prompt,
        completion: baseEstimate.completion,
      },
      estimatedCost,
      isFree,
    });

    expectedTotal += estimatedCost;
  }

  // Add research phase estimate if applicable
  if (options?.includeResearch) {
    const researchEstimate = TOKEN_ESTIMATES['trading-research'];
    // Research typically uses claude-sonnet-4-5-20250929
    const researchPricing = MODEL_COSTS_PER_1K['claude-sonnet-4-5-20250929'];
    if (researchPricing) {
      const researchCost =
        (researchEstimate.prompt / 1000) * researchPricing.input +
        (researchEstimate.completion / 1000) * researchPricing.output;
      expectedTotal += researchCost;
    }
  }

  // Multiply by rounds for debate mode
  if (options?.rounds && options.rounds > 1) {
    expectedTotal *= options.rounds;
    breakdown.forEach((b) => {
      b.estimatedCost *= options.rounds!;
      b.estimatedTokens.prompt *= options.rounds!;
      b.estimatedTokens.completion *= options.rounds!;
    });
  }

  return {
    minimum: expectedTotal * 0.7,
    expected: expectedTotal,
    maximum: expectedTotal * 1.5,
    breakdown,
    freeModelsCount: freeCount,
    paidModelsCount: paidCount,
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost === 0) return 'FREE';
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${Math.round(tokens / 1000)}K`;
}

// ============================================================================
// Storage Management
// ============================================================================

/**
 * Get stored daily aggregates from localStorage
 */
export function getStoredAggregates(): CostStorageSchema | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as CostStorageSchema;
    if (parsed.version !== SCHEMA_VERSION) {
      // Migration could happen here
      return null;
    }

    return parsed;
  } catch (e) {
    console.error('[CostTracker] Error reading localStorage:', e);
    return null;
  }
}

/**
 * Save daily aggregates to localStorage
 */
export function saveAggregates(data: CostStorageSchema): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[CostTracker] Error saving to localStorage:', e);
  }
}

/**
 * Get current session data from sessionStorage
 */
export function getSessionData(): SessionStorageSchema | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as SessionStorageSchema;
  } catch (e) {
    console.error('[CostTracker] Error reading sessionStorage:', e);
    return null;
  }
}

/**
 * Save session data to sessionStorage
 */
export function saveSessionData(data: SessionStorageSchema): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[CostTracker] Error saving to sessionStorage:', e);
  }
}

/**
 * Clear session data
 */
export function clearSessionData(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Get today's date string
 */
export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Update daily aggregate with new record
 */
export function updateDailyAggregate(record: CostRecord): void {
  const stored = getStoredAggregates() || {
    version: SCHEMA_VERSION,
    dailyAggregates: {},
    lastUpdated: new Date().toISOString(),
  };

  const todayKey = getTodayKey();
  const existing = stored.dailyAggregates[todayKey] || {
    date: todayKey,
    totalTokens: 0,
    totalCost: 0,
    byProvider: {},
    byModel: {},
    byAnalysisType: {},
    analysisCount: 0,
  };

  // Update totals
  existing.totalTokens += record.tokens.total;
  existing.totalCost += record.cost;

  // Update by provider
  if (!existing.byProvider[record.provider]) {
    existing.byProvider[record.provider] = { tokens: 0, cost: 0 };
  }
  existing.byProvider[record.provider].tokens += record.tokens.total;
  existing.byProvider[record.provider].cost += record.cost;

  // Update by model
  if (!existing.byModel[record.modelId]) {
    existing.byModel[record.modelId] = { tokens: 0, cost: 0 };
  }
  existing.byModel[record.modelId].tokens += record.tokens.total;
  existing.byModel[record.modelId].cost += record.cost;

  // Update by analysis type
  if (!existing.byAnalysisType[record.analysisType]) {
    existing.byAnalysisType[record.analysisType] = { tokens: 0, cost: 0 };
  }
  existing.byAnalysisType[record.analysisType].tokens += record.tokens.total;
  existing.byAnalysisType[record.analysisType].cost += record.cost;

  stored.dailyAggregates[todayKey] = existing;
  stored.lastUpdated = new Date().toISOString();

  // Clean up old data (keep last 30 days)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffKey = cutoffDate.toISOString().split('T')[0];

  for (const key of Object.keys(stored.dailyAggregates)) {
    if (key < cutoffKey) {
      delete stored.dailyAggregates[key];
    }
  }

  saveAggregates(stored);
}

/**
 * Get today's totals from localStorage
 */
export function getTodayTotals(): { tokens: number; cost: number } {
  const stored = getStoredAggregates();
  if (!stored) return { tokens: 0, cost: 0 };

  const todayKey = getTodayKey();
  const today = stored.dailyAggregates[todayKey];
  if (!today) return { tokens: 0, cost: 0 };

  return { tokens: today.totalTokens, cost: today.totalCost };
}

// ============================================================================
// Session Management
// ============================================================================

let currentSessionId: string | null = null;

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize or restore session
 */
export function initializeSession(): SessionStorageSchema {
  const existing = getSessionData();
  if (existing) {
    currentSessionId = existing.sessionId;
    return existing;
  }

  const newSession: SessionStorageSchema = {
    sessionId: generateSessionId(),
    startTime: new Date().toISOString(),
    records: [],
    totalTokens: 0,
    totalCost: 0,
    analysisCount: 0,
  };

  currentSessionId = newSession.sessionId;
  saveSessionData(newSession);
  return newSession;
}

/**
 * Add record to current session
 */
export function addRecordToSession(record: CostRecord): void {
  const session = getSessionData() || initializeSession();

  session.records.push(record);
  session.totalTokens += record.tokens.total;
  session.totalCost += record.cost;

  saveSessionData(session);

  // Also update daily aggregate
  updateDailyAggregate(record);
}

/**
 * Increment analysis count
 */
export function incrementAnalysisCount(): void {
  const session = getSessionData() || initializeSession();
  session.analysisCount += 1;
  saveSessionData(session);
}

/**
 * Get session summary
 */
export function getSessionSummary(): {
  totalTokens: number;
  totalCost: number;
  analysisCount: number;
  byModel: Record<string, number>;
  byProvider: Record<string, number>;
} {
  const session = getSessionData();
  if (!session) {
    return {
      totalTokens: 0,
      totalCost: 0,
      analysisCount: 0,
      byModel: {},
      byProvider: {},
    };
  }

  const byModel: Record<string, number> = {};
  const byProvider: Record<string, number> = {};

  for (const record of session.records) {
    byModel[record.modelId] = (byModel[record.modelId] || 0) + record.cost;
    byProvider[record.provider] = (byProvider[record.provider] || 0) + record.cost;
  }

  return {
    totalTokens: session.totalTokens,
    totalCost: session.totalCost,
    analysisCount: session.analysisCount,
    byModel,
    byProvider,
  };
}

/**
 * Reset current session
 */
export function resetSession(): SessionStorageSchema {
  clearSessionData();
  return initializeSession();
}
