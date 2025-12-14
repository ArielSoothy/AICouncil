import { NextRequest, NextResponse } from 'next/server';
import { getActiveBroker } from '@/lib/brokers/broker-factory';
import { generateEnhancedTradingPromptWithData } from '@/lib/alpaca/enhanced-prompts';
import { fetchSharedTradingData } from '@/lib/alpaca/data-coordinator';
import { runResearchAgents, type ResearchReport, type ResearchTier, type ResearchModelPreset } from '@/lib/agents/research-agents';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';
import { ResearchCache } from '@/lib/trading/research-cache';
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';

// Initialize research cache
const researchCache = new ResearchCache();
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import { GroqProvider } from '@/lib/ai-providers/groq';
import { MistralProvider } from '@/lib/ai-providers/mistral';
import { PerplexityProvider } from '@/lib/ai-providers/perplexity';
import { CohereProvider } from '@/lib/ai-providers/cohere';
import { XAIProvider } from '@/lib/ai-providers/xai';
import { getModelDisplayName as getModelName, getProviderForModel as getProviderFromConfig } from '@/lib/trading/models-config';
import { getModelInfo } from '@/lib/models/model-registry';
import type { TradeDecision } from '@/lib/alpaca/types';
// Model fallback system imports
import {
  getFallbackModel,
  recordModelFailure,
  isModelUnstable,
  getModelDisplayName as getFallbackModelName,
} from '@/lib/trading/model-fallback';
// Deterministic scoring engine imports
import { calculateTradingScore, formatTradingScoreForPrompt, hashToSeed, type TradingScore } from '@/lib/trading/scoring-engine';

