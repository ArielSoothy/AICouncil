/**
 * Enhanced Agent Debate API with Heterogeneous Model Mixing
 * 
 * This endpoint integrates the new heterogeneous mixing system with the existing
 * agent debate functionality to provide research-based optimal model selection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { AgentDebateOrchestrator } from '@/lib/agents/agent-system'
import { 
  DebateRequest, 
  DebateResponse, 
  AGENT_PERSONAS,
  DEBATE_CONFIG,
  AgentConfig,
  AgentRole 
} from '@/lib/agents/types'
import { 
  applyHeterogeneousMixing, 
  HeterogeneousConfig,
  MixingMode,
  analyzeQuery 
} from '@/lib/heterogeneous-mixing'
import { providerRegistry } from '@/lib/ai-providers'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { canUseModel } from '@/lib/user-tiers'

export const dynamic = 'force-dynamic'

/**
 * Enhanced debate request with heterogeneous mixing options
 */
interface HeterogeneousDebateRequest extends Omit<DebateRequest, 'agents'> {
  // Agent selection can be automatic or manual
  agentSelection?: {
    mode: 'auto' | 'manual'
    roles?: AgentRole[]  // For auto mode
    agents?: AgentConfig[]  // For manual mode (existing behavior)
  }
  
  // Heterogeneous mixing configuration
  heterogeneousMixing?: {
    enabled: boolean
    mode: MixingMode
    performanceTarget?: 'cost' | 'balance' | 'accuracy'
    enableQueryAnalysis?: boolean
    showRecommendations?: boolean
  }
  
  // Enhanced options
  enableWebSearch?: boolean
  responseMode?: 'concise' | 'normal' | 'detailed'
  isGuestMode?: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Get user session and tier
    let userTier: 'guest' | 'free' | 'pro' | 'enterprise' = 'free'
    
