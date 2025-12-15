import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccount, placeBracketOrder, getLatestQuote } from '@/lib/alpaca/client';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';

// API Providers (for Free/Pro/Max tiers - per-call billing)
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import { GroqProvider } from '@/lib/ai-providers/groq';
import { MistralProvider } from '@/lib/ai-providers/mistral';
import { PerplexityProvider } from '@/lib/ai-providers/perplexity';
import { CohereProvider } from '@/lib/ai-providers/cohere';
import { XAIProvider } from '@/lib/ai-providers/xai';

// CLI Providers (for Sub Pro/Max tiers - subscription billing)
import { ClaudeCLIProvider, CodexCLIProvider, GoogleCLIProvider } from '@/lib/ai-providers/cli';

import { getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import { runAllModelsArena, rerunModelsWithExclusions } from '@/lib/arena/arena-research';
import type { ArenaRunResult, ArenaModelResult } from '@/lib/arena/arena-research';
import { getLockedStocks, lockStock } from '@/lib/arena/stock-locks';
import { getTodayRotation } from '@/lib/arena/rotation';
import { getTodaysTrades } from '@/lib/arena/trade-guards';

// API Providers (per-call billing)
const API_PROVIDERS: Record<string, any> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
  groq: new GroqProvider(),
  mistral: new MistralProvider(),
  perplexity: new PerplexityProvider(),
  cohere: new CohereProvider(),
  xai: new XAIProvider(),
};

// CLI Providers (subscription billing)
const CLI_PROVIDERS: Record<string, any> = {
  anthropic: new ClaudeCLIProvider(),
  openai: new CodexCLIProvider(),
  google: new GoogleCLIProvider(),
  // Groq, Mistral, Perplexity, Cohere, xAI don't have CLI providers
  // They fall back to API providers (most are free anyway)
  groq: new GroqProvider(),      // Groq is FREE - no cost concern
  mistral: new MistralProvider(),
  perplexity: new PerplexityProvider(),
  cohere: new CohereProvider(),
  xai: new XAIProvider(),
};

type UserTier = 'free' | 'pro' | 'max' | 'sub-pro' | 'sub-max';

/**
 * Check if tier uses subscription (CLI) providers
 */
function isSubscriptionTier(tier: UserTier): boolean {
  return tier === 'sub-pro' || tier === 'sub-max';
}

/**
 * Get the appropriate providers based on user tier
 */
function getProvidersForTier(tier: UserTier): Record<string, any> {
  if (isSubscriptionTier(tier)) {
    console.log(`🔷 Using CLI providers for ${tier} tier (subscription billing)`);
    return CLI_PROVIDERS;
  }
  console.log(`🔶 Using API providers for ${tier} tier (per-call billing)`);
  return API_PROVIDERS;
}

/**
 * Create a query function that uses the correct provider for the tier
 */
