import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/alpaca/client';
import { generateTradingPrompt } from '@/lib/alpaca/prompts';
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import { GroqProvider } from '@/lib/ai-providers/groq';
import type { TradeDecision } from '@/lib/alpaca/types';

// Map model IDs to providers
const PROVIDER_MAP: Record<string, any> = {
  'claude-3-5-sonnet-20241022': { provider: new AnthropicProvider(), model: 'claude-3-5-sonnet-20241022' },
  'gpt-4o': { provider: new OpenAIProvider(), model: 'gpt-4o' },
  'gemini-2.0-flash-exp': { provider: new GoogleProvider(), model: 'gemini-2.0-flash-exp' },
  'llama-3.1-70b-versatile': { provider: new GroqProvider(), model: 'llama-3.1-70b-versatile' },
};

const MODEL_NAMES: Record<string, string> = {
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'gpt-4o': 'GPT-4o',
  'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
  'llama-3.1-70b-versatile': 'Llama 3.1 70B',
};

// Helper function to strip markdown code blocks from JSON responses
function stripMarkdownCodeBlocks(text: string): string {
  // Remove ```json or ``` wrappers
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7); // Remove ```json
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3); // Remove ```
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3); // Remove trailing ```
  }
  return cleaned.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedModels } = body;

    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 models' },
        { status: 400 }
      );
    }

    console.log('🤖 Getting trading decisions from', selectedModels.length, 'models...');

    // Step 1: Get Alpaca account info
    const account = await getAccount();
    console.log('💰 Account balance:', account.portfolio_value);

    // Step 2: Generate trading prompt (same for all models)
    const date = new Date().toISOString().split('T')[0];
    const prompt = generateTradingPrompt(account, [], date);

    // Step 3: Call each AI model in parallel
    const decisionsPromises = selectedModels.map(async (modelId: string) => {
      try {
        const config = PROVIDER_MAP[modelId];
        if (!config) {
          throw new Error(`Unknown model: ${modelId}`);
        }

        console.log(`📊 Asking ${MODEL_NAMES[modelId]} for trading decision...`);

        const result = await config.provider.query(prompt, {
          model: config.model,
          provider: getProviderName(modelId),
          temperature: 0.7,
          maxTokens: 200,
          enabled: true,
        });

        // Parse JSON response (strip markdown code blocks if present)
        const cleanedResponse = stripMarkdownCodeBlocks(result.response);
        const decision: TradeDecision = JSON.parse(cleanedResponse);

        // Add model name
        return {
          model: MODEL_NAMES[modelId],
          ...decision,
        };
      } catch (error) {
        console.error(`❌ Error getting decision from ${MODEL_NAMES[modelId]}:`, error);
        // Return error as HOLD decision
        return {
          model: MODEL_NAMES[modelId],
          action: 'HOLD' as const,
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        };
      }
    });

    const decisions = await Promise.all(decisionsPromises);

    console.log('✅ Got', decisions.length, 'trading decisions');

    // Return decisions along with context for transparency
    return NextResponse.json({
      decisions,
      context: {
        accountBalance: account.portfolio_value,
        buyingPower: account.buying_power,
        cash: account.cash,
        analysisDate: date,
        promptSummary: 'AI models analyze current portfolio, market conditions, and generate trading recommendations based on risk assessment and growth opportunities.'
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getProviderName(modelId: string): string {
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gpt')) return 'openai';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('llama')) return 'groq';
  return 'unknown';
}
