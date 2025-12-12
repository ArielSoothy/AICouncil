/**
 * Specialized Research Agents for Exhaustive Trading Analysis
 *
 * Architecture: 4 specialized agents conduct parallel deep research
 * - Technical Analyst: Price action, indicators, patterns (5-8 tools)
 * - Fundamental Analyst: News, earnings, company fundamentals (4-6 tools)
 * - Sentiment Analyst: News sentiment, market psychology (3-5 tools)
 * - Risk Manager: Position sizing, risk levels, stop-loss (6-10 tools)
 *
 * Philosophy: Real money decisions require exhaustive research, not shortcuts
 * Expected: 30-40 total tool calls across all agents
 *
 * Research Foundation:
 * - ReAct Pattern (Reasoning + Acting) for systematic exploration
 * - TradingAgents (Dec 2024): Specialized roles with shared context
 * - AlphaAgents (Aug 2025): Multi-agent synergy principles
 */

import { GroqProvider } from '@/lib/ai-providers/groq';
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';
// Note: CLI providers (ClaudeCLIProvider, CodexCLIProvider, GoogleCLIProvider)
// are NOT used here - research agents need tool calling which CLI doesn't support.
// CLI providers are used in consensus route for final model queries instead.
import { AlpacaAccount } from '@/lib/alpaca/types';
import { TradingTimeframe } from '@/components/trading/timeframe-selector';
import { ModelResponse } from '@/types/consensus';
import {
  generateResearchAgentPrompt,
  ResearchAgentRole,
} from '@/lib/alpaca/enhanced-prompts';
import {
  fetchSharedTradingData,
  formatMinimalDataForPrompt,
} from '@/lib/alpaca/data-coordinator';
import type { ResearchProgressEvent } from '@/types/research-progress';

/**
 * Research Model Tier Configuration
 *
 * ALL tiers use Claude 4.5 Sonnet for research agents (December 2025)
 * - Best tool calling reliability across all tiers
 * - Consistent quality for market research
 * - Claude Code optimized for structured analysis
 *
 * Note: Tier differences are in decision models, not research models
 * Sub-max uses Opus 4.5 for flagship subscription users
 */
export type ResearchTier = 'free' | 'pro' | 'max' | 'sub-pro' | 'sub-max';

interface TierModelConfig {
  model: string;
  provider: 'groq' | 'anthropic' | 'openai' | 'google';
  displayName: string;
}

const RESEARCH_TIER_MODELS: Record<ResearchTier, TierModelConfig> = {
  free: {
    // Claude 4.5 Sonnet - consistent research quality across ALL tiers
    // December 2025: Standardized to Sonnet 4.5 for reliable tool calling
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    displayName: 'Claude 4.5 Sonnet',
  },
  pro: {
    // Claude 4.5 Sonnet - consistent research quality across ALL tiers
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    displayName: 'Claude 4.5 Sonnet',
  },
  max: {
    // Claude 4.5 Sonnet - consistent research quality across ALL tiers
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    displayName: 'Claude 4.5 Sonnet',
  },
  'sub-pro': {
    // Claude 4.5 Sonnet - Sub Pro tier for subscription CLI users
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    displayName: 'Claude 4.5 Sonnet',
  },
  'sub-max': {
    // Claude 4.5 Opus - Sub Max tier for flagship subscription CLI users
    model: 'claude-opus-4-5-20251124',
    provider: 'anthropic',
    displayName: 'Claude 4.5 Opus',
  },
};

/**
 * Get the appropriate AI provider for RESEARCH agents
 *
 * IMPORTANT: Research agents ALWAYS use API providers (not CLI)
 * because they require tool calling for market data research.
 * CLI providers don't support tool calling.
 *
 * CLI providers are used in the CONSENSUS route for final model
 * analysis, which doesn't require tools.
 *
 * All tiers use API key providers for research:
 *   - Research needs 30-40 tool calls for market data
 *   - Claude 4.5 Sonnet has best tool calling reliability
 */
function getProviderForTier(tier: ResearchTier) {
  const config = RESEARCH_TIER_MODELS[tier];

  // ALL TIERS: Use API providers for research (NEEDS TOOL CALLING)
  // Note: CLI providers (ClaudeCLIProvider, CodexCLIProvider, GoogleCLIProvider)
  // are used in consensus route for final model queries, not here.
  console.log(`🔧 Research agents using API provider for tier: ${tier} (tools required)`);
  switch (config.provider) {
    case 'groq':
      return new GroqProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'google':
      return new GoogleProvider();
    default:
      return new GroqProvider();
  }
}

