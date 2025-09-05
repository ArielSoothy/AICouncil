import { NextRequest, NextResponse } from 'next/server'
import { AgentDebateOrchestrator } from '@/lib/agents/agent-system'
import { 
  DebateRequest, 
  DebateResponse, 
  AGENT_PERSONAS,
  DEBATE_CONFIG,
  AgentConfig 
} from '@/lib/agents/types'
import { providerRegistry } from '@/lib/ai-providers'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { canUseModel } from '@/lib/user-tiers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Cost calculation (reuse from consensus API)
const calculateDebateCost = (session: any): number => {
  // Simplified cost calculation - would need proper implementation
  const costPerToken = 0.00002 // Average cost
  return session.totalTokensUsed * costPerToken
}

export async function POST(request: NextRequest) {
  try {
    // Get user session and tier
    let userTier: 'guest' | 'free' | 'pro' | 'enterprise' = 'free'
    
    try {
      const supabase = createClient()
      // Check if Supabase is properly configured
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
    
    // Parse request body
    const body = await request.json()
    const { 
      query, 
      agents = [], 
      rounds = DEBATE_CONFIG.defaultRounds,
      responseMode = 'normal',
      isGuestMode = false 
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
    
    if (!agents || agents.length < DEBATE_CONFIG.minAgents) {
      return NextResponse.json(
        { error: `At least ${DEBATE_CONFIG.minAgents} agents are required` },
        { status: 400 }
      )
    }
    
    if (agents.length > DEBATE_CONFIG.maxAgents) {
      return NextResponse.json(
        { error: `Maximum ${DEBATE_CONFIG.maxAgents} agents allowed` },
        { status: 400 }
      )
    }
    
    if (rounds < 1 || rounds > DEBATE_CONFIG.maxRounds) {
      return NextResponse.json(
        { error: `Rounds must be between 1 and ${DEBATE_CONFIG.maxRounds}` },
        { status: 400 }
      )
    }
    
    // Prepare agent configurations
    const agentConfigs: AgentConfig[] = agents.map((agent: any) => {
      // Validate model access for user tier
      if (!canUseModel(userTier, agent.provider, agent.model)) {
        throw new Error(`Model ${agent.model} not available for ${userTier} tier`)
      }
      
      // Get persona or use provided one
      const persona = agent.persona || AGENT_PERSONAS[agent.role as keyof typeof AGENT_PERSONAS]
      if (!persona) {
        throw new Error(`Invalid agent role: ${agent.role}`)
      }
      
      return {
        ...agent,
        agentId: agent.agentId || `${agent.role}-${Date.now()}`,
        persona,
        enabled: true
      }
    })
    
    // Create debate request
    const debateRequest: DebateRequest = {
      query,
      agents: agentConfigs,
      rounds,
      responseMode,
      userTier
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
    session.estimatedCost = calculateDebateCost(session)
    
    // Save to database if authenticated
    if (userTier !== 'guest') {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          await supabase.from('conversations').insert({
            user_id: user.id,
            type: 'debate',
            query,
            data: session,
            created_at: new Date().toISOString()
          })
        }
      } catch (saveError) {
        console.error('Failed to save debate:', saveError)
      }
    }
    
    // Return response
    const response: DebateResponse = {
      session,
      success: session.status === 'completed'
    }
    
    return NextResponse.json(response, {
      headers: getRateLimitHeaders(rateLimitResult)
    })
    
  } catch (error) {
    console.error('Debate API error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Return available agent personas
  return NextResponse.json({
    agents: Object.values(AGENT_PERSONAS),
    config: {
      maxRounds: DEBATE_CONFIG.maxRounds,
      defaultRounds: DEBATE_CONFIG.defaultRounds,
      minAgents: DEBATE_CONFIG.minAgents,
      maxAgents: DEBATE_CONFIG.maxAgents
    }
  })
}