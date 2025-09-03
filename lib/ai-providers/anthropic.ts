import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic';
  models = [
    // Latest Claude 4 models
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    // Claude 3.7 models
    'claude-3-7-sonnet-20250219',
    // Claude 3.5 models
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    // Legacy Claude 3 models
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    // Legacy Claude 2 models
    'claude-2.1',
    'claude-2.0'
  ];

  isConfigured(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY && 
             process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' &&
             process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-'));
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured()) {
        throw new Error('Anthropic API key not configured');
      }

      const result = await generateText({
        model: anthropic(config.model),
        prompt,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 1000,
        topP: config.topP || 1,
      });

      const responseTime = Date.now() - startTime;
      
      console.log('=== ANTHROPIC SUCCESS ===');
      console.log('Response length:', result.text?.length || 0);
      console.log('Has text:', !!result.text);
      console.log('First 200 chars:', result.text ? result.text.substring(0, 200) : 'NO TEXT');
      console.log('=========================');

      return {
        id: `anthropic-${Date.now()}`,
        provider: 'anthropic',
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