/**
 * OPTIONAL Progress Callback Type
 * Pass this to research functions to receive real-time progress updates
 * If not provided, functions work normally without streaming
 */
export type ProgressCallback = (event: ResearchProgressEvent) => void;

/**
 * Individual research agent result
 */
export interface ResearchAgentResult {
  agent: ResearchAgentRole;
  model: string;
  provider: string;
  toolsUsed: boolean;
  toolCallCount: number;
  toolNames: string[];
  findings: string; // Raw research output
  responseTime: number;
  tokensUsed: number;
  error?: string;
}

/**
 * Complete research report from all 4 agents
 */
export interface ResearchReport {
  symbol: string;
  timeframe: TradingTimeframe;
  technical: ResearchAgentResult;
  fundamental: ResearchAgentResult;
  sentiment: ResearchAgentResult;
  risk: ResearchAgentResult;
  totalToolCalls: number;
  researchDuration: number; // ms
  timestamp: Date;
  minimalDataProvided: string; // What basic data agents started with
}

/**
 * Technical Analyst Research Agent
 *
 * Model: Based on tier (Free: Llama 3.3 70B, Pro: Claude 3.5 Sonnet, Max: Claude 3.7 Sonnet)
 * Tools: 5-8 expected (price_bars, RSI, MACD, support/resistance, volume)
 * Focus: Price action, momentum, trend analysis
 *
 * @param tier - Research tier (free/pro/max) determines which model to use
 * @param onProgress - OPTIONAL callback for real-time progress updates (SSE streaming)
 */
