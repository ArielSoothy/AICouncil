import { ModelResponse, ModelConfig } from '../../types/consensus';

export interface AIProvider {
  name: string;
  models: string[];
  query(prompt: string, config: ModelConfig): Promise<ModelResponse>;
  isConfigured(): boolean;
}

export interface ProviderError {
  provider: string;
  error: string;
  retryable: boolean;
}
