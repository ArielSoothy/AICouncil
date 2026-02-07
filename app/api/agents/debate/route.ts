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
import { SimpleMemoryService } from '@/lib/memory/simple-memory-service'

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
      const supabase = await createClient()
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
    } catch {
      // Auth check failed, using free tier
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
      isGuestMode = false,
      enableWebSearch = false
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
    
    // Initialize memory service for this user
    const memoryService = new SimpleMemoryService(userTier !== 'guest' ? 'user-id' : null)
    
    // MEMORY INTEGRATION: Retrieve relevant past memories before debate
    let relevantMemories: any[] = []
    try {
      relevantMemories = await memoryService.searchEpisodicMemories(query, 3)
    } catch {
      // Memory retrieval failed, continuing without memories
    }
    
    // Create debate request
    const debateRequest: DebateRequest = {
      query,
      agents: agentConfigs,
      rounds,
      responseMode,
      userTier,
      enableWebSearch,
      // Add memory context to enhance debate quality
      memoryContext: relevantMemories.length > 0 ? {
        pastExperiences: relevantMemories,
        hasRelevantHistory: true
      } : undefined
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
    
    // MEMORY INTEGRATION: Store episodic memory after successful debate
    if (session.status === 'completed' && userTier !== 'guest') {
      try {
        // Extract key information from debate session
        const episodicMemory = {
          query: query,
          agents_used: agentConfigs.map(agent => `${agent.provider}/${agent.model}`),
          consensus_reached: session.synthesis?.response || 'No clear consensus reached',
          confidence_score: session.synthesis?.confidence || 0.5,
          disagreement_points: session.rounds?.map((round: any) => 
            round.responses?.map((resp: any) => resp.disagreements || []).flat()
          ).flat().filter(Boolean) || [],
          resolution_method: 'agent_debate',
          total_tokens_used: session.totalTokensUsed || 0,
          estimated_cost: session.estimatedCost || 0,
          response_time_ms: Date.now() - (session.startTime || Date.now()),
          follow_up_questions: session.followUpQuestions || []
        }
        
        await memoryService.storeEpisodicMemory(episodicMemory)

        // Also extract and store semantic knowledge if consensus was strong
        if (session.synthesis?.confidence && session.synthesis.confidence > 0.7) {
          const semanticMemory = {
            fact: session.synthesis.response,
            category: 'learned_fact' as const,
            source: `AI Council debate with ${agentConfigs.length} agents`,
            confidence: session.synthesis.confidence,
            contexts: [query.split(' ').slice(0, 3).join(' ')], // First few words as context
            last_used: new Date(),
            validations: 1  // First validation from this debate
          }
          
          await memoryService.storeSemanticMemory(semanticMemory)
        }
        
      } catch (memoryError) {
        console.error('Failed to store memory, continuing anyway:', memoryError)
      }
    }
    
    // Save to database if authenticated
    if (userTier !== 'guest') {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Create evaluation data structure for training/analysis
          const evaluationData = {
            query_type: 'debate', // Could be enhanced with auto-classification
            mode: 'agents',
            agent_verdicts: session.rounds?.[session.rounds.length - 1]?.responses?.map((resp: any) => ({
              agent: resp.agent || 'unknown',
              verdict: resp.response || '',
              confidence: resp.confidence || 0.5
            })) || [],
            consensus_verdict: session.synthesis?.response || 'No consensus reached',
            confidence_scores: {
              overall: session.synthesis?.confidence || 0.5,
              agreement_level: session.agreementScore || 0.5,
              certainty: session.synthesis?.confidence || 0.5
            },
            reasoning_chain: session.rounds?.map((round: any) =>
              round.responses?.map((resp: any) => resp.reasoning || '').filter(Boolean)
            ).flat() || [],
            disagreement_points: session.rounds?.map((round: any) =>
              round.responses?.map((resp: any) => resp.disagreements || []).flat()
            ).flat().filter(Boolean) || [],
            metadata: {
              models_used: agentConfigs.map(agent => agent.model),
              providers_used: agentConfigs.map(agent => agent.provider),
              total_cost: session.estimatedCost || 0,
              response_time_ms: Date.now() - (session.startTime || Date.now()),
              rounds_executed: session.rounds?.length || 0,
              auto_trigger_round_2: session.autoTriggeredRound2 || false,
              timestamp: new Date().toISOString(),
              is_guest_session: false
            },
            ground_truth: null, // For future manual validation
            training_ready: true
          }

          await supabase.from('conversations').insert({
            user_id: user.id,
            query,
            responses: session, // Keep existing format
            evaluation_data: evaluationData, // Add structured evaluation data
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