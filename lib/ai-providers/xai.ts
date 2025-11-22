import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { alpacaTools, toolTracker } from '../alpaca/market-data-tools';
import { getModelsByProvider } from '../models/model-registry';

export class XAIProvider implements AIProvider {
  name = 'xAI';
  models = getModelsByProvider('xai').map(m => m.id);

  isConfigured(): boolean {
    return !!(
      process.env.XAI_API_KEY &&
      process.env.XAI_API_KEY !== 'your_xai_api_key_here' &&
      process.env.XAI_API_KEY.startsWith('xai-')
    );
  }

  async query(prompt: string, config: ModelConfig & { useTools?: boolean; maxSteps?: number; useWebSearch?: boolean }): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('xAI API key not configured');
      }

      const xai = createOpenAI({
        baseURL: 'https://api.x.ai/v1',
        apiKey: process.env.XAI_API_KEY as string,
      });

      console.log('=== XAI DEBUG ===');
      console.log('Model:', config.model);
      console.log('useTools:', config.useTools);
      console.log('useWebSearch:', config.useWebSearch);
      console.log('=================');

      // Build tools object
      const tools: Record<string, any> = {};

      if (config.useTools) {
        Object.assign(tools, alpacaTools);
      }

      const hasTools = Object.keys(tools).length > 0;

      const result = await generateText({
        model: xai(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,

        // xAI Live Search via provider options
        providerOptions: config.useWebSearch ? {
          xai: {
            searchParameters: {
              mode: 'auto', // 'auto', 'on', or 'off'
              returnCitations: true,
              maxSearchResults: 5,
            },
          },
        } : undefined,

        // ✅ Tool use integration
        tools: hasTools ? tools : undefined,
        maxSteps: hasTools ? (config.maxSteps || 15) : 1,
        onStepFinish: hasTools ? (step) => {
          if (step.toolCalls && step.toolCalls.length > 0) {
            step.toolCalls.forEach((call: any) => {
              console.log(`🔧 ${config.model} → ${call.toolName}(${JSON.stringify(call.args)})`);
              toolTracker.logCall(call.toolName, call.args.symbol || 'N/A');
            });
          }
        } : undefined,
      });

      if (config.useWebSearch) {
        console.log('xAI: Live Search enabled (auto mode)');
      }

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
        toolCalls: config.useTools ? result.steps?.flatMap(s => s.toolCalls || []) : undefined,
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


