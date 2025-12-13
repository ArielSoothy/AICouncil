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

// Import client-safe types from types/ directory
// Re-export for backward compatibility with API routes
import {
  type ResearchTier,
  type TierModelConfig,
  type ResearchModelPreset,
  type ResearchAgentResult,
  type ResearchReport,
  RESEARCH_MODEL_PRESETS,
} from '@/types/research-agents';

// Re-export types for API route backward compatibility
export type { ResearchTier, TierModelConfig, ResearchModelPreset, ResearchAgentResult, ResearchReport };
export { RESEARCH_MODEL_PRESETS };

// Types and RESEARCH_MODEL_PRESETS are now imported from @/types/research-agents

// Get research model from env or default to sonnet
function getResearchModelConfig(): TierModelConfig {
  const preset = (process.env.RESEARCH_MODEL || 'sonnet').toLowerCase() as ResearchModelPreset;
  const config = RESEARCH_MODEL_PRESETS[preset];
  if (config) {
    console.log(`🔬 Research model: ${config.displayName} (preset: ${preset})`);
    return config;
  }
  console.log(`🔬 Research model: Claude 4.5 Sonnet (default)`);
  return RESEARCH_MODEL_PRESETS.sonnet;
}

/**
 * Get research model config from preset or tier
 * Priority: explicit preset > env var > tier default
 *
 * IMPORTANT: If selected model doesn't support tools, fall back to sonnet
 */
export function getResearchModelForConfig(tier: ResearchTier, researchModel?: ResearchModelPreset): TierModelConfig {
  // If explicit preset provided, use it
  if (researchModel && RESEARCH_MODEL_PRESETS[researchModel]) {
    const config = RESEARCH_MODEL_PRESETS[researchModel];

    // Check if model supports tool calling (required for research)
    if (config.hasToolSupport === false) {
      console.log(`⚠️ ${config.displayName} doesn't support tool calling, falling back to Sonnet`);
      return RESEARCH_MODEL_PRESETS.sonnet;
    }

    console.log(`🔬 Research model (UI selected): ${config.displayName}`);
    return config;
  }

  // Otherwise use tier config (which checks env var)
  const tierConfig = RESEARCH_TIER_MODELS[tier];

  // Also check tier config for tool support
  if (tierConfig.hasToolSupport === false) {
    console.log(`⚠️ ${tierConfig.displayName} doesn't support tool calling, falling back to Sonnet`);
    return RESEARCH_MODEL_PRESETS.sonnet;
  }

  return tierConfig;
}

const RESEARCH_TIER_MODELS: Record<ResearchTier, TierModelConfig> = {
  free: getResearchModelConfig(),
  pro: getResearchModelConfig(),
  max: getResearchModelConfig(),
  'sub-pro': getResearchModelConfig(),
  'sub-max': {
    // Sub Max keeps Opus for flagship users
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
 * This function now takes the modelConfig directly to properly support
 * user-selected research models (Llama, Haiku, etc.)
 *
 * @param modelConfig - The model configuration from getResearchModelForConfig()
 */
function getProviderForModel(modelConfig: TierModelConfig) {
  // Use the model's actual provider - NOT the tier's default!
  console.log(`🔧 Research agents using ${modelConfig.provider.toUpperCase()} provider for ${modelConfig.displayName}`);
  switch (modelConfig.provider) {
    case 'groq':
      return new GroqProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'google':
      return new GoogleProvider();
    default:
      console.log(`⚠️ Unknown provider ${modelConfig.provider}, falling back to Anthropic`);
      return new AnthropicProvider();
  }
}

/**
 * OPTIONAL Progress Callback Type
 * Pass this to research functions to receive real-time progress updates
 * If not provided, functions work normally without streaming
 */
export type ProgressCallback = (event: ResearchProgressEvent) => void;

// ResearchAgentResult and ResearchReport interfaces are now imported from @/types/research-agents

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
  onProgress?: ProgressCallback,
  researchModel?: ResearchModelPreset
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = getResearchModelForConfig(tier, researchModel);

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

    const provider = getProviderForModel(modelConfig);

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

    // Emit agent complete event (OPTIONAL) - include model/provider for cost tracking
    onProgress?.({
      type: 'agent_complete',
      agent: 'technical',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      model: modelConfig.model,      // For cost tracking
      provider: modelConfig.provider, // For cost tracking
      inputTokens: result.tokens.prompt,
      outputTokens: result.tokens.completion,
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
  onProgress?: ProgressCallback,
  researchModel?: ResearchModelPreset
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = getResearchModelForConfig(tier, researchModel);

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

    const provider = getProviderForModel(modelConfig);

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

    // Emit agent complete event (OPTIONAL) - include model/provider for cost tracking
    onProgress?.({
      type: 'agent_complete',
      agent: 'fundamental',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      model: modelConfig.model,      // For cost tracking
      provider: modelConfig.provider, // For cost tracking
      inputTokens: result.tokens.prompt,
      outputTokens: result.tokens.completion,
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
  onProgress?: ProgressCallback,
  researchModel?: ResearchModelPreset
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = getResearchModelForConfig(tier, researchModel);

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

    const provider = getProviderForModel(modelConfig);

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

    // Emit agent complete event (OPTIONAL) - include model/provider for cost tracking
    onProgress?.({
      type: 'agent_complete',
      agent: 'sentiment',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      model: modelConfig.model,      // For cost tracking
      provider: modelConfig.provider, // For cost tracking
      inputTokens: result.tokens.prompt,
      outputTokens: result.tokens.completion,
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
  onProgress?: ProgressCallback,
  researchModel?: ResearchModelPreset
): Promise<ResearchAgentResult> {
  const startTime = Date.now();
  const modelConfig = getResearchModelForConfig(tier, researchModel);

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

    const provider = getProviderForModel(modelConfig);

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

    // Emit agent complete event (OPTIONAL) - include model/provider for cost tracking
    onProgress?.({
      type: 'agent_complete',
      agent: 'risk',
      toolCount: toolCalls.length,
      duration: responseTime,
      tokensUsed: result.tokens.total,
      model: modelConfig.model,      // For cost tracking
      provider: modelConfig.provider, // For cost tracking
      inputTokens: result.tokens.prompt,
      outputTokens: result.tokens.completion,
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
 * @param researchModel - OPTIONAL explicit research model preset (overrides tier default)
 * @returns Complete research report from all agents
 */
export async function runResearchAgents(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  tier: ResearchTier = 'free',
  onProgress?: ProgressCallback,
  researchModel?: ResearchModelPreset
): Promise<ResearchReport> {
  const startTime = Date.now();
  // Use explicit researchModel if provided, otherwise fall back to tier config
  const modelConfig = getResearchModelForConfig(tier, researchModel);

  console.log(
    `\n${'='.repeat(80)}\n🔬 STARTING EXHAUSTIVE RESEARCH PIPELINE FOR ${symbol.toUpperCase()}\n${'='.repeat(80)}`
  );
  console.log(`📊 Research Tier: ${tier.toUpperCase()} (${modelConfig.displayName})`);
  if (researchModel) {
    console.log(`🔬 Research Model Override: ${researchModel}`);
  }

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
      runTechnicalResearch(symbol, timeframe, account, minimalData, tier, onProgress, researchModel),
      runFundamentalResearch(symbol, timeframe, account, minimalData, tier, onProgress, researchModel),
      runSentimentResearch(symbol, timeframe, account, minimalData, tier, onProgress, researchModel),
      runRiskAnalysis(symbol, timeframe, account, minimalData, tier, onProgress, researchModel),
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
