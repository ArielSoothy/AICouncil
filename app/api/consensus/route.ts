import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry } from '../../../lib/ai-providers/index'
import { QueryRequest, ConsensusResult, ModelResponse, EnhancedConsensusResponse } from '../../../types/consensus'
import { checkRateLimit, getRateLimitHeaders } from '../../../lib/rate-limit'
import { calculateConsensusScore, generateConsensusId } from '../../../lib/utils'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

// Cost calculation per 1K tokens (in USD) - Updated with official 2025 pricing
const TOKEN_COSTS = {
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4o': { input: 0.01, output: 0.03 },
  
  // Claude 4 Series (2025) - Official Pricing
  'claude-opus-4-20250514': { input: 0.015, output: 0.075 }, // $15/MTok → $75/MTok
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 }, // $3/MTok → $15/MTok
  
  // Claude 3.7 Series (2025)
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015 }, // $3/MTok → $15/MTok
  
  // Claude 3.5 Series (2024)
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 }, // $3/MTok → $15/MTok
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 }, // $0.80/MTok → $4/MTok
  
  // Claude 3 Series (Legacy)
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 }, // $15/MTok → $75/MTok
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 }, // $3/MTok → $15/MTok
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }, // $0.25/MTok → $1.25/MTok
  
  // Google Gemini
  'gemini-pro': { input: 0.0, output: 0.0 }, // Free tier
  'gemini-pro-vision': { input: 0.0, output: 0.0 }, // Free tier
}

// Model expertise scoring for weighted analysis
const MODEL_EXPERTISE = {
  'gpt-3.5-turbo': { reasoning: 0.7, factual: 0.75, creative: 0.7, speed: 0.9 },
  'gpt-4': { reasoning: 0.9, factual: 0.85, creative: 0.85, speed: 0.4 },
  'gpt-4o': { reasoning: 0.9, factual: 0.85, creative: 0.9, speed: 0.6 },
  // Claude 4 models (highest scores)
  'claude-opus-4-20250514': { reasoning: 0.98, factual: 0.95, creative: 0.95, speed: 0.2 },
  'claude-sonnet-4-20250514': { reasoning: 0.95, factual: 0.92, creative: 0.9, speed: 0.4 },
  // Claude 3.7 models
  'claude-3-7-sonnet-20250219': { reasoning: 0.92, factual: 0.9, creative: 0.88, speed: 0.5 },
  // Claude 3.5 models
  'claude-3-5-sonnet-20241022': { reasoning: 0.9, factual: 0.88, creative: 0.85, speed: 0.6 },
  'claude-3-5-haiku-20241022': { reasoning: 0.85, factual: 0.82, creative: 0.8, speed: 0.8 },
  // Legacy Claude 3 models
  'claude-3-haiku-20240307': { reasoning: 0.8, factual: 0.8, creative: 0.8, speed: 0.8 },
  'claude-3-sonnet-20240229': { reasoning: 0.85, factual: 0.9, creative: 0.9, speed: 0.7 },
  'claude-3-opus-20240229': { reasoning: 0.95, factual: 0.9, creative: 0.9, speed: 0.3 },
  // Other models
  'gemini-pro': { reasoning: 0.75, factual: 0.8, creative: 0.6, speed: 0.95 },
  'gemini-pro-vision': { reasoning: 0.75, factual: 0.8, creative: 0.6, speed: 0.95 }
}

// Smart minimization system prompts
const RESPONSE_MODES = {
  concise: {
    systemPrompt: "Respond in MAX 50 words. List format if multiple items. No explanations.",
    maxTokens: 75
  },
  normal: {
    systemPrompt: "Respond in 100-150 words. Be direct and clear.",
    maxTokens: 200
  },
  detailed: {
    systemPrompt: "Provide comprehensive answer with examples.",
    maxTokens: 500
  }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS]
  if (!costs) return 0
  
  return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output)
}

async function runJudgeAnalysis(query: string, responses: ModelResponse[]): Promise<{
  unifiedAnswer: string;
  confidence: number;
  agreements: string[];
  disagreements: string[];
  judgeTokensUsed: number;
}> {
  const successfulResponses = responses.filter(r => !r.error && r.response.trim())
  
  if (successfulResponses.length === 0) {
    return {
      unifiedAnswer: "No valid responses to analyze.",
      confidence: 0,
      agreements: [],
      disagreements: [],
      judgeTokensUsed: 0
    }
  }

  // Try Claude Opus 4 first (best judge)
  try {
    if (process.env.ANTHROPIC_API_KEY && 
        process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' &&
        process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      return await runClaudeOpusJudge(query, successfulResponses)
    }
  } catch (error) {
    console.log('Claude Opus 4 judge failed, trying GPT-4o fallback:', error)
  }

  // Fallback to GPT-4o
  try {
    if (process.env.OPENAI_API_KEY && 
        process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
        process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return await runGPT4oJudge(query, successfulResponses)
    }
  } catch (error) {
    console.log('GPT-4o judge failed, using heuristic analysis:', error)
  }

  // Final fallback: Heuristic analysis
  return runHeuristicJudge(query, successfulResponses)
}

