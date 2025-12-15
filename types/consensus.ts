// Import judge system types
import { JudgeAnalysis, ConciseJudgeResult } from '@/lib/judge-system'

export interface ModelResponse {
  id: string;
  provider: string;
  model: string;
  response: string;
  confidence: number; // 0-1
  responseTime: number; // ms
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: Date;
  error?: string;
  tokensUsed?: number; // For new enhanced response
  toolCalls?: Array<{ // Tool use for trading research
    toolName: string;
    args: Record<string, any>;
    result?: any;
  }>;
}

export interface ConsensusResult {
  id: string;
  prompt: string;
  responses: ModelResponse[];
  consensus: {
    agreement: number; // 0-1, how much models agree
    summary: string; // AI-generated summary of consensus
    disagreements: string[]; // Key points of disagreement
    confidence: number; // Overall confidence in consensus
    unifiedAnswer?: string; // Judge model unified answer
    agreements?: string[]; // Key agreements from judge
    judgeTokensUsed?: number; // Tokens used by judge model
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    totalTokens: number;
  };
  timestamp: Date;
  mode?: 'concise' | 'normal' | 'detailed'; // Response mode
  totalTokensUsed?: number; // Total tokens across all models
  estimatedCost?: number; // Cost estimation in USD
}

export interface ModelConfig {
  provider: '' | 'openai' | 'anthropic' | 'google' | 'groq' | 'xai' | 'perplexity' | 'mistral' | 'cohere';
  model: string;
  enabled: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  useWebSearch?: boolean; // Enable native AI provider web search (GPT, Claude, Gemini, Grok)
  useTools?: boolean; // Enable tool use (Alpaca trading tools)
  maxSteps?: number; // Max steps for multi-step tool use
  seed?: number; // Seed for reproducible outputs (OpenAI, Google support)
}

export interface QueryRequest {
  prompt: string;
  models: ModelConfig[];
  includeReasoning?: boolean;
  responseMode?: 'concise' | 'normal' | 'detailed'; // New smart minimization
  usePremiumQuery?: boolean; // Use premium credit for all models access
  isGuestMode?: boolean; // Guest mode flag
  comparisonModel?: ModelConfig; // Optional single model to compare against
  includeComparison?: boolean; // Enable comparison mode
  enableWebSearch?: boolean; // Enable web search enrichment
  testingTierOverride?: 'pro' | 'enterprise'; // Testing-only tier override for development
}

// New enhanced response structure
export interface EnhancedConsensusResponse {
  query: string;
  mode: string;
  responses: {
    model: string;
    response: string;
    tokensUsed: number;
    responseTime: number;
    usedWebSearch?: boolean;
  }[];
  consensus: {
    unifiedAnswer: string;
    conciseAnswer: string;     // Short summary (1-2 sentences) - now required
    normalAnswer?: string;     // Normal mode answer when elaborated once
    detailedAnswer?: string;   // Detailed analysis when elaborated twice
    elaborationLevel: 'concise' | 'normal' | 'detailed'; // Current elaboration level
    confidence: number;
    agreements: string[];
    disagreements: string[];
    judgeTokensUsed: number;
    judgeAnalysis?: JudgeAnalysis | ConciseJudgeResult; // Enhanced judge analysis data
  };
  totalTokensUsed: number;
  estimatedCost: number;
  comparisonResponse?: {  // Optional single model comparison
    model: string;
    response: string;
    tokensUsed: number;
    responseTime: number;
    cost: number;
    confidence: number;
  };
  webSearch?: { // Optional web search results
    context: string;
    sources: string[];
  };
}

// Structured response data extracted from model outputs
export interface ParsedModelResponse {
  mainAnswer: string;
  confidence: number;
  keyEvidence: string[];
  limitations: string[];
}

// Enhanced model response with structured parsing
export interface StructuredModelResponse extends ModelResponse {
  parsed?: ParsedModelResponse;
  rawStructuredResponse?: string; // The full structured response from model
}

// Judge analysis interface for consensus response
export interface JudgeAnalysisResponse {
  id: string;
  consensusId: string;
  analysis: JudgeAnalysis;
  conciseResults: ConciseJudgeResult[];
  timestamp: Date;
}

/**
 * SSE Event Types for Consensus Streaming
 *
 * These types define the events sent during consensus trading stream
 */

// Base event structure
export interface ConsensusStreamEvent {
  type: string;
  timestamp: number;
  [key: string]: any;
}

// Model fallback event - sent when a model fails and another is substituted
export interface ModelFallbackEvent extends ConsensusStreamEvent {
  type: 'fallback';
  originalModel: string;
  originalModelName: string;
  fallbackModel: string;
  fallbackModelName: string;
  reason: string;           // Raw error message
  errorCategory: string;    // QUOTA_LIMIT, AUTH_ERROR, etc.
  userMessage: string;      // Friendly UI message (e.g., "rate limit")
}

// Warning event - sent when a model is unstable but still attempted
export interface ModelWarningEvent extends ConsensusStreamEvent {
  type: 'warning';
  model: string;
  modelName: string;
  message: string;
}

// Union of all stream event types
export type TradingStreamEvent =
  | { type: 'phase_start'; phase: number; message: string; timestamp: number }
  | { type: 'agent_complete'; agent: string; timestamp: number }
  | { type: 'decision_start'; modelName: string; modelId: string; timestamp: number }
  | { type: 'decision_complete'; modelName: string; modelId: string; action: string; confidence: number; duration: number; tokensUsed: number; inputTokens: number; outputTokens: number; provider?: 'CLI' | 'API'; timestamp: number }
  | { type: 'judge_start'; message: string; timestamp: number }
  | { type: 'judge_complete'; judgeResult: any; timestamp: number }
  | { type: 'final_result'; result: any; timestamp: number }
  | { type: 'error'; phase?: number; model?: string; message: string; errorCategory?: string; timestamp: number }
  | ModelFallbackEvent
  | ModelWarningEvent;
