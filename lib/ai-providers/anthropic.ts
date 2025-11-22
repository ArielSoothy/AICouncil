import { anthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { alpacaTools, toolTracker } from '../alpaca/market-data-tools';
import { getModelsByProvider } from '../models/model-registry';

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic';
  models = getModelsByProvider('anthropic').map(m => m.id);

  isConfigured(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY && 
             process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' &&
             process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-'));
  }

  async query(prompt: string, config: ModelConfig & { useTools?: boolean; maxSteps?: number; useWebSearch?: boolean }): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        throw new Error('Anthropic API key not configured');
      }

      // 🔍 DEBUG: Log tool configuration
      console.log('=== ANTHROPIC DEBUG ===');
      console.log('Model:', config.model);
      console.log('useTools:', config.useTools);
      console.log('useWebSearch:', config.useWebSearch);
      console.log('maxSteps:', config.maxSteps);
      console.log('Tools passed:', config.useTools ? Object.keys(alpacaTools) : 'none');
      console.log('Prompt includes tools section:', prompt.includes('AVAILABLE RESEARCH TOOLS'));
      console.log('=======================');

      // Build tools object - combine alpaca tools with web search if needed
      const tools: Record<string, any> = {};

      // Add Alpaca trading tools if requested
      if (config.useTools) {
        Object.assign(tools, alpacaTools);
      }

      // Add Claude web search if requested
      // Requires @ai-sdk/anthropic v2.x+
      if (config.useWebSearch) {
        try {
          const anthropicAny = anthropic as any;
          if (anthropicAny.tools?.webSearch_20250305) {
            tools.web_search = anthropicAny.tools.webSearch_20250305({ maxUses: 5 });
            console.log('Anthropic: Native web search enabled');
          } else {
            console.log('Anthropic: Web search requested but SDK does not support anthropic.tools.webSearch_20250305');
          }
        } catch (e) {
          console.log('Anthropic: Could not enable native search:', e);
        }
      }

      const hasTools = Object.keys(tools).length > 0;

      const result = await generateText({
        model: anthropic(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 1000,
        // Claude Sonnet 4.5 doesn't allow both temperature and topP
        // topP: config.topP || 1,

        // ✅ Tool use integration (Alpaca + Web Search)
        tools: hasTools ? tools : undefined,
        stopWhen: hasTools ? stepCountIs(config.maxSteps || 15) : stepCountIs(1),
        onStepFinish: hasTools ? (step) => {
          console.log('🔍 Step finished:', {
            text: step.text?.substring(0, 100),
            toolCalls: step.toolCalls?.length || 0,
            toolResults: step.toolResults?.length || 0
          });
          if (step.toolCalls && step.toolCalls.length > 0) {
            step.toolCalls.forEach((call: any) => {
              if (call.toolName === 'web_search') {
                console.log(`🔍 ${config.model} → Claude Web Search`);
              } else {
                console.log(`🔧 ${config.model} → ${call.toolName}(${JSON.stringify(call.args)})`);
                toolTracker.logCall(call.toolName, call.args.symbol || 'N/A');
              }
            });
          }
        } : undefined,
      });

      const responseTime = Date.now() - startTime;

      console.log('=== ANTHROPIC SUCCESS ===');
      console.log('Response length:', result.text?.length || 0);
      console.log('Has text:', !!result.text);
      console.log('First 200 chars:', result.text ? result.text.substring(0, 200) : 'NO TEXT');
      if (config.useTools) {
        console.log('Total steps:', result.steps?.length || 0);
        console.log('Steps with toolCalls:', result.steps?.filter(s => s.toolCalls && s.toolCalls.length > 0).length || 0);
        console.log('Steps detail:', result.steps?.map(s => ({
          toolCallsCount: s.toolCalls?.length || 0,
          toolResultsCount: s.toolResults?.length || 0
        })));
      }
      console.log('=========================');

      return {
        id: `anthropic-${Date.now()}`,
        provider: 'anthropic',
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
      
      console.error('=== ANTHROPIC PROVIDER ERROR ===');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Full error:', error);
      console.error('Model:', config.model);
      console.error('================================');
      
      return {
        id: `anthropic-error-${Date.now()}`,
        provider: 'anthropic',
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
    // Anthropic-specific confidence calculation
    const responseLength = result.text.length;
    const hasGoodLength = responseLength > 50 && responseLength < 3000;
    
    return hasGoodLength ? 0.85 : 0.65;
  }
}