export async function runTechnicalResearch(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  tier: ResearchTier = 'free',
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = RESEARCH_TIER_MODELS[tier];

  try {
    console.log(`🔍 Technical Analyst starting research... (${modelConfig.displayName})`);

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'technical',
      model: modelConfig.model,
      provider: modelConfig.provider,
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'technical',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = getProviderForTier(tier);

    console.log(`🔬 Technical Analyst calling ${modelConfig.provider} with useTools=true`);

    const result: ModelResponse = await provider.query(prompt, {
      model: modelConfig.model,
      provider: modelConfig.provider,
      enabled: true,
      temperature: 0.7,
      maxTokens: 2000,
      useTools: true, // ✅ Enable all 8 market data tools
      maxSteps: 10, // Allow up to 10 tool calls
    });

    const responseTime = Date.now() - startTime;
    const toolCalls = result.toolCalls || [];

    // DEBUG: Log what we got back
    console.log(`🔬 Technical Analyst RESULT: toolCalls=${JSON.stringify(toolCalls?.length)}, error=${result.error}, responseLen=${result.response?.length}`);
    console.log(
      `✅ Technical Analyst complete: ${toolCalls.length} tools used in ${responseTime}ms`
    );

    // Emit agent complete event (OPTIONAL)
    onProgress?.({
      type: 'agent_complete',
      agent: 'technical',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      timestamp: Date.now()
    });

    return {
      agent: 'technical',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: toolCalls.length > 0,
      toolCallCount: toolCalls.length,
      toolNames: toolCalls.map((tc) => tc.toolName),
      findings: result.response,
      responseTime,
      tokensUsed: result.tokens.total,
    };
  } catch (error) {
    console.error('❌ Technical Analyst error:', error);
    return {
      agent: 'technical',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: false,
      toolCallCount: 0,
      toolNames: [],
      findings: '',
      responseTime: Date.now() - startTime,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fundamental Analyst Research Agent
 *
 * Model: Based on tier (Free: Llama 3.3 70B, Pro: Claude 3.5 Sonnet, Max: Claude 3.7 Sonnet)
 * Tools: 4-6 expected (earnings_date, news, quote, bars for context)
 * Focus: Company fundamentals, news catalysts, earnings
 */
export async function runFundamentalResearch(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  tier: ResearchTier = 'free',
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = RESEARCH_TIER_MODELS[tier];

  try {
    console.log(`🔍 Fundamental Analyst starting research... (${modelConfig.displayName})`);

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'fundamental',
      model: modelConfig.model,
      provider: modelConfig.provider,
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'fundamental',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = getProviderForTier(tier);

    const result: ModelResponse = await provider.query(prompt, {
      model: modelConfig.model,
      provider: modelConfig.provider,
      enabled: true,
      temperature: 0.7,
      maxTokens: 2000,
      useTools: true,
      maxSteps: 10,
    });

    const responseTime = Date.now() - startTime;
    const toolCalls = result.toolCalls || [];

    console.log(
      `✅ Fundamental Analyst complete: ${toolCalls.length} tools used in ${responseTime}ms`
    );

    // Emit agent complete event (OPTIONAL)
    onProgress?.({
      type: 'agent_complete',
      agent: 'fundamental',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      timestamp: Date.now()
    });

    return {
      agent: 'fundamental',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: toolCalls.length > 0,
      toolCallCount: toolCalls.length,
      toolNames: toolCalls.map((tc) => tc.toolName),
      findings: result.response,
      responseTime,
      tokensUsed: result.tokens.total,
    };
  } catch (error) {
    console.error('❌ Fundamental Analyst error:', error);
    return {
      agent: 'fundamental',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: false,
      toolCallCount: 0,
      toolNames: [],
      findings: '',
      responseTime: Date.now() - startTime,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sentiment Analyst Research Agent
 *
 * Model: Based on tier (Free: Llama 3.3 70B, Pro: Claude 3.5 Sonnet, Max: Claude 3.7 Sonnet)
 * Tools: 3-5 expected (news primary, quote, bars for context)
 * Focus: News sentiment, market psychology, social signals
 *
 * @param tier - Research tier (free/pro/max) determines which model to use
 * @param onProgress - OPTIONAL callback for real-time progress updates (SSE streaming)
 */
export async function runSentimentResearch(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  tier: ResearchTier = 'free',
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = RESEARCH_TIER_MODELS[tier];

  try {
    console.log(`🔍 Sentiment Analyst starting research... (${modelConfig.displayName})`);

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'sentiment',
      model: modelConfig.model,
      provider: modelConfig.provider,
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'sentiment',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = getProviderForTier(tier);

    const result: ModelResponse = await provider.query(prompt, {
      model: modelConfig.model,
      provider: modelConfig.provider,
      enabled: true,
      temperature: 0.7,
      maxTokens: 2000,
      useTools: true,
      maxSteps: 10,
    });

    const responseTime = Date.now() - startTime;
    const toolCalls = result.toolCalls || [];

    console.log(
      `✅ Sentiment Analyst complete: ${toolCalls.length} tools used in ${responseTime}ms`
    );

    // Emit agent complete event (OPTIONAL)
    onProgress?.({
      type: 'agent_complete',
      agent: 'sentiment',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      timestamp: Date.now()
    });

    return {
      agent: 'sentiment',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: toolCalls.length > 0,
      toolCallCount: toolCalls.length,
      toolNames: toolCalls.map((tc) => tc.toolName),
      findings: result.response,
      responseTime,
      tokensUsed: result.tokens.total,
    };
  } catch (error) {
    console.error('❌ Sentiment Analyst error:', error);
    return {
      agent: 'sentiment',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: false,
      toolCallCount: 0,
      toolNames: [],
      findings: '',
      responseTime: Date.now() - startTime,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Risk Manager Research Agent
 *
 * Model: Based on tier (Free: Llama 3.3 70B, Pro: Claude 3.5 Sonnet, Max: Claude 3.7 Sonnet)
 * Tools: 6-10 expected (most comprehensive: all technical + fundamentals)
 * Focus: Risk assessment, position sizing, stop-loss/take-profit levels
 *
 * @param tier - Research tier (free/pro/max) determines which model to use
 * @param onProgress - OPTIONAL callback for real-time progress updates (SSE streaming)
 */
export async function runRiskAnalysis(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  tier: ResearchTier = 'free',
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = RESEARCH_TIER_MODELS[tier];

  try {
    console.log(`🔍 Risk Manager starting research... (${modelConfig.displayName})`);

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'risk',
      model: modelConfig.model,
      provider: modelConfig.provider,
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'risk',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = getProviderForTier(tier);

    const result: ModelResponse = await provider.query(prompt, {
      model: modelConfig.model,
      provider: modelConfig.provider,
      enabled: true,
      temperature: 0.7,
      maxTokens: 2000,
      useTools: true,
      maxSteps: 10,
    });

    const responseTime = Date.now() - startTime;
    const toolCalls = result.toolCalls || [];

    console.log(
      `✅ Risk Manager complete: ${toolCalls.length} tools used in ${responseTime}ms`
    );

    // Emit agent complete event (OPTIONAL)
    onProgress?.({
      type: 'agent_complete',
      agent: 'risk',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      timestamp: Date.now()
    });

    return {
      agent: 'risk',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: toolCalls.length > 0,
      toolCallCount: toolCalls.length,
      toolNames: toolCalls.map((tc) => tc.toolName),
      findings: result.response,
      responseTime,
      tokensUsed: result.tokens.total,
    };
  } catch (error) {
    console.error('❌ Risk Manager error:', error);
    return {
      agent: 'risk',
      model: modelConfig.model,
      provider: modelConfig.provider,
      toolsUsed: false,
      toolCallCount: 0,
      toolNames: [],
      findings: '',
      responseTime: Date.now() - startTime,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run ALL 4 Research Agents in Parallel
 *
 * This is the main orchestrator function that:
 * 1. Fetches minimal shared data (symbol + price only)
 * 2. Launches all 4 research agents simultaneously
 * 3. Waits for all research to complete
 * 4. Aggregates results into comprehensive research report
 *
 * Expected Performance:
 * - 30-40 total tool calls across all agents
 * - 8-12 seconds total duration (parallel execution)
 * - ~2000-3000 tokens per agent = 8k-12k total
 *
 * @param symbol - Stock ticker (e.g., "TSLA", "AAPL")
 * @param timeframe - Trading timeframe (day, swing, position, longterm)
 * @param account - Alpaca account for context
 * @param tier - Research tier (free/pro/max) determines which models to use
 * @param onProgress - OPTIONAL callback for real-time progress updates (SSE streaming)
 * @returns Complete research report from all agents
 */
export async function runResearchAgents(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  tier: ResearchTier = 'free',
  onProgress?: ProgressCallback
): Promise<ResearchReport> {
  const startTime = Date.now();
  const modelConfig = RESEARCH_TIER_MODELS[tier];

  console.log(
    `\n${'='.repeat(80)}\n🔬 STARTING EXHAUSTIVE RESEARCH PIPELINE FOR ${symbol.toUpperCase()}\n${'='.repeat(80)}`
  );
  console.log(`📊 Research Tier: ${tier.toUpperCase()} (${modelConfig.displayName})`);

  try {
    // Step 1: Fetch minimal shared data (just for market validation)
    console.log('📊 Step 1: Fetching minimal market data for validation...');
    const sharedData = await fetchSharedTradingData(symbol);
    const minimalData = formatMinimalDataForPrompt(sharedData);

    console.log(
      `✅ Minimal data fetched: ${symbol} at $${sharedData.quote.price.toFixed(2)}`
    );
    console.log(
      '⚠️  Note: This is INTENTIONALLY minimal - agents MUST use tools for real research\n'
    );

    // Step 2: Launch all 4 research agents in parallel
    console.log('🚀 Step 2: Launching 4 specialized research agents in parallel...\n');

    const [technical, fundamental, sentiment, risk] = await Promise.all([
      runTechnicalResearch(symbol, timeframe, account, minimalData, tier, onProgress),
      runFundamentalResearch(symbol, timeframe, account, minimalData, tier, onProgress),
      runSentimentResearch(symbol, timeframe, account, minimalData, tier, onProgress),
      runRiskAnalysis(symbol, timeframe, account, minimalData, tier, onProgress),
    ]);

    const researchDuration = Date.now() - startTime;

    // Step 3: Aggregate results
    const totalToolCalls =
      technical.toolCallCount +
      fundamental.toolCallCount +
      sentiment.toolCallCount +
      risk.toolCallCount;

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ RESEARCH PIPELINE COMPLETE');
    console.log(`${'='.repeat(80)}`);
    console.log(`⏱️  Total Duration: ${researchDuration}ms`);
    console.log(`🔧 Total Tool Calls: ${totalToolCalls}`);
    console.log(`   - Technical: ${technical.toolCallCount} tools`);
    console.log(`   - Fundamental: ${fundamental.toolCallCount} tools`);
    console.log(`   - Sentiment: ${sentiment.toolCallCount} tools`);
    console.log(`   - Risk: ${risk.toolCallCount} tools`);
    console.log(
      `📊 Total Tokens: ${
        technical.tokensUsed +
        fundamental.tokensUsed +
        sentiment.tokensUsed +
        risk.tokensUsed
      }`
    );
    console.log(`${'='.repeat(80)}\n`);

    return {
      symbol: symbol.toUpperCase(),
      timeframe,
      technical,
      fundamental,
      sentiment,
      risk,
      totalToolCalls,
      researchDuration,
      timestamp: new Date(),
      minimalDataProvided: minimalData,
    };
  } catch (error) {
    console.error('❌ Research pipeline error:', error);
    throw error;
  }
}
