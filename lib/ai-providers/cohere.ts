import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';

export class CohereProvider implements AIProvider {
  name = 'Cohere';
  models = [
    'command-r-plus',
    'command-r'
  ];

  isConfigured(): boolean {
    return !!(
      process.env.COHERE_API_KEY &&
      process.env.COHERE_API_KEY !== 'your_cohere_api_key_here'
    );
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('Cohere API key not configured');
      }

      const cohere = createOpenAI({
        baseURL: 'https://api.cohere.ai/v1',
        apiKey: process.env.COHERE_API_KEY as string,
      });

      const result = await generateText({
        model: cohere(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,
      });

      const responseTime = Date.now() - startTime;

      return {
        id: `cohere-${Date.now()}`,
        provider: 'cohere',
        model: config.model,
        response: result.text,
        confidence: this.calculateConfidence(result),
        responseTime,
        tokens: {
          prompt: result.usage?.promptTokens || 0,
          completion: result.usage?.completionTokens || 0,
          total: result.usage?.totalTokens || 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        id: `cohere-error-${Date.now()}`,
        provider: 'cohere',
        model: config.model,
        response: '',
        confidence: 0,
        responseTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private calculateConfidence(result: any): number {
    const responseLength = result.text.length;
    const hasGoodLength = responseLength > 50 && responseLength < 2500;
    return hasGoodLength ? 0.78 : 0.6;
  }
}











