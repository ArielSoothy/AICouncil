/**
 * Arena Mode Research Integration
 *
 * PARALLEL execution flow:
 * 1. ALL models research and provide recommendations simultaneously
 * 2. Show all recommendations to user (including conflicts if multiple pick same stock)
 * 3. User can re-query specific models with exclusions if needed
 *
 * This allows:
 * - Full transparency of what each model recommends
 * - User control over conflict resolution
 * - Parallel execution (faster)
 */

import { runResearchAgents } from '@/lib/agents/research-agents';
import type { ResearchReport, ResearchTier } from '@/types/research-agents';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';
import type { AlpacaAccount } from '@/lib/alpaca/types';
import type { ArenaTradeDecision } from '@/lib/alpaca/types';
import { getModelDisplayName } from '@/lib/trading/models-config';
import { getLatestQuote } from '@/lib/alpaca/client';

// Popular stocks for Arena Mode selection
export const ARENA_STOCK_UNIVERSE = [
  // Tech Giants
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  // Semiconductors
  'AMD', 'INTC', 'AVGO', 'QCOM',
  // Finance
  'JPM', 'BAC', 'GS', 'V', 'MA',
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV',
  // Consumer
  'WMT', 'COST', 'HD', 'MCD', 'SBUX',
  // Energy
  'XOM', 'CVX',
  // Other
  'DIS', 'NFLX', 'CRM', 'ORCL'
];

export interface ArenaModelResult {
  modelId: string;
  modelName: string;
  status: 'success' | 'error' | 'pending';

  // Stock selection
  selectedSymbol: string | null;
  selectionReasoning: string;

  // Research (optional - only if we run deep research)
  research: ResearchReport | null;

  // Final decision with bracket order params
  decision: ArenaTradeDecision | null;

  // Error info
  error?: string;

  // Timing
  duration: number;

  // Provider billing mode proof (CLI = subscription, API = per-call billing)
  providerType?: 'CLI' | 'API';
}

export interface ArenaRunResult {
  // All model results
  results: ArenaModelResult[];

  // Conflict detection
  conflicts: StockConflict[];
  hasConflicts: boolean;

  // Summary
  uniqueStocks: string[];
  totalModels: number;
  successfulModels: number;
  failedModels: number;

  // Timing
  totalDuration: number;
}

export interface StockConflict {
  symbol: string;
  models: string[]; // Model IDs that picked this stock
  modelNames: string[]; // Display names
}

/**
 * Fetch current prices for multiple stocks in parallel
 * Returns map of symbol -> price (or null if fetch failed)
 */
export async function fetchCurrentPrices(symbols: string[]): Promise<Record<string, number | null>> {
  console.log(`📊 Fetching current prices for ${symbols.length} stocks...`);

  const prices: Record<string, number | null> = {};

  // Fetch in parallel with error handling per symbol
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const quote = await getLatestQuote(symbol);
        prices[symbol] = quote.price;
      } catch (error) {
        console.warn(`⚠️ Failed to get price for ${symbol}:`, error);
        prices[symbol] = null;
      }
    })
  );

  const successCount = Object.values(prices).filter(p => p !== null).length;
  console.log(`📊 Got prices for ${successCount}/${symbols.length} stocks`);

  return prices;
}

/**
 * Format prices for prompt display
 */
