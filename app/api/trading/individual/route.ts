import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getPositions } from '@/lib/alpaca/client';
import { generateEnhancedTradingPrompt } from '@/lib/alpaca/enhanced-prompts';
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
    console.log('🤖 Getting trading decisions from', selectedModels.length, 'models for', timeframe, 'trading' + symbolText + '...');

    // Step 1: Get Alpaca account info and positions
    const account = await getAccount();
    const positions = await getPositions();
    console.log('💰 Account balance:', account.portfolio_value);
    console.log('📊 Current positions:', positions.length);

    // Step 2: Validate target symbol (required for research)
    if (!targetSymbol) {
      return NextResponse.json(
        { error: 'Target symbol is required for individual analysis' },
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
    const basePrompt = generateEnhancedTradingPrompt(
      account,
      positions,
      date,
      timeframe as TradingTimeframe,
      targetSymbol
    );

    // Insert research findings into prompt
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

        // Track tool usage
        const decisionWithTracking: TradeDecision & { model: string } = {
          model: modelName,
          ...decision,
          toolsUsed: false, // Decision model didn't use tools
          toolCallCount: 0, // But research agents used 30-40 tools
        };

        console.log(`  ✅ ${modelName} decision: ${decision.action}`);

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

    console.log('✅ Got', decisions.length, 'trading decisions');
    console.log('🔬 Research metadata: ' + researchReport.totalToolCalls + ' total tool calls\n');

    // Return decisions, context, AND research metadata for transparency
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
