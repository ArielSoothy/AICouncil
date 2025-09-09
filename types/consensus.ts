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