function createQueryFunction(tier: UserTier): (modelId: string, prompt: string) => Promise<string> {
  const providers = getProvidersForTier(tier);

  return async (modelId: string, prompt: string): Promise<string> => {
    const providerType = getProviderType(modelId);
    if (!providerType || !providers[providerType]) {
      throw new Error(`Unknown model or provider: ${modelId}`);
    }

    const provider = providers[providerType];
    const result = await provider.query(prompt, {
      model: modelId,
      provider: providerType,
      temperature: 0.7,
      maxTokens: 1500,
      enabled: true,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result.response;
  };
}

/**
 * POST /api/arena/execute
 *
 * Supports tier-based provider selection:
 * - Sub Pro/Max tiers → CLI providers (subscription billing)
 * - Free/Pro/Max tiers → API providers (per-call billing)
 *
 * Phase 1: Research Phase (PARALLEL)
 * - All models research and provide recommendations simultaneously
 * - Returns all recommendations including any conflicts
 * - User reviews and decides on conflict resolution
 *
 * Phase 2: Execution Phase (called separately after user approval)
 * - Execute approved trades with bracket orders
 * - Lock stocks to prevent future conflicts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phase, approvedTrades, rerunModels, additionalExclusions, tier = 'free', selectedModels } = body;

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

    // Prefer models from request (frontend selection), fallback to DB config
    const enabledModels = selectedModels || (config.enabled_models as string[]);
    if (!enabledModels || enabledModels.length === 0) {
      return NextResponse.json(
        { error: 'No models enabled for Arena Mode' },
        { status: 400 }
      );
    }
    console.log(`🎯 Arena models source: ${selectedModels ? 'frontend selection' : 'database config'}`);
    console.log(`   Models: ${enabledModels.join(', ')}`)

    // Get account info
    const account = await getAccount();
    const timeframe = config.default_timeframe as TradingTimeframe;

    // Create tier-aware query function
    const queryModel = createQueryFunction(tier as UserTier);

    console.log(`🏟️ Arena Mode: Using ${tier} tier`);

    // Handle different phases
    if (phase === 'execute') {
      // PHASE 2: Execute approved trades
      return await executeApprovedTrades(supabase, approvedTrades, account, timeframe);
    }

    if (phase === 'rerun') {
      // RE-RUN: Query specific models with additional exclusions
      return await rerunModelsWithConflicts(
        supabase,
        rerunModels,
        additionalExclusions,
        account,
        timeframe,
        queryModel
      );
    }

    // PHASE 1: Research Phase (default) - All models analyze in parallel
    return await runResearchPhase(supabase, enabledModels, account, timeframe, queryModel, tier as UserTier);

  } catch (error) {
    console.error('❌ Arena execute error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Phase 1: Research Phase
 * All models research and provide recommendations in PARALLEL
 * Returns results including any conflicts for user review
 */
async function runResearchPhase(
  supabase: any,
  enabledModels: string[],
  account: any,
  timeframe: TradingTimeframe,
  queryModel: (modelId: string, prompt: string) => Promise<string>,
  tier: UserTier
): Promise<NextResponse> {
  console.log('🏟️  ARENA MODE: Starting Research Phase...');
  console.log(`   Models competing: ${enabledModels.length}`);
  console.log(`   Timeframe: ${timeframe}`);
  console.log(`   Tier: ${tier} (${isSubscriptionTier(tier) ? 'CLI/Subscription' : 'API/Per-call'})`);

  // Get today's rotation order for fair selection
  const orderedModels = await getTodayRotation(enabledModels);
  console.log(`📋 Today's rotation: ${orderedModels.join(' → ')}`);

  // Get currently locked stocks (from existing open positions)
  const lockedStocks = await getLockedStocks();
  console.log(`🔒 Currently locked: ${lockedStocks.length > 0 ? lockedStocks.join(', ') : 'none'}`);

  // Get stocks traded today (for soft guidance in prompts)
  const todaysTrades = await getTodaysTrades();
  const stocksTradedToday = todaysTrades.stocksTradedToday;
  console.log(`📊 Traded today: ${stocksTradedToday.length > 0 ? stocksTradedToday.join(', ') : 'none'}`);

  // Create arena run record
  const { data: arenaRun, error: runError } = await supabase
    .from('arena_runs')
    .insert({
      status: 'research_complete',
      models_executed: orderedModels,
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

  // Run ALL models in PARALLEL
  const runResult: ArenaRunResult = await runAllModelsArena(
    orderedModels,
    lockedStocks,
    timeframe,
    account,
    queryModel,
    stocksTradedToday
  );

  // Update run record with research results
  await supabase
    .from('arena_runs')
    .update({
      status: runResult.hasConflicts ? 'has_conflicts' : 'ready_to_execute',
      completed_at: new Date().toISOString(),
      trades_generated: runResult.successfulModels,
    })
    .eq('id', arenaRun.id);

  // Update last_run_at in config
  await supabase
    .from('arena_config')
    .update({
      last_run_at: new Date().toISOString(),
    })
    .eq('id', 1);

  console.log(`\n🏆 Research Phase Complete!`);
  console.log(`   Successful: ${runResult.successfulModels}/${runResult.totalModels}`);
  console.log(`   Conflicts: ${runResult.conflicts.length}`);

  return NextResponse.json({
    success: true,
    phase: 'research',
    runId: arenaRun.id,
    results: runResult.results,
    conflicts: runResult.conflicts,
    hasConflicts: runResult.hasConflicts,
    uniqueStocks: runResult.uniqueStocks,
    summary: {
      totalModels: runResult.totalModels,
      successfulModels: runResult.successfulModels,
      failedModels: runResult.failedModels,
      duration: runResult.totalDuration,
    },
    // Rotation info for UI
    rotationOrder: orderedModels,
    lockedStocks,
    // Tier info
    tier,
    providerType: isSubscriptionTier(tier) ? 'subscription' : 'api',
  });
}

/**
 * Re-run specific models with additional exclusions
 * Used when user wants to resolve conflicts by re-querying
 */
async function rerunModelsWithConflicts(
  supabase: any,
  modelIds: string[],
  additionalExclusions: string[],
  account: any,
  timeframe: TradingTimeframe,
  queryModel: (modelId: string, prompt: string) => Promise<string>
): Promise<NextResponse> {
  console.log('🔄 ARENA MODE: Re-running models with exclusions...');
  console.log(`   Models to re-run: ${modelIds.join(', ')}`);
  console.log(`   Additional exclusions: ${additionalExclusions.join(', ')}`);

  // Get currently locked stocks
  const lockedStocks = await getLockedStocks();
  const allExclusions = [...new Set([...lockedStocks, ...additionalExclusions])];

  // Re-run models
  const results: ArenaModelResult[] = await rerunModelsWithExclusions(
    modelIds,
    additionalExclusions,
    lockedStocks,
    timeframe,
    account,
    queryModel
  );

  // Check for new conflicts
  const stockPicks: Record<string, string[]> = {};
  for (const result of results) {
    if (result.status === 'success' && result.selectedSymbol) {
      if (!stockPicks[result.selectedSymbol]) {
        stockPicks[result.selectedSymbol] = [];
      }
      stockPicks[result.selectedSymbol].push(result.modelId);
    }
  }

  const newConflicts = Object.entries(stockPicks)
    .filter(([_, models]) => models.length > 1)
    .map(([symbol, models]) => ({ symbol, models }));

  return NextResponse.json({
    success: true,
    phase: 'rerun',
    results,
    newConflicts,
    hasConflicts: newConflicts.length > 0,
    exclusionsUsed: allExclusions,
  });
}

/**
 * Phase 2: Execute approved trades
 * Places bracket orders for approved model decisions
 */
async function executeApprovedTrades(
  supabase: any,
  approvedTrades: Array<{
    modelId: string;
    symbol: string;
    quantity: number;
    stopLoss: number;
    takeProfit: number;
    reasoning: string;
    confidence: number;
  }>,
  account: any,
  timeframe: TradingTimeframe
): Promise<NextResponse> {
  console.log('🚀 ARENA MODE: Executing approved trades...');
  console.log(`   Trades to execute: ${approvedTrades.length}`);

  const executedTrades: any[] = [];
  const errors: any[] = [];

  for (const trade of approvedTrades) {
    try {
      console.log(`\n📈 Executing: ${trade.symbol} for ${trade.modelId}`);

      // Get current price for reference
      const quote = await getLatestQuote(trade.symbol);
      const entryPrice = quote.price;

      // Place BRACKET order (entry + stop-loss + take-profit)
      const bracketResult = await placeBracketOrder(
        trade.symbol,
        trade.quantity,
        'buy', // Arena always uses BUY for opening positions
        trade.takeProfit,
        trade.stopLoss
      );

      // Lock stock to this model
      const { data: savedTrade, error: saveError } = await supabase
        .from('arena_trades')
        .insert({
          model_id: trade.modelId,
          symbol: trade.symbol,
          action: 'BUY',
          quantity: trade.quantity,
          reasoning: trade.reasoning,
          confidence: trade.confidence,
          timeframe,
          // Bracket order data
          entry_price: entryPrice,
          stop_loss_price: trade.stopLoss,
          take_profit_price: trade.takeProfit,
          // Alpaca order IDs
          alpaca_order_id: bracketResult.parentOrder.id,
          stop_loss_order_id: bracketResult.stopLossOrderId,
          take_profit_order_id: bracketResult.takeProfitOrderId,
          order_status: bracketResult.parentOrder.status,
          bracket_status: 'active',
          // P&L is NULL until position closes
          pnl: null,
          pnl_percent: null,
        })
        .select()
        .single();

      if (saveError) {
        console.error(`❌ Error saving trade:`, saveError);
        errors.push({ modelId: trade.modelId, error: saveError.message });
        continue;
      }

      // Lock stock to this model
      await lockStock(trade.modelId, trade.symbol, savedTrade.id);

      executedTrades.push({
        ...savedTrade,
        bracketResult,
      });

      console.log(`✅ ${trade.modelId}: Bracket order placed for ${trade.symbol}`);
      console.log(`   Entry: ~$${entryPrice}, SL: $${trade.stopLoss}, TP: $${trade.takeProfit}`);
      console.log(`   Parent Order: ${bracketResult.parentOrder.id}`);

    } catch (error) {
      console.error(`❌ Error executing ${trade.modelId}:`, error);
      errors.push({
        modelId: trade.modelId,
        symbol: trade.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: true,
    phase: 'execute',
    executedTrades,
    errors,
    summary: {
      requested: approvedTrades.length,
      executed: executedTrades.length,
      failed: errors.length,
    },
  });
}
