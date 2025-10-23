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
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
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

    console.log('🤝 Getting consensus from', selectedModels.length, 'models...');

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

        return decision;
      } catch (error) {
        console.error(`❌ Error getting decision from ${MODEL_NAMES[modelId]}:`, error);
        // Return HOLD on error
        return {
          action: 'HOLD' as const,
          symbol: undefined,
          quantity: undefined,
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        } as TradeDecision;
      }
    });

    const decisions = await Promise.all(decisionsPromises);

    // Step 4: Calculate consensus
    const votes = {
      BUY: decisions.filter(d => d.action === 'BUY').length,
      SELL: decisions.filter(d => d.action === 'SELL').length,
      HOLD: decisions.filter(d => d.action === 'HOLD').length,
    };

    console.log('🗳️  Vote breakdown:', votes);

    // Determine consensus action (majority wins)
    let consensusAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const maxVotes = Math.max(votes.BUY, votes.SELL, votes.HOLD);

    if (maxVotes === votes.BUY && votes.BUY > decisions.length / 2) {
      consensusAction = 'BUY';
    } else if (maxVotes === votes.SELL && votes.SELL > decisions.length / 2) {
      consensusAction = 'SELL';
    } else {
      consensusAction = 'HOLD';
    }

    console.log('✅ Consensus action:', consensusAction);

    // Step 5: Calculate aggregate values for BUY/SELL
    let consensusSymbol: string | undefined;
    let consensusQuantity: number | undefined;
    let consensusReasoning = '';
    let consensusConfidence = 0;

    if (consensusAction === 'BUY' || consensusAction === 'SELL') {
      const relevantDecisions = decisions.filter(d => d.action === consensusAction);

      // Most common symbol
      const symbolCounts: Record<string, number> = {};
      relevantDecisions.forEach(d => {
        if (d.symbol) {
          symbolCounts[d.symbol] = (symbolCounts[d.symbol] || 0) + 1;
        }
      });
      consensusSymbol = Object.keys(symbolCounts).sort((a, b) => symbolCounts[b] - symbolCounts[a])[0];

      // Average quantity
      const quantities = relevantDecisions.filter(d => d.quantity).map(d => d.quantity!);
      if (quantities.length > 0) {
        consensusQuantity = Math.round(quantities.reduce((a, b) => a + b, 0) / quantities.length);
      }

      // Average confidence
      const confidences = relevantDecisions.map(d => d.confidence || 0);
      consensusConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

      // Combine reasoning
      const reasonings = relevantDecisions.map(d => d.reasoning).filter(Boolean);
      consensusReasoning = `Consensus: ${votes[consensusAction]}/${decisions.length} models recommend ${consensusAction} ${consensusSymbol}. ${reasonings[0] || 'No reasoning provided.'}`;
    } else {
      // HOLD consensus
      consensusReasoning = `No clear consensus reached. Vote breakdown: BUY (${votes.BUY}), SELL (${votes.SELL}), HOLD (${votes.HOLD}). Recommend holding current positions.`;
      consensusConfidence = 0.5;
    }

    const consensus = {
      action: consensusAction,
      symbol: consensusSymbol,
      quantity: consensusQuantity,
      reasoning: consensusReasoning,
      confidence: consensusConfidence,
      votes,
      modelCount: decisions.length,
    };

    console.log('✅ Consensus result:', consensus);

    return NextResponse.json({ consensus });

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
