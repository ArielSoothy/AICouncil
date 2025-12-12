/**
 * Server-Sent Events (SSE) Streaming endpoint for Consensus Trading
 *
 * This is a SEPARATE endpoint from /api/trading/consensus for modularity:
 * - Old code uses: /api/trading/consensus (returns complete JSON)
 * - New code uses: /api/trading/consensus/stream (streams progress via SSE)
 *
 * Benefits of separate endpoint:
 * - Backward compatible (existing code keeps working)
 * - Easy to test both versions
 * - Frontend can choose streaming or not
 * - No complex conditional logic in one route
 */

import { NextRequest } from 'next/server';
import { getAccount, getPositions } from '@/lib/alpaca/client';
import { runResearchAgents, type ResearchTier } from '@/lib/agents/research-agents';
import type { ResearchProgressEvent, ProgressCallback } from '@/types/research-progress';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';
import type { TradeDecision } from '@/lib/alpaca/types';
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import { generateEnhancedTradingPrompt } from '@/lib/alpaca/enhanced-prompts';
import { generateTradingJudgePrompt, parseTradingJudgeResponse } from '@/lib/trading/judge-system';
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import { GroqProvider } from '@/lib/ai-providers/groq';
import { MistralProvider } from '@/lib/ai-providers/mistral';
import { PerplexityProvider } from '@/lib/ai-providers/perplexity';
import { CohereProvider } from '@/lib/ai-providers/cohere';
import { XAIProvider } from '@/lib/ai-providers/xai';
// CLI-based providers for subscription mode (Sub Pro/Max) - for FINAL MODEL QUERIES only
import { ClaudeCLIProvider, CodexCLIProvider, GoogleCLIProvider } from '@/lib/ai-providers/cli';
import { ResearchCache } from '@/lib/trading/research-cache';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize research cache
const researchCache = new ResearchCache();

/**
 * LOCAL extractJSON - matches Individual Mode's working implementation
 * SIMPLE: indexOf + lastIndexOf (no brace counting!)
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
  // SIMPLE: Find first { and last } (works for nested objects!)
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
    // Try to extract just the JSON object more aggressively
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return match[0];
    }
    // If all else fails, return what we have
    return cleaned;
  }
}

// Initialize all providers - API key based
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

// CLI-based providers for subscription tiers (Sub Pro/Max)
// These use local CLI tools with user's subscription credentials
const CLI_PROVIDERS = {
  anthropic: new ClaudeCLIProvider(),   // Uses Claude Pro/Max subscription
  openai: new CodexCLIProvider(),       // Uses ChatGPT Plus/Pro subscription
  google: new GoogleCLIProvider(),      // Uses Gemini Advanced subscription
};

/**
 * Get the appropriate provider based on model and tier
 *
 * SUB TIERS (sub-pro, sub-max):
 *   Use CLI providers for anthropic/openai/google models
 *   (leverages user's subscription instead of API keys)
 *
 * REGULAR TIERS (free, pro, max):
 *   Use API key providers (standard billing)
 */
function getProviderForModelAndTier(
  providerType: string,
  tier: string
) {
  const useSubscription = tier === 'sub-pro' || tier === 'sub-max';

  // For sub tiers, use CLI providers where available
  if (useSubscription) {
    const cliProvider = CLI_PROVIDERS[providerType as keyof typeof CLI_PROVIDERS];
    if (cliProvider) {
      console.log(`🔑 Using CLI SUBSCRIPTION provider for ${providerType} (${tier} tier)`);
      return cliProvider;
    }
    // Fall back to API provider if no CLI provider for this type
    console.log(`⚠️ No CLI provider for ${providerType}, falling back to API`);
  }

  // Use regular API providers
  return PROVIDERS[providerType as keyof typeof PROVIDERS];
}

// extractJSON and repairJSON functions now imported from @/lib/utils/json-repair

