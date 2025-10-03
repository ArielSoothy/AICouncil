import { NextRequest, NextResponse } from 'next/server'
import { providerRegistry } from '@/lib/ai-providers/index'
import { QueryRequest, ConsensusResult, ModelResponse, EnhancedConsensusResponse, StructuredModelResponse } from '@/types/consensus'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { calculateConsensusScore, generateConsensusId } from '@/lib/utils'
import { generateModelPrompt, parseModelResponse, ResponseLength } from '@/lib/prompt-system'
import { generateJudgePrompt, parseJudgeResponse, JudgeResponseMode, ConciseJudgeResult, JudgeAnalysis } from '@/lib/judge-system'
import { getJudgeModel, canUseModel, getQueryLimit } from '@/lib/user-tiers'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { MODEL_COSTS_PER_1K, MODEL_POWER } from '@/lib/model-metadata'
import { enrichQueryWithWebSearch } from '@/lib/web-search/web-search-service'
// import { SimpleMemoryService } from '@/lib/memory/simple-memory-service' // Disabled - memory on backlog

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Deterministic answer parsing and ranking
interface ParsedOption {
  answer: string
  models: string[]
  confidence: number
  mentions: number
  weightedScore: number
}

function parseAndRankAnswers(responses: StructuredModelResponse[]): ParsedOption[] {
  const extractedOptions: { answer: string; model: string; confidence: number; weight: number }[] = []

  // Extract options from each response
  responses.forEach(response => {
    if (response.error || !response.response) return

    const text = response.response.trim()
    const modelWeight = MODEL_POWER[response.model] || 0.7

    // Try to extract numbered list items (1., 2., 3., etc.)
    const numberedMatches = text.match(/^\s*\d+\.\s*([^\n]+)/gm)
    if (numberedMatches && numberedMatches.length > 0) {
      numberedMatches.forEach(match => {
        const cleaned = match.replace(/^\s*\d+\.\s*/, '').trim()
        if (cleaned.length > 10 && cleaned.length < 200) {
          extractedOptions.push({
            answer: cleaned,
            model: response.model,
            confidence: 85,
            weight: modelWeight
          })
        }
      })
    } else {
      // Fallback: take first sentence
      const firstSentence = text.split('.')[0].trim()
      if (firstSentence.length > 10) {
        extractedOptions.push({
          answer: firstSentence.length > 150 ? firstSentence.substring(0, 150) + '...' : firstSentence,
          model: response.model,
          confidence: 75,
          weight: modelWeight
        })
      }
    }
  })

  // Group similar answers - extract just the product/brand name (before : or -)
  const answerGroups: { [key: string]: ParsedOption } = {}

  extractedOptions.forEach(option => {
    // Extract just the brand/model name (before : or - or –)
    const productName = option.answer.split(/[:\-–]/)[0].trim()
    // Normalize: remove numbers like "300/350" → "300", lowercase for matching
    const key = productName.toLowerCase().replace(/\/\d+/g, '').split(/\s+/).slice(0, 3).join(' ')

    if (!answerGroups[key]) {
      answerGroups[key] = {
        answer: option.answer,
        models: [option.model],
        confidence: option.confidence,
        mentions: 1,
        weightedScore: option.weight
      }
    } else {
      answerGroups[key].models.push(option.model)
      answerGroups[key].mentions += 1
      answerGroups[key].confidence = Math.min(95, answerGroups[key].confidence + 5)
      answerGroups[key].weightedScore += option.weight
    }
  })

  // Rank by weighted score (mentions * average model weight)
  return Object.values(answerGroups)
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 6)
}

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
  const meta = MODEL_COSTS_PER_1K[model]
  const costs = meta || TOKEN_COSTS[model as keyof typeof TOKEN_COSTS]
  if (!costs) return 0
  return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output)
}

