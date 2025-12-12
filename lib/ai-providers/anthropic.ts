import { anthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';
import { alpacaTools, toolTracker } from '../alpaca/market-data-tools';
import { getModelsByProvider } from '../models/model-registry';

// Models that support Anthropic's native web search (web_search_20250305)
// Only newer Claude 3.5+ models support this feature
// Updated Nov 2025 with correct model IDs
const WEB_SEARCH_SUPPORTED_MODELS = [
  'claude-sonnet-4-5-20250929',     // Claude Sonnet 4.5 (Sept 2025)
  'claude-haiku-4-5-20251001',      // Claude Haiku 4.5 (Oct 2025)
  'claude-opus-4-1-20250805',       // Claude Opus 4.1 (Aug 2025)
  'claude-opus-4-20250514',         // Claude Opus 4 (May 2025)
  'claude-sonnet-4-20250514',       // Claude Sonnet 4 (May 2025)
  'claude-3-7-sonnet-20250219',     // Claude 3.7 Sonnet (Feb 2025)
  'claude-3-5-haiku-20241022',      // Claude 3.5 Haiku (Oct 2024)
];

function supportsWebSearch(model: string): boolean {
  return WEB_SEARCH_SUPPORTED_MODELS.some(m => model.includes(m) || m.includes(model));
}

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

      // Build tools object - combine alpaca tools with web search if needed
      const tools: Record<string, any> = {};

      // Add Alpaca trading tools if requested
      if (config.useTools) {
        Object.assign(tools, alpacaTools);
      }

      // Add Claude web search if requested AND model supports it
      // Only newer Claude 3.5+ models support web_search_20250305
      // Older models (Haiku, Opus, Claude 3) will cause runtime errors
      if (config.useWebSearch) {
        if (supportsWebSearch(config.model)) {
          try {
            const anthropicAny = anthropic as any;
            if (anthropicAny.tools?.webSearch_20250305) {
              tools.web_search = anthropicAny.tools.webSearch_20250305({ maxUses: 5 });
            }
          } catch {
            // Web search not available for this model
          }
        }
      }

      const hasTools = Object.keys(tools).length > 0;

      // DEBUG: Log tool configuration
      console.log(`🔧 Anthropic ${config.model}: useTools=${config.useTools}, hasTools=${hasTools}, toolCount=${Object.keys(tools).length}, toolNames=${Object.keys(tools).join(', ')}`);

      const result = await generateText({
        model: anthropic(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 1000,
        // Claude Sonnet 4.5 doesn't allow both temperature and topP
        // topP: config.topP || 1,

        // ✅ Tool use integration (Alpaca + Web Search)
        // toolChoice: 'required' forces model to call at least one tool
        // This ensures research agents always fetch live data
        tools: hasTools ? tools : undefined,
        toolChoice: hasTools ? 'required' : undefined,
        stopWhen: hasTools ? stepCountIs(config.maxSteps || 15) : stepCountIs(1),
        onStepFinish: hasTools ? (step) => {
          // Track tool usage for analytics (non-debug)
          if (step.toolCalls && step.toolCalls.length > 0) {
            step.toolCalls.forEach((call: any) => {
              if (call.toolName !== 'web_search') {
                toolTracker.logCall(call.toolName, call.args?.symbol || 'N/A');
              }
            });
          }
        } : undefined,
      });

      const responseTime = Date.now() - startTime;

      // DEBUG: Log result structure
      const extractedToolCalls = config.useTools ? result.steps?.flatMap(s => s.toolCalls || []) : [];
      console.log(`🔧 Anthropic ${config.model} RESULT: steps=${result.steps?.length || 0}, toolCalls=${extractedToolCalls?.length || 0}, text=${result.text?.substring(0, 100)}...`);

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
