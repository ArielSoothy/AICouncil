/**
 * Server-Sent Events (SSE) Streaming endpoint for Arena Mode Research
 *
 * Streams real-time progress as each model researches and provides recommendations.
 * Frontend uses ResearchProgressPanel to display progress.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccount } from '@/lib/alpaca/client';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';
import type { ResearchProgressEvent } from '@/types/research-progress';
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import { getLockedStocks } from '@/lib/arena/stock-locks';
import { getTodayRotation } from '@/lib/arena/rotation';
import { getTodaysTrades } from '@/lib/arena/trade-guards';
import { generateArenaPrompt, extractJSON, fetchCurrentPrices, ARENA_STOCK_UNIVERSE } from '@/lib/arena/arena-research';
import type { ArenaModelResult, StockConflict, ArenaRunResult } from '@/lib/arena/arena-research';

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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// CLI Providers (subscription billing) + FREE providers only
// CRITICAL: Do NOT include API-billed providers (mistral, perplexity, cohere, xai)
// Only CLI providers (anthropic, openai, google) and FREE providers (groq)
const CLI_PROVIDERS: Record<string, any> = {
  anthropic: new ClaudeCLIProvider(),   // CLI subscription
  openai: new CodexCLIProvider(),       // CLI subscription
  google: new GoogleCLIProvider(),      // CLI subscription
  groq: new GroqProvider(),             // FREE - no billing
  // REMOVED: mistral, perplexity, cohere, xai - would charge API fees for sub tiers
};

type UserTier = 'free' | 'pro' | 'max' | 'sub-pro' | 'sub-max';

function isSubscriptionTier(tier: UserTier): boolean {
  return tier === 'sub-pro' || tier === 'sub-max';
}

function getProvidersForTier(tier: UserTier): Record<string, any> {
  return isSubscriptionTier(tier) ? CLI_PROVIDERS : API_PROVIDERS;
}

/**
 * POST /api/arena/execute/stream
 *
 * Streams real-time progress updates via Server-Sent Events (SSE)
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const {
      selectedModels = [],
      timeframe = 'day' as TradingTimeframe,
      tier = 'free',
    } = body;

    // Validation
    if (!selectedModels || selectedModels.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one model must be selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Helper: Sanitize strings to ensure they're JSON-safe
    const sanitizeString = (str: string | undefined | null): string => {
      if (!str) return '';
      // Remove or replace problematic characters
      return str
        .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
        .replace(/\\/g, '\\\\') // Escape backslashes
        .substring(0, 1000); // Limit length to prevent huge payloads
    };

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        // Helper: Send SSE event
        const sendEvent = (event: ResearchProgressEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          const supabase = await createClient();

          // Get Arena config
          const { data: config, error: configError } = await supabase
            .from('arena_config')
            .select('*')
            .eq('id', 1)
            .single();

          if (configError || !config?.is_enabled) {
            sendEvent({
              type: 'error',
              phase: 1,
              message: configError ? 'Failed to load arena config' : 'Arena Mode is disabled',
              timestamp: Date.now()
            });
            controller.close();
            return;
          }

          // Get account info
          const account = await getAccount();

          // Get rotation order and locked stocks
          const orderedModels = await getTodayRotation(selectedModels);
          const lockedStocks = await getLockedStocks();
          const { stocksTradedToday } = await getTodaysTrades();

          // Create arena run record
          const { data: arenaRun } = await supabase
            .from('arena_runs')
            .insert({
              status: 'running',
              models_executed: orderedModels,
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          // PHASE 2: Decision Models - Arena skips research agents, goes directly to model decisions
          sendEvent({
            type: 'phase_start',
            phase: 2,
            message: `${orderedModels.length} models analyzing market opportunities`,
            timestamp: Date.now()
          });

          const providers = getProvidersForTier(tier as UserTier);
          const isSubMode = isSubscriptionTier(tier as UserTier);
          const results: ArenaModelResult[] = [];
          const startTime = Date.now();

          // PHASE 1: Fetch current market prices for all stocks
          sendEvent({
            type: 'phase_start',
            phase: 1,
            message: 'Fetching current market prices...',
            timestamp: Date.now()
          });
          const currentPrices = await fetchCurrentPrices(ARENA_STOCK_UNIVERSE);

          // Run models sequentially to emit progress events in order
          for (const modelId of orderedModels) {
            const modelName = getModelDisplayName(modelId);
            const providerType = getProviderType(modelId);

            // Send decision_start event
            sendEvent({
              type: 'decision_start',
              modelName,
              modelId,
              timestamp: Date.now()
            });

            const modelStartTime = Date.now();
            let result: ArenaModelResult & { providerType?: 'CLI' | 'API' } = {
              modelId,
              modelName,
              status: 'pending',
              selectedSymbol: null,
              selectionReasoning: '',
              research: null,
              decision: null,
              duration: 0,
              providerType: isSubMode ? 'CLI' : 'API', // Billing mode proof for UI
            };

            try {
              if (!providerType) {
                throw new Error(`Unknown provider for model: ${modelId}`);
              }
              const provider = providers[providerType];
              if (!provider) {
                throw new Error(`No provider found for ${providerType}`);
              }

              // Generate prompt with real-time market prices
              const prompt = generateArenaPrompt(lockedStocks, account, timeframe, stocksTradedToday, currentPrices);

              // Query model
              const response = await provider.query(prompt, {
                model: modelId,
                provider: providerType,
                temperature: 0.7,
                maxTokens: 1500,
                enabled: true,
              });

              if (response.error) {
                throw new Error(response.error);
              }

              // Parse response
              const json = extractJSON(response.response);
              const parsed = JSON.parse(json);

              if (!parsed.symbol) {
                throw new Error('No symbol selected');
              }
              if (!parsed.stopLoss || !parsed.takeProfit) {
                throw new Error('Missing stop-loss or take-profit');
              }

              const selectedSymbol = parsed.symbol.toUpperCase();
              result.selectedSymbol = selectedSymbol;
              result.selectionReasoning = sanitizeString(parsed.reasoning);
              result.decision = {
                action: parsed.action || 'BUY',
                symbol: selectedSymbol,
                quantity: parsed.quantity || 1,
                reasoning: sanitizeString(parsed.reasoning),
                confidence: parsed.confidence || 0.5,
                stopLoss: parsed.stopLoss,
                takeProfit: parsed.takeProfit,
                entryPrice: parsed.entryPrice,
                riskRewardRatio: sanitizeString(parsed.riskRewardRatio),
              };
              result.status = 'success';

              // Send decision_complete event
              sendEvent({
                type: 'decision_complete',
                modelName,
                modelId,
                action: result.decision.action as 'BUY' | 'SELL' | 'HOLD',
                symbol: selectedSymbol,
                confidence: result.decision.confidence,
                duration: Date.now() - modelStartTime,
                tokensUsed: response.tokens?.total || 0,
                provider: isSubMode ? 'CLI' as const : 'API' as const, // Billing mode proof
                timestamp: Date.now()
              });

            } catch (error) {
              result.status = 'error';
              result.error = sanitizeString(error instanceof Error ? error.message : 'Unknown error');

              // Send error event
              sendEvent({
                type: 'error',
                phase: 2,
                model: modelId,
                message: result.error,
                timestamp: Date.now()
              });
            }

            result.duration = Date.now() - modelStartTime;
            results.push(result);
          }

          // Detect conflicts
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

          const successfulModels = results.filter(r => r.status === 'success').length;
          const failedModels = results.filter(r => r.status === 'error').length;

          // Update arena run record
          if (arenaRun) {
            await supabase
              .from('arena_runs')
              .update({
                status: conflicts.length > 0 ? 'has_conflicts' : 'ready_to_execute',
                completed_at: new Date().toISOString(),
                trades_generated: successfulModels,
              })
              .eq('id', arenaRun.id);

            // Update last_run_at in config
            await supabase
              .from('arena_config')
              .update({ last_run_at: new Date().toISOString() })
              .eq('id', 1);
          }

          // Send final result
          sendEvent({
            type: 'final_result',
            consensus: null, // Arena doesn't have consensus
            decisions: results.map(r => ({
              model: r.modelId,
              modelName: r.modelName,
              action: r.decision?.action || 'HOLD',
              symbol: r.selectedSymbol,
              confidence: r.decision?.confidence || 0,
              reasoning: r.decision?.reasoning || r.error || '',
            })),
            research: {
              results,
              conflicts,
              hasConflicts: conflicts.length > 0,
              uniqueStocks: Object.keys(stockPicks),
              summary: {
                totalModels: orderedModels.length,
                successfulModels,
                failedModels,
                duration: Date.now() - startTime,
              },
              runId: arenaRun?.id,
              rotationOrder: orderedModels,
              lockedStocks,
            },
            timestamp: Date.now()
          });

          controller.close();

        } catch (error) {
          console.error('Arena stream error:', error);
          sendEvent({
            type: 'error',
            phase: 1,
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Arena stream error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