async function runClaudeOpusJudge(query: string, responses: ModelResponse[]) {
  const responseData = responses.map((r, i) => ({
    index: i + 1,
    model: r.model,
    response: r.response,
    expertise: MODEL_EXPERTISE[r.model as keyof typeof MODEL_EXPERTISE] || { reasoning: 0.7, factual: 0.7, creative: 0.7, speed: 0.7 }
  }))

  const promptContent = `Analyze these AI responses for the query: "${query}"

${responseData.map(r => `Response ${r.index} (${r.model}): "${r.response}"`).join('\n\n')}

Model Expertise Scores:
${responseData.map(r => `${r.model}: Reasoning=${r.expertise.reasoning}, Factual=${r.expertise.factual}, Creative=${r.expertise.creative}`).join('\n')}

Provide your analysis in this exact JSON format:
{
  "consensus": "Unified answer combining the best insights (max 150 words)",
  "confidence": 85,
  "agreements": ["Point 1 all models agree on", "Point 2 all models agree on"],
  "disagreements": ["Any significant conflicts if present"],
  "recommendation": "Which response is most accurate/helpful and why (1 sentence)"
}`

  const result = await generateText({
    model: anthropic('claude-opus-4-20250514'), // Try the latest Claude Opus 4 first
    messages: [
      {
        role: 'system',
        content: 'You are an expert meta-analysis AI. Analyze multiple AI responses and provide a structured consensus analysis. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    maxTokens: 400,
    temperature: 0.2
  })

  // Parse JSON response
  try {
    // Clean the response text to handle markdown code blocks
    let cleanText = result.text.trim()
    
    // Remove markdown code blocks if present
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const analysis = JSON.parse(cleanText)
    return {
      unifiedAnswer: analysis.consensus + (analysis.recommendation ? `\n\nRecommendation: ${analysis.recommendation}` : ''),
      confidence: Math.min(Math.max(analysis.confidence || 75, 0), 100),
      agreements: Array.isArray(analysis.agreements) ? analysis.agreements.slice(0, 3) : [],
      disagreements: Array.isArray(analysis.disagreements) ? analysis.disagreements.slice(0, 3) : [],
      judgeTokensUsed: result.usage?.totalTokens || 0
    }
  } catch (parseError) {
    console.error('Failed to parse Claude Opus response:', parseError)
    console.error('Raw response:', result.text)
    throw new Error('Judge response parsing failed')
  }
}

async function runGPT4oJudge(query: string, responses: ModelResponse[]) {
  const responseData = responses.map((r, i) => ({
    index: i + 1,
    model: r.model,
    response: r.response
  }))

  const promptContent = `Analyze these AI responses for: "${query}"

${responseData.map(r => `Response ${r.index} (${r.model}): "${r.response}"`).join('\n\n')}

Respond with JSON:
{
  "consensus": "unified answer (max 150 words)",
  "confidence": 85,
  "agreements": ["agreement 1", "agreement 2"],
  "disagreements": ["disagreement 1"]
}`

  const result = await generateText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: 'You are a meta-analysis AI. Provide structured consensus analysis as JSON only.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    maxTokens: 350,
    temperature: 0.2
  })

  try {
    const analysis = JSON.parse(result.text)
    return {
      unifiedAnswer: analysis.consensus || "GPT-4o analysis completed",
      confidence: Math.min(Math.max(analysis.confidence || 75, 0), 100),
      agreements: Array.isArray(analysis.agreements) ? analysis.agreements.slice(0, 3) : [],
      disagreements: Array.isArray(analysis.disagreements) ? analysis.disagreements.slice(0, 3) : [],
      judgeTokensUsed: result.usage?.totalTokens || 0
    }
  } catch (parseError) {
    console.error('Failed to parse GPT-4o response:', parseError)
    throw new Error('Judge response parsing failed')
  }
}

