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
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    totalTokens: number;
  };
  timestamp: Date;
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
}
