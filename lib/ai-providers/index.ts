import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { GroqProvider } from './groq';
import { XAIProvider } from './xai';
import { PerplexityProvider } from './perplexity';
import { MistralProvider } from './mistral';
import { CohereProvider } from './cohere';
import { AIProvider } from './types';

export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('google', new GoogleProvider());
    this.providers.set('groq', new GroqProvider());
    this.providers.set('xai', new XAIProvider());
    this.providers.set('perplexity', new PerplexityProvider());
    this.providers.set('mistral', new MistralProvider());
    this.providers.set('cohere', new CohereProvider());
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getConfiguredProviders(): AIProvider[] {
    return this.getAllProviders().filter(provider => provider.isConfigured());
  }

  getAvailableModels(): { provider: string; models: string[] }[] {
    return this.getConfiguredProviders().map(provider => ({
      provider: provider.name.toLowerCase(),
      models: provider.models,
    }));
  }
}

export const providerRegistry = new ProviderRegistry();

// Re-export types and providers for easier access
export type { AIProvider } from './types';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GoogleProvider } from './google';
export { GroqProvider } from './groq';
export { XAIProvider } from './xai';
export { PerplexityProvider } from './perplexity';
export { MistralProvider } from './mistral';
export { CohereProvider } from './cohere';
