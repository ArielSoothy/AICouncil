import { NextRequest, NextResponse } from 'next/server';
import { AnthropicProvider } from '@/lib/ai-providers/anthropic';
import { OpenAIProvider } from '@/lib/ai-providers/openai';
import { GoogleProvider } from '@/lib/ai-providers/google';
import { GroqProvider } from '@/lib/ai-providers/groq';
import { MistralProvider } from '@/lib/ai-providers/mistral';
import { PerplexityProvider } from '@/lib/ai-providers/perplexity';
import { CohereProvider } from '@/lib/ai-providers/cohere';
import { XAIProvider } from '@/lib/ai-providers/xai';
import { getModelDisplayName, getProviderForModel as getProviderType } from '@/lib/trading/models-config';
import type { TradeDecision } from '@/lib/alpaca/types';

// Initialize all providers
const PROVIDERS: Record<string, any> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
  groq: new GroqProvider(),
  mistral: new MistralProvider(),
  perplexity: new PerplexityProvider(),
  cohere: new CohereProvider(),
  xai: new XAIProvider(),
};

// Simple test prompt that mimics trading analysis
const TEST_PROMPT = `You are a trading AI assistant. Analyze AAPL stock.

Respond ONLY with a valid JSON object in this exact format:
{
  "action": "BUY" or "SELL" or "HOLD",
  "symbol": "AAPL",
  "quantity": 10,
  "confidence": 0.75,
  "reasoning": "Brief 1-2 sentence reason for your decision"
}

Important: Return ONLY the JSON object, no markdown, no explanation before or after.`;

// Tool test prompt - requires model to use market data tools
const TOOL_TEST_PROMPT = `You are a trading research assistant with access to market data tools.

Your task:
1. Use the get_quote tool to get the current price of AAPL
2. Report the price you found

You MUST call the get_quote tool first before responding. Start by calling get_quote with symbol "AAPL".`;

/**
 * Extract JSON from model response (same as consensus route)
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
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Pattern 3: Try to fix common JSON issues
  cleaned = cleaned
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    // NOTE: Do NOT replace all single quotes with double quotes!
    // This breaks apostrophes in text like "AAPL's" → "AAPL"s"
    // Only replace single quotes used as JSON string delimiters (rare)
    .trim();

  return cleaned;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { modelId, testTools = false } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      );
    }

    const providerType = getProviderType(modelId);
    if (!providerType || !PROVIDERS[providerType]) {
      return NextResponse.json(
        { error: `Unknown model or provider: ${modelId}` },
        { status: 400 }
      );
    }

    const provider = PROVIDERS[providerType];
    const modelName = getModelDisplayName(modelId);

    console.log(`🧪 Testing model: ${modelName} (${modelId}) - testTools=${testTools}`);

    // Check if provider is configured
    if (!provider.isConfigured()) {
      return NextResponse.json({
        success: false,
        modelId,
        modelName,
        provider: providerType,
        error: `${providerType} API key not configured`,
        responseTime: Date.now() - startTime,
      });
    }

    // Select prompt based on test type
    const prompt = testTools ? TOOL_TEST_PROMPT : TEST_PROMPT;

    // Call the model
    const result = await provider.query(prompt, {
      model: modelId,
      provider: providerType,
      temperature: 0.2,
      maxTokens: testTools ? 1000 : 500,
      enabled: true,
      useTools: testTools,  // Enable tools for tool test
      maxSteps: testTools ? 5 : 1,
    });

    // Check for API errors
    if (result.error) {
      console.log(`❌ ${modelName} API error:`, result.error);
      return NextResponse.json({
        success: false,
        modelId,
        modelName,
        provider: providerType,
        error: result.error,
        responseTime: Date.now() - startTime,
      });
    }

    // For tool tests, check tool calls instead of JSON response
    if (testTools) {
      const toolCalls = result.toolCalls || [];
      const toolCallCount = toolCalls.length;
      const toolNames = toolCalls.map((tc: { toolName: string }) => tc.toolName);

      console.log(`🔧 ${modelName} tool test: ${toolCallCount} tools called (${toolNames.join(', ')})`);

      if (toolCallCount === 0) {
        return NextResponse.json({
          success: false,
          modelId,
          modelName,
          provider: providerType,
          error: 'Model did not call any tools (expected at least 1 tool call)',
          toolCalls: 0,
          toolNames: [],
          rawResponse: result.response?.substring(0, 500) || '',
          responseTime: Date.now() - startTime,
          tokens: result.tokens,
        });
      }

      return NextResponse.json({
        success: true,
        modelId,
        modelName,
        provider: providerType,
        toolCalls: toolCallCount,
        toolNames,
        rawResponse: result.response?.substring(0, 500) || '',
        responseTime: Date.now() - startTime,
        tokens: result.tokens,
      });
    }

    // Check for empty response (JSON tests only)
    if (!result.response || result.response.trim().length === 0) {
      console.log(`❌ ${modelName} returned empty response`);
      return NextResponse.json({
        success: false,
        modelId,
        modelName,
        provider: providerType,
        error: 'Model returned empty response',
        rawResponse: '',
        responseTime: Date.now() - startTime,
      });
    }

    // Try to parse JSON
    const cleanedResponse = extractJSON(result.response);

    try {
      const decision: TradeDecision = JSON.parse(cleanedResponse);

      // Validate required fields
      if (!decision.action || !['BUY', 'SELL', 'HOLD'].includes(decision.action)) {
        console.log(`⚠️ ${modelName} missing/invalid action field`);
        return NextResponse.json({
          success: false,
          modelId,
          modelName,
          provider: providerType,
          error: 'Response missing valid action field (BUY/SELL/HOLD)',
          rawResponse: result.response.substring(0, 500),
          parsedResponse: decision,
          responseTime: Date.now() - startTime,
        });
      }

      console.log(`✅ ${modelName} passed! Action: ${decision.action}, Confidence: ${decision.confidence}`);

      return NextResponse.json({
        success: true,
        modelId,
        modelName,
        provider: providerType,
        decision,
        rawResponse: result.response.substring(0, 500),
        responseTime: Date.now() - startTime,
        tokens: result.tokens,
      });

    } catch (parseError) {
      console.log(`❌ ${modelName} JSON parse failed:`, parseError);
      return NextResponse.json({
        success: false,
        modelId,
        modelName,
        provider: providerType,
        error: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`,
        rawResponse: result.response.substring(0, 500),
        cleanedResponse: cleanedResponse.substring(0, 500),
        responseTime: Date.now() - startTime,
      });
    }

  } catch (error) {
    console.error('Model test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
