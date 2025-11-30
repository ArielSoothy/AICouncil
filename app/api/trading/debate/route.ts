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
import { getModelDisplayName as getModelName, getProviderForModel as getProviderFromConfig } from '@/lib/trading/models-config';
import { getModelInfo } from '@/lib/models/model-registry';
import type { TradeDecision } from '@/lib/alpaca/types';

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

    // Step 1: Get Alpaca account info and positions
    const account = await getAccount();
    const positions = await getPositions();

    // Step 2: Validate target symbol is provided
    if (!targetSymbol) {
      return NextResponse.json(
        { error: 'Target symbol is required for trading debate' },
        { status: 400 }
      );
    }

    // Step 3: RUN EXHAUSTIVE RESEARCH PIPELINE (4 specialized agents)
    const researchReport = await runResearchAgents(
      targetSymbol,
      timeframe as TradingTimeframe,
      account
    );

    // Step 4: Generate trading prompt WITH research findings (no tools needed)
    const date = new Date().toISOString().split('T')[0];
    const researchSection = formatResearchReportForPrompt(researchReport);
    const baseTradingPrompt = generateEnhancedTradingPromptWithData(
      account,
      positions,
      { symbol: targetSymbol, quote: { price: 0 } } as any, // Minimal data, research has real data
      date,
      timeframe as TradingTimeframe
    );

    // Insert research findings into base prompt
    const basePrompt = baseTradingPrompt.replace(
      '⚠️ ⚠️ ⚠️ CRITICAL OUTPUT FORMAT REQUIREMENT ⚠️ ⚠️ ⚠️',
      `${researchSection}\n\n⚠️ ⚠️ ⚠️ CRITICAL OUTPUT FORMAT REQUIREMENT ⚠️ ⚠️ ⚠️`
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

    // Round 1: Initial positions

    // Analyst (Dynamic model)
    const analystPrompt = `${basePrompt}\n\n${ANALYST_PROMPT}`;
    const analystProvider = getProviderForModel(analystModel, providers);
    const analystResult = await analystProvider.query(analystPrompt, {
      model: analystModel,
      provider: getProviderName(analystModel),
      temperature: 0.7,
      maxTokens: 2000, // Sufficient for analyzing research
      enabled: true,
      useTools: false, // ❌ NO TOOLS - analyzes research, doesn't conduct it
      maxSteps: 1,
    });
    const analystDecision: TradeDecision = JSON.parse(extractJSON(analystResult.response));
    analystDecision.toolsUsed = false; // Analyst didn't use tools (research agents did)
    analystDecision.toolCallCount = 0;

    // Critic (Dynamic model)
    const criticPrompt = `${basePrompt}\n\n${CRITIC_PROMPT.replace('{analystDecision}', JSON.stringify(analystDecision))}`;
    const criticProvider = getProviderForModel(criticModel, providers);
    const criticResult = await criticProvider.query(criticPrompt, {
      model: criticModel,
      provider: getProviderName(criticModel),
      temperature: 0.7,
      maxTokens: 2000,
      enabled: true,
      useTools: false, // ❌ NO TOOLS - analyzes research, doesn't conduct it
      maxSteps: 1,
    });
    const criticDecision: TradeDecision = JSON.parse(extractJSON(criticResult.response));
    criticDecision.toolsUsed = false;
    criticDecision.toolCallCount = 0;

    // Synthesizer (Dynamic model)
    const synthesizerPrompt = `${basePrompt}\n\n${SYNTHESIZER_PROMPT
      .replace('{analystDecision}', JSON.stringify(analystDecision))
      .replace('{criticDecision}', JSON.stringify(criticDecision))}`;
    const synthesizerProvider = getProviderForModel(synthesizerModel, providers);
    const synthesizerResult = await synthesizerProvider.query(synthesizerPrompt, {
      model: synthesizerModel,
      provider: getProviderName(synthesizerModel),
      temperature: 0.7,
      maxTokens: 2000,
      enabled: true,
      useTools: false, // ❌ NO TOOLS - analyzes research, doesn't conduct it
      maxSteps: 1,
    });
    const synthesizerDecision: TradeDecision = JSON.parse(extractJSON(synthesizerResult.response));
    synthesizerDecision.toolsUsed = false;
    synthesizerDecision.toolCallCount = 0;

    const round1 = [
      { role: 'analyst' as const, name: getModelName(analystModel), decision: analystDecision },
      { role: 'critic' as const, name: getModelName(criticModel), decision: criticDecision },
      { role: 'synthesizer' as const, name: getModelName(synthesizerModel), decision: synthesizerDecision },
    ];

    // Round 2: Refinement based on full debate

    const round1Summary = {
      analystDecision: JSON.stringify(analystDecision),
      criticDecision: JSON.stringify(criticDecision),
      synthesizerDecision: JSON.stringify(synthesizerDecision),
    };

    // Round 2 Analyst refinement
    const analystR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'ANALYST')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const analystR2Result = await analystProvider.query(analystR2Prompt, {
      model: analystModel,
      provider: getProviderName(analystModel),
      temperature: 0.7,
      maxTokens: 2000,
      enabled: true,
      useTools: false, // ❌ NO TOOLS - analyzes research, doesn't conduct it
      maxSteps: 1,
    });
    const analystR2Decision: TradeDecision = JSON.parse(extractJSON(analystR2Result.response));
    analystR2Decision.toolsUsed = false;
    analystR2Decision.toolCallCount = 0;

    // Round 2 Critic refinement
    const criticR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'CRITIC')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const criticR2Result = await criticProvider.query(criticR2Prompt, {
      model: criticModel,
      provider: getProviderName(criticModel),
      temperature: 0.7,
      maxTokens: 2000,
      enabled: true,
      useTools: false, // ❌ NO TOOLS - analyzes research, doesn't conduct it
      maxSteps: 1,
    });
    const criticR2Decision: TradeDecision = JSON.parse(extractJSON(criticR2Result.response));
    criticR2Decision.toolsUsed = false;
    criticR2Decision.toolCallCount = 0;

    // Round 2 Synthesizer final decision
    const synthesizerR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'SYNTHESIZER')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const synthesizerR2Result = await synthesizerProvider.query(synthesizerR2Prompt, {
      model: synthesizerModel,
      provider: getProviderName(synthesizerModel),
      temperature: 0.7,
      maxTokens: 2000,
      enabled: true,
      useTools: false, // ❌ NO TOOLS - analyzes research, doesn't conduct it
      maxSteps: 1,
    });
    const synthesizerR2Decision: TradeDecision = JSON.parse(extractJSON(synthesizerR2Result.response));
    synthesizerR2Decision.toolsUsed = false;
    synthesizerR2Decision.toolCallCount = 0;

    const round2 = [
      { role: 'analyst' as const, name: getModelName(analystModel), decision: analystR2Decision },
      { role: 'critic' as const, name: getModelName(criticModel), decision: criticR2Decision },
      { role: 'synthesizer' as const, name: getModelName(synthesizerModel), decision: synthesizerR2Decision },
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

    // Return debate results AND research metadata for transparency
    return NextResponse.json({
      debate,
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
