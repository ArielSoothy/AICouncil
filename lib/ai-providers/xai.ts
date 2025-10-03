import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';

export class XAIProvider implements AIProvider {
  name = 'xAI';
  models = [
    // Grok 4 Series (2025)
    'grok-code-fast-1',
    'grok-4-fast-reasoning',
    'grok-4-fast-non-reasoning',
    'grok-4-0709',
    // Grok 3 Series
    'grok-3',
    'grok-3-mini',
    // Grok 2 Series
    'grok-2-vision-1212',
    'grok-2-1212',
    'grok-2-latest'
  ];

  isConfigured(): boolean {
    return !!(
      process.env.XAI_API_KEY &&
      process.env.XAI_API_KEY !== 'your_xai_api_key_here' &&
      process.env.XAI_API_KEY.startsWith('xai-')
    );
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('xAI API key not configured');
      }

      const xai = createOpenAI({
        baseURL: 'https://api.x.ai/v1',
        apiKey: process.env.XAI_API_KEY as string,
      });

      const result = await generateText({
        model: xai(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,
      });

      const responseTime = Date.now() - startTime;

      return {
        id: `xai-${Date.now()}`,
        provider: 'xai',
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
        id: `xai-error-${Date.now()}`,
        provider: 'xai',
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
    return hasGoodLength ? 0.82 : 0.65;
  }
}


