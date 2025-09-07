import { NextRequest, NextResponse } from 'next/server'
import { SimpleMemoryService } from '@/lib/memory/simple-memory-service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const memoryService = new SimpleMemoryService(user?.id)
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    
    switch (action) {
      case 'stats':
        // Get memory statistics
        const stats = await memoryService.getMemoryStats()
        return NextResponse.json({ 
          success: true, 
          stats,
          userId: user?.id || 'guest'
        })
        
      case 'search':
        // Search for relevant memories
        const query = searchParams.get('query')
        if (!query) {
          return NextResponse.json({ 
            success: false, 
            error: 'Query parameter required' 
          }, { status: 400 })
        }
        
        const memories = await memoryService.searchEpisodicMemories(
          query, 
          parseInt(searchParams.get('limit') || '5')
        )
        
        return NextResponse.json({ 
          success: true, 
          memories,
          count: memories.length
        })
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: stats, search' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Memory API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const memoryService = new SimpleMemoryService(user?.id)
    const body = await request.json()
    
    switch (body.type) {
      case 'episodic':
        // Store episodic memory
        const episodicMemory = await memoryService.storeEpisodicMemory(body.memory)
        return NextResponse.json({ 
          success: true, 
          memory: episodicMemory 
        })
        
      case 'semantic':
        // Store semantic memory
        const semanticMemory = await memoryService.storeSemanticMemory(body.memory)
        return NextResponse.json({ 
          success: true, 
          memory: semanticMemory 
        })
        
      case 'procedural':
        // Store procedural memory
        const proceduralMemory = await memoryService.storeProceduralMemory(body.memory)
        return NextResponse.json({ 
          success: true, 
          memory: proceduralMemory 
        })
        
      case 'debate':
        // Store debate session as episodic memory (simplified)
        if (body.session?.finalSynthesis) {
          await memoryService.storeEpisodicMemory({
            query: body.session.query,
            agents_used: body.session.agents?.map((a: any) => a.name) || [],
            consensus_reached: body.session.finalSynthesis.conclusion,
            confidence_score: body.session.finalSynthesis.confidence,
            disagreement_points: body.session.finalSynthesis.disagreements || [],
            total_tokens_used: body.session.totalTokensUsed || 0,
            estimated_cost: body.session.estimatedCost || 0,
            response_time_ms: body.session.endTime 
              ? new Date(body.session.endTime).getTime() - new Date(body.session.startTime).getTime()
              : 0
          })
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Debate stored in memory system'
        })
        
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid memory type. Use: episodic, semantic, procedural, debate' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Memory API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// Search for relevant memories (simplified)
export async function PUT(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const memoryService = new SimpleMemoryService(user?.id)
    const body = await request.json()
    const { query } = body
    
    if (!query) {
      return NextResponse.json({ 
        success: false, 
        error: 'Query required' 
      }, { status: 400 })
    }
    
    // Search for relevant memories
    const relevantMemories = await memoryService.searchEpisodicMemories(query, 5)
    
    return NextResponse.json({ 
      success: true, 
      memories: relevantMemories,
      memoriesFound: relevantMemories.length,
      message: `Found ${relevantMemories.length} relevant memories`
    })
  } catch (error) {
    console.error('Memory search error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}