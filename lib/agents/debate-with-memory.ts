import { MemoryService } from '@/lib/memory/memory-service'
import { MemoryRetrievalResult, MemoryImpact } from '@/lib/memory/types'
import { AgentConfig, DebateSession } from './types'

/**
 * Enhanced debate system with memory integration
 * Retrieves relevant past experiences and applies learned patterns
 */
export class DebateWithMemory {
  private memoryService: MemoryService
  private userId?: string | null

  constructor(userId?: string | null) {
    this.userId = userId
    this.memoryService = new MemoryService(userId)
  }

  /**
   * Enhance query with relevant memories before debate
   */
  async enhanceQueryWithMemory(
    query: string,
    agents: AgentConfig[]
  ): Promise<{
    enhancedQuery: string
    relevantMemories: MemoryRetrievalResult[]
    suggestedConfig?: {
      agents?: string[]
      rounds?: number
      responseMode?: 'concise' | 'normal' | 'detailed'
    }
  }> {
    // Retrieve relevant memories
    const memories = await this.memoryService.retrieveRelevantMemories(query, {
      limit: 5,
      threshold: 0.6
    })

    let enhancedQuery = query
    const suggestedConfig: any = {}

    // Process episodic memories (past debates)
    const episodicMemories = memories.filter(m => m.memory.type === 'episodic')
    if (episodicMemories.length > 0) {
      const bestPastDebate = episodicMemories[0].memory as any
      
      // Add context from past similar debates
      enhancedQuery += `\n\n[Context from similar past discussions: ${bestPastDebate.consensus_reached}]`
      
      // Suggest configuration based on successful past debates
      if (bestPastDebate.confidence_score > 0.8) {
        suggestedConfig.agents = bestPastDebate.agents_used
      }
    }

    // Process semantic memories (known facts)
    const semanticMemories = memories.filter(m => m.memory.type === 'semantic')
    if (semanticMemories.length > 0) {
      const relevantFacts = semanticMemories
        .map(m => (m.memory as any).fact)
        .slice(0, 3)
        .join('; ')
      
      enhancedQuery += `\n\n[Relevant information: ${relevantFacts}]`
    }

    // Process procedural memories (learned rules)
    const proceduralMemories = memories.filter(m => m.memory.type === 'procedural')
    if (proceduralMemories.length > 0) {
      const bestRule = proceduralMemories[0].memory as any
      
      if (bestRule.agent_configuration) {
        Object.assign(suggestedConfig, bestRule.agent_configuration)
      }
      
      enhancedQuery += `\n\n[Approach: ${bestRule.action}]`
    }

    return {
      enhancedQuery,
      relevantMemories: memories,
      suggestedConfig: Object.keys(suggestedConfig).length > 0 ? suggestedConfig : undefined
    }
  }

  /**
   * Store debate outcome as episodic memory
   */
  async storeDebateAsMemory(session: DebateSession): Promise<void> {
    if (!session.finalSynthesis) return

    try {
      // Store as episodic memory
      await this.memoryService.storeEpisodicMemory({
        query: session.query,
        agents_used: session.agents.map(a => a.name),
        consensus_reached: session.finalSynthesis.conclusion,
        confidence_score: session.finalSynthesis.confidence,
        disagreement_points: session.finalSynthesis.disagreements,
        total_tokens_used: session.totalTokensUsed,
        estimated_cost: session.estimatedCost,
        response_time_ms: session.endTime 
          ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
          : 0,
        follow_up_questions: session.informationRequest?.suggestedQuestions
      })

      // Extract and store semantic facts from the consensus
      const facts = this.extractFactsFromConsensus(session.finalSynthesis.conclusion)
      for (const fact of facts) {
        await this.memoryService.storeSemanticMemory({
          fact,
          category: 'learned_fact',
          source: `Debate consensus on: ${session.query}`,
          confidence: session.finalSynthesis.confidence,
          contexts: [session.query],
          validations: 0
        })
      }

      // Learn procedural rules if the debate was successful
      if (session.finalSynthesis.confidence > 0.8) {
        const rule = this.extractRuleFromDebate(session)
        if (rule) {
          await this.memoryService.storeProceduralMemory(rule)
        }
      }
    } catch (error) {
      console.error('Failed to store debate memory:', error)
    }
  }

