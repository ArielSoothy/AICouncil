import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getPositions } from '@/lib/alpaca/client';
import { generateEnhancedTradingPromptWithData } from '@/lib/alpaca/enhanced-prompts';
import { fetchSharedTradingData } from '@/lib/alpaca/data-coordinator';
import { runResearchAgents, type ResearchReport } from '@/lib/agents/research-agents';
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
import { getModelInfo } from '@/lib/models/model-registry';
import type { TradeDecision } from '@/lib/alpaca/types';
import { generateTradingJudgePrompt, parseTradingJudgeResponse } from '@/lib/trading/judge-system';

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
    const { selectedModels, timeframe = 'swing', targetSymbol, researchMode = 'hybrid' } = body;

    if (!selectedModels || !Array.isArray(selectedModels) || selectedModels.length < 2) {
      return NextResponse.json(
        { error: 'Please select at least 2 models' },
        { status: 400 }
      );
    }

    const symbolText = targetSymbol ? ` on ${targetSymbol.toUpperCase()}` : '';
    console.log('🤝 Getting consensus from', selectedModels.length, 'models for', timeframe, 'trading' + symbolText + '...');

    // Step 1: Get Alpaca account info and positions
    const account = await getAccount();
    const positions = await getPositions();
    console.log('💰 Account balance:', account.portfolio_value);
    console.log('📊 Current positions:', positions.length);

    // Step 2: Validate target symbol is provided
    if (!targetSymbol) {
      return NextResponse.json(
        { error: 'Target symbol is required for consensus analysis' },
        { status: 400 }
      );
    }

    // Step 3: RUN EXHAUSTIVE RESEARCH PIPELINE (4 specialized agents)
    console.log(`\n🔬 PHASE 1: Running exhaustive research pipeline for ${targetSymbol.toUpperCase()}...`);
    const researchReport = await runResearchAgents(
      targetSymbol,
      timeframe as TradingTimeframe,
      account
    );
    console.log(`✅ Research complete: ${researchReport.totalToolCalls} tools used, ${(researchReport.researchDuration / 1000).toFixed(1)}s duration\n`);

    // Step 4: Generate trading prompt WITH research findings (no tools needed)
    console.log('🔬 PHASE 2: Decision models analyzing research findings...');
    const date = new Date().toISOString().split('T')[0];
    const researchSection = formatResearchReportForPrompt(researchReport);
    const basePrompt = generateEnhancedTradingPromptWithData(
      account,
      positions,
      { symbol: targetSymbol, quote: { price: 0 } } as any, // Minimal data, research has real data
      date,
      timeframe as TradingTimeframe
    );

    // Insert research findings into prompt (BEFORE the JSON format instruction)
    const prompt = basePrompt.replace(
      '⚠️ OUTPUT FORMAT (CRITICAL):',
      `${researchSection}\n\n⚠️ OUTPUT FORMAT (CRITICAL):`
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

        console.log(`📊 ${modelName}: Analyzing research findings...`);

        const result = await provider.query(prompt, {
          model: modelId,
          provider: providerType,
          temperature: 0.7,
          maxTokens: 2000, // Sufficient for analyzing research
          enabled: true,
          useTools: false, // ❌ NO TOOLS - decision models analyze research, don't conduct it
          maxSteps: 1,
        });

        // Parse JSON response with robust extraction
        const cleanedResponse = extractJSON(result.response);
        const decision: TradeDecision = JSON.parse(cleanedResponse);

        // Add model ID for judge weighting
        decision.model = modelId;

        // Mark that this decision was based on exhaustive research
        decision.toolsUsed = false; // Decision model didn't use tools
        decision.toolCallCount = 0; // But research agents used 30-40 tools

        console.log(`  ✅ ${modelName} decision: ${decision.action}`);

        return decision;
      } catch (error) {
        const modelName = getModelDisplayName(modelId);
        console.error(`❌ Error getting decision from ${modelName}:`, error);
        // Return HOLD on error
        return {
          action: 'HOLD' as const,
          symbol: undefined,
          quantity: undefined,
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        } as TradeDecision;
      }
    });

    const decisions = await Promise.all(decisionsPromises);

    // Step 4: Calculate consensus
    const votes = {
      BUY: decisions.filter(d => d.action === 'BUY').length,
      SELL: decisions.filter(d => d.action === 'SELL').length,
      HOLD: decisions.filter(d => d.action === 'HOLD').length,
    };

    console.log('🗳️  Vote breakdown:', votes);

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

    console.log('✅ Consensus action:', consensusAction);

    // Step 5: Run LLM Judge Analysis (uses Llama 3.3 70B for intelligent synthesis)
    console.log('🧑‍⚖️  Running LLM judge analysis...');
    const judgePrompt = generateTradingJudgePrompt(decisions, votes, consensusAction);

    // Use Groq's Llama 3.3 70B (free) as judge
    const groqProvider = PROVIDERS.groq;
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
    const agreementPercentage = maxVotes / decisions.length
    let agreementLevel: number
    let agreementText: string

    if (agreementPercentage >= 0.75) {
      agreementLevel = 0.9
      agreementText = 'High Consensus'
    } else if (agreementPercentage >= 0.5) {
      agreementLevel = 0.7
      agreementText = 'Moderate Consensus'
    } else {
      agreementLevel = 0.4
      agreementText = 'Low Consensus'
    }

    // Step 7: Generate summary text
    const summary = `${maxVotes} out of ${decisions.length} models (${(agreementPercentage * 100).toFixed(0)}%) recommend ${consensusAction}${consensusSymbol ? ' ' + consensusSymbol : ''}. ${agreementText} achieved.`

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

    console.log('✅ Consensus result:', consensus);
    console.log('📊 Returning individual decisions:', decisions.length);
    console.log('🔬 Research metadata: ' + researchReport.totalToolCalls + ' total tool calls\n');

    // Return consensus, decisions, AND research metadata for transparency
    return NextResponse.json({
      consensus,
      decisions, // Individual model decisions for transparency
      research: {
        // Research metadata for UI display
        totalToolCalls: researchReport.totalToolCalls,
        researchDuration: researchReport.researchDuration,
        agents: [
          {
            role: 'technical',
            model: researchReport.technical.model,
            toolsUsed: researchReport.technical.toolCallCount,
            tools: researchReport.technical.toolNames,
          },
          {
            role: 'fundamental',
            model: researchReport.fundamental.model,
            toolsUsed: researchReport.fundamental.toolCallCount,
            tools: researchReport.fundamental.toolNames,
          },
          {
            role: 'sentiment',
            model: researchReport.sentiment.model,
            toolsUsed: researchReport.sentiment.toolCallCount,
            tools: researchReport.sentiment.toolNames,
          },
          {
            role: 'risk',
            model: researchReport.risk.model,
            toolsUsed: researchReport.risk.toolCallCount,
            tools: researchReport.risk.toolNames,
          },
        ],
      },
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