/**
 * Robust JSON extraction from model responses
 * Handles multiple formats: markdown blocks, plain text, truncated responses
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
  // Find first { and last }
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

// Helper function to get provider instance for a model
function getProviderForModel(modelId: string, providers: {
  anthropic: AnthropicProvider;
  openai: OpenAIProvider;
  google: GoogleProvider;
  groq: GroqProvider;
  mistral: MistralProvider;
  perplexity: PerplexityProvider;
  cohere: CohereProvider;
  xai: XAIProvider;
}) {
  const providerType = getProviderFromConfig(modelId);

  if (providerType === 'anthropic') return providers.anthropic;
  if (providerType === 'openai') return providers.openai;
  if (providerType === 'google') return providers.google;
  if (providerType === 'groq') return providers.groq;
  if (providerType === 'mistral') return providers.mistral;
  if (providerType === 'perplexity') return providers.perplexity;
  if (providerType === 'cohere') return providers.cohere;
  if (providerType === 'xai') return providers.xai;

  // Default to anthropic if unknown
  return providers.anthropic;
}

// Helper function to get provider name from model ID
function getProviderName(modelId: string): 'anthropic' | 'openai' | 'google' | 'groq' | 'mistral' | 'perplexity' | 'cohere' | 'xai' {
  const providerType = getProviderFromConfig(modelId);
  return providerType || 'anthropic';
}

// Fallback tracking for response
interface FallbackInfo {
  originalModel: string;
  originalModelName: string;
  fallbackModel: string;
  fallbackModelName: string;
  reason: string;
  role: string;
  round: number;
}

// Helper function to query with fallback
async function queryWithFallback(
  prompt: string,
  modelId: string,
  providers: {
    anthropic: AnthropicProvider;
    openai: OpenAIProvider;
    google: GoogleProvider;
    groq: GroqProvider;
    mistral: MistralProvider;
    perplexity: PerplexityProvider;
    cohere: CohereProvider;
    xai: XAIProvider;
  },
  options: {
    temperature: number;
    maxTokens: number;
    seed?: number;
    role: string;
    round: number;
  },
  fallbacks: FallbackInfo[],
  attemptedModels: string[] = []
): Promise<{ response: string; modelUsed: string; tokensUsed?: number }> {
  // Log warning if model has been unstable
  if (isModelUnstable(modelId)) {
    console.warn(`⚠️ [Debate ${options.role} R${options.round}] ${getFallbackModelName(modelId)} has been unstable recently`);
  }

  try {
    const provider = getProviderForModel(modelId, providers);
    const result = await provider.query(prompt, {
      model: modelId,
      provider: getProviderName(modelId),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      enabled: true,
      useTools: false,
      maxSteps: 1,
      seed: options.seed,
    });

    return {
      response: result.response,
      modelUsed: modelId,
      tokensUsed: result.tokens?.total,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [Debate ${options.role} R${options.round}] ${getFallbackModelName(modelId)} failed: ${errorMessage}`);

    // Record failure for instability tracking
    recordModelFailure(modelId, errorMessage);

    // Get fallback model
    const fallbackModelId = getFallbackModel(modelId, [...attemptedModels, modelId]);

    if (fallbackModelId) {
      console.log(`🔄 [Debate ${options.role} R${options.round}] Falling back: ${getFallbackModelName(modelId)} → ${getFallbackModelName(fallbackModelId)}`);

      // Track fallback for response
      fallbacks.push({
        originalModel: modelId,
        originalModelName: getFallbackModelName(modelId),
        fallbackModel: fallbackModelId,
        fallbackModelName: getFallbackModelName(fallbackModelId),
        reason: errorMessage,
        role: options.role,
        round: options.round,
      });

      // Recursive call with fallback model
      return queryWithFallback(
        prompt,
        fallbackModelId,
        providers,
        options,
        fallbacks,
        [...attemptedModels, modelId]
      );
    }

    // No more fallbacks - throw error
    throw new Error(`All fallback models exhausted for ${options.role} (Round ${options.round}). Last error: ${errorMessage}`);
  }
}

// Helper function to determine if model should use tools (Hybrid Research Mode)
function shouldModelUseTools(modelId: string, researchMode: string): boolean {
  const modelInfo = getModelInfo(modelId);
  if (researchMode === 'all') return true;
  if (researchMode === 'shared') return false;
  // 'hybrid' mode: only premium/flagship models get tools
  return modelInfo?.tier === 'flagship' || modelInfo?.tier === 'premium';
}

/**
 * Format research report into comprehensive prompt section for debate agents
 * All debate agents (Analyst, Critic, Synthesizer) analyze this research
 */
