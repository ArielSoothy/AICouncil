import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

/**
 * Robust JSON extraction from model responses
 */
function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Pattern 1: Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Pattern 2: Extract JSON object from surrounding text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Pattern 3: Try to fix common JSON issues
  cleaned = cleaned
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/'/g, '"') // Replace single quotes with double quotes
    .trim();

  // Pattern 4: If still not valid, try to find complete JSON
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return match[0];
    }
    return cleaned;
  }
}

/**
 * POST /api/arena/execute
 * Executes autonomous trading run for all enabled models
 * This can be triggered manually or by a cron job
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Step 1: Get Arena config
    const { data: config, error: configError } = await supabase
      .from('arena_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (configError) {
      console.error('Error fetching arena config:', configError);
      return NextResponse.json(
        { error: 'Failed to fetch arena configuration' },
        { status: 500 }
      );
    }

    // Check if Arena Mode is enabled
    if (!config.is_enabled) {
      return NextResponse.json(
        { error: 'Arena Mode is currently disabled' },
        { status: 403 }
      );
    }

    const enabledModels = config.enabled_models as string[];
    if (!enabledModels || enabledModels.length === 0) {
      return NextResponse.json(
        { error: 'No models enabled for Arena Mode' },
        { status: 400 }
      );
    }

    console.log('🏟️  Starting Arena Mode autonomous trading run...');
    console.log(`   Models competing: ${enabledModels.length}`);
    console.log(`   Timeframe: ${config.default_timeframe}`);

    // Step 2: Create arena run record
    const { data: arenaRun, error: runError } = await supabase
      .from('arena_runs')
      .insert({
        status: 'running',
        models_executed: enabledModels,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError) {
      console.error('Error creating arena run:', runError);
      return NextResponse.json(
        { error: 'Failed to create arena run record' },
        { status: 500 }
      );
    }

    const runId = arenaRun.id;

    // Step 3: Get Alpaca account info
    const account = await getAccount();
    console.log('💰 Account balance:', account.portfolio_value);

    // Step 4: Generate trading prompt
    const date = new Date().toISOString().split('T')[0];
    const timeframe = config.default_timeframe as TradingTimeframe;
    const prompt = generateEnhancedTradingPrompt(account, [], date, timeframe);

    // Step 5: Execute trading for each model in parallel
    const tradesPromises = enabledModels.map(async (modelId: string) => {
      try {
        const providerType = getProviderType(modelId);
        if (!providerType || !PROVIDERS[providerType]) {
          throw new Error(`Unknown model or provider: ${modelId}`);
        }

        const provider = PROVIDERS[providerType];
        const modelName = getModelDisplayName(modelId);

        console.log(`🤖 ${modelName} analyzing market...`);

        // Query AI model for trading decision
        const result = await provider.query(prompt, {
          model: modelId,
          provider: providerType,
          temperature: 0.7,
          maxTokens: 1500,
          enabled: true,
        });

        // Parse trading decision
        const cleanedResponse = extractJSON(result.response);
        const decision: TradeDecision = JSON.parse(cleanedResponse);

        // Save trade to arena_trades table
        const { data: trade, error: tradeError } = await supabase
          .from('arena_trades')
          .insert({
            model_id: modelId,
            model_name: modelName,
            provider: providerType,
            symbol: decision.symbol,
            action: decision.action,
            quantity: decision.quantity,
            reasoning: decision.reasoning,
            confidence: decision.confidence,
            timeframe,
            scheduled_run_id: runId,
            order_status: 'simulated', // For now, simulate trades
          })
          .select()
          .single();

        if (tradeError) {
          console.error(`❌ Error saving trade for ${modelName}:`, tradeError);
          return null;
        }

        console.log(`✅ ${modelName}: ${decision.action} ${decision.symbol || ''}`);
        return trade;

      } catch (error) {
        const modelName = getModelDisplayName(modelId);
        console.error(`❌ Error executing ${modelName}:`, error);
        return null;
      }
    });

    const trades = await Promise.all(tradesPromises);
    const successfulTrades = trades.filter(t => t !== null);

    // Step 6: Update arena run with results
    await supabase
      .from('arena_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        trades_generated: successfulTrades.length,
      })
      .eq('id', runId);

    // Step 7: Update last_run_at in config
    await supabase
      .from('arena_config')
      .update({
        last_run_at: new Date().toISOString(),
      })
      .eq('id', 1);

    console.log(`🏆 Arena run complete: ${successfulTrades.length}/${enabledModels.length} trades executed`);

    return NextResponse.json({
      success: true,
      runId,
      tradesExecuted: successfulTrades.length,
      totalModels: enabledModels.length,
      trades: successfulTrades,
    });

  } catch (error) {
    console.error('❌ Arena execute error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
