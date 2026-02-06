import { NextRequest, NextResponse } from 'next/server';
import { backendLogger } from '@/lib/dev/backend-logger';
import { getActiveBroker } from '@/lib/brokers/broker-factory';
import { generateDecisionPrompt, type ResearchFindings } from '@/lib/alpaca/enhanced-prompts';
import { runResearchAgents, type ResearchReport, type ResearchTier } from '@/lib/agents/research-agents';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';
import { ResearchCache } from '@/lib/trading/research-cache';
import { getProviderForTier, isSubscriptionTier } from '@/lib/ai-providers/provider-factory';
import type { PresetTier } from '@/lib/config/model-presets';
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import { getModelInfo } from '@/lib/models/model-registry';
import type { TradeDecision } from '@/lib/alpaca/types';
import { extractJSON } from '@/lib/trading/json-extraction';
import { generateTradingJudgePrompt, parseTradingJudgeResponse } from '@/lib/trading/judge-system';
// Deterministic scoring engine imports
import { fetchSharedTradingData } from '@/lib/alpaca/data-coordinator';
import { calculateTradingScore, formatTradingScoreForPrompt, hashToSeed, type TradingScore } from '@/lib/trading/scoring-engine';

// NOTE: Provider initialization moved to provider-factory.ts
// This route uses getProviderForTier() to get the appropriate provider based on tier

