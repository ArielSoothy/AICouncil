import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/alpaca/client';
import { generateEnhancedTradingPrompt } from '@/lib/alpaca/enhanced-prompts';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import { GroqProvider } from '@/lib/ai-providers/groq';
import { MistralProvider } from '@/lib/ai-providers/mistral';
import { PerplexityProvider } from '@/lib/ai-providers/perplexity';
import { CohereProvider } from '@/lib/ai-providers/cohere';
import { XAIProvider } from '@/lib/ai-providers/xai';
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import type { TradeDecision } from '@/lib/alpaca/types';

// Initialize all providers
const PROVIDERS = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
  groq: new GroqProvider(),
  mistral: new MistralProvider(),
  perplexity: new PerplexityProvider(),
  cohere: new CohereProvider(),
  xai: new XAIProvider(),
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
    const { selectedModels, timeframe = 'swing', targetSymbol } = body;

    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 models' },
        { status: 400 }
      );
    }

    const symbolText = targetSymbol ? ` on ${targetSymbol.toUpperCase()}` : '';
    console.log('🤝 Getting consensus from', selectedModels.length, 'models for', timeframe, 'trading' + symbolText + '...');

    // Step 1: Get Alpaca account info
    const account = await getAccount();
    console.log('💰 Account balance:', account.portfolio_value);

    // Step 2: Generate enhanced trading prompt with timeframe-specific analysis
    const date = new Date().toISOString().split('T')[0];
    const prompt = generateEnhancedTradingPrompt(account, [], date, timeframe as TradingTimeframe, targetSymbol);

    // Step 3: Call each AI model in parallel
    const decisionsPromises = selectedModels.map(async (modelId: string) => {
      try {
        const providerType = getProviderType(modelId);
        if (!providerType || !PROVIDERS[providerType]) {
          throw new Error(`Unknown model or provider: ${modelId}`);
        }

        const provider = PROVIDERS[providerType];
        const modelName = getModelDisplayName(modelId);

        console.log(`📊 Asking ${modelName} for trading decision...`);

        const result = await provider.query(prompt, {
          model: modelId,
          provider: providerType,
          temperature: 0.7,
          maxTokens: 500, // Increased for comprehensive analysis with stop-loss, take-profit, etc.
          enabled: true,
        });

        // Parse JSON response (strip markdown code blocks if present)
        const cleanedResponse = stripMarkdownCodeBlocks(result.response);
        const decision: TradeDecision = JSON.parse(cleanedResponse);

        return decision;
      } catch (error) {
        const modelName = getModelDisplayName(modelId);
        console.error(`❌ Error getting decision from ${modelName}:`, error);
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