/**
 * POST /api/trading/consensus/stream
 *
 * Streams real-time progress updates via Server-Sent Events (SSE)
 * Client should use EventSource to connect and receive updates
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const {
      selectedModels = [],
      timeframe = 'swing' as TradingTimeframe,
      targetSymbol,
      researchTier = 'free'
    } = body;

    // Validation
    if (!selectedModels || selectedModels.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one model must be selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        // Helper: Send SSE event
        const sendEvent = (event: ResearchProgressEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          // Initialize Alpaca client
          const account = await getAccount();
          const positions = await getPositions();

          // Determine target symbol
          const normalizedSymbol = targetSymbol?.trim().toUpperCase() || '';
          const symbol = normalizedSymbol || (positions.length > 0 ? positions[0].symbol : 'AAPL');

          // PHASE 1: RESEARCH (with caching)
          // Include researchTier in cache key so different tiers don't share cache
          const cacheSymbol = `${symbol}-${researchTier}`; // e.g., "TEAD-free" vs "TEAD-pro"

          sendEvent({
            type: 'phase_start',
            phase: 1,
            message: `Starting exhaustive research for ${symbol} (${researchTier} tier)`,
            timestamp: Date.now()
          });

          // Check cache first (tier-aware)
          let researchReport = await researchCache.get(cacheSymbol, timeframe);

          if (researchReport) {
            // Cache hit! Skip research and use cached data
            // Send cache hit event
            sendEvent({
              type: 'phase_start',
              phase: 1,
              message: `Using cached research for ${symbol} (saved 30-40 API calls!)`,
              timestamp: Date.now()
            });

            // Simulate agent completion events for cached research
            // (so frontend shows proper "complete" state)
            sendEvent({
              type: 'agent_complete',
              agent: 'technical',
              toolCount: researchReport.technical.toolCallCount || 0,
              duration: 0, // Cached - instant
              tokensUsed: 0, // Cached - no API calls
              timestamp: Date.now()
            });
            sendEvent({
              type: 'agent_complete',
              agent: 'fundamental',
              toolCount: researchReport.fundamental.toolCallCount || 0,
              duration: 0,
              tokensUsed: 0,
              timestamp: Date.now()
            });
            sendEvent({
              type: 'agent_complete',
              agent: 'sentiment',
              toolCount: researchReport.sentiment.toolCallCount || 0,
              duration: 0,
              tokensUsed: 0,
              timestamp: Date.now()
            });
            sendEvent({
              type: 'agent_complete',
              agent: 'risk',
              toolCount: researchReport.risk.toolCallCount || 0,
              duration: 0,
              tokensUsed: 0,
              timestamp: Date.now()
            });
          } else {
            // Cache miss - run fresh research
            // Create progress callback that streams events
            const onProgress: ProgressCallback = (event) => {
              sendEvent(event);
            };

            // Run research with streaming progress
            researchReport = await runResearchAgents(
              symbol,
              timeframe,
              account,
              researchTier as ResearchTier,
              onProgress  // Pass callback to stream progress
            );

            // Cache the results for next time (tier-aware key)
            await researchCache.set(cacheSymbol, timeframe, researchReport);
          }

          // PHASE 2: DECISION MODELS
          sendEvent({
            type: 'phase_start',
            phase: 2,
            message: `${selectedModels.length} decision models analyzing research`,
            timestamp: Date.now()
          });

          // Get decisions from selected models
          // researchTier determines whether to use CLI (subscription) or API providers
          const decisionsPromises = selectedModels.map(async (modelId: string) => {
            const modelName = getModelDisplayName(modelId);
            const providerType = getProviderType(modelId);

            try {
              if (!providerType) {
                throw new Error(`Unknown model or provider: ${modelId}`);
              }

              // Get provider based on tier - CLI for sub-pro/sub-max, API for others
              const provider = getProviderForModelAndTier(providerType, researchTier);
              if (!provider) {
                throw new Error(`No provider available for: ${providerType}`);
              }

              // Send decision start event
              sendEvent({
                type: 'decision_start',
                modelName,
                modelId,
                timestamp: Date.now()
              });

              const decisionStartTime = Date.now();

              // Generate prompt with research data
              const prompt = generateEnhancedTradingPrompt(
                account,
                positions,
                new Date().toLocaleDateString(),
                timeframe,
                normalizedSymbol || undefined
              );

              // Add research context
              const enhancedPrompt = `${prompt}\n\n=== RESEARCH FINDINGS ===\n\nTechnical Analysis:\n${researchReport.technical.findings}\n\nFundamental Analysis:\n${researchReport.fundamental.findings}\n\nSentiment Analysis:\n${researchReport.sentiment.findings}\n\nRisk Assessment:\n${researchReport.risk.findings}`;

              const result = await provider.query(enhancedPrompt, {
                model: modelId,
                provider: providerType,
                temperature: 0.7,
                maxTokens: 4000,  // ⬆️ Increased from 2000 to prevent truncation
                enabled: true,
                useTools: false,
                maxSteps: 1,
              });

              // Check for provider errors or empty responses BEFORE parsing
              if (result.error) {
                throw new Error(`Provider error: ${result.error}`);
              }

              if (!result.response || result.response.trim().length === 0) {
                throw new Error(`Empty response from provider (possible rate limit exhaustion)`);
              }

              // Extract and parse JSON response
              const cleanedResponse = extractJSON(result.response);

              let decision: TradeDecision;
              try {
                decision = JSON.parse(cleanedResponse);
              } catch (parseError) {
                throw parseError; // Let outer catch handle it
              }

              // Handle malformed responses
              if (!decision.action && (decision as any).bullishCase) {
                decision = {
                  action: 'HOLD' as const,
                  symbol: normalizedSymbol || 'UNKNOWN',
                  quantity: 0,
                  reasoning: decision as any,
                  confidence: 0.5,
                };
              }

              decision.model = modelId;
              decision.toolsUsed = false;
              decision.toolCallCount = 0;

              const decisionDuration = Date.now() - decisionStartTime;

              // Send decision complete event
              sendEvent({
                type: 'decision_complete',
                modelName,
                modelId,
                action: decision.action,
                confidence: decision.confidence || 0.5,
                duration: decisionDuration,
                timestamp: Date.now()
              });

              return decision;
            } catch (error) {
              // Handle errors per-model (don't crash entire stream)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              // Send error event
              sendEvent({
                type: 'error',
                phase: 2,
                model: modelName,
                message: `${modelName}: ${errorMessage}`,
                timestamp: Date.now()
              });

              // Return null for failed models
              return null;
            }
          });

          const decisionsOrNulls = await Promise.all(decisionsPromises);
          const decisions = decisionsOrNulls.filter((d): d is TradeDecision => d !== null);

          // Check if we have any successful decisions
          if (decisions.length === 0) {
            sendEvent({
              type: 'error',
              phase: 2,
              message: 'All decision models failed. Please try again or select different models.',
              timestamp: Date.now()
            });
            controller.close();
            return;
          }

          // Calculate votes
          const votes = { BUY: 0, SELL: 0, HOLD: 0 };
          decisions.forEach(d => {
            if (d.action) votes[d.action]++;
          });

          // Determine consensus action (majority wins)
          let consensusAction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
          const maxVotes = Math.max(votes.BUY, votes.SELL, votes.HOLD);
          if (maxVotes === votes.BUY && votes.BUY > decisions.length / 2) {
            consensusAction = 'BUY';
          } else if (maxVotes === votes.SELL && votes.SELL > decisions.length / 2) {
            consensusAction = 'SELL';
          }

          // PHASE 3: JUDGE CONSENSUS
          sendEvent({
            type: 'judge_start',
            message: 'Analyzing consensus from all models',
            timestamp: Date.now()
          });

          const judgeStartTime = Date.now();

          // Use judge system
          const judgePrompt = generateTradingJudgePrompt(decisions, votes, consensusAction);
          const judgeProvider = PROVIDERS.anthropic;
          const judgeResult = await judgeProvider.query(judgePrompt, {
            model: 'claude-sonnet-4-5-20250929',
            provider: 'anthropic',
            temperature: 0.3,
            maxTokens: 2000,
            enabled: true,
            useTools: false,
            maxSteps: 1,
          });

          const parsedJudgeResult = parseTradingJudgeResponse(judgeResult.response);
          const judgeDuration = Date.now() - judgeStartTime;

          // Calculate agreement level
          const agreementPercentage = decisions.length > 0 ? maxVotes / decisions.length : 0;
          let agreementLevel: number;
          if (agreementPercentage >= 0.75) {
            agreementLevel = 0.9;
          } else if (agreementPercentage >= 0.5) {
            agreementLevel = 0.7;
          } else {
            agreementLevel = 0.4;
          }

          // Build consensus object
          const consensus = {
            action: parsedJudgeResult.bestAction,
            symbol: parsedJudgeResult.symbol,
            quantity: parsedJudgeResult.quantity,
            reasoning: parsedJudgeResult.unifiedReasoning,
            confidence: parsedJudgeResult.confidence,
            agreement: agreementLevel,
            votes,
            modelCount: decisions.length,
          };

          sendEvent({
            type: 'judge_complete',
            consensusAction: consensus.action,
            agreement: agreementLevel,
            duration: judgeDuration,
            timestamp: Date.now()
          });

          // FINAL: Send complete results
          // Research data sent as direct properties (UI expects research.technical, not research.agents[])
          sendEvent({
            type: 'final_result',
            consensus,
            decisions,
            research: {
              totalToolCalls: researchReport.totalToolCalls,
              researchDuration: researchReport.researchDuration,
              technical: researchReport.technical,
              fundamental: researchReport.fundamental,
              sentiment: researchReport.sentiment,
              risk: researchReport.risk,
            },
            timestamp: Date.now()
          });

          // Close the stream
          controller.close();

        } catch (error) {
          // Send error event
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

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
