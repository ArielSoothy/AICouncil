import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';

export class GoogleProvider implements AIProvider {
  name = 'Google';
  models = [
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-1.5-pro-latest'
  ];

  isConfigured(): boolean {
    return !!(process.env.GOOGLE_AI_API_KEY && 
             process.env.GOOGLE_AI_API_KEY !== 'your_google_ai_api_key_here' &&
             process.env.GOOGLE_AI_API_KEY.length > 10);
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured()) {
        throw new Error('Google AI API key not configured');
      }

      const result = await generateText({
        model: google(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,
      });

      const responseTime = Date.now() - startTime;

      return {
        id: `google-${Date.now()}`,
        provider: 'google',
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
        id: `google-error-${Date.now()}`,
        provider: 'google',
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
    // Google-specific confidence calculation
    const responseLength = result.text.length;
    const hasGoodLength = responseLength > 50 && responseLength < 2500;
    
    return hasGoodLength ? 0.82 : 0.62;
  }
}