function runHeuristicJudge(query: string, responses: ModelResponse[]) {
  const responseCount = responses.length
  const avgLength = responses.reduce((sum, r) => sum + r.response.length, 0) / responseCount
  
  // Calculate confidence based on response count and quality
  let confidence = 50 + (responseCount * 8) // Base confidence increases with more responses
  confidence = Math.min(confidence, 85) // Cap heuristic confidence lower than AI judges
  
  // Detect common themes for agreements
  const commonWords = ['important', 'benefits', 'helps', 'improves', 'reduces', 'increases', 'provides']
  const agreements = commonWords.filter(word => 
    responses.filter(r => r.response.toLowerCase().includes(word)).length >= Math.ceil(responseCount * 0.6)
  ).slice(0, 3).map(word => `Multiple models mention ${word}-related aspects`)

  // Simple disagreement detection
  const disagreements = responseCount > 1 ? 
    ['Variation in response detail and emphasis'] : []

  return {
    unifiedAnswer: `Heuristic analysis of ${responseCount} responses: ${responses[0].response.substring(0, 200)}${responses[0].response.length > 200 ? '...' : ''}`,
    confidence,
    agreements: agreements.length > 0 ? agreements : [`${responseCount} models provided valid responses`],
    disagreements,
    judgeTokensUsed: 0
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    const body: QueryRequest = await request.json()
    const { prompt, models, responseMode = 'normal' } = body

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!models?.length) {
      return NextResponse.json(
        { error: 'At least one model must be selected' },
        { status: 400 }
      )
    }

    // Get response mode configuration
    const modeConfig = RESPONSE_MODES[responseMode]
    if (!modeConfig) {
      return NextResponse.json(
        { error: 'Invalid response mode' },
        { status: 400 }
      )
    }

    // Enhanced prompt with system instruction
    const enhancedPrompt = `${modeConfig.systemPrompt}\n\nUser Query: ${prompt}`

    // Query all models in parallel with smart minimization
    const startTime = Date.now()
    const responses = await Promise.allSettled(
      models.map(async (config) => {
        const provider = providerRegistry.getProvider(config.provider)
        if (!provider) {
          throw new Error(`Provider ${config.provider} not found`)
        }
        
        // Override maxTokens with response mode setting
        const enhancedConfig = {
          ...config,
          maxTokens: modeConfig.maxTokens
        }
        
        return provider.query(enhancedPrompt, enhancedConfig)
      })
    )

    // Process responses
    const modelResponses: ModelResponse[] = responses.map((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value
        return {
          ...response,
          tokensUsed: response.tokens.total
        }
      } else {
        return {
          id: `error-${Date.now()}-${index}`,
          provider: models[index].provider,
          model: models[index].model,
          response: '',
          confidence: 0,
          responseTime: Date.now() - startTime,
          tokens: { prompt: 0, completion: 0, total: 0 },
          timestamp: new Date(),
          error: result.reason?.message || 'Unknown error',
          tokensUsed: 0
        }
      }
    })

    // Run judge analysis
    const judgeAnalysis = await runJudgeAnalysis(prompt, modelResponses)

    // Calculate total tokens and cost
    let totalTokensUsed = modelResponses.reduce((sum, r) => sum + r.tokens.total, 0)
    totalTokensUsed += judgeAnalysis.judgeTokensUsed

    let estimatedCost = 0
    modelResponses.forEach(response => {
      if (!response.error) {
        estimatedCost += calculateCost(
          response.model,
          response.tokens.prompt,
          response.tokens.completion
        )
      }
    })
    
    // Add judge cost based on which judge was used
    if (judgeAnalysis.judgeTokensUsed > 0) {
      // Try Claude Opus 4 first, fallback to GPT-4o, then heuristic (no cost)
      if (process.env.ANTHROPIC_API_KEY) {
        estimatedCost += calculateCost('claude-3-opus-20240229', 0, judgeAnalysis.judgeTokensUsed)
      } else if (process.env.OPENAI_API_KEY) {
        estimatedCost += calculateCost('gpt-4o', 0, judgeAnalysis.judgeTokensUsed)
      }
    }

    // Create enhanced response structure
    const enhancedResponse: EnhancedConsensusResponse = {
      query: prompt,
      mode: responseMode,
      responses: modelResponses.map(r => ({
        model: `${r.provider}/${r.model}`,
        response: r.response,
        tokensUsed: r.tokensUsed || r.tokens.total,
        responseTime: r.responseTime
      })),
      consensus: {
        unifiedAnswer: judgeAnalysis.unifiedAnswer,
        confidence: judgeAnalysis.confidence,
        agreements: judgeAnalysis.agreements,
        disagreements: judgeAnalysis.disagreements,
        judgeTokensUsed: judgeAnalysis.judgeTokensUsed
      },
      totalTokensUsed,
      estimatedCost: Math.round(estimatedCost * 100000) / 100000 // Round to 5 decimal places
    }

    return NextResponse.json(enhancedResponse, {
      headers: getRateLimitHeaders(rateLimitResult)
    })

  } catch (error) {
    console.error('Consensus API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
