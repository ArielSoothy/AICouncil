import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModelResponse, ModelConfig } from '../../types/consensus';
import { AIProvider } from './types';

export class GoogleProvider implements AIProvider {
  name = 'Google';
  models = [
    // Current Generation (Free)
    'gemini-2.5-pro',
    'gemini-2.5-flash', 
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    // Deprecated but still working
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ];

  isConfigured(): boolean {
    return !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY && 
             process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'your_google_ai_api_key_here' &&
             process.env.GOOGLE_GENERATIVE_AI_API_KEY.length > 10);
  }

  async query(prompt: string, config: ModelConfig): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isConfigured()) {
        throw new Error('Google AI API key not configured');
      }

      console.log('Google AI: Attempting query with model:', config.model);
      console.log('Google AI: API key configured:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

      // Initialize the Google AI client
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: config.model });
      
      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const responseTime = Date.now() - startTime;
      console.log('Google AI: Success! Response length:', text.length);

      return {
        id: `google-${Date.now()}`,
        provider: 'google',
        model: config.model,
        response: text,
        confidence: this.calculateConfidence(text),
        responseTime,
        tokens: {
          prompt: 0, // Google AI doesn't provide token usage in free tier
          completion: 0,
          total: 0,
        },
        timestamp: new Date(),
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
