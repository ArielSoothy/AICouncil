import { NextRequest, NextResponse } from 'next/server';
import { getActiveBroker } from '@/lib/brokers/broker-factory';
import { generateEnhancedTradingPrompt } from '@/lib/alpaca/enhanced-prompts';
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
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import { getModelInfo } from '@/lib/models/model-registry';
import type { TradeDecision } from '@/lib/alpaca/types';
// Deterministic scoring engine imports
import { fetchSharedTradingData } from '@/lib/alpaca/data-coordinator';
import { calculateTradingScore, formatTradingScoreForPrompt, hashToSeed, type TradingScore } from '@/lib/trading/scoring-engine';

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

/**
 * Format research report into comprehensive prompt section for decision models
 * Decision models analyze this research instead of conducting their own
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
⚠️ YOUR MISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a PROFESSIONAL TRADING DECISION ANALYST.

The research above was conducted by 4 specialized AI agents using ${research.totalToolCalls} real-time market data tool calls.
Your job is to ANALYZE this comprehensive research and make an INFORMED trading recommendation.

DO NOT conduct your own research (you don't have access to tools).
DO analyze the research findings above and synthesize them into a clear recommendation.

Base your decision on:
✅ Technical analysis findings (trend, momentum, key levels)
✅ Fundamental analysis findings (news, catalysts, company health)
✅ Sentiment analysis findings (market psychology, news sentiment)
✅ Risk analysis findings (position sizing, stop-loss levels, risk assessment)

Synthesize all 4 research perspectives into ONE informed decision.
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedModels, timeframe = 'swing', targetSymbol, researchMode = 'hybrid', researchTier = 'free', researchModel } = body;

    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 models' },
        { status: 400 }
      );
    }

    // Step 1: Get broker account info and positions (graceful fallback if broker unavailable)
    let account;
    let positions: Array<{ symbol: string; qty: string; side: string; market_value: string; cost_basis: string; unrealized_pl: string; unrealized_plpc: string; current_price: string; avg_entry_price: string }> = [];

    try {
      const broker = getActiveBroker();
      const [brokerAccount, brokerPositions] = await Promise.all([
        broker.getAccount(),
        broker.getPositions(),
      ]);

      // Map to legacy format for compatibility with existing prompts
      account = {
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
      positions = brokerPositions.map(pos => ({
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
    } catch (brokerError) {
      // Graceful fallback - research can proceed without live broker data
      console.warn(`⚠️ Broker unavailable, using fallback data: ${brokerError}`);
      account = {
        id: 'fallback',
        account_number: 'N/A',
        status: 'ACTIVE',
        currency: 'USD',
        portfolio_value: '100000',
        buying_power: '100000',
        cash: '100000',
        equity: '100000',
        last_equity: '100000',
      };
      // positions already initialized as empty array
    }

    // Step 2: Validate target symbol (required for research)
    if (!targetSymbol) {
      return NextResponse.json(
        { error: 'Target symbol is required for individual analysis' },
        { status: 400 }
      );
    }

    // Step 2.5: CALCULATE DETERMINISTIC SCORE (before AI analysis)
    // This score is REPRODUCIBLE - same inputs = same outputs
    let deterministicScore: TradingScore | null = null;
    try {
      const sharedData = await fetchSharedTradingData(targetSymbol);
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
        undefined, // No progress callback for individual mode (non-streaming)
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

    const basePrompt = generateEnhancedTradingPrompt(
      account,
      positions,
      date,
      timeframe as TradingTimeframe,
      targetSymbol
    );

    // Insert research findings AND deterministic score into prompt
    const prompt = basePrompt.replace(
      '⚠️ ⚠️ ⚠️ CRITICAL OUTPUT FORMAT REQUIREMENT ⚠️ ⚠️ ⚠️',
      `${scoreSection}\n\n${researchSection}\n\n⚠️ YOUR TASK: Analyze the deterministic score above and research findings. Explain WHY the score recommends ${deterministicScore?.recommendation || 'this action'} based on the research data.\n\n⚠️ ⚠️ ⚠️ CRITICAL OUTPUT FORMAT REQUIREMENT ⚠️ ⚠️ ⚠️`
    );

    // Step 5: Call each AI model in parallel (NO TOOLS - analyzing research)
    const decisionsPromises = selectedModels.map(async (modelId: string) => {
      try {
        const providerType = getProviderType(modelId);
        if (!providerType || !PROVIDERS[providerType]) {
          throw new Error(`Unknown model or provider: ${modelId}`);
        }

        const provider = PROVIDERS[providerType];
        const modelName = getModelDisplayName(modelId);

        // Generate seed from deterministic score for reproducibility (OpenAI supports this)
        const seed = deterministicScore ? hashToSeed(deterministicScore.inputHash) : undefined;

        const result = await provider.query(prompt, {
          model: modelId,
          provider: providerType,
          temperature: 0.2, // Low temperature for deterministic trading decisions
          maxTokens: 2000, // Sufficient for analyzing research
          enabled: true,
          useTools: false, // ❌ NO TOOLS - decision models analyze research, don't conduct it
          maxSteps: 1,
          seed, // For reproducibility (OpenAI supports this)
        });

        // Parse JSON response with robust extraction
        const cleanedResponse = extractJSON(result.response);
        const decision: TradeDecision = JSON.parse(cleanedResponse);

        // Track tool usage and token usage for cost tracking
        const decisionWithTracking: TradeDecision & { model: string; modelId: string; tokens?: { prompt: number; completion: number; total: number } } = {
          model: modelName,
          modelId: modelId,
          ...decision,
          toolsUsed: false, // Decision model didn't use tools
          toolCallCount: 0, // But research agents used 30-40 tools
          tokens: result.tokens, // Include token usage for cost tracking
        };

        return decisionWithTracking;
      } catch (error) {
        const modelName = getModelDisplayName(modelId);
        console.error(`❌ Error getting decision from ${modelName}:`, error);
        // Return error as HOLD decision
        return {
          model: modelName,
          action: 'HOLD' as const,
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        };
      }
    });

    const decisions = await Promise.all(decisionsPromises);

    // Return decisions, context, deterministic score, AND research metadata
    return NextResponse.json({
      decisions,
      context: {
        accountBalance: account.portfolio_value,
        buyingPower: account.buying_power,
        cash: account.cash,
        analysisDate: date,
        promptSummary: 'AI models analyze exhaustive research conducted by 4 specialized agents and generate informed trading recommendations.'
      },
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
    });

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
