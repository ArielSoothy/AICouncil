import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { alpacaTools, toolTracker } from '../alpaca/market-data-tools';
import { getModelsByProvider } from '../models/model-registry';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  models = getModelsByProvider('openai').map(m => m.id);

  isConfigured(): boolean {
    return !!(process.env.OPENAI_API_KEY && 
             process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
             process.env.OPENAI_API_KEY.startsWith('sk-'));
  }

  async query(prompt: string, config: ModelConfig & { useTools?: boolean; maxSteps?: number; useWebSearch?: boolean }): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API key not configured');
      }

      // GPT-5 models have different parameter requirements
      const isGPT5 = config.model.startsWith('gpt-5');

      // GPT-5 requires maxCompletionTokens instead of maxTokens
      const tokenConfig = isGPT5
        ? { maxCompletionTokens: config.maxTokens || 1000 }
        : { maxOutputTokens: config.maxTokens || 1000 };

      // GPT-5 only supports temperature=1, other values are not allowed
      const temperatureConfig = isGPT5
        ? { temperature: 1 } // GPT-5 requires explicit temperature=1
        : { temperature: config.temperature || 0.7 };

      // Seed for reproducibility (OpenAI supports seed parameter)
      const seedConfig = config.seed ? { seed: config.seed } : {};

      // Build tools object - combine alpaca tools with web search if needed
      const tools: Record<string, any> = {};

      // Add Alpaca trading tools if requested
      if (config.useTools) {
        Object.assign(tools, alpacaTools);
      }

      // Add OpenAI web search if requested (requires GPT-4o+ or GPT-5)
      if (config.useWebSearch) {
        tools.web_search = openai.tools.webSearchPreview({});
      }

      const hasTools = Object.keys(tools).length > 0;

      const result = await generateText({
        model: openai(config.model),
        prompt,
        ...temperatureConfig,
        ...tokenConfig,
        topP: config.topP || 1,
        // Pass seed for reproducible outputs (OpenAI API supports this)
        ...(config.seed ? {
          experimental_providerMetadata: {
            openai: { seed: config.seed }
          }
        } : {}),

        // ✅ Tool use integration (Alpaca + Web Search)
        tools: hasTools ? tools : undefined,
        stopWhen: hasTools ? stepCountIs(config.maxSteps || 15) : stepCountIs(1),
        onStepFinish: hasTools ? (step) => {
          try {
            if (step.toolCalls && step.toolCalls.length > 0) {
              step.toolCalls.forEach((call: any) => {
                if (call.toolName !== 'web_search') {
                  const args = call.args || call.input || call.parameters || {};
                  toolTracker.logCall(call.toolName, args?.symbol || 'N/A');
                }
              });
            }
          } catch (e) {
            console.error('OpenAI onStepFinish error:', e);
          }
        } : undefined,
      });

      const responseTime = Date.now() - startTime;

      return {
        id: `openai-${Date.now()}`,
        provider: 'openai',
        model: config.model,
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
          args: tc.args || {},
          result: tc.result
        })) : undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      console.error('=== OPENAI PROVIDER ERROR ===');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Full error:', error);
      console.error('Model:', config.model);
      console.error('=============================');

      return {
        id: `openai-error-${Date.now()}`,
        provider: 'openai',
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
    // In a real implementation, you might use the model's confidence scores
    const responseLength = result.text.length;
    const hasGoodLength = responseLength > 50 && responseLength < 2000;
    
    return hasGoodLength ? 0.8 : 0.6;
  }
}
