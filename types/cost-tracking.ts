/**
 * Cost Tracking Types
 *
 * All cost calculations use REAL data from:
 * - lib/model-metadata.ts: MODEL_COSTS_PER_1K (actual provider pricing)
 * - API responses: result.usage.inputTokens, result.usage.outputTokens
 */

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface CostRecord {
  id: string;
  timestamp: Date;
  modelId: string;
  provider: string;
  tokens: TokenUsage;
  cost: number; // Calculated from MODEL_COSTS_PER_1K
  analysisType: AnalysisType;
  context?: string; // Symbol, query preview, etc.
}

export type AnalysisType =
  | 'trading-consensus'
  | 'trading-debate'
  | 'trading-individual'
  | 'trading-research'
  | 'ultra-consensus'
  | 'ultra-debate'
  | 'vacation-planner'
  | 'apartment-planner'
  | 'general';

export interface AnalysisSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  analysisType: AnalysisType;
  records: CostRecord[];
  totalTokens: number;
  totalCost: number;
  status: 'running' | 'completed' | 'error';
  context?: string; // e.g., "AAPL - Swing Trading"
}

export interface SessionAggregate {
  date: string; // YYYY-MM-DD
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
  byModel: Record<string, { tokens: number; cost: number }>;
  byAnalysisType: Record<string, { tokens: number; cost: number }>;
  analysisCount: number;
}

export interface CostEstimate {
  minimum: number;
  expected: number;
  maximum: number;
  breakdown: EstimateBreakdown[];
  freeModelsCount: number;
  paidModelsCount: number;
}

export interface EstimateBreakdown {
  modelId: string;
  provider: string;
  estimatedTokens: {
    prompt: number;
    completion: number;
  };
  estimatedCost: number;
  isFree: boolean;
}

export interface CostTrackerState {
  // Current analysis tracking
  currentAnalysis: AnalysisSession | null;
  estimatedCost: CostEstimate | null;

  // Session aggregates
  sessionTotal: number;
  sessionTokens: number;
  sessionStartTime: Date;
  analysisCount: number;

  // Historical data (from localStorage)
  todayTotal: number;
  todayTokens: number;

  // UI state
  isFooterExpanded: boolean;
  isFooterVisible: boolean;
}

// localStorage schema
export interface CostStorageSchema {
  version: 1;
  dailyAggregates: Record<string, SessionAggregate>; // keyed by YYYY-MM-DD
  lastUpdated: string;
}

// sessionStorage schema (cleared on browser close)
export interface SessionStorageSchema {
  sessionId: string;
  startTime: string;
  records: CostRecord[];
  totalTokens: number;
  totalCost: number;
  analysisCount: number;
}

// Input type for trackUsage - cost is optional (calculated if not provided)
export type TrackUsageInput = Omit<CostRecord, 'id' | 'timestamp' | 'cost'> & { cost?: number };

// Context value type
export interface CostTrackerContextValue {
  state: CostTrackerState;

  // Actions
  trackUsage: (record: TrackUsageInput) => void;
  startAnalysis: (type: AnalysisType, context?: string) => void;
  endAnalysis: (status?: 'completed' | 'error') => void;
  updateEstimate: (estimate: CostEstimate) => void;
  clearSession: () => void;
  toggleFooter: () => void;
  setFooterVisible: (visible: boolean) => void;

  // Computed
  getCurrentAnalysisCost: () => number;
  getSessionBreakdown: () => { byModel: Record<string, number>; byProvider: Record<string, number> };
}
