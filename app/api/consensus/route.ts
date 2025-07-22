import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry } from '@/lib/ai-providers/index'
import { QueryRequest, ConsensusResult, ModelResponse, EnhancedConsensusResponse, StructuredModelResponse } from '@/types/consensus'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { calculateConsensusScore, generateConsensusId } from '@/lib/utils'
import { generateModelPrompt, parseModelResponse, ResponseLength } from '@/lib/prompt-system'
import { generateJudgePrompt, parseJudgeResponse, JudgeResponseMode, ConciseJudgeResult, JudgeAnalysis } from '@/lib/judge-system'
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
  
  // Google Models (All FREE on free tier)
  'gemini-2.5-pro': { input: 0.0, output: 0.0 },
  'gemini-2.5-flash': { input: 0.0, output: 0.0 },
  'gemini-2.0-flash': { input: 0.0, output: 0.0 },
  'gemini-2.0-flash-lite': { input: 0.0, output: 0.0 },
  'gemini-1.5-flash': { input: 0.0, output: 0.0 },
  'gemini-1.5-flash-8b': { input: 0.0, output: 0.0 },
  'gemini-1.5-pro': { input: 0.0, output: 0.0 },
  
  // Groq Models (FREE - 5B tokens/day limit)
  'llama-3.3-70b-versatile': { input: 0.0, output: 0.0 },
  'llama-3.1-8b-instant': { input: 0.0, output: 0.0 },
  'gemma2-9b-it': { input: 0.0, output: 0.0 }
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
  // Google Models
  'gemini-2.5-pro': { reasoning: 0.92, factual: 0.95, creative: 0.88, speed: 0.8 },
  'gemini-2.5-flash': { reasoning: 0.9, factual: 0.92, creative: 0.85, speed: 0.9 },
  'gemini-2.0-flash': { reasoning: 0.85, factual: 0.9, creative: 0.8, speed: 0.95 },
  'gemini-2.0-flash-lite': { reasoning: 0.75, factual: 0.8, creative: 0.7, speed: 0.98 },
  'gemini-1.5-flash': { reasoning: 0.8, factual: 0.85, creative: 0.7, speed: 0.98 },
  'gemini-1.5-flash-8b': { reasoning: 0.75, factual: 0.8, creative: 0.65, speed: 0.99 },
  'gemini-1.5-pro': { reasoning: 0.9, factual: 0.95, creative: 0.8, speed: 0.7 },
  
  // Groq Models (High speed, good performance)
  'llama-3.3-70b-versatile': { reasoning: 0.88, factual: 0.85, creative: 0.82, speed: 0.98 },
  'llama-3.1-8b-instant': { reasoning: 0.75, factual: 0.78, creative: 0.72, speed: 0.99 },
  'gemma2-9b-it': { reasoning: 0.78, factual: 0.8, creative: 0.75, speed: 0.95 }
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

async function runJudgeAnalysis(query: string, responses: StructuredModelResponse[], responseMode: JudgeResponseMode = 'concise'): Promise<{
  unifiedAnswer: string;
  conciseAnswer: string;
  normalAnswer?: string;
  detailedAnswer?: string;
  elaborationLevel: 'concise' | 'normal' | 'detailed';
  confidence: number;
  agreements: string[];
  disagreements: string[];
  judgeTokensUsed: number;
  judgeAnalysis?: JudgeAnalysis | ConciseJudgeResult;
}> {
  const successfulResponses = responses.filter(r => !r.error && r.response.trim())
  
  if (successfulResponses.length === 0) {
    return {
      unifiedAnswer: "No valid responses to analyze.",
      conciseAnswer: "No valid responses to analyze.",
      normalAnswer: undefined,
      detailedAnswer: undefined,
      elaborationLevel: 'concise' as const,
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
      return await runEnhancedClaudeJudge(query, successfulResponses, responseMode)
    }
  } catch (error) {
    console.log('Claude Opus 4 judge failed, trying GPT-4o fallback:', error)
  }

  // Fallback to GPT-4o
  try {
    if (process.env.OPENAI_API_KEY && 
        process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
        process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return await runEnhancedGPTJudge(query, successfulResponses, responseMode)
    }
  } catch (error) {
    console.log('GPT-4o judge failed, using heuristic analysis:', error)
  }

  // Final fallback: Heuristic analysis
  return runHeuristicJudge(query, successfulResponses)
}

