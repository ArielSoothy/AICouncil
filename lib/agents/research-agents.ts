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
 * Model: Llama 3.3 70B (Berkeley #1 tool-use model, FREE)
 * Tools: 5-8 expected (price_bars, RSI, MACD, support/resistance, volume)
 * Focus: Price action, momentum, trend analysis
 *
 * @param onProgress - OPTIONAL callback for real-time progress updates (SSE streaming)
 */
export async function runTechnicalResearch(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();

  try {
    console.log('🔍 Technical Analyst starting research...');

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'technical',
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'technical',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = new GroqProvider();

    // Use Llama 3.3 70B - best free tool-use model
    const result: ModelResponse = await provider.query(prompt, {
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      enabled: true,
      temperature: 0.7,
      maxTokens: 2000,
      useTools: true, // ✅ Enable all 8 market data tools
      maxSteps: 10, // Allow up to 10 tool calls
    });

    const responseTime = Date.now() - startTime;
    const toolCalls = result.toolCalls || [];

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
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
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
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
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
 * Model: Gemini 2.0 Flash (free, fast, good reasoning with tools)
 * Tools: 4-6 expected (earnings_date, news, quote, bars for context)
 * Focus: Company fundamentals, news catalysts, earnings
 */
export async function runFundamentalResearch(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();

  try {
    console.log('🔍 Fundamental Analyst starting research...');

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'fundamental',
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'fundamental',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = new GoogleProvider();

    // Use Gemini 2.0 Flash - free model with excellent tool use
    const result: ModelResponse = await provider.query(prompt, {
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
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
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
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
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
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
 * Model: Llama 3.3 70B (Berkeley #1 tool-use model, FREE)
 * Tools: 3-5 expected (news primary, quote, bars for context)
 * Focus: News sentiment, market psychology, social signals
 *
 * NOTE: Switched from Gemini 2.0 Flash due to tool argument validation errors.
 * Llama 3.3 70B proven to work perfectly with our tool schema.
 */
export async function runSentimentResearch(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();

  try {
    console.log('🔍 Sentiment Analyst starting research...');

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'sentiment',
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'sentiment',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = new GroqProvider();

    // Use Llama 3.3 70B - best free tool-use model, proven compatibility
    const result: ModelResponse = await provider.query(prompt, {
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      enabled: true,
      temperature: 0.7,
      maxTokens: 2000,
      useTools: true, // ✅ Proven to work with our tool schema
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
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
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
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
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
 * Model: Gemini 2.0 Flash (free, good reasoning with safety focus)
 * Tools: 6-10 expected (most comprehensive: all technical + fundamentals)
 * Focus: Risk assessment, position sizing, stop-loss/take-profit levels
 */
export async function runRiskAnalysis(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  minimalData: string,
  onProgress?: ProgressCallback
): Promise<ResearchAgentResult> {
  const startTime = Date.now();

  try {
    console.log('🔍 Risk Manager starting research...');

    // Emit agent start event (OPTIONAL - only if callback provided)
    onProgress?.({
      type: 'agent_start',
      agent: 'risk',
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
      timestamp: Date.now()
    });

    const prompt = generateResearchAgentPrompt(
      'risk',
      symbol,
      timeframe,
      account,
      minimalData
    );

    const provider = new GoogleProvider();

    // Use Gemini 2.0 Flash - free model with good reasoning and safety focus
    const result: ModelResponse = await provider.query(prompt, {
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
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
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
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
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
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
 * @param onProgress - OPTIONAL callback for real-time progress updates (SSE streaming)
 * @returns Complete research report from all agents
 */
export async function runResearchAgents(
  symbol: string,
  timeframe: TradingTimeframe,
  account: AlpacaAccount,
  onProgress?: ProgressCallback
): Promise<ResearchReport> {
  const startTime = Date.now();

  console.log(
    `\n${'='.repeat(80)}\n🔬 STARTING EXHAUSTIVE RESEARCH PIPELINE FOR ${symbol.toUpperCase()}\n${'='.repeat(80)}`
  );

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
      runTechnicalResearch(symbol, timeframe, account, minimalData, onProgress),
      runFundamentalResearch(symbol, timeframe, account, minimalData, onProgress),
      runSentimentResearch(symbol, timeframe, account, minimalData, onProgress),
      runRiskAnalysis(symbol, timeframe, account, minimalData, onProgress),
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
