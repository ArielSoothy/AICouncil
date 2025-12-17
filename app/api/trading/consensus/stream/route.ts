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
import { runResearchAgents, type ResearchTier, type ResearchModelPreset } from '@/lib/agents/research-agents';
import type { ResearchProgressEvent, ProgressCallback } from '@/types/research-progress';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';
import type { TradeDecision } from '@/lib/alpaca/types';
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import { generateDecisionPrompt, type ResearchFindings } from '@/lib/alpaca/enhanced-prompts';
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
import {
  getFallbackModel,
  recordModelFailure,
  isModelUnstable,
  classifyError,
  logFallbackWithColor,
} from '@/lib/trading/model-fallback';
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
 *   Use CLI providers ONLY for anthropic/openai/google models
 *   NO FALLBACK TO API - if CLI fails, show error to user
 *   (leverages user's subscription instead of API keys)
 *
 * REGULAR TIERS (free, pro, max):
 *   Use API key providers (standard billing)
 *
 * CRITICAL: Sub tiers NEVER fall back to API providers!
 * User pays monthly subscription - should NOT be charged per-call API fees.
 */
function getProviderForModelAndTier(
  providerType: string,
  tier: string
): { provider: any; error?: string } {
  const useSubscription = tier === 'sub-pro' || tier === 'sub-max';

  // SUB TIERS: CLI providers ONLY - NO API FALLBACK
  if (useSubscription) {
    const cliProvider = CLI_PROVIDERS[providerType as keyof typeof CLI_PROVIDERS];

    // Check if CLI provider exists for this provider type
    if (!cliProvider) {
      const errorMsg = `No CLI provider available for ${providerType}. Sub ${tier} requires CLI. Switch to Pro/Max tier for API access.`;
      console.error(`❌ ${errorMsg}`);
      return { provider: null, error: errorMsg };
    }

    // Check if CLI is installed and configured
    try {
      if (cliProvider.isConfigured()) {
        console.log(`🔑 Using CLI SUBSCRIPTION provider for ${providerType} (${tier} tier)`);
        return { provider: cliProvider };
      } else {
        // CLI not configured - DO NOT FALL BACK TO API
        const errorMsg = `CLI provider for ${providerType} not configured. Install the CLI tool or switch to Pro/Max tier for API access.`;
        console.error(`❌ ${errorMsg}`);
        return { provider: null, error: errorMsg };
      }
    } catch (error) {
      // CLI check failed - DO NOT FALL BACK TO API
      const errorMsg = `CLI provider check failed for ${providerType}: ${error}. Install the CLI tool or switch to Pro/Max tier.`;
      console.error(`❌ ${errorMsg}`);
      return { provider: null, error: errorMsg };
    }
  }

  // REGULAR TIERS: Use API providers
  const apiProvider = PROVIDERS[providerType as keyof typeof PROVIDERS];
  if (apiProvider) {
    return { provider: apiProvider };
  }

  // No provider found
  const errorMsg = `No provider found for ${providerType}!`;
  console.error(`❌ ${errorMsg}`);
  return { provider: null, error: errorMsg };
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
      researchTier = 'free',
      researchModel // Optional research model override (sonnet, haiku, llama, gemini)
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
            // DEBUG: Log what's in the cached research report
            console.log(`🔍 CACHE DEBUG - researchReport structure:`, {
              technical_findings_length: researchReport.technical?.findings?.length || 0,
              fundamental_findings_length: researchReport.fundamental?.findings?.length || 0,
              sentiment_findings_length: researchReport.sentiment?.findings?.length || 0,
              risk_findings_length: researchReport.risk?.findings?.length || 0,
              technical_keys: researchReport.technical ? Object.keys(researchReport.technical) : [],
              totalToolCalls: researchReport.totalToolCalls,
            });

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
              onProgress,  // Pass callback to stream progress
              researchModel // Optional research model override
            );

            // DEBUG: Log fresh research results before caching
            console.log(`🔍 FRESH RESEARCH DEBUG - researchReport structure:`, {
              technical_findings_length: researchReport.technical?.findings?.length || 0,
              fundamental_findings_length: researchReport.fundamental?.findings?.length || 0,
              sentiment_findings_length: researchReport.sentiment?.findings?.length || 0,
              risk_findings_length: researchReport.risk?.findings?.length || 0,
              technical_keys: researchReport.technical ? Object.keys(researchReport.technical) : [],
              totalToolCalls: researchReport.totalToolCalls,
            });

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

          // Get decisions from selected models with automatic fallback
          // researchTier determines whether to use CLI (subscription) or API providers
          const decisionsPromises = selectedModels.map(async (modelId: string) => {
            // Track attempted models to avoid infinite loops in fallback chain
            const attemptedModels: string[] = [];

            // Recursive helper to query with fallback
            const queryWithFallback = async (currentModelId: string): Promise<TradeDecision | null> => {
              const modelName = getModelDisplayName(currentModelId);
              const providerType = getProviderType(currentModelId);

              // Check if model is unstable (failed multiple times recently)
              if (isModelUnstable(currentModelId)) {
                sendEvent({
                  type: 'warning',
                  model: currentModelId,
                  modelName,
                  message: `${modelName} has been unstable recently, attempting anyway...`,
                  timestamp: Date.now()
                });
              }

              try {
                if (!providerType) {
                  throw new Error(`Unknown model or provider: ${currentModelId}`);
                }

                // Get provider based on tier - CLI for sub-pro/sub-max, API for others
                // CRITICAL: Sub tiers use CLI ONLY - no fallback to API
                const { provider, error: providerError } = getProviderForModelAndTier(providerType, researchTier);
                if (providerError || !provider) {
                  throw new Error(providerError || `No provider available for: ${providerType}`);
                }

                // Send decision start event
                sendEvent({
                  type: 'decision_start',
                  modelName,
                  modelId: currentModelId,
                  timestamp: Date.now()
                });

                const decisionStartTime = Date.now();

                // Generate decision prompt with research data
                // CRITICAL: Use generateDecisionPrompt which does NOT mention tools
                // Decision models have useTools: false so they should analyze research, not expect tools
                const researchFindings: ResearchFindings = {
                  technical: researchReport.technical.findings,
                  fundamental: researchReport.fundamental.findings,
                  sentiment: researchReport.sentiment.findings,
                  risk: researchReport.risk.findings,
                };

                // DEBUG: Log research findings length to verify data is passing through
                console.log(`📊 Research findings for ${currentModelId}:`, {
                  technical: researchFindings.technical?.length || 0,
                  fundamental: researchFindings.fundamental?.length || 0,
                  sentiment: researchFindings.sentiment?.length || 0,
                  risk: researchFindings.risk?.length || 0,
                });

                const enhancedPrompt = generateDecisionPrompt(
                  account,
                  positions,
                  new Date().toLocaleDateString(),
                  timeframe,
                  normalizedSymbol || 'UNKNOWN',
                  researchFindings
                );

                const result = await provider.query(enhancedPrompt, {
                  model: currentModelId,
                  provider: providerType,
                  temperature: 0.7,
                  maxTokens: 4000,  // Increased from 2000 to prevent truncation
                  enabled: true,
                  useTools: false,
                  maxSteps: 1,
                });

                // Check for provider errors or empty responses BEFORE parsing
                if (result.error) {
                  throw new Error(`Provider error: ${result.error}`);
                }

                if (!result.response || result.response.trim().length === 0) {
                  throw new Error(`Empty response (possible rate limit)`);
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

                decision.model = currentModelId;
                decision.toolsUsed = false;
                decision.toolCallCount = 0;
                // Track provider type for billing proof in UI
                decision.providerType = (researchTier === 'sub-pro' || researchTier === 'sub-max') ? 'CLI' : 'API';

                const decisionDuration = Date.now() - decisionStartTime;

                // Send decision complete event with token usage for cost tracking
                sendEvent({
                  type: 'decision_complete',
                  modelName,
                  modelId: currentModelId,
                  action: decision.action,
                  confidence: decision.confidence || 0.5,
                  duration: decisionDuration,
                  tokensUsed: result.tokens?.total || 0,
                  inputTokens: result.tokens?.prompt || 0,
                  outputTokens: result.tokens?.completion || 0,
                  provider: decision.providerType,  // CLI or API for billing proof
                  timestamp: Date.now()
                });

                return decision;

              } catch (error) {
                // Record failure for instability tracking
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                recordModelFailure(currentModelId, errorMessage);
                attemptedModels.push(currentModelId);

                // Classify the error for structured logging and UI display
                const classification = classifyError(errorMessage);

                // Try to get a fallback model
                const fallbackModelId = getFallbackModel(currentModelId, attemptedModels);

                if (fallbackModelId) {
                  const fallbackName = getModelDisplayName(fallbackModelId);

                  // Send fallback event to user with error classification
                  sendEvent({
                    type: 'fallback',
                    originalModel: currentModelId,
                    originalModelName: modelName,
                    fallbackModel: fallbackModelId,
                    fallbackModelName: fallbackName,
                    reason: errorMessage,
                    errorCategory: classification.category,
                    userMessage: classification.userMessage,
                    timestamp: Date.now()
                  });

                  // Colored console output with structured error category
                  logFallbackWithColor(currentModelId, fallbackModelId, classification);

                  // Recursively try the fallback model
                  return queryWithFallback(fallbackModelId);
                }

                // No fallback available - send error event with classification
                sendEvent({
                  type: 'error',
                  phase: 2,
                  model: modelName,
                  message: `${modelName}: ${classification.userMessage} (no fallback available)`,
                  errorCategory: classification.category,
                  timestamp: Date.now()
                });

                console.error(`\x1b[${classification.consoleColor}m❌ [${classification.category}] All fallbacks exhausted for ${modelName}: ${errorMessage}\x1b[0m`);
                return null;
              }
            };

            // Start query with the originally selected model
            return queryWithFallback(modelId);
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

          // Use judge system with error handling
          let parsedJudgeResult;
          let judgeDuration;
          let consensus;

          try {
            const judgePrompt = generateTradingJudgePrompt(decisions, votes, consensusAction);

            // Get judge provider based on tier - CLI for sub-pro/sub-max, API for others
            // CRITICAL: Sub tiers use CLI ONLY - no fallback to API (same as decision models)
            const { provider: judgeProvider, error: judgeProviderError } = getProviderForModelAndTier('anthropic', researchTier);
            if (judgeProviderError || !judgeProvider) {
              throw new Error(judgeProviderError || `No judge provider available for tier: ${researchTier}`);
            }

            const judgeResult = await judgeProvider.query(judgePrompt, {
              model: 'claude-sonnet-4-5-20250929',
              provider: 'anthropic',
              temperature: 0.3,
              maxTokens: 2000,
              enabled: true,
              useTools: false,
              maxSteps: 1,
            });

            // Check for API errors
            if (judgeResult.error) {
              throw new Error(`Judge provider error: ${judgeResult.error}`);
            }

            // Check for empty response
            if (!judgeResult.response || judgeResult.response.trim().length === 0) {
              throw new Error(`Empty response from judge (possible rate limit)`);
            }

            parsedJudgeResult = parseTradingJudgeResponse(judgeResult.response);
            judgeDuration = Date.now() - judgeStartTime;

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
            consensus = {
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
              tokensUsed: judgeResult.tokens?.total || 0,
              inputTokens: judgeResult.tokens?.prompt || 0,
              outputTokens: judgeResult.tokens?.completion || 0,
              timestamp: Date.now()
            });

          } catch (error) {
            // Classify the error for structured logging and UI display
            const errorMessage = error instanceof Error ? error.message : String(error);
            const classification = classifyError(errorMessage);

            // Log with color (matches decision model pattern)
            console.log(
              `\x1b[${classification.consoleColor}m🚨 [Judge ${classification.category}] ${errorMessage}\x1b[0m`
            );

            // SUB MODE BUG DETECTION: Budget errors should NEVER happen in Sub mode
            const useSubscription = researchTier === 'sub-pro' || researchTier === 'sub-max';
            if (useSubscription && classification.category === 'BUDGET_LIMIT') {
              console.error(
                `\x1b[31m🐛 CRITICAL BUG: BUDGET_LIMIT error in ${researchTier} mode!\x1b[0m\n` +
                `Subscriptions have NO credit limits. CLI may not be using subscription auth.\n` +
                `Check if CLI is properly authenticated with subscription credentials.`
              );
            }

            judgeDuration = Date.now() - judgeStartTime;

            // Return fallback consensus
            const agreementPercentage = decisions.length > 0 ? maxVotes / decisions.length : 0;
            let agreementLevel: number;
            if (agreementPercentage >= 0.75) {
              agreementLevel = 0.9;
            } else if (agreementPercentage >= 0.5) {
              agreementLevel = 0.7;
            } else {
              agreementLevel = 0.4;
            }

            parsedJudgeResult = {
              bestAction: consensusAction,
              symbol: symbol.toUpperCase(),
              quantity: 0,
              unifiedReasoning: `Judge model unavailable (${classification.userMessage}): ${errorMessage}. Based on individual model votes: ${consensusAction} (${maxVotes}/${decisions.length} models agree).`,
              confidence: 0,
              consensusScore: 50,
              disagreements: [],
              riskLevel: 'High' as const,
              tokenUsage: 0
            };

            consensus = {
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
              tokensUsed: 0,
              inputTokens: 0,
              outputTokens: 0,
              timestamp: Date.now()
            });
          }

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