async function runEnhancedClaudeJudge(query: string, responses: StructuredModelResponse[], mode: JudgeResponseMode = 'concise') {
  const promptContent = generateJudgePrompt(responses, query, mode)
  
  const result = await generateText({
    model: anthropic('claude-opus-4-20250514'),
    messages: [
      {
        role: 'system',
        content: mode === 'concise' 
          ? 'You are an expert consensus analyzer. Always respond with valid JSON only.' 
          : 'You are the Chief Decision Synthesizer for Consensus AI. Provide thorough analysis in the exact format requested.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    maxTokens: mode === 'concise' ? 300 : 800,
    temperature: 0.2
  })

  const analysis = parseJudgeResponse(result.text, mode)
  const tokensUsed = result.usage?.totalTokens || 0
  
  if (mode === 'concise') {
    const conciseResult = analysis as ConciseJudgeResult
    return {
      unifiedAnswer: conciseResult.bestAnswer,
      conciseAnswer: conciseResult.bestAnswer,
      normalAnswer: undefined,
      detailedAnswer: undefined,
      elaborationLevel: 'concise' as const,
      confidence: conciseResult.confidence,
      agreements: [`${conciseResult.consensusScore}% consensus achieved`],
      disagreements: conciseResult.riskLevel !== 'None' ? [`Risk level: ${conciseResult.riskLevel}`] : [],
      judgeTokensUsed: tokensUsed,
      judgeAnalysis: { ...conciseResult, tokenUsage: tokensUsed }
    }
  } else {
    const detailedResult = analysis as JudgeAnalysis
    return {
      unifiedAnswer: detailedResult.synthesis.bestAnswer,
      conciseAnswer: detailedResult.synthesis.bestAnswer.substring(0, 100) + '...',
      normalAnswer: undefined,
      detailedAnswer: detailedResult.synthesis.bestAnswer,
      elaborationLevel: 'detailed' as const,
      confidence: detailedResult.synthesis.confidence,
      agreements: detailedResult.answerDistribution.majorityPosition ? [detailedResult.answerDistribution.majorityPosition] : [],
      disagreements: detailedResult.answerDistribution.outlierPositions,
      judgeTokensUsed: tokensUsed,
      judgeAnalysis: { ...detailedResult, tokenUsage: tokensUsed }
    }
  }
}

async function runEnhancedGPTJudge(query: string, responses: StructuredModelResponse[], mode: JudgeResponseMode = 'concise') {
  const promptContent = generateJudgePrompt(responses, query, mode)
  
  const result = await generateText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: mode === 'concise' 
          ? 'You are an expert consensus analyzer. Always respond with valid JSON only.' 
          : 'You are the Chief Decision Synthesizer for Consensus AI. Provide thorough analysis in the exact format requested.'
      },
      {
        role: 'user',
        content: promptContent
      }
    ],
    maxTokens: mode === 'concise' ? 300 : 800,
    temperature: 0.2
  })

  const analysis = parseJudgeResponse(result.text, mode)
  const tokensUsed = result.usage?.totalTokens || 0
  
  if (mode === 'concise') {
    const conciseResult = analysis as ConciseJudgeResult
    return {
      unifiedAnswer: conciseResult.bestAnswer,
      conciseAnswer: conciseResult.bestAnswer,
      normalAnswer: undefined,
      detailedAnswer: undefined,
      elaborationLevel: 'concise' as const,
      confidence: conciseResult.confidence,
      agreements: [`${conciseResult.consensusScore}% consensus achieved`],
      disagreements: conciseResult.riskLevel !== 'None' ? [`Risk level: ${conciseResult.riskLevel}`] : [],
      judgeTokensUsed: tokensUsed,
      judgeAnalysis: { ...conciseResult, tokenUsage: tokensUsed }
    }
  } else {
    const detailedResult = analysis as JudgeAnalysis
    return {
      unifiedAnswer: detailedResult.synthesis.bestAnswer,
      conciseAnswer: detailedResult.synthesis.bestAnswer.substring(0, 100) + '...',
      normalAnswer: undefined,
      detailedAnswer: detailedResult.synthesis.bestAnswer,
      elaborationLevel: 'detailed' as const,
      confidence: detailedResult.synthesis.confidence,
      agreements: detailedResult.answerDistribution.majorityPosition ? [detailedResult.answerDistribution.majorityPosition] : [],
      disagreements: detailedResult.answerDistribution.outlierPositions,
      judgeTokensUsed: tokensUsed,
      judgeAnalysis: { ...detailedResult, tokenUsage: tokensUsed }
    }
  }
}