function formatResearchReportForPrompt(research: ResearchReport): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 EXHAUSTIVE RESEARCH REPORT FOR ${research.symbol}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Research Completed: ${research.timestamp.toLocaleString()}
Total Research Time: ${(research.researchDuration / 1000).toFixed(1)}s
Total Tool Calls: ${research.totalToolCalls}
Research Quality: ${research.totalToolCalls >= 30 ? 'EXCELLENT ⭐⭐⭐' : research.totalToolCalls >= 20 ? 'GOOD ⭐⭐' : 'MINIMAL ⭐'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 TECHNICAL ANALYSIS RESEARCH
Agent: ${research.technical.model} (${research.technical.provider})
Tools Used: ${research.technical.toolCallCount} calls - ${research.technical.toolNames.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${research.technical.findings}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 FUNDAMENTAL ANALYSIS RESEARCH
Agent: ${research.fundamental.model} (${research.fundamental.provider})
Tools Used: ${research.fundamental.toolCallCount} calls - ${research.fundamental.toolNames.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${research.fundamental.findings}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 SENTIMENT ANALYSIS RESEARCH
Agent: ${research.sentiment.model} (${research.sentiment.provider})
Tools Used: ${research.sentiment.toolCallCount} calls - ${research.sentiment.toolNames.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${research.sentiment.findings}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RISK MANAGEMENT RESEARCH
Agent: ${research.risk.model} (${research.risk.provider})
Tools Used: ${research.risk.toolCallCount} calls - ${research.risk.toolNames.join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${research.risk.findings}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ DEBATE INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The research above was conducted by 4 specialized AI agents using ${research.totalToolCalls} real-time market data tool calls.
Your job is to ANALYZE this comprehensive research for your debate role.

DO NOT conduct your own research (you don't have access to tools).
DO analyze the research findings above and formulate your position.

Base your arguments on:
✅ Technical analysis findings (trend, momentum, key levels)
✅ Fundamental analysis findings (news, catalysts, company health)
✅ Sentiment analysis findings (market psychology, news sentiment)
✅ Risk analysis findings (position sizing, stop-loss levels, risk assessment)
`;
}

// Agent personas for trading debate
const ANALYST_PROMPT = `You are the ANALYST agent in a trading debate. Your role is to analyze market data and propose trading opportunities.

Based on the account information and market conditions provided, make an initial trading recommendation.

Return your response in JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "TICKER" (if BUY/SELL),
  "quantity": number (if BUY/SELL),
  "reasoning": "Your analysis and rationale",
  "confidence": 0.0-1.0
}`;

const CRITIC_PROMPT = `You are the CRITIC agent in a trading debate. Your role is to challenge the Analyst's recommendation and identify risks.

The Analyst recommended: {analystDecision}

Provide a critical evaluation and your counter-recommendation if you disagree.

Return your response in JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "TICKER" (if BUY/SELL),
  "quantity": number (if BUY/SELL),
  "reasoning": "Your critical analysis and concerns",
  "confidence": 0.0-1.0
}`;

const SYNTHESIZER_PROMPT = `You are the SYNTHESIZER agent in a trading debate. Your role is to synthesize the Analyst and Critic's positions into a final decision.

Analyst recommended: {analystDecision}
Critic recommended: {criticDecision}

Consider both perspectives and make a final trading decision that balances opportunity and risk.

Return your response in JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "TICKER" (if BUY/SELL),
  "quantity": number (if BUY/SELL),
  "reasoning": "Your synthesis and final rationale",
  "confidence": 0.0-1.0
}`;

const ROUND2_REFINEMENT_PROMPT = `You are the {role} agent in Round 2 of the trading debate. Review the previous round's discussion and refine your position.

Previous Round Summary:
- Analyst: {analystDecision}
- Critic: {criticDecision}
- Synthesizer: {synthesizerDecision}

Based on the full Round 1 debate, provide your refined trading recommendation for Round 2.

Return your response in JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "TICKER" (if BUY/SELL),
  "quantity": number (if BUY/SELL),
  "reasoning": "Your refined analysis considering Round 1 discussion",
  "confidence": 0.0-1.0
}`;

export async function POST(request: NextRequest) {
  try {
    // Parse request body for model selections, timeframe, target symbol, and research mode
    const body = await request.json();
    const analystModel = body.analystModel || 'claude-3-5-sonnet-20241022';
    const criticModel = body.criticModel || 'gpt-4o';
    const synthesizerModel = body.synthesizerModel || 'gemini-2.5-flash';
    const timeframe = body.timeframe || 'swing';
    const targetSymbol = body.targetSymbol;
    const researchMode = body.researchMode || 'hybrid';
    const researchTier = body.researchTier || 'free';
    const researchModel = body.researchModel; // Optional research model override

    // Step 1: Get broker account info and positions
    const broker = getActiveBroker();
    const [brokerAccount, brokerPositions] = await Promise.all([
      broker.getAccount(),
      broker.getPositions(),
    ]);

    // Map to legacy format for compatibility with existing prompts
    const account = {
      id: brokerAccount.id,
      account_number: brokerAccount.accountNumber,
      status: brokerAccount.status,
      currency: brokerAccount.currency,
      portfolio_value: String(brokerAccount.portfolioValue),
      buying_power: String(brokerAccount.buyingPower),
      cash: String(brokerAccount.cash),
      equity: String(brokerAccount.equity),
      last_equity: String(brokerAccount.lastEquity),
    };
    const positions = brokerPositions.map(pos => ({
      symbol: pos.symbol,
      qty: String(pos.quantity),
      side: pos.side,
      market_value: String(pos.marketValue),
      cost_basis: String(pos.avgEntryPrice * pos.quantity),
      unrealized_pl: String(pos.unrealizedPL),
      unrealized_plpc: String(pos.unrealizedPLPercent),
      current_price: String(pos.currentPrice),
      avg_entry_price: String(pos.avgEntryPrice),
    }));

    // Step 2: Validate target symbol is provided
    if (!targetSymbol) {
      return NextResponse.json(
        { error: 'Target symbol is required for trading debate' },
        { status: 400 }
      );
    }

    // Step 2.5: CALCULATE DETERMINISTIC SCORE (before AI analysis)
    // This score is REPRODUCIBLE - same inputs = same outputs
    let deterministicScore: TradingScore | null = null;
    let sharedData: Awaited<ReturnType<typeof fetchSharedTradingData>> | null = null;
    try {
      sharedData = await fetchSharedTradingData(targetSymbol);
      deterministicScore = calculateTradingScore(sharedData, timeframe as TradingTimeframe);
      console.log(`✅ Deterministic score for ${targetSymbol}: ${deterministicScore.recommendation} (${deterministicScore.weightedScore.toFixed(2)})`);
    } catch (scoreError) {
      console.warn(`⚠️ Could not calculate deterministic score: ${scoreError}`);
      // Continue without deterministic score - AI will still analyze research
    }

    // Step 3: RUN EXHAUSTIVE RESEARCH PIPELINE (4 specialized agents)
    // Check cache first
    let researchReport = await researchCache.get(targetSymbol, timeframe as TradingTimeframe);

    if (researchReport) {
      console.log(`✅ Cache hit for ${targetSymbol}-${timeframe} - using cached research`);
    } else {
      console.log(`💨 Cache miss for ${targetSymbol}-${timeframe} - running fresh research`);
      researchReport = await runResearchAgents(
        targetSymbol,
        timeframe as TradingTimeframe,
        account,
        researchTier as ResearchTier,
        undefined, // No progress callback for debate mode (non-streaming)
        researchModel as ResearchModelPreset | undefined
      );
      // Cache the results for next time
      await researchCache.set(targetSymbol, timeframe as TradingTimeframe, researchReport);
    }

    // Step 4: Generate trading prompt WITH research findings AND deterministic score
    const date = new Date().toISOString().split('T')[0];
    const researchSection = formatResearchReportForPrompt(researchReport);

    // Format deterministic score for prompt (if available)
    const scoreSection = deterministicScore
      ? formatTradingScoreForPrompt(deterministicScore)
      : '';

    // Use actual shared data if available, otherwise minimal placeholder
    const dataForPrompt = sharedData || { symbol: targetSymbol, quote: { price: 0 } } as any;
    const baseTradingPrompt = generateEnhancedTradingPromptWithData(
      account,
      positions,
      dataForPrompt,
      date,
      timeframe as TradingTimeframe
    );

    // Insert research findings AND deterministic score into base prompt
    const basePrompt = baseTradingPrompt.replace(
      '⚠️ ⚠️ ⚠️ CRITICAL OUTPUT FORMAT REQUIREMENT ⚠️ ⚠️ ⚠️',
      `${scoreSection}\n\n${researchSection}\n\n⚠️ DEBATE CONTEXT: The deterministic score recommends ${deterministicScore?.recommendation || 'N/A'}. Your role is to debate this recommendation.\n\n⚠️ ⚠️ ⚠️ CRITICAL OUTPUT FORMAT REQUIREMENT ⚠️ ⚠️ ⚠️`
    );

    // Initialize all AI providers
    const providers = {
      anthropic: new AnthropicProvider(),
      openai: new OpenAIProvider(),
      google: new GoogleProvider(),
      groq: new GroqProvider(),
      mistral: new MistralProvider(),
      perplexity: new PerplexityProvider(),
      cohere: new CohereProvider(),
      xai: new XAIProvider(),
    };

    // Track fallbacks for response
    const fallbacks: FallbackInfo[] = [];

    // Round 1: Initial positions

    // Generate seed from deterministic score for reproducibility (OpenAI supports this)
    const seed = deterministicScore ? hashToSeed(deterministicScore.inputHash) : undefined;

    // Analyst (Dynamic model) - with fallback
    const analystPrompt = `${basePrompt}\n\n${ANALYST_PROMPT}`;
    const analystResultWithFallback = await queryWithFallback(
      analystPrompt,
      analystModel,
      providers,
      { temperature: 0.2, maxTokens: 2000, seed, role: 'Analyst', round: 1 },
      fallbacks
    );
    const analystDecision: TradeDecision = JSON.parse(extractJSON(analystResultWithFallback.response));
    analystDecision.toolsUsed = false; // Analyst didn't use tools (research agents did)
    analystDecision.toolCallCount = 0;
    const analystModelUsed = analystResultWithFallback.modelUsed;

    // Critic (Dynamic model) - with fallback
    const criticPrompt = `${basePrompt}\n\n${CRITIC_PROMPT.replace('{analystDecision}', JSON.stringify(analystDecision))}`;
    const criticResultWithFallback = await queryWithFallback(
      criticPrompt,
      criticModel,
      providers,
      { temperature: 0.2, maxTokens: 2000, seed, role: 'Critic', round: 1 },
      fallbacks
    );
    const criticDecision: TradeDecision = JSON.parse(extractJSON(criticResultWithFallback.response));
    criticDecision.toolsUsed = false;
    criticDecision.toolCallCount = 0;
    const criticModelUsed = criticResultWithFallback.modelUsed;

    // Synthesizer (Dynamic model) - with fallback
    const synthesizerPrompt = `${basePrompt}\n\n${SYNTHESIZER_PROMPT
      .replace('{analystDecision}', JSON.stringify(analystDecision))
      .replace('{criticDecision}', JSON.stringify(criticDecision))}`;
    const synthesizerResultWithFallback = await queryWithFallback(
      synthesizerPrompt,
      synthesizerModel,
      providers,
      { temperature: 0.2, maxTokens: 2000, seed, role: 'Synthesizer', round: 1 },
      fallbacks
    );
    const synthesizerDecision: TradeDecision = JSON.parse(extractJSON(synthesizerResultWithFallback.response));
    synthesizerDecision.toolsUsed = false;
    synthesizerDecision.toolCallCount = 0;
    const synthesizerModelUsed = synthesizerResultWithFallback.modelUsed;

    const round1 = [
      { role: 'analyst' as const, name: getModelName(analystModelUsed), decision: analystDecision },
      { role: 'critic' as const, name: getModelName(criticModelUsed), decision: criticDecision },
      { role: 'synthesizer' as const, name: getModelName(synthesizerModelUsed), decision: synthesizerDecision },
    ];

    // Round 2: Refinement based on full debate

    const round1Summary = {
      analystDecision: JSON.stringify(analystDecision),
      criticDecision: JSON.stringify(criticDecision),
      synthesizerDecision: JSON.stringify(synthesizerDecision),
    };

    // Round 2 Analyst refinement - with fallback
    const analystR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'ANALYST')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const analystR2ResultWithFallback = await queryWithFallback(
      analystR2Prompt,
      analystModelUsed, // Use the model from Round 1 (may be fallback)
      providers,
      { temperature: 0.2, maxTokens: 2000, seed, role: 'Analyst', round: 2 },
      fallbacks
    );
    const analystR2Decision: TradeDecision = JSON.parse(extractJSON(analystR2ResultWithFallback.response));
    analystR2Decision.toolsUsed = false;
    analystR2Decision.toolCallCount = 0;
    const analystR2ModelUsed = analystR2ResultWithFallback.modelUsed;

    // Round 2 Critic refinement - with fallback
    const criticR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'CRITIC')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const criticR2ResultWithFallback = await queryWithFallback(
      criticR2Prompt,
      criticModelUsed, // Use the model from Round 1 (may be fallback)
      providers,
      { temperature: 0.2, maxTokens: 2000, seed, role: 'Critic', round: 2 },
      fallbacks
    );
    const criticR2Decision: TradeDecision = JSON.parse(extractJSON(criticR2ResultWithFallback.response));
    criticR2Decision.toolsUsed = false;
    criticR2Decision.toolCallCount = 0;
    const criticR2ModelUsed = criticR2ResultWithFallback.modelUsed;

    // Round 2 Synthesizer final decision - with fallback
    const synthesizerR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'SYNTHESIZER')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const synthesizerR2ResultWithFallback = await queryWithFallback(
      synthesizerR2Prompt,
      synthesizerModelUsed, // Use the model from Round 1 (may be fallback)
      providers,
      { temperature: 0.2, maxTokens: 2000, seed, role: 'Synthesizer', round: 2 },
      fallbacks
    );
    const synthesizerR2Decision: TradeDecision = JSON.parse(extractJSON(synthesizerR2ResultWithFallback.response));
    synthesizerR2Decision.toolsUsed = false;
    synthesizerR2Decision.toolCallCount = 0;
    const synthesizerR2ModelUsed = synthesizerR2ResultWithFallback.modelUsed;

    const round2 = [
      { role: 'analyst' as const, name: getModelName(analystR2ModelUsed), decision: analystR2Decision },
      { role: 'critic' as const, name: getModelName(criticR2ModelUsed), decision: criticR2Decision },
      { role: 'synthesizer' as const, name: getModelName(synthesizerR2ModelUsed), decision: synthesizerR2Decision },
    ];

    // Final decision is the Round 2 Synthesizer's decision
    const finalDecision = {
      ...synthesizerR2Decision,
      consensus: `After 2 rounds of debate between Analyst, Critic, and Synthesizer, the final decision is ${synthesizerR2Decision.action}.`,
    };

    const debate = {
      round1,
      round2,
      finalDecision,
    };

    // Return debate results, deterministic score, research metadata, AND fallbacks
    return NextResponse.json({
      debate,
      research: {
        // Research data for UI display - direct properties (not agents[] array)
        totalToolCalls: researchReport.totalToolCalls,
        researchDuration: researchReport.researchDuration,
        symbol: researchReport.symbol,
        timestamp: researchReport.timestamp,
        // Direct agent properties for ResearchActivityPanel
        technical: researchReport.technical,
        fundamental: researchReport.fundamental,
        sentiment: researchReport.sentiment,
        risk: researchReport.risk,
      },
      deterministicScore: deterministicScore ? {
        recommendation: deterministicScore.recommendation,
        weightedScore: deterministicScore.weightedScore,
        confidence: deterministicScore.confidence,
        inputHash: deterministicScore.inputHash,
        technical: deterministicScore.technical.score,
        fundamental: deterministicScore.fundamental.score,
        sentiment: deterministicScore.sentiment.score,
        trend: deterministicScore.trend.score,
        bullishFactors: deterministicScore.bullishFactors,
        bearishFactors: deterministicScore.bearishFactors,
        suggestedStopLoss: deterministicScore.suggestedStopLoss,
        suggestedTakeProfit: deterministicScore.suggestedTakeProfit,
        riskRewardRatio: deterministicScore.riskRewardRatio,
      } : null,
      // Model fallback information (if any models were substituted)
      fallbacks: fallbacks.length > 0 ? fallbacks : undefined,
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
