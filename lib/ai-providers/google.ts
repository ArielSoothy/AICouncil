import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { alpacaTools, toolTracker } from '../alpaca/market-data-tools';
import { getModelsByProvider } from '../models/model-registry';

export class GoogleProvider implements AIProvider {
  name = 'Google';
  models = getModelsByProvider('google').map(m => m.id);

  isConfigured(): boolean {
    return !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY && 
             process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'your_google_ai_api_key_here' &&
             process.env.GOOGLE_GENERATIVE_AI_API_KEY.length > 10);
  }

  async query(prompt: string, config: ModelConfig & { useTools?: boolean; maxSteps?: number }): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('Google AI API key not configured');
      }

      console.log('Google AI: Attempting query with model:', config.model);
      console.log('Google AI: API key configured:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

      const result = await generateText({
        model: google(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,

        // ✅ Tool use integration
        tools: config.useTools ? alpacaTools : undefined,
        maxSteps: config.useTools ? (config.maxSteps || 15) : 1,
        onStepFinish: config.useTools ? (step) => {
          if (step.toolCalls && step.toolCalls.length > 0) {
            step.toolCalls.forEach((call: any) => {
              console.log(`🔧 ${config.model} → ${call.toolName}(${JSON.stringify(call.args)})`);
              toolTracker.logCall(call.toolName, call.args.symbol || 'N/A');
            });
          }
        } : undefined,
      });

      const responseTime = Date.now() - startTime;

      // Check for empty response
      if (!result.text || result.text.trim().length === 0) {
        console.error('Google AI: Returned empty response');
        throw new Error('Google AI returned empty response');
      }

      console.log('Google AI: Success! Response length:', result.text.length);

      return {
        id: `google-${Date.now()}`,
        provider: 'google',
        model: config.model,
        response: result.text,
        confidence: this.calculateConfidence(result.text),
        responseTime,
        tokens: {
          prompt: result.usage?.promptTokens || 0,
          completion: result.usage?.completionTokens || 0,
          total: result.usage?.totalTokens || 0,
        },
        timestamp: new Date(),
        toolCalls: config.useTools ? result.steps?.flatMap(s => s.toolCalls || []) : undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('Google AI Error:', error);
      
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

  private calculateConfidence(text: string): number {
    // Google-specific confidence calculation
    const responseLength = text.length;
    const hasGoodLength = responseLength > 2 && responseLength < 2500;
    
    return hasGoodLength ? 0.82 : 0.62;
  }
}
