import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getPositions } from '@/lib/alpaca/client';
import { generateEnhancedTradingPrompt } from '@/lib/alpaca/enhanced-prompts';
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
    // Parse request body for model selections, timeframe, and target symbol
    const body = await request.json();
    const analystModel = body.analystModel || 'claude-3-5-sonnet-20241022';
    const criticModel = body.criticModel || 'gpt-4o';
    const synthesizerModel = body.synthesizerModel || 'gemini-2.5-flash';
    const timeframe = body.timeframe || 'swing';
    const targetSymbol = body.targetSymbol;

    const symbolText = targetSymbol ? ` on ${targetSymbol.toUpperCase()}` : '';
    console.log('🎭 Starting agent debate for', timeframe, 'trading decision' + symbolText + '...');
    console.log('📋 Selected models:', { analystModel, criticModel, synthesizerModel });

    // Step 1: Get Alpaca account info and positions
    const account = await getAccount();
    const positions = await getPositions();
    console.log('💰 Account balance:', account.portfolio_value);
    console.log('📊 Current positions:', positions.length);

    // Step 2: Generate enhanced trading prompt with timeframe-specific analysis
    const date = new Date().toISOString().split('T')[0];
    const basePrompt = generateEnhancedTradingPrompt(account, positions, date, timeframe as TradingTimeframe, targetSymbol);

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
    console.log('🔄 Round 1: Initial agent positions...');

    // Analyst (Dynamic model)
    console.log(`📊 Analyst (${getModelName(analystModel)}) analyzing market...`);
    const analystPrompt = `${basePrompt}\n\n${ANALYST_PROMPT}`;
    const analystProvider = getProviderForModel(analystModel, providers);
    const analystResult = await analystProvider.query(analystPrompt, {
      model: analystModel,
      provider: getProviderName(analystModel),
      temperature: 0.7,
      maxTokens: 1500, // Further increased to fix GPT-5 Mini, Mistral Large, Sonar Pro truncation
      enabled: true,
    });
    const analystDecision: TradeDecision = JSON.parse(extractJSON(analystResult.response));

    // Critic (Dynamic model)
    console.log(`🔍 Critic (${getModelName(criticModel)}) evaluating recommendation...`);
    const criticPrompt = `${basePrompt}\n\n${CRITIC_PROMPT.replace('{analystDecision}', JSON.stringify(analystDecision))}`;
    const criticProvider = getProviderForModel(criticModel, providers);
    const criticResult = await criticProvider.query(criticPrompt, {
      model: criticModel,
      provider: getProviderName(criticModel),
      temperature: 0.7,
      maxTokens: 1500, // Further increased to fix GPT-5 Mini, Mistral Large, Sonar Pro truncation
      enabled: true,
    });
    const criticDecision: TradeDecision = JSON.parse(extractJSON(criticResult.response));

    // Synthesizer (Dynamic model)
    console.log(`⚖️  Synthesizer (${getModelName(synthesizerModel)}) balancing perspectives...`);
    const synthesizerPrompt = `${basePrompt}\n\n${SYNTHESIZER_PROMPT
      .replace('{analystDecision}', JSON.stringify(analystDecision))
      .replace('{criticDecision}', JSON.stringify(criticDecision))}`;
    const synthesizerProvider = getProviderForModel(synthesizerModel, providers);
    const synthesizerResult = await synthesizerProvider.query(synthesizerPrompt, {
      model: synthesizerModel,
      provider: getProviderName(synthesizerModel),
      temperature: 0.7,
      maxTokens: 1500, // Further increased to fix GPT-5 Mini, Mistral Large, Sonar Pro truncation
      enabled: true,
    });
    const synthesizerDecision: TradeDecision = JSON.parse(extractJSON(synthesizerResult.response));

    const round1 = [
      { role: 'analyst' as const, name: getModelName(analystModel), decision: analystDecision },
      { role: 'critic' as const, name: getModelName(criticModel), decision: criticDecision },
      { role: 'synthesizer' as const, name: getModelName(synthesizerModel), decision: synthesizerDecision },
    ];

    console.log('✅ Round 1 complete');

    // Round 2: Refinement based on full debate
    console.log('🔄 Round 2: Refining positions after debate...');

    const round1Summary = {
      analystDecision: JSON.stringify(analystDecision),
      criticDecision: JSON.stringify(criticDecision),
      synthesizerDecision: JSON.stringify(synthesizerDecision),
    };

    // Round 2 Analyst refinement
    console.log(`📊 Analyst (${getModelName(analystModel)}) refining position...`);
    const analystR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'ANALYST')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const analystR2Result = await analystProvider.query(analystR2Prompt, {
      model: analystModel,
      provider: getProviderName(analystModel),
      temperature: 0.7,
      maxTokens: 1500, // Further increased to fix GPT-5 Mini, Mistral Large, Sonar Pro truncation
      enabled: true,
    });
    const analystR2Decision: TradeDecision = JSON.parse(extractJSON(analystR2Result.response));

    // Round 2 Critic refinement
    console.log(`🔍 Critic (${getModelName(criticModel)}) refining evaluation...`);
    const criticR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'CRITIC')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const criticR2Result = await criticProvider.query(criticR2Prompt, {
      model: criticModel,
      provider: getProviderName(criticModel),
      temperature: 0.7,
      maxTokens: 1500, // Further increased to fix GPT-5 Mini, Mistral Large, Sonar Pro truncation
      enabled: true,
    });
    const criticR2Decision: TradeDecision = JSON.parse(extractJSON(criticR2Result.response));

    // Round 2 Synthesizer final decision
    console.log(`⚖️  Synthesizer (${getModelName(synthesizerModel)}) making final decision...`);
    const synthesizerR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'SYNTHESIZER')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const synthesizerR2Result = await synthesizerProvider.query(synthesizerR2Prompt, {
      model: synthesizerModel,
      provider: getProviderName(synthesizerModel),
      temperature: 0.7,
      maxTokens: 1500, // Further increased to fix GPT-5 Mini, Mistral Large, Sonar Pro truncation
      enabled: true,
    });
    const synthesizerR2Decision: TradeDecision = JSON.parse(extractJSON(synthesizerR2Result.response));

    const round2 = [
      { role: 'analyst' as const, name: getModelName(analystModel), decision: analystR2Decision },
      { role: 'critic' as const, name: getModelName(criticModel), decision: criticR2Decision },
      { role: 'synthesizer' as const, name: getModelName(synthesizerModel), decision: synthesizerR2Decision },
    ];

    console.log('✅ Round 2 complete');

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

    console.log('🎭 Debate complete. Final decision:', finalDecision.action);

    return NextResponse.json({ debate });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
