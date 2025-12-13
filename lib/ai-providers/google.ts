import { google } from '@ai-sdk/google';
import { generateText, stepCountIs } from 'ai';
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

  async query(prompt: string, config: ModelConfig & { useTools?: boolean; maxSteps?: number; useWebSearch?: boolean }): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('Google AI API key not configured');
      }

      console.log('Google AI: Attempting query with model:', config.model);
      console.log('Google AI: API key configured:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      console.log('Google AI: Web search enabled:', config.useWebSearch || false);
      console.log('Google AI: Seed:', config.seed || 'none (Gemini seed support limited)');

      // Build tools object - combine alpaca tools with Google Search if needed
      const tools: Record<string, any> = {};

      // Add Alpaca trading tools if requested
      if (config.useTools) {
        Object.assign(tools, alpacaTools);
      }

      // Add Google Search grounding if web search is requested
      // Requires @ai-sdk/google v2.x+
      if (config.useWebSearch) {
        try {
          const googleAny = google as any;
          if (googleAny.tools?.googleSearch) {
            tools.google_search = googleAny.tools.googleSearch({});
            console.log('Google AI: Native Google Search grounding enabled');
          } else {
            console.log('Google AI: Web search requested but SDK does not support google.tools.googleSearch');
          }
        } catch (e) {
          console.log('Google AI: Could not enable native search:', e);
        }
      }

      const hasTools = Object.keys(tools).length > 0;

      const result = await generateText({
        model: google(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 1000,
        // ✅ Reduced top_p to prevent premature stopping and truncation
        // @see https://discuss.ai.google.dev/t/truncated-response-issue-with-gemini-2-5-flash-preview/81258
        topP: 0.5,

        // ✅ Tool use integration (Alpaca + Google Search)
        tools: hasTools ? tools : undefined,
        stopWhen: hasTools ? stepCountIs(config.maxSteps || 15) : stepCountIs(1),
        onStepFinish: hasTools ? (step) => {
          try {
            console.log('🔍 Google Step finished:', {
              text: step.text?.substring(0, 100),
              toolCalls: step.toolCalls?.length || 0,
              toolResults: step.toolResults?.length || 0
            });
            if (step.toolCalls && step.toolCalls.length > 0) {
              step.toolCalls.forEach((call: any) => {
                // Gemini may use different property names for arguments
                const args = call.args || call.input || call.parameters || {};

                if (call.toolName === 'google_search') {
                  console.log(`🔍 ${config.model} → Google Search`);
                } else {
                  console.log(`🔧 ${config.model} → ${call.toolName}(${JSON.stringify(args)})`);
                  toolTracker.logCall(call.toolName, args?.symbol || 'N/A');
                }
              });
            }
          } catch (e) {
            console.error('Google AI onStepFinish error:', e);
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
          prompt: result.usage?.inputTokens || 0,
          completion: result.usage?.outputTokens || 0,
          total: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
        },
        timestamp: new Date(),
        toolCalls: config.useTools ? result.steps?.flatMap(s => s.toolCalls || []).map((tc: any) => ({
          toolName: tc.toolName,
          args: tc.args || {},
          result: tc.result
        })) : undefined,
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