async function runJudgeAnalysis(query: string, responses: StructuredModelResponse[], responseMode: JudgeResponseMode = 'concise', userTier: 'guest' | 'free' | 'pro' | 'enterprise' = 'free'): Promise<{
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

  // Get tier-appropriate judge model
  const judgeModel = getJudgeModel(userTier)
  
  // Use tier-based judge model
  try {
    if (judgeModel.startsWith('gemini-')) {
      // Free tier: Use Gemini models (fast and free)
      try {
        return await runEnhancedGeminiJudge(query, successfulResponses, responseMode, judgeModel)
      } catch (geminiError) {
        console.log(`Gemini judge failed, falling back to Groq:`, geminiError)
        // Fallback to fast Groq model for free tier if configured
        const groqProvider = providerRegistry.getProvider('groq')
        if (groqProvider && groqProvider.isConfigured()) {
          return await runEnhancedGroqJudge(query, successfulResponses, responseMode)
        } else {
          console.log('Groq not configured, using heuristic fallback')
          // If Groq not configured, skip to heuristic
        }
      }
    } else if (judgeModel === 'claude-opus-4-20250514') {
      // Pro/Enterprise: Use Claude Opus 4 if available
      if (process.env.ANTHROPIC_API_KEY && 
          process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' &&
          process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
        return await runEnhancedClaudeJudge(query, successfulResponses, responseMode)
      }
      // Fallback to GPT-4o if Claude not available
      if (process.env.OPENAI_API_KEY && 
          process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
          process.env.OPENAI_API_KEY.startsWith('sk-')) {
        return await runEnhancedGPTJudge(query, successfulResponses, responseMode)
      }
    }
  } catch (error) {
    console.log(`${judgeModel} judge failed, using heuristic fallback:`, error)
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

async function runEnhancedGroqJudge(query: string, responses: StructuredModelResponse[], mode: JudgeResponseMode = 'concise') {
  const promptContent = generateJudgePrompt(responses, query, mode)
  
  // Use the existing Groq provider through our provider registry
  const groqProvider = providerRegistry.getProvider('groq')
  if (!groqProvider) {
    throw new Error('Groq provider not available')
  }
  
  try {
    // Create a system-aware prompt by combining system instruction with user prompt
    const systemInstruction = mode === 'concise' 
      ? 'You are an expert consensus analyzer. Always respond with valid JSON only.' 
      : 'You are the Chief Decision Synthesizer for Consensus AI. Provide thorough analysis in the exact format requested.'
    
    const fullPrompt = `${systemInstruction}\n\n${promptContent}`
    
    const result = await groqProvider.query(
      fullPrompt,
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        enabled: true,
        maxTokens: mode === 'concise' ? 300 : 800,
        temperature: 0.2
      }
    )
    
    const analysis = parseJudgeResponse(result.response, mode)
    const tokensUsed = result.tokensUsed || result.tokens?.total || 0
    
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
  } catch (error) {
    console.error('Groq judge failed:', error)
    throw error // Re-throw to trigger further fallback
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

async function runEnhancedGeminiJudge(query: string, responses: StructuredModelResponse[], mode: JudgeResponseMode = 'concise', modelName: string = 'gemini-2.0-flash') {
  const promptContent = generateJudgePrompt(responses, query, mode)
  
  const result = await generateText({
    model: google(modelName),
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
  
  // Calculate weighted confidence using model power weights
  const baseConfidence = 40 + (responseCount * 5)
  let weightedConfidence = baseConfidence
  if (validResponses.length > 0) {
    const { totalWeight, weightedSum } = validResponses.reduce((acc, r) => {
      const weight = MODEL_POWER[r.model] || 0.7
      const modelConf = r.parsed?.confidence ?? 50
      acc.totalWeight += weight
      acc.weightedSum += weight * modelConf
      return acc
    }, { totalWeight: 0, weightedSum: 0 } as { totalWeight: number; weightedSum: number })
    const avgWeighted = totalWeight > 0 ? weightedSum / totalWeight : 60
    weightedConfidence = Math.min(baseConfidence + (avgWeighted * 0.3), 80)
  }
  const confidence = Math.min(weightedConfidence, 80)
  
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

  // Choose best answer from highest power-weighted confidence product
  let bestAnswer = responses[0]?.response || 'No valid responses'
  if (validResponses.length > 0) {
    const best = validResponses
      .map(r => ({ r, score: (MODEL_POWER[r.model] || 0.7) * (r.parsed?.confidence ?? 50) }))
      .sort((a, b) => b.score - a.score)[0]
    bestAnswer = best?.r.parsed?.mainAnswer || best?.r.response || bestAnswer
  }
    
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
    // Get user session and tier (optional for now - default to free)
    let userTier: 'guest' | 'free' | 'pro' | 'enterprise' = 'free'
    
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user tier from database if authenticated
        const { data: profile } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()
        
        userTier = profile?.subscription_tier || 'free'
      }
    } catch (authError) {
      // If auth fails, continue with free tier
      console.log('Auth check failed, using free tier:', authError)
      userTier = 'free'
    }

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
    const { prompt, models, responseMode = 'concise', usePremiumQuery = false, isGuestMode = false, comparisonModel, includeComparison, enableWebSearch = false, testingTierOverride } = body
    
    // Override tier if in guest mode
    if (isGuestMode) {
      userTier = 'guest'
    }

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

    // Use testing tier override if provided (for development testing only)
    const effectiveTier = testingTierOverride || userTier
    
    // Validate models are available for user's tier (or premium query tier)
    const filteredModels = models.filter(model => 
      model.enabled && canUseModel(effectiveTier, model.provider, model.model)
    )
    
    if (filteredModels.length === 0) {
      return NextResponse.json(
        { error: 'No valid models selected for your subscription tier' },
        { status: 403 }
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

    // Enrich query with web search if enabled
    let enrichedQuery = prompt
    let webSearchContext: string | undefined
    let webSearchSources: string[] | undefined
    
    if (enableWebSearch) {
      try {
        const searchResult = await enrichQueryWithWebSearch(prompt, {
          enabled: true,
          provider: 'duckduckgo',
          maxResults: 5,
          cache: true,
          includeInPrompt: true
        })
        enrichedQuery = searchResult.query
        webSearchContext = searchResult.searchContext
        webSearchSources = searchResult.sources
      } catch (searchError) {
        console.error('Web search failed:', searchError)
        // Continue without web search if it fails
      }
    }

    // MEMORY INTEGRATION: DISABLED - On backlog, not current priority
    let memoryContext: string | undefined
    let foundMemoriesCount = 0
    
    // Memory retrieval disabled - focusing on research validation
    // When re-enabled, will retrieve relevant past experiences from database
    // See: docs/archived/MEMORY_IMPLEMENTATION_PLAN.md for implementation details

    // Generate structured prompt using the new system
    const structuredPrompt = generateModelPrompt(enrichedQuery, responseMode as ResponseLength)
    
    // Query comparison model first if requested
    let comparisonResult = null
    if (includeComparison && comparisonModel && comparisonModel.enabled) {
      try {
        const compProvider = providerRegistry.getProvider(comparisonModel.provider)
        if (compProvider && compProvider.isConfigured()) {
          const compConfig = {
            ...comparisonModel,
            maxTokens: responseMode === 'concise' ? 100 : responseMode === 'normal' ? 400 : 800
          }
          const compStartTime = Date.now()
          const compResponse = await compProvider.query(structuredPrompt, compConfig)
          const compResponseTime = Date.now() - compStartTime
          
          // Calculate cost for comparison model
          const modelKey = `${comparisonModel.provider}/${comparisonModel.model}`
          const costPerK = MODEL_COSTS_PER_1K[modelKey] || { input: 0, output: 0 }
          const compCost = ((compResponse.tokens.total * (costPerK.input + costPerK.output) / 2) / 1000)
          
          comparisonResult = {
            model: `${comparisonModel.provider}/${comparisonModel.model}`,
            response: compResponse.response,
            tokensUsed: compResponse.tokens.total,
            responseTime: compResponseTime,
            cost: compCost,
            confidence: compResponse.confidence || 0.7
          }
        }
      } catch (error) {
        console.error('Comparison model query failed:', error)
        // Continue without comparison if it fails
      }
    }

    // Query all models in parallel with structured prompts
    const startTime = Date.now()
    const responses = await Promise.allSettled(
      filteredModels.map(async (config) => {
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

    // Run judge analysis using effective tier for premium queries
    const judgeAnalysis = await runJudgeAnalysis(prompt, modelResponses, responseMode as JudgeResponseMode, effectiveTier)

    // DETERMINISTIC RANKING: Parse and rank answers algorithmically
    const rankedOptions = parseAndRankAnswers(modelResponses)

    // Override judge's bestAnswer with algorithmic rankings for consistency
    if (rankedOptions.length > 0) {
      const top3 = rankedOptions.slice(0, 3)
      const formattedAnswer = `Top 3 Recommendations:\n${top3.map((opt, i) =>
        `${i + 1}. ${opt.answer} (${opt.mentions}/${modelResponses.length} models, ${Math.round(opt.confidence)}% confidence)`
      ).join('\n')}\n\n${top3[0].answer} is the top recommendation based on ${top3[0].mentions} model${top3[0].mentions > 1 ? 's' : ''} agreeing.`

      judgeAnalysis.unifiedAnswer = formattedAnswer
      judgeAnalysis.conciseAnswer = formattedAnswer
      judgeAnalysis.normalAnswer = formattedAnswer
    }

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
    
    // Add judge cost based on which judge was actually used (not just available)
    if (judgeAnalysis.judgeTokensUsed > 0) {
      // Use the actual judge model that was selected based on user tier
      const judgeModelUsed = getJudgeModel(userTier)
      estimatedCost += calculateCost(judgeModelUsed, 0, judgeAnalysis.judgeTokensUsed)
    }

    // Create enhanced response structure
    const enhancedResponse: EnhancedConsensusResponse = {
      query: prompt,
      mode: responseMode,
      responses: modelResponses.map(r => ({
        model: `${r.provider}/${r.model}`,
        response: r.response,
        tokensUsed: r.tokensUsed || r.tokens.total,
        responseTime: r.responseTime,
        usedWebSearch: enableWebSearch && !!webSearchContext // Show if this model got web search context
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
      estimatedCost: Math.round(estimatedCost * 100000) / 100000, // Round to 5 decimal places
      ...(comparisonResult && { comparisonResponse: comparisonResult }), // Add comparison if available
      ...(webSearchContext && { 
        webSearch: {
          context: webSearchContext,
          sources: webSearchSources || []
        }
      }) // Add web search results if available
    }

    // MEMORY INTEGRATION: DISABLED - On backlog, not current priority
    // Memory system foundation is complete but disabled to focus on research validation
    // See: docs/archived/MEMORY_IMPLEMENTATION_PLAN.md for future implementation
    const MEMORY_ENABLED = false; // Toggle when ready to re-enable
    
    if (MEMORY_ENABLED && userTier !== 'guest' && judgeAnalysis.confidence > 0.6) {
      // Memory code commented out but preserved for future use
      // Will store episodic and semantic memories when re-enabled
      console.log('Memory system currently disabled - focusing on research validation')
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
