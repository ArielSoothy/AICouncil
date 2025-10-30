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
import { runResearchAgents } from '@/lib/agents/research-agents';
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * ULTRA-ROBUST JSON extraction from model responses
 * Handles malformed JSON from free/open-source models
 */
function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Remove tool call XML artifacts
  cleaned = cleaned.replace(/<[^>]+>\s*\{[^}]*\}?\s*<\/[^>]+>/g, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');

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

  // Extract first complete JSON object
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = firstBrace; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            cleaned = cleaned.substring(firstBrace, i + 1);
            break;
          }
        }
      }
    }
  }

  // AGGRESSIVE JSON REPAIR STRATEGIES

  // 1. Fix trailing commas before } and ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // 2. Replace single quotes with double quotes
  cleaned = cleaned.replace(/'/g, '"');

  // 3. Fix unquoted property names (common in malformed JSON)
  cleaned = cleaned.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // 4. Fix missing commas between properties
  cleaned = cleaned.replace(/"\s*\n\s*"/g, '",\n"');
  cleaned = cleaned.replace(/(\}|\])\s*\n\s*"/g, '$1,\n"');

  // 5. Remove any non-JSON text after the closing brace
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  // 6. Handle incomplete JSON (missing closing brace)
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    // Add missing closing braces
    cleaned += '}'.repeat(openBraces - closeBraces);
  }

  // 7. Fix double-escaped quotes
  cleaned = cleaned.replace(/\\\\"/g, '\\"');

  // 8. Remove JavaScript comments (some models add these)
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  return cleaned.trim();
}

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
      targetSymbol
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

          // PHASE 1: RESEARCH
          sendEvent({
            type: 'phase_start',
            phase: 1,
            message: `Starting exhaustive research for ${symbol}`,
            timestamp: Date.now()
          });

          // Create progress callback that streams events
          const onProgress: ProgressCallback = (event) => {
            sendEvent(event);
          };

          // Run research with streaming progress
          const researchReport = await runResearchAgents(
            symbol,
            timeframe,
            account,
            onProgress  // Pass callback to stream progress
          );

          // PHASE 2: DECISION MODELS
          sendEvent({
            type: 'phase_start',
            phase: 2,
            message: `${selectedModels.length} decision models analyzing research`,
            timestamp: Date.now()
          });

          // Get decisions from selected models
          const decisionsPromises = selectedModels.map(async (modelId: string) => {
            const modelName = getModelDisplayName(modelId);
            const providerType = getProviderType(modelId);

            try {
              if (!providerType || !PROVIDERS[providerType as keyof typeof PROVIDERS]) {
                throw new Error(`Unknown model or provider: ${modelId}`);
              }

              // Send decision start event
              sendEvent({
                type: 'decision_start',
                modelName,
                modelId,
                timestamp: Date.now()
              });

              const decisionStartTime = Date.now();
              const provider = PROVIDERS[providerType as keyof typeof PROVIDERS];

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
                maxTokens: 2000,
                enabled: true,
                useTools: false,
                maxSteps: 1,
              });

              const cleanedResponse = extractJSON(result.response);

              // Try to parse JSON with detailed error logging
              let decision: TradeDecision;
              try {
                decision = JSON.parse(cleanedResponse);
              } catch (parseError) {
                // Log the actual response for debugging
                console.error(`\n❌ JSON Parse failed for ${modelName}:`);
                console.error('Raw response length:', result.response.length);
                console.error('First 200 chars:', result.response.substring(0, 200));
                console.error('Cleaned JSON:', cleanedResponse);
                console.error('Parse error:', parseError);
                throw parseError; // Re-throw to be caught by outer try-catch
              }

              // Handle malformed responses
              if (!decision.action && (decision as any).bullishCase) {
                decision = {
                  action: 'HOLD' as const,
                  symbol: undefined,
                  quantity: undefined,
                  reasoning: decision as any,
                  confidence: 0.5,
                } as TradeDecision;
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
              console.error(`Model ${modelName} failed:`, error);

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

          console.log(`✅ ${decisions.length}/${selectedModels.length} models succeeded`);

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
          sendEvent({
            type: 'final_result',
            consensus,
            decisions,
            research: {
              totalToolCalls: researchReport.totalToolCalls,
              researchDuration: researchReport.researchDuration,
              agents: [
                { role: 'technical', ...researchReport.technical },
                { role: 'fundamental', ...researchReport.fundamental },
                { role: 'sentiment', ...researchReport.sentiment },
                { role: 'risk', ...researchReport.risk },
              ]
            },
            timestamp: Date.now()
          });

          // Close the stream
          controller.close();

        } catch (error) {
          console.error('SSE Stream Error:', error);

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
    console.error('Request parsing error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