  /**
   * Get memory-enhanced prompt for agents
   */
  generateMemoryEnhancedPrompt(
    basePrompt: string,
    memories: MemoryRetrievalResult[]
  ): string {
    if (memories.length === 0) return basePrompt

    let enhancedPrompt = basePrompt

    // Add episodic context
    const episodicMemories = memories.filter(m => m.memory.type === 'episodic')
    if (episodicMemories.length > 0) {
      enhancedPrompt += '\n\n## Previous Similar Discussions:\n'
      episodicMemories.slice(0, 2).forEach(m => {
        const mem = m.memory as any
        enhancedPrompt += `- Query: "${mem.query}" → Consensus: "${mem.consensus_reached}" (Confidence: ${(mem.confidence_score * 100).toFixed(0)}%)\n`
      })
    }

    // Add semantic context
    const semanticMemories = memories.filter(m => m.memory.type === 'semantic')
    if (semanticMemories.length > 0) {
      enhancedPrompt += '\n\n## Relevant Facts:\n'
      semanticMemories.slice(0, 3).forEach(m => {
        const mem = m.memory as any
        enhancedPrompt += `- ${mem.fact} (Source: ${mem.source})\n`
      })
    }

    // Add procedural guidance
    const proceduralMemories = memories.filter(m => m.memory.type === 'procedural')
    if (proceduralMemories.length > 0) {
      enhancedPrompt += '\n\n## Recommended Approach:\n'
      const bestRule = proceduralMemories[0].memory as any
      enhancedPrompt += `${bestRule.action} (Success rate: ${(bestRule.success_rate * 100).toFixed(0)}%)\n`
    }

    return enhancedPrompt
  }

  /**
   * Calculate and display memory impact
   */
  calculateMemoryImpact(
    memories: MemoryRetrievalResult[],
    session: DebateSession
  ): MemoryImpact {
    return this.memoryService.calculateMemoryImpact(
      memories,
      session.estimatedCost,
      session.endTime 
        ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
        : 0
    )
  }

  /**
   * Extract facts from consensus (simple implementation)
   */
  private extractFactsFromConsensus(consensus: string): string[] {
    const facts: string[] = []
    
    // Look for statements that seem like facts
    const sentences = consensus.split(/[.!?]/).filter(s => s.trim())
    
    sentences.forEach(sentence => {
      // Simple heuristic: sentences with "is", "are", "has", "have" might be facts
      if (/\b(is|are|was|were|has|have|will|would|should)\b/i.test(sentence)) {
        const cleanedSentence = sentence.trim()
        if (cleanedSentence.length > 20 && cleanedSentence.length < 200) {
          facts.push(cleanedSentence)
        }
      }
    })

    return facts.slice(0, 5) // Limit to 5 facts
  }

  /**
   * Extract procedural rule from successful debate
   */
  private extractRuleFromDebate(session: DebateSession): any {
    if (!session.finalSynthesis || session.finalSynthesis.confidence < 0.8) {
      return null
    }

    // Extract query patterns
    const queryWords = session.query.toLowerCase().split(/\s+/)
    const queryPatterns = queryWords
      .filter(word => word.length > 4) // Keep meaningful words
      .slice(0, 3)

    return {
      rule_name: `Rule_${session.query.substring(0, 30).replace(/\s+/g, '_')}`,
      condition: `Query contains: ${queryPatterns.join(' OR ')}`,
      action: `Use consensus approach: ${session.finalSynthesis.conclusion.substring(0, 100)}`,
      success_rate: session.finalSynthesis.confidence,
      usage_count: 1,
      query_patterns: queryPatterns,
      agent_configuration: {
        preferred_models: session.agents.map(a => (a as any).model || a.name),
        debate_rounds: session.rounds.length,
        response_mode: session.round1Mode === 'llm' ? 'concise' : 'normal'
      }
    }
  }

  /**
   * Get memory statistics for display
   */
  async getMemoryStats() {
    return this.memoryService.getMemoryStats()
  }
}