import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';

export class GroqProvider implements AIProvider {
  name = 'Groq';
  models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it',
    'llama-3-groq-70b-tool-use',  // #1 on Berkeley Function Calling Leaderboard
    'llama-3-groq-8b-tool-use'    // #3 on Berkeley Function Calling Leaderboard
  ];

  isConfigured(): boolean {
    return !!(process.env.GROQ_API_KEY && 
             process.env.GROQ_API_KEY !== 'your_groq_api_key_here' &&
             process.env.GROQ_API_KEY.startsWith('gsk_'));
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured()) {
        console.error('Groq API key not configured properly:', {
          keyExists: !!process.env.GROQ_API_KEY,
          keyPrefix: process.env.GROQ_API_KEY?.substring(0, 4) || 'none',
          keyStartsWithGsk: process.env.GROQ_API_KEY?.startsWith('gsk_') || false
        })
        throw new Error('Groq API key not configured properly');
      }

      console.log('Groq: Attempting query with model:', config.model)
      console.log('Groq: API key configured:', this.isConfigured())

      const result = await generateText({
        model: groq(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,
      });

      const responseTime = Date.now() - startTime;

      console.log('Groq: Success! Response length:', result.text?.length || 0)

      // Check for empty response
      if (!result.text || result.text.trim().length === 0) {
        console.error('Groq returned empty response')
        throw new Error('Groq returned empty response')
      }

      return {
        id: `groq-${Date.now()}`,
        provider: 'groq',
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
        id: `groq-error-${Date.now()}`,
        provider: 'groq',
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
    // Simple confidence calculation based on response length and token usage
    // Groq models tend to be very fast, so we give them good base confidence
    const responseLength = result.text.length;
    const hasGoodLength = responseLength > 50 && responseLength < 2000;
    
    return hasGoodLength ? 0.85 : 0.7;
  }
}