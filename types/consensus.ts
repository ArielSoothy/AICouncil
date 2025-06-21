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
  provider: 'openai' | 'anthropic' | 'google';
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
  };
  totalTokensUsed: number;
  estimatedCost: number;
}
