import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { getModelsByProvider } from '../models/model-registry';

export class MistralProvider implements AIProvider {
  name = 'Mistral';
  models = getModelsByProvider('mistral').map(m => m.id);

  isConfigured(): boolean {
    return !!(
      process.env.MISTRAL_API_KEY &&
      process.env.MISTRAL_API_KEY !== 'your_mistral_api_key_here'
    );
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('Mistral API key not configured');
      }

      const mistral = createOpenAI({
        baseURL: 'https://api.mistral.ai/v1',
        apiKey: process.env.MISTRAL_API_KEY as string,
      });

      const result = await generateText({
        model: mistral(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,
      });

      const responseTime = Date.now() - startTime;

      // Check for empty response
      if (!result.text || result.text.trim().length === 0) {
        console.error('Mistral: Returned empty response');
        throw new Error('Mistral returned empty response');
      }

      return {
        id: `mistral-${Date.now()}`,
        provider: 'mistral',
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
        id: `mistral-error-${Date.now()}`,
        provider: 'mistral',
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
    // Safety check for empty responses
    if (!result.text) return 0.5;

    const responseLength = result.text.length;
    const hasGoodLength = responseLength > 50 && responseLength < 2500;
    return hasGoodLength ? 0.8 : 0.62;
  }
}






