    try {
      const supabase = await createClient()
      if (supabase && typeof supabase.auth !== 'undefined') {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', user.id)
            .single()
          
          userTier = profile?.subscription_tier || 'free'
        }
      }
    } catch (authError) {
      console.log('Auth check failed, using free tier:', authError)
    }
    
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
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
    
    // Parse enhanced request body
    const body = await request.json() as HeterogeneousDebateRequest
    const { 
      query, 
      rounds = DEBATE_CONFIG.defaultRounds,
      responseMode = 'normal',
      isGuestMode = false,
      enableWebSearch = false,
      agentSelection = { mode: 'auto', roles: ['analyst', 'critic', 'synthesizer'] },
      heterogeneousMixing = { enabled: true, mode: 'auto', performanceTarget: 'balance' }
    } = body
    
    // Override tier if guest mode
    if (isGuestMode) {
      userTier = 'guest'
    }
    
    // Validate request
    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }
    
    // Determine agent roles
    let agentRoles: AgentRole[]
    if (agentSelection.mode === 'manual' && agentSelection.agents) {
      agentRoles = agentSelection.agents.map(a => a.persona.role)
    } else {
      agentRoles = agentSelection.roles || ['analyst', 'critic', 'synthesizer']
    }
    
    // Validate agent count
    if (agentRoles.length < DEBATE_CONFIG.minAgents || agentRoles.length > DEBATE_CONFIG.maxAgents) {
      return NextResponse.json(
        { error: `Agent count must be between ${DEBATE_CONFIG.minAgents} and ${DEBATE_CONFIG.maxAgents}` },
        { status: 400 }
      )
    }
    
    // Validate rounds
    if (rounds < 1 || rounds > DEBATE_CONFIG.maxRounds) {
      return NextResponse.json(
        { error: `Rounds must be between 1 and ${DEBATE_CONFIG.maxRounds}` },
        { status: 400 }
      )
    }
    
    let agentConfigs: AgentConfig[]
    let mixingAnalysis: any = null
    
    // Apply heterogeneous mixing if enabled
    if (heterogeneousMixing.enabled) {
      try {
        const mixingConfig: HeterogeneousConfig = {
          mode: heterogeneousMixing.mode || 'auto',
          userTier,
          agentRoles,
          performanceTarget: heterogeneousMixing.performanceTarget,
          enableFallback: true
        }
        
        // Apply heterogeneous mixing
        const mixingResult = await applyHeterogeneousMixing(query, mixingConfig)
        agentConfigs = mixingResult.agentConfigs
        
        // Store analysis for response
        if (heterogeneousMixing.showRecommendations) {
          mixingAnalysis = {
            queryAnalysis: mixingResult.queryAnalysis,
            strategy: mixingResult.strategy,
            expectedImprovement: mixingResult.expectedImprovement,
            reasoning: mixingResult.reasoning,
            confidence: mixingResult.confidence,
            modelSelection: mixingResult.modelSelection.recommendations.map(rec => ({
              agentRole: rec.agentRole,
              selectedModel: rec.model,
              provider: rec.provider,
              reasoning: rec.reasoning,
              alternatives: rec.alternatives
            }))
          }
        }
      } catch (mixingError) {
        console.warn('Heterogeneous mixing failed, falling back to default:', mixingError)
        
        // Fallback to default agent configuration
        agentConfigs = agentRoles.map(role => ({
          agentId: `${role}-${Date.now()}`,
          role,
          persona: AGENT_PERSONAS[role],
          provider: 'openai',
          model: userTier === 'guest' ? 'gpt-3.5-turbo' : 'gpt-4o',
          enabled: true
        }))
      }
    } else {
      // Manual agent selection or default configuration
      if (agentSelection.mode === 'manual' && agentSelection.agents) {
        agentConfigs = agentSelection.agents.map(agent => {
          const role = agent.persona?.role as AgentRole || 'analyst'
          return {
            ...agent,
            agentId: agent.agentId || `${role}-${Date.now()}`,
            persona: agent.persona || AGENT_PERSONAS[role],
            enabled: true
          }
        })
      } else {
        // Default configuration
        const defaultModels = {
          guest: 'gpt-3.5-turbo',
          free: 'gpt-4o',
          pro: 'gpt-4.1',
          enterprise: 'gpt-5'
        }
        
        agentConfigs = agentRoles.map(role => ({
          agentId: `${role}-${Date.now()}`,
          persona: AGENT_PERSONAS[role],
          provider: 'openai' as const,
          model: defaultModels[userTier] || defaultModels.free,
          enabled: true
        }))
      }
    }
    
    // Validate model access for user tier
    for (const config of agentConfigs) {
      if (!canUseModel(userTier, config.provider, config.model)) {
        return NextResponse.json(
          { error: `Model ${config.model} not available for ${userTier} tier` },
          { status: 403 }
        )
      }
    }
    
    // Create debate request
    const debateRequest: DebateRequest = {
      query,
      agents: agentConfigs,
      rounds,
      responseMode,
      userTier,
      enableWebSearch
    }
    
    // Initialize and run debate
    const orchestrator = new AgentDebateOrchestrator(debateRequest)
    
    // Run debate with timeout
    const debatePromise = orchestrator.runDebate()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Debate timeout')), DEBATE_CONFIG.timeouts.total)
    )
    
    const session = await Promise.race([debatePromise, timeoutPromise])
      .catch(error => {
        orchestrator.abort()
        throw error
      }) as any
    
    // Calculate cost
    const costPerToken = 0.00002 // Simplified
    session.estimatedCost = session.totalTokensUsed * costPerToken
    
    // Save to database if authenticated
    if (userTier !== 'guest') {
      try {
        const supabase = await createClient()
        if (supabase && typeof supabase.auth !== 'undefined') {
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            await supabase.from('conversations').insert({
              user_id: user.id,
              query: query.substring(0, 500), // Truncate for storage
              response_type: 'heterogeneous-debate',
              models_used: agentConfigs.map(c => c.model),
              tokens_used: session.totalTokensUsed,
              estimated_cost: session.estimatedCost,
              created_at: new Date().toISOString()
            })
          }
        }
      } catch (saveError) {
        console.warn('Failed to save conversation:', saveError)
        // Continue without saving
      }
    }
    
    // Prepare response
    const response: DebateResponse & { 
      heterogeneousMixing?: any
      metadata?: {
        userTier: string
        tokensUsed: number
        estimatedCost: number
        responseTime: number
        timestamp: string
      }
    } = {
      success: true,
      session,
      metadata: {
        userTier,
        tokensUsed: session.totalTokensUsed,
        estimatedCost: session.estimatedCost,
        responseTime: Date.now() - session.startTime.getTime(),
        timestamp: new Date().toISOString()
      }
    }
    
    // Include mixing analysis if requested
    if (mixingAnalysis) {
      response.heterogeneousMixing = mixingAnalysis
    }
    
    return NextResponse.json(response, {
      headers: getRateLimitHeaders(rateLimitResult)
    })
    
  } catch (error) {
    console.error('Enhanced debate API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to analyze queries and provide mixing recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const userTier = (searchParams.get('userTier') || 'free') as 'guest' | 'free' | 'pro' | 'enterprise'
    const showDetails = searchParams.get('showDetails') === 'true'
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }
    
    // Analyze query
    const analysis = analyzeQuery(query)
    
    if (!showDetails) {
      return NextResponse.json({
        queryType: analysis.primaryType,
        complexity: analysis.complexity,
        requiresWebSearch: analysis.requiresWebSearch,
        confidence: analysis.confidence
      })
    }
    
    // Get heterogeneous recommendations
    const recommendations = await applyHeterogeneousMixing(query, {
      mode: 'auto',
      userTier,
      agentRoles: ['analyst', 'critic', 'synthesizer'],
      performanceTarget: 'balance',
      enableFallback: true
    })
    
    return NextResponse.json({
      queryAnalysis: analysis,
      recommendations: recommendations.modelSelection.recommendations,
      expectedImprovement: recommendations.expectedImprovement,
      strategy: recommendations.strategy,
      reasoning: recommendations.reasoning,
      confidence: recommendations.confidence
    })
    
  } catch (error) {
    console.error('Query analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}