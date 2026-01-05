import { NextRequest, NextResponse } from 'next/server';
import { getProviderForTier, isSubscriptionTier } from '@/lib/ai-providers/provider-factory';
import { GoogleCLIProvider } from '@/lib/ai-providers/cli';
import type { PresetTier } from '@/lib/config/model-presets';

// CLI Provider for subscription mode (Gemini Advanced subscription)
// Using Gemini CLI because it properly supports subscription in non-interactive mode
// Claude CLI has a known bug where -p flag falls back to API mode (GitHub Issue #2051)
const geminiCLIProvider = new GoogleCLIProvider();

/**
 * Screening Analysis API - Quick LLM analysis for pre-market screening stocks
 *
 * Modes:
 * - Quick (<5s): Fast verdict with basic reasoning
 * - Deep (30-60s): Thorough analysis with research
 */

interface ScreeningStock {
  symbol: string;
  rank: number;
  gap_percent: number;
  gap_direction: 'up' | 'down';
  pre_market_price: number;
  previous_close: number;
  pre_market_volume: number;
  score: number;
}

interface AnalyzeRequest {
  stock: ScreeningStock;
  mode: 'quick' | 'deep';
  model?: string;
  tier?: PresetTier;
}

interface AnalysisResult {
  verdict: 'BUY' | 'WATCH' | 'SKIP';
  confidence: number;
  reasons: string[];
  entryTrigger?: string;
  riskFlag?: string;
  analysisTime: number;
}

/**
 * Generate quick analysis prompt for screening stock
 */
function generateQuickPrompt(stock: ScreeningStock): string {
  const direction = stock.gap_direction === 'up' ? '📈 GAPPING UP' : '📉 GAPPING DOWN';

  return `You are a pre-market stock analyst for day trading. Provide a QUICK assessment.

STOCK: ${stock.symbol}
${direction}: ${stock.gap_percent > 0 ? '+' : ''}${stock.gap_percent.toFixed(2)}%

DATA:
- Pre-Market Price: $${stock.pre_market_price.toFixed(2)}
- Previous Close: $${stock.previous_close.toFixed(2)}
- Pre-Market Volume: ${formatVolume(stock.pre_market_volume)}
- Scanner Rank: #${stock.rank}
- Composite Score: ${stock.score}/100

RESPOND IN EXACT JSON FORMAT:
{
  "verdict": "BUY" | "WATCH" | "SKIP",
  "confidence": <0-100>,
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "entryTrigger": "specific price/pattern to watch",
  "riskFlag": "main risk to consider" | null
}

DECISION CRITERIA:
- BUY: Strong momentum, high volume, good risk/reward setup
- WATCH: Interesting but needs confirmation (breakout, volume surge)
- SKIP: Poor setup, low volume, or high risk

Be concise. Max 3 reasons. Focus on actionable insights.`;
}

/**
 * Format volume for display
 */
function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toString();
}

/**
 * Extract JSON from LLM response
 */
function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Extract JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AnalyzeRequest = await request.json();
    const { stock, mode = 'quick', model = 'gemini-2.0-flash', tier = 'free' } = body;

    if (!stock || !stock.symbol) {
      return NextResponse.json(
        { error: 'Stock data required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Analyzing ${stock.symbol} (${mode} mode, ${model}, tier: ${tier})`);

    // Generate prompt based on mode
    const prompt = mode === 'quick'
      ? generateQuickPrompt(stock)
      : generateQuickPrompt(stock); // TODO: Deep mode with research

    // Use CLI provider for sub tiers (subscription mode) - Uses Gemini Advanced subscription!
    // Gemini CLI properly supports subscription in non-interactive mode (unlike Claude CLI)
    // Using gemini-2.5-flash for fast screening with thinking support
    let response;
    try {
      console.log(`🔷 Using GeminiCLI provider (subscription mode - gemini-2.5-flash)`);
      response = await geminiCLIProvider.query(prompt, {
        provider: 'google',
        model: 'gemini-2.5-flash', // Fast model with thinking support
        enabled: true,
        temperature: 0.3,
        maxTokens: 500,
      });
    } catch (cliError) {
      console.error('CLI provider error:', cliError);
      // If CLI fails, try API provider as fallback for non-sub tiers
      if (!isSubscriptionTier(tier as PresetTier)) {
        const providerType = getProviderTypeFromModel(model);
        const { provider, error } = getProviderForTier(tier as PresetTier, providerType);
        if (error || !provider) {
          throw new Error(error || 'Provider not available');
        }
        response = await provider.chat(model, [
          { role: 'user', content: prompt }
        ]);
      } else {
        throw cliError;
      }
    }

    // Check for errors or empty response
    if (!response || response.error) {
      return NextResponse.json(
        { error: response?.error || 'Empty response from model' },
        { status: 500 }
      );
    }

    // GoogleCLIProvider returns 'response' field, API providers return 'content'
    const responseText = response.response || response.content || '';
    if (!responseText) {
      return NextResponse.json(
        { error: 'Empty response from model' },
        { status: 500 }
      );
    }

    // Parse response
    const jsonStr = extractJSON(responseText);
    let analysis: AnalysisResult;

    try {
      const parsed = JSON.parse(jsonStr);
      analysis = {
        verdict: parsed.verdict || 'WATCH',
        confidence: parsed.confidence || 50,
        reasons: parsed.reasons || [],
        entryTrigger: parsed.entryTrigger,
        riskFlag: parsed.riskFlag,
        analysisTime: Date.now() - startTime,
      };
    } catch (parseError) {
      console.error('Failed to parse LLM response:', jsonStr);
      // Return a default response on parse failure
      analysis = {
        verdict: 'WATCH',
        confidence: 50,
        reasons: ['Unable to parse model response', 'Manual review recommended'],
        analysisTime: Date.now() - startTime,
      };
    }

    console.log(`✅ Analysis complete for ${stock.symbol}: ${analysis.verdict} (${analysis.analysisTime}ms)`);

    return NextResponse.json({
      success: true,
      symbol: stock.symbol,
      mode,
      model,
      analysis,
    });

  } catch (error) {
    console.error('Screening analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

/**
 * Map model ID to provider type
 */
function getProviderTypeFromModel(model: string): string {
  if (model.includes('claude')) return 'anthropic';
  if (model.includes('gpt')) return 'openai';
  if (model.includes('gemini')) return 'google';
  if (model.includes('llama') || model.includes('gemma')) return 'groq';
  if (model.includes('grok')) return 'xai';
  if (model.includes('mistral')) return 'mistral';
  if (model.includes('sonar')) return 'perplexity';
  if (model.includes('command')) return 'cohere';
  return 'google'; // Default to Gemini
}
