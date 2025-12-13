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

      // 🔍 DEBUG: Log tool configuration
      console.log('=== OPENAI DEBUG ===');
      console.log('Model:', config.model);
      console.log('Is GPT-5:', isGPT5);
      console.log('Token param:', isGPT5 ? 'maxCompletionTokens' : 'maxTokens');
      console.log('Token value:', config.maxTokens || 1000);
      console.log('Temperature:', isGPT5 ? '1 (default only)' : (config.temperature || 0.7));
      console.log('Seed:', config.seed || 'none');
      console.log('useTools:', config.useTools);
      console.log('useWebSearch:', config.useWebSearch);
      console.log('maxSteps:', config.maxSteps);
      console.log('Tools passed:', config.useTools ? Object.keys(alpacaTools) : 'none');
      console.log('====================');

      // Build tools object - combine alpaca tools with web search if needed
      const tools: Record<string, any> = {};

      // Add Alpaca trading tools if requested
      if (config.useTools) {
        Object.assign(tools, alpacaTools);
      }

      // Add OpenAI web search if requested (requires GPT-4o+ or GPT-5)
      if (config.useWebSearch) {
        tools.web_search = openai.tools.webSearchPreview({});
        console.log('OpenAI: Native web search enabled');
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
            console.log('🔍 OpenAI Step finished:', {
              text: step.text?.substring(0, 100),
              toolCalls: step.toolCalls?.length || 0,
              toolResults: step.toolResults?.length || 0
            });
            if (step.toolCalls && step.toolCalls.length > 0) {
              step.toolCalls.forEach((call: any) => {
                if (call.toolName === 'web_search') {
                  console.log(`🔍 ${config.model} → OpenAI Web Search`);
                } else {
                  // Tool call args may be in different properties depending on AI SDK version
                  const args = call.args || call.input || call.parameters || {};
                  console.log(`🔧 ${config.model} → ${call.toolName}(${JSON.stringify(args)})`);
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

      console.log('=== OPENAI SUCCESS ===');
      console.log('Response length:', result.text?.length || 0);
      console.log('Has text:', !!result.text);
      console.log('Token usage:', result.usage);
      console.log('First 300 chars:', result.text ? result.text.substring(0, 300) : 'NO TEXT');
      console.log('Last 100 chars:', result.text ? result.text.substring(result.text.length - 100) : 'NO TEXT');
      if (config.useTools) {
        console.log('Total steps:', result.steps?.length || 0);
        console.log('Steps with toolCalls:', result.steps?.filter(s => s.toolCalls && s.toolCalls.length > 0).length || 0);
      }
      console.log('======================');

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