// Initialize research cache
const researchCache = new ResearchCache();

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
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { selectedModels, timeframe = 'swing', targetSymbol, researchMode = 'hybrid', researchTier = 'free' } = body;

    backendLogger.info('api', `POST /api/trading/consensus`, {
      symbol: targetSymbol,
      timeframe,
      modelCount: selectedModels?.length,
      researchTier
    }, '/api/trading/consensus');

    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 models' },
        { status: 400 }
      );
    }

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
        { error: 'Target symbol is required for consensus analysis' },
        { status: 400 }
      );
    }

    // Step 2.5: CALCULATE DETERMINISTIC SCORE (before AI analysis)
    // This score is REPRODUCIBLE - same inputs = same outputs
    let deterministicScore: TradingScore | null = null;
    try {
      const sharedData = await fetchSharedTradingData(targetSymbol);
      deterministicScore = calculateTradingScore(sharedData, timeframe as TradingTimeframe);
    } catch (scoreError) {
      // Continue without deterministic score - non-critical
      // Continue without deterministic score - AI will still analyze research
    }

    // Step 3: RUN EXHAUSTIVE RESEARCH PIPELINE (4 specialized agents)
    // With caching: Check cache first, run fresh research if cache miss/expired
    let researchReport: ResearchReport;
    const cached = await researchCache.get(targetSymbol, timeframe as TradingTimeframe);

    if (cached) {
      // Cache hit! Reuse existing research
      researchReport = cached;
      backendLogger.cacheHit(`${targetSymbol}-${timeframe}`);
    } else {
      // Cache miss - run fresh research
      backendLogger.cacheMiss(`${targetSymbol}-${timeframe}`);
      backendLogger.info('research', `Starting research pipeline for ${targetSymbol}`, { timeframe, tier: researchTier });
      researchReport = await runResearchAgents(
        targetSymbol,
        timeframe as TradingTimeframe,
        account,
        researchTier as ResearchTier
      );

      backendLogger.success('research', `Research complete for ${targetSymbol}`, {
        toolCalls: researchReport.totalToolCalls,
        duration: `${(researchReport.researchDuration / 1000).toFixed(1)}s`
      });

      // Cache the results for next time
      await researchCache.set(targetSymbol, timeframe as TradingTimeframe, researchReport);
      backendLogger.cacheSet(`${targetSymbol}-${timeframe}`);
    }

    // Step 4: Generate trading prompt WITH research findings AND deterministic score
    const date = new Date().toISOString().split('T')[0];
    const researchSection = formatResearchReportForPrompt(researchReport);

    // Format deterministic score for prompt (if available)
    const scoreSection = deterministicScore
      ? formatTradingScoreForPrompt(deterministicScore)
      : '';

    // CRITICAL: Use generateDecisionPrompt which does NOT mention tools
    // Decision models have useTools: false so they analyze research, not call tools
    const researchFindings: ResearchFindings = {
      technical: researchReport.technical.findings,
      fundamental: researchReport.fundamental.findings,
      sentiment: researchReport.sentiment.findings,
      risk: researchReport.risk.findings,
    };

    const basePrompt = generateDecisionPrompt(
      account,
      positions,
      date,
      timeframe as TradingTimeframe,
      targetSymbol,
      researchFindings
    );

    // Prepend deterministic score if available
    const prompt = scoreSection
      ? `${scoreSection}\n\n🎯 YOUR TASK: Analyze the deterministic score above and research findings. Explain WHY the score recommends ${deterministicScore?.recommendation || 'this action'} based on the research data. Your reasoning should validate, refine, or challenge the algorithmic score.\n\n${basePrompt}`
      : basePrompt;

    // Step 5: Call each AI model in parallel (NO TOOLS - analyzing research)
    const decisionsPromises = selectedModels.map(async (modelId: string) => {
      try {
        const providerType = getProviderType(modelId);
        if (!providerType) {
          throw new Error(`Unknown model or provider: ${modelId}`);
        }

        // Get provider based on tier - CLI for sub-pro/sub-max, API for others
        const { provider, error: providerError } = getProviderForTier(
          researchTier as PresetTier,
          providerType
        );

        if (providerError || !provider) {
          // For sub tiers: This is a billing protection error - do NOT fall back to API
          throw new Error(providerError || `No provider available for ${providerType}`);
        }

        const modelName = getModelDisplayName(modelId);

        backendLogger.info('model', `Querying ${modelName}`, { provider: providerType, modelId }, modelId);

        // Generate seed from deterministic score for reproducibility (OpenAI supports this)
        const seed = deterministicScore ? hashToSeed(deterministicScore.inputHash) : undefined;
        const modelStartTime = Date.now();

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

        // ✅ Check for error response BEFORE parsing
        if (result.error) {
          console.error(`❌ ${modelName} returned error:`, result.error);
          throw new Error(result.error);
        }

        // ✅ Check for empty response BEFORE parsing
        if (!result.response || result.response.trim().length === 0) {
          console.error(`❌ ${modelName} returned empty response`);
          throw new Error(`${modelName} returned empty response`);
        }

        // Parse JSON response with robust extraction
        const cleanedResponse = extractJSON(result.response);

        // ✅ Check if we got valid JSON-like content
        if (!cleanedResponse || cleanedResponse.trim().length === 0 || !cleanedResponse.includes('{')) {
          console.error(`❌ ${modelName} response not valid JSON:`, result.response.substring(0, 200));
          throw new Error(`${modelName} response was not valid JSON format`);
        }

        let decision: TradeDecision = JSON.parse(cleanedResponse);

        // Handle malformed responses (some models return just the reasoning object)
        if (!decision.action && (decision as any).bullishCase) {
          decision = {
            action: 'HOLD' as const,
            symbol: targetSymbol || 'UNKNOWN',
            quantity: 0,
            reasoning: decision as any, // The entire response is the reasoning object
            confidence: 0.5, // Medium confidence since it's a fallback
          };
        }

        // Add model ID for judge weighting
        decision.model = modelId;

        // Mark that this decision was based on exhaustive research
        decision.toolsUsed = false; // Decision model didn't use tools
        decision.toolCallCount = 0; // But research agents used 30-40 tools

        // Track provider type for billing proof in UI
        decision.providerType = isSubscriptionTier(researchTier as PresetTier) ? 'CLI' : 'API';

        backendLogger.success('model', `${modelName} decided: ${decision.action}`, {
          confidence: decision.confidence,
          duration: `${Date.now() - modelStartTime}ms`
        }, modelId);

        return decision;
      } catch (error) {
        const modelName = getModelDisplayName(modelId);
        console.error(`❌ Error getting decision from ${modelName}:`, error);
        // Return HOLD on error
        return {
          action: 'HOLD' as const,
          symbol: targetSymbol || 'UNKNOWN',
          quantity: 0,
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        };
      }
    });

    const decisions = await Promise.all(decisionsPromises);

    // Step 4: Calculate consensus
    const votes = {
      BUY: decisions.filter(d => d.action === 'BUY').length,
      SELL: decisions.filter(d => d.action === 'SELL').length,
      HOLD: decisions.filter(d => d.action === 'HOLD').length,
    };

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

    // Step 5: Run LLM Judge Analysis (uses Llama 3.3 70B for intelligent synthesis)
    const judgePrompt = generateTradingJudgePrompt(decisions, votes, consensusAction);

    // Use Groq's Llama 3.3 70B (FREE) as judge - safe for all tiers
    const { provider: groqProvider, error: groqError } = getProviderForTier(
      researchTier as PresetTier,
      'groq'
    );
    if (groqError || !groqProvider) {
      throw new Error(groqError || 'Groq provider not available for judge');
    }
    const judgeResponse = await groqProvider.query(judgePrompt, {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      enabled: true,
      maxTokens: 800, // Reduced (no tool use, just synthesis)
      temperature: 0.2,
      useTools: false, // ❌ Disabled - judge synthesizes from model decisions, doesn't need market data
      maxSteps: 1,
    });

    const judgeResult = parseTradingJudgeResponse(judgeResponse.response);
    judgeResult.tokenUsage = judgeResponse.tokensUsed || judgeResponse.tokens?.total || 0;

    // Step 6: Calculate aggregate values for BUY/SELL
    let consensusSymbol: string | undefined;
    let consensusQuantity: number | undefined;

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
    }

    // Step 6: Calculate agreement level (like normal consensus mode)
    const agreementPercentage = decisions.length > 0 ? maxVotes / decisions.length : 0;
    let agreementLevel: number;
    let agreementText: string;

    if (agreementPercentage >= 0.75) {
      agreementLevel = 0.9;
      agreementText = 'High Consensus';
    } else if (agreementPercentage >= 0.5) {
      agreementLevel = 0.7;
      agreementText = 'Moderate Consensus';
    } else {
      agreementLevel = 0.4;
      agreementText = 'Low Consensus';
    }

    // Step 7: Generate summary text (with defensive null check)
    const percentageText = (agreementPercentage * 100).toFixed(0);
    const summary = `${maxVotes} out of ${decisions.length} models (${percentageText}%) recommend ${consensusAction}${consensusSymbol ? ' ' + consensusSymbol : ''}. ${agreementText} achieved.`;

    // Step 8: Build consensus with LLM judge results
    const consensus = {
      action: judgeResult.bestAction, // From LLM judge analysis
      symbol: judgeResult.symbol || consensusSymbol, // Prefer judge's symbol analysis
      quantity: judgeResult.quantity || consensusQuantity, // Prefer judge's quantity analysis
      reasoning: judgeResult.unifiedReasoning, // From LLM judge (intelligent synthesis)
      confidence: judgeResult.confidence, // From LLM judge (weighted analysis)
      agreement: agreementLevel,
      agreementText,
      summary,
      disagreements: judgeResult.disagreements, // From LLM judge (intelligent detection)
      votes,
      modelCount: decisions.length,
      judgeTokensUsed: judgeResult.tokenUsage, // Track judge API usage
      riskLevel: judgeResult.riskLevel, // From LLM judge risk assessment
    };

    // Log final consensus result
    backendLogger.success('consensus', `Consensus: ${consensus.action} ${consensus.symbol || ''}`, {
      agreement: agreementText,
      votes,
      duration: `${Date.now() - startTime}ms`
    });

    // Return consensus, decisions, deterministic score, AND full research report
    return NextResponse.json({
      consensus,
      decisions, // Individual model decisions for transparency
      research: researchReport, // Full research report with all agent details
      deterministicScore: deterministicScore ? {
        recommendation: deterministicScore.recommendation,
        weightedScore: deterministicScore.weightedScore,
        confidence: deterministicScore.confidence,
        inputHash: deterministicScore.inputHash, // For audit trail
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
    backendLogger.error('api', `POST /api/trading/consensus failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${Date.now() - startTime}ms`
    });
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