function formatPricesForPrompt(prices: Record<string, number | null>): string {
  const lines: string[] = [];
  for (const [symbol, price] of Object.entries(prices)) {
    if (price !== null) {
      lines.push(`- ${symbol}: $${price.toFixed(2)}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : 'Price data unavailable';
}

/**
 * Generate the stock selection + decision prompt
 * Model picks stock AND provides full trade decision in one call
 */
export function generateArenaPrompt(
  excludedStocks: string[],
  account: AlpacaAccount,
  timeframe: TradingTimeframe,
  stocksTradedToday: string[] = [],
  currentPrices: Record<string, number | null> = {}
): string {
  const availableStocks = ARENA_STOCK_UNIVERSE.filter(s => !excludedStocks.includes(s));
  const hasPrices = Object.keys(currentPrices).length > 0;

  return `You are a professional trader competing in an AI Trading Arena.

## Your Task
1. Select ONE stock to trade from the available options
2. Provide a complete trade decision with entry, stop-loss, and take-profit

## Account Information
- Portfolio Value: $${account.portfolio_value}
- Buying Power: $${account.buying_power}
- Cash: $${account.cash}

## Trading Timeframe: ${timeframe.toUpperCase()}

## Available Stocks (${availableStocks.length} options)
${availableStocks.join(', ')}

${hasPrices ? `## CURRENT MARKET PRICES (Use these for your entry price!)
${formatPricesForPrompt(currentPrices)}` : ''}

${excludedStocks.length > 0 ? `## EXCLUDED Stocks (DO NOT SELECT - already taken)
${excludedStocks.join(', ')}` : ''}

${stocksTradedToday.length > 0 ? `## NOTE: Stocks Already Traded Today
${stocksTradedToday.join(', ')}
Consider picking different stocks for portfolio diversification. You CAN still select these if you have a strong conviction.` : ''}

## Risk Management Guidelines
- Maximum position size: 20% of buying power
- Day trading: stops 3-5%, targets 5-10%
- Swing trading: stops 5-8%, targets 10-20%
- Position trading: stops 8-12%, targets 20-30%
- Long-term: stops 10-15%, targets 25-40%
- Risk-reward ratio should be at least 2:1

## Required Response Format (JSON only)
{
  "symbol": "TICKER",
  "action": "BUY",
  "quantity": 10,
  "reasoning": "Detailed reasoning for stock selection and trade (3-5 sentences)",
  "confidence": 0.75,
  "entryPrice": 150.00,
  "stopLoss": 142.50,
  "takeProfit": 172.50,
  "riskRewardRatio": "2.3:1"
}

IMPORTANT:
- entryPrice: MUST use the CURRENT MARKET PRICE shown above (not a guess!)
- stopLoss: Price to exit if trade goes against you (REQUIRED)
- takeProfit: Price to exit with profit (REQUIRED)
- quantity: Number of shares (respect 20% max position size)
- Calculate stopLoss and takeProfit based on the ACTUAL current price

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * Run Arena research for a SINGLE model
 */
export async function runSingleModelArena(
  modelId: string,
  excludedStocks: string[],
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  queryModel: (prompt: string) => Promise<string>,
  stocksTradedToday: string[] = [],
  currentPrices: Record<string, number | null> = {}
): Promise<ArenaModelResult> {
  const startTime = Date.now();
  const modelName = getModelDisplayName(modelId);

  console.log(`\n🤖 ${modelName}: Starting arena analysis...`);

  const result: ArenaModelResult = {
    modelId,
    modelName,
    status: 'pending',
    selectedSymbol: null,
    selectionReasoning: '',
    research: null,
    decision: null,
    duration: 0,
  };

  try {
    // Generate prompt with exclusions, today's traded stocks, and real-time prices
    const prompt = generateArenaPrompt(excludedStocks, account, timeframe, stocksTradedToday, currentPrices);

    // Query model
    const response = await queryModel(prompt);

    // Parse response
    const json = extractJSON(response);
    const parsed = JSON.parse(json);

    // Validate required fields
    if (!parsed.symbol) {
      throw new Error('No symbol selected');
    }
    if (!parsed.stopLoss || !parsed.takeProfit) {
      throw new Error('Missing stop-loss or take-profit');
    }
    if (excludedStocks.includes(parsed.symbol.toUpperCase())) {
      throw new Error(`Selected excluded stock: ${parsed.symbol}`);
    }

    const selectedSymbol = parsed.symbol.toUpperCase();
    result.selectedSymbol = selectedSymbol;
    result.selectionReasoning = parsed.reasoning || '';
    result.decision = {
      action: parsed.action || 'BUY',
      symbol: selectedSymbol,
      quantity: parsed.quantity || 1,
      reasoning: parsed.reasoning || '',
      confidence: parsed.confidence || 0.5,
      stopLoss: parsed.stopLoss,
      takeProfit: parsed.takeProfit,
      entryPrice: parsed.entryPrice,
      riskRewardRatio: parsed.riskRewardRatio,
    };
    result.status = 'success';

    const decision = result.decision;
    console.log(`   ✅ ${modelName}: ${decision.action} ${selectedSymbol}`);
    console.log(`      Entry: $${decision.entryPrice || 'market'}, SL: $${decision.stopLoss}, TP: $${decision.takeProfit}`);

  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ ${modelName}: ${result.error}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Run Arena research for ALL models in PARALLEL
 * Returns all results including conflicts
 */
export async function runAllModelsArena(
  modelIds: string[],
  excludedStocks: string[],
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  queryModelFn: (modelId: string, prompt: string) => Promise<string>,
  stocksTradedToday: string[] = [],
  currentPrices?: Record<string, number | null>
): Promise<ArenaRunResult> {
  const startTime = Date.now();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏟️ ARENA MODE: Running ${modelIds.length} models in parallel`);
  if (stocksTradedToday.length > 0) {
    console.log(`📊 Stocks already traded today: ${stocksTradedToday.join(', ')}`);
  }
  console.log(`${'='.repeat(60)}`);

  // Fetch prices once if not provided (for parallel execution)
  const prices = currentPrices ?? await fetchCurrentPrices(ARENA_STOCK_UNIVERSE);

  // Run all models in parallel
  const resultsPromises = modelIds.map(modelId =>
    runSingleModelArena(
      modelId,
      excludedStocks,
      timeframe,
      account,
      (prompt) => queryModelFn(modelId, prompt),
      stocksTradedToday,
      prices
    )
  );

  const results = await Promise.all(resultsPromises);

  // Detect conflicts (multiple models picked same stock)
  const stockPicks: Record<string, { modelIds: string[]; modelNames: string[] }> = {};

  for (const result of results) {
    if (result.status === 'success' && result.selectedSymbol) {
      const symbol = result.selectedSymbol;
      if (!stockPicks[symbol]) {
        stockPicks[symbol] = { modelIds: [], modelNames: [] };
      }
      stockPicks[symbol].modelIds.push(result.modelId);
      stockPicks[symbol].modelNames.push(result.modelName);
    }
  }

  const conflicts: StockConflict[] = [];
  for (const [symbol, picks] of Object.entries(stockPicks)) {
    if (picks.modelIds.length > 1) {
      conflicts.push({
        symbol,
        models: picks.modelIds,
        modelNames: picks.modelNames,
      });
    }
  }

  // Summary
  const successfulModels = results.filter(r => r.status === 'success').length;
  const failedModels = results.filter(r => r.status === 'error').length;
  const uniqueStocks = Object.keys(stockPicks);

  const runResult: ArenaRunResult = {
    results,
    conflicts,
    hasConflicts: conflicts.length > 0,
    uniqueStocks,
    totalModels: modelIds.length,
    successfulModels,
    failedModels,
    totalDuration: Date.now() - startTime,
  };

  // Log summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏆 ARENA RESULTS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successful: ${successfulModels}/${modelIds.length}`);
  console.log(`📊 Unique stocks selected: ${uniqueStocks.join(', ') || 'none'}`);

  if (conflicts.length > 0) {
    console.log(`\n⚠️ CONFLICTS DETECTED:`);
    for (const conflict of conflicts) {
      console.log(`   ${conflict.symbol}: ${conflict.modelNames.join(', ')}`);
    }
  }

  console.log(`\n⏱️ Total time: ${runResult.totalDuration}ms`);

  return runResult;
}

/**
 * Re-run specific models with additional exclusions
 * Used after user reviews conflicts and decides which stocks to exclude
 */
export async function rerunModelsWithExclusions(
  modelIds: string[],
  additionalExclusions: string[],
  previousExclusions: string[],
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  queryModelFn: (modelId: string, prompt: string) => Promise<string>,
  currentPrices?: Record<string, number | null>
): Promise<ArenaModelResult[]> {
  const allExclusions = [...new Set([...previousExclusions, ...additionalExclusions])];

  console.log(`\n🔄 Re-running ${modelIds.length} models with exclusions: ${additionalExclusions.join(', ')}`);

  // Fetch prices once if not provided
  const prices = currentPrices ?? await fetchCurrentPrices(ARENA_STOCK_UNIVERSE);

  const results = await Promise.all(
    modelIds.map(modelId =>
      runSingleModelArena(
        modelId,
        allExclusions,
        timeframe,
        account,
        (prompt) => queryModelFn(modelId, prompt),
        [],
        prices
      )
    )
  );

  return results;
}

/**
 * Run deep research on a specific stock (optional enhancement)
 * Can be called after model selection to get more detailed analysis
 */
export async function runDeepResearch(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  tier: ResearchTier = 'free'
): Promise<ResearchReport> {
  console.log(`\n🔬 Running deep research on ${symbol}...`);
  return runResearchAgents(symbol, timeframe, account, tier);
}

/**
 * Extract JSON from model response (handles markdown code blocks)
 */
export function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Extract JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Fix common JSON issues
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned
    .replace(/,(\s*[}\]])/g, '$1')
    .trim();

  return cleaned;
}
