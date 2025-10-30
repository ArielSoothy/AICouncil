import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { alpacaTools, toolTracker } from '../alpaca/market-data-tools';
import { getModelsByProvider } from '../models/model-registry';

export class GroqProvider implements AIProvider {
  name = 'Groq';
  models = getModelsByProvider('groq').map(m => m.id);

  isConfigured(): boolean {
    return !!(process.env.GROQ_API_KEY && 
             process.env.GROQ_API_KEY !== 'your_groq_api_key_here' &&
             process.env.GROQ_API_KEY.startsWith('gsk_'));
  }

  async query(prompt: string, config: ModelConfig & { useTools?: boolean; maxSteps?: number }): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Define fallback models for rate-limited models
    // Try multiple fallbacks in order of preference
    const fallbackModels: Record<string, string[]> = {
      'llama-3.3-70b-versatile': ['gemma2-9b-it', 'llama-3.1-8b-instant'],  // Try gemma2 first, then llama 8b
      'llama-3-groq-70b-tool-use': ['llama-3-groq-8b-tool-use', 'llama-3.1-8b-instant']  // Try 8b tool-use first
    };
    
    const attemptQuery = async (modelToUse: string, fallbackIndex: number = 0, originalModel?: string): Promise<ModelResponse> => {
      try {
        if (!this.isConfigured()) {
          console.error('Groq API key not configured properly:', {
            keyExists: !!process.env.GROQ_API_KEY,
            keyPrefix: process.env.GROQ_API_KEY?.substring(0, 4) || 'none',
            keyStartsWithGsk: process.env.GROQ_API_KEY?.startsWith('gsk_') || false
          })
          throw new Error('Groq API key not configured properly');
        }

        console.log('Groq: Attempting query with model:', modelToUse)
        if (originalModel) {
          console.log(`Groq: Using fallback model due to rate limit (original: ${originalModel})`)
        }
        console.log('Groq: API key configured:', this.isConfigured())

        const result = await generateText({
          model: groq(modelToUse),
          prompt,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
          topP: config.topP || 1,

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

        console.log('Groq: Success! Response length:', result.text?.length || 0)
        if (!result.text || result.text.trim() === '') {
          console.error('CRITICAL: Groq result.text is empty/undefined!', {
            hasText: !!result.text,
            textType: typeof result.text,
            textValue: result.text,
            resultKeys: Object.keys(result),
            fullResult: JSON.stringify(result, null, 2)
          });
        }

        // Check for empty response
        if (!result.text || result.text.trim().length === 0) {
          console.error('Groq returned empty response')
          throw new Error('Groq returned empty response')
        }

        return {
          id: `groq-${Date.now()}`,
          provider: 'groq',
          model: originalModel ? `${modelToUse} (fallback from ${originalModel})` : config.model,
          response: result.text,
          confidence: this.calculateConfidence(result),
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
        // Check if it's a rate limit error and we have a fallback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRateLimitError = errorMessage.includes('Rate limit reached') || errorMessage.includes('TPD');
        
        const original = originalModel || modelToUse;
        const availableFallbacks = fallbackModels[original];
        
        if (isRateLimitError && availableFallbacks && fallbackIndex < availableFallbacks.length) {
          const nextFallback = availableFallbacks[fallbackIndex];
          console.log(`Groq: Rate limit hit for ${modelToUse}, attempting fallback to ${nextFallback}`)
          return attemptQuery(nextFallback, fallbackIndex + 1, original);
        }
        
        // If no more fallbacks or fallback also failed, return error response
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
          error: errorMessage,
        };
      }
    };
    
    return attemptQuery(config.model);
  }

  private calculateConfidence(result: any): number {
    // Simple confidence calculation based on response length and token usage
    // Groq models tend to be very fast, so we give them good base confidence
    const responseLength = result.text.length;
    const hasGoodLength = responseLength > 50 && responseLength < 2000;
    
    return hasGoodLength ? 0.85 : 0.7;
  }
}