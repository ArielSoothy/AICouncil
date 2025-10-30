import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { getModelsByProvider } from '../models/model-registry';

export class PerplexityProvider implements AIProvider {
  name = 'Perplexity';
  models = getModelsByProvider('perplexity').map(m => m.id);

  isConfigured(): boolean {
    return !!(
      process.env.PERPLEXITY_API_KEY &&
      process.env.PERPLEXITY_API_KEY !== 'your_perplexity_api_key_here'
    );
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('Perplexity API key not configured');
      }

      const pplx = createOpenAI({
        baseURL: 'https://api.perplexity.ai',
        apiKey: process.env.PERPLEXITY_API_KEY as string,
      });

      const result = await generateText({
        model: pplx(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,
      });

      const responseTime = Date.now() - startTime;

      return {
        id: `perplexity-${Date.now()}`,
        provider: 'perplexity',
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
        id: `perplexity-error-${Date.now()}`,
        provider: 'perplexity',
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
    return hasGoodLength ? 0.8 : 0.6;
  }
}




