function runHeuristicJudge(query: string, responses: StructuredModelResponse[]) {
  const responseCount = responses.length
  const validResponses = responses.filter(r => r.parsed?.mainAnswer)
  
  // Calculate confidence based on response count and parsed confidence scores
  let confidence = 40 + (responseCount * 5) // Base confidence increases with more responses
  if (validResponses.length > 0) {
    const avgModelConfidence = validResponses.reduce((sum, r) => sum + (r.parsed?.confidence || 50), 0) / validResponses.length
    confidence = Math.min(confidence + (avgModelConfidence * 0.3), 75) // Cap heuristic confidence
  }
  confidence = Math.min(confidence, 75) // Cap heuristic confidence lower than AI judges
  
  // Extract main answers for analysis
  const mainAnswers = validResponses.map(r => r.parsed?.mainAnswer || r.response)
  
  // Detect common themes for agreements (simple keyword matching)
  const agreementsList: string[] = []
  const allEvidence = validResponses.flatMap(r => r.parsed?.keyEvidence || [])
  
  // Group similar evidence points
  if (allEvidence.length > 0) {
    agreementsList.push(`${allEvidence.length} evidence points provided across responses`)
  }
  
  const commonWords = ['important', 'benefits', 'helps', 'improves', 'reduces', 'increases', 'provides']
  const wordAgreements = commonWords.filter(word => 
    validResponses.filter(r => (r.parsed?.mainAnswer || r.response).toLowerCase().includes(word)).length >= Math.ceil(responseCount * 0.6)
  ).slice(0, 2).map(word => `Multiple models mention ${word}-related aspects`)
  
  agreementsList.push(...wordAgreements)

  // Simple disagreement detection
  const disagreements = responseCount > 1 ? 
    ['Variation in response detail and emphasis'] : []

  // Use best available answer
  const bestAnswer = validResponses.length > 0 ? 
    (validResponses[0].parsed?.mainAnswer || validResponses[0].response) :
    responses[0].response
    
  const conciseVersion = bestAnswer.length > 100 ? 
    bestAnswer.substring(0, 100) + '...' : bestAnswer

  return {
    unifiedAnswer: conciseVersion,
    conciseAnswer: conciseVersion,
    normalAnswer: undefined, // Don't generate until requested
    detailedAnswer: undefined, // Don't generate until requested
    elaborationLevel: 'concise' as const,
    confidence,
    agreements: agreementsList.length > 0 ? agreementsList : [`${responseCount} models provided valid responses`],
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
    const { prompt, models, responseMode = 'concise' } = body

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

    // Generate structured prompt using the new system
    const structuredPrompt = generateModelPrompt(prompt, responseMode as ResponseLength)

    // Query all models in parallel with structured prompts
    const startTime = Date.now()
    const responses = await Promise.allSettled(
      models.map(async (config) => {
        const provider = providerRegistry.getProvider(config.provider)
        if (!provider) {
          throw new Error(`Provider ${config.provider} not found`)
        }
        
        // Enhanced config with appropriate max tokens for structured responses
        // Concise mode uses very few tokens for brief, list-style responses
        const enhancedConfig = {
          ...config,
          maxTokens: responseMode === 'concise' ? 100 : responseMode === 'normal' ? 400 : 800
        }
        
        return provider.query(structuredPrompt, enhancedConfig)
      })
    )

    // Process responses with structured parsing
    const modelResponses: StructuredModelResponse[] = responses.map((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value
        const baseResponse: ModelResponse = {
          ...response,
          tokensUsed: response.tokens.total
        }
        
        // Parse structured response
        const parsed = parseModelResponse(response.response)
        
        return {
          ...baseResponse,
          parsed,
          rawStructuredResponse: response.response
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
    const judgeAnalysis = await runJudgeAnalysis(prompt, modelResponses, responseMode as JudgeResponseMode)

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
        estimatedCost += calculateCost('claude-opus-4-20250514', 0, judgeAnalysis.judgeTokensUsed)
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
        conciseAnswer: judgeAnalysis.conciseAnswer,
        normalAnswer: judgeAnalysis.normalAnswer,
        detailedAnswer: judgeAnalysis.detailedAnswer,
        elaborationLevel: judgeAnalysis.elaborationLevel,
        confidence: judgeAnalysis.confidence,
        agreements: judgeAnalysis.agreements,
        disagreements: judgeAnalysis.disagreements,
        judgeTokensUsed: judgeAnalysis.judgeTokensUsed,
        judgeAnalysis: judgeAnalysis.judgeAnalysis
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
