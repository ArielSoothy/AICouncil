import { groq } from '@ai-sdk/groq';
import { generateText, stepCountIs } from 'ai';
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
    // Try llama 8b instant first (fast and reliable)
    const fallbackModels: Record<string, string[]> = {
      'llama-3.3-70b-versatile': ['llama-3.1-8b-instant'],  // gemma2-9b-it was decommissioned
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
          maxOutputTokens: config.maxTokens || 1000,
          topP: config.topP || 1,

          // ✅ Tool use integration
          tools: config.useTools ? alpacaTools : undefined,
          stopWhen: config.useTools ? stepCountIs(config.maxSteps || 15) : stepCountIs(1),
          onStepFinish: config.useTools ? (step) => {
            console.log(`🔧 Step finished: ${step.toolCalls?.length || 0} tool calls, toolResults: ${step.toolResults?.length || 0}`);
            if (step.toolCalls && step.toolCalls.length > 0) {
              step.toolCalls.forEach((call: any) => {
                // AI SDK uses 'input' not 'args' for tool call parameters
                const args = call.args || call.input || {};
                const argsStr = Object.keys(args).length > 0 ? JSON.stringify(args) : 'NO_ARGS';
                console.log(`🔧 ${config.model} → ${call.toolName}(${argsStr})`);
                toolTracker.logCall(call.toolName, args.symbol || 'N/A');
              });
            }
            // Also log tool results if available
            if (step.toolResults && step.toolResults.length > 0) {
              step.toolResults.forEach((tr: any, i: number) => {
                // AI SDK toolResults structure: { toolCallId, toolName, result }
                const resultData = tr.result ?? tr;
                const resultStr = typeof resultData === 'object'
                  ? JSON.stringify(resultData).substring(0, 200)
                  : String(resultData).substring(0, 200);
                console.log(`🔧 Tool result ${i} (${tr.toolName || 'unknown'}):`, resultStr);
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
            prompt: result.usage?.inputTokens || 0,
            completion: result.usage?.outputTokens || 0,
            total: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
          },
          timestamp: new Date(),
          toolCalls: config.useTools ? result.steps?.flatMap(s => s.toolCalls || []).map((tc: any) => ({
            toolName: tc.toolName,
            args: tc.args || tc.input || {},
            result: tc.result
          })) : undefined,
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