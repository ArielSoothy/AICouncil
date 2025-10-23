import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/alpaca/client';
import { generateTradingPrompt } from '@/lib/alpaca/prompts';
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import type { TradeDecision } from '@/lib/alpaca/types';

// Helper function to strip markdown code blocks from JSON responses
function stripMarkdownCodeBlocks(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
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
    console.log('🎭 Starting agent debate for trading decision...');

    // Step 1: Get Alpaca account info
    const account = await getAccount();
    console.log('💰 Account balance:', account.portfolio_value);

    // Step 2: Generate base trading prompt
    const date = new Date().toISOString().split('T')[0];
    const basePrompt = generateTradingPrompt(account, [], date);

    // Initialize AI providers
    const anthropic = new AnthropicProvider();
    const openai = new OpenAIProvider();
    const google = new GoogleProvider();

    // Round 1: Initial positions
    console.log('🔄 Round 1: Initial agent positions...');

    // Analyst (Claude)
    console.log('📊 Analyst analyzing market...');
    const analystPrompt = `${basePrompt}\n\n${ANALYST_PROMPT}`;
    const analystResult = await anthropic.query(analystPrompt, {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      temperature: 0.7,
      maxTokens: 300,
      enabled: true,
    });
    const analystDecision: TradeDecision = JSON.parse(stripMarkdownCodeBlocks(analystResult.response));

    // Critic (GPT-4o)
    console.log('🔍 Critic evaluating recommendation...');
    const criticPrompt = `${basePrompt}\n\n${CRITIC_PROMPT.replace('{analystDecision}', JSON.stringify(analystDecision))}`;
    const criticResult = await openai.query(criticPrompt, {
      model: 'gpt-4o',
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 300,
      enabled: true,
    });
    const criticDecision: TradeDecision = JSON.parse(stripMarkdownCodeBlocks(criticResult.response));

    // Synthesizer (Gemini)
    console.log('⚖️  Synthesizer balancing perspectives...');
    const synthesizerPrompt = `${basePrompt}\n\n${SYNTHESIZER_PROMPT
      .replace('{analystDecision}', JSON.stringify(analystDecision))
      .replace('{criticDecision}', JSON.stringify(criticDecision))}`;
    const synthesizerResult = await google.query(synthesizerPrompt, {
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
      temperature: 0.7,
      maxTokens: 300,
      enabled: true,
    });
    const synthesizerDecision: TradeDecision = JSON.parse(stripMarkdownCodeBlocks(synthesizerResult.response));

    const round1 = [
      { role: 'analyst' as const, name: 'Claude 3.5 Sonnet', decision: analystDecision },
      { role: 'critic' as const, name: 'GPT-4o', decision: criticDecision },
      { role: 'synthesizer' as const, name: 'Gemini 2.0 Flash', decision: synthesizerDecision },
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
    console.log('📊 Analyst refining position...');
    const analystR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'ANALYST')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const analystR2Result = await anthropic.query(analystR2Prompt, {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      temperature: 0.7,
      maxTokens: 300,
      enabled: true,
    });
    const analystR2Decision: TradeDecision = JSON.parse(stripMarkdownCodeBlocks(analystR2Result.response));

    // Round 2 Critic refinement
    console.log('🔍 Critic refining evaluation...');
    const criticR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'CRITIC')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const criticR2Result = await openai.query(criticR2Prompt, {
      model: 'gpt-4o',
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 300,
      enabled: true,
    });
    const criticR2Decision: TradeDecision = JSON.parse(stripMarkdownCodeBlocks(criticR2Result.response));

    // Round 2 Synthesizer final decision
    console.log('⚖️  Synthesizer making final decision...');
    const synthesizerR2Prompt = `${basePrompt}\n\n${ROUND2_REFINEMENT_PROMPT
      .replace('{role}', 'SYNTHESIZER')
      .replace('{analystDecision}', round1Summary.analystDecision)
      .replace('{criticDecision}', round1Summary.criticDecision)
      .replace('{synthesizerDecision}', round1Summary.synthesizerDecision)}`;
    const synthesizerR2Result = await google.query(synthesizerR2Prompt, {
      model: 'gemini-2.0-flash-exp',
      provider: 'google',
      temperature: 0.7,
      maxTokens: 300,
      enabled: true,
    });
    const synthesizerR2Decision: TradeDecision = JSON.parse(stripMarkdownCodeBlocks(synthesizerR2Result.response));

    const round2 = [
      { role: 'analyst' as const, name: 'Claude 3.5 Sonnet', decision: analystR2Decision },
      { role: 'critic' as const, name: 'GPT-4o', decision: criticR2Decision },
      { role: 'synthesizer' as const, name: 'Gemini 2.0 Flash', decision: synthesizerR2Decision },
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
