import { 
  EpisodicMemory, 
  SemanticMemory, 
  ProceduralMemory, 
  Memory,
  MemoryStats
} from './types'

// Simple in-memory storage for testing
const inMemoryStorage = {
  episodic: [] as EpisodicMemory[],
  semantic: [] as SemanticMemory[],
  procedural: [] as ProceduralMemory[]
}

/**
 * Simple Memory Service for Testing
 * Uses in-memory storage to validate memory system functionality
 */
export class SimpleMemoryService {
  private userId: string | null

  constructor(userId?: string | null) {
    this.userId = userId || null
  }

  /**
   * Store episodic memory from a debate session
   */
  async storeEpisodicMemory(memory: Omit<EpisodicMemory, 'id' | 'created_at' | 'updated_at' | 'type'>): Promise<EpisodicMemory | null> {
    try {
      const episodicMemory: EpisodicMemory = {
        id: `episodic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'episodic',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: this.userId,
        ...memory
      }

      inMemoryStorage.episodic.push(episodicMemory)
      return episodicMemory
    } catch (err) {
      console.error('Failed to store episodic memory:', err)
      return null
    }
  }

  /**
   * Store semantic memory (facts and knowledge)
   */
  async storeSemanticMemory(memory: Omit<SemanticMemory, 'id' | 'created_at' | 'updated_at' | 'type'>): Promise<SemanticMemory | null> {
    try {
      // Check if fact already exists
      const existing = inMemoryStorage.semantic.find(m => 
        m.user_id === this.userId && 
        m.fact === memory.fact && 
        m.category === memory.category
      )

      if (existing) {
        // Update existing fact
        existing.confidence = Math.min(1, existing.confidence * 1.1)
        existing.validations = existing.validations + 1
        existing.last_used = new Date()
        existing.contexts = [...new Set([...existing.contexts, ...memory.contexts])]
        existing.updated_at = new Date()

        return existing
      }

      // Create new fact
      const semanticMemory: SemanticMemory = {
        ...memory,
        id: `semantic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'semantic',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: this.userId,
        validations: memory.validations ?? 1,
      }

      inMemoryStorage.semantic.push(semanticMemory)
      return semanticMemory
    } catch (err) {
      console.error('Failed to store semantic memory:', err)
      return null
    }
  }

  /**
   * Store procedural memory (rules and patterns)
   */
  async storeProceduralMemory(memory: Omit<ProceduralMemory, 'id' | 'created_at' | 'updated_at' | 'type'>): Promise<ProceduralMemory | null> {
    try {
      const proceduralMemory: ProceduralMemory = {
        ...memory,
        id: `procedural_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'procedural',
        created_at: new Date(),
        updated_at: new Date(),
        user_id: this.userId,
        usage_count: memory.usage_count ?? 0,
      }

      inMemoryStorage.procedural.push(proceduralMemory)
      return proceduralMemory
    } catch (err) {
      console.error('Failed to store procedural memory:', err)
      return null
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    const stats: MemoryStats = {
      total_memories: inMemoryStorage.episodic.length + inMemoryStorage.semantic.length + inMemoryStorage.procedural.length,
      episodic_count: inMemoryStorage.episodic.length,
      semantic_count: inMemoryStorage.semantic.length,
      procedural_count: inMemoryStorage.procedural.length,
      avg_confidence: 0,
      most_used_models: [],
      common_query_patterns: [],
      improvement_rate: 0
    }

    // Calculate average confidence from episodic memories
    if (inMemoryStorage.episodic.length > 0) {
      stats.avg_confidence = inMemoryStorage.episodic.reduce((sum, m) => sum + m.confidence_score, 0) / inMemoryStorage.episodic.length
    }

    // Get most used models
    const modelCounts: Record<string, number> = {}
    inMemoryStorage.episodic.forEach(memory => {
      memory.agents_used.forEach(agent => {
        modelCounts[agent] = (modelCounts[agent] || 0) + 1
      })
    })
    stats.most_used_models = Object.entries(modelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([model]) => model)

    return stats
  }

  /**
   * Search episodic memories by query similarity
   */
  async searchEpisodicMemories(query: string, limit: number = 5): Promise<EpisodicMemory[]> {
    // Simple text matching for now (would use vector similarity in production)
    const queryWords = query.toLowerCase().split(' ')
    
    const matches = inMemoryStorage.episodic
      .filter(memory => {
        const memoryWords = memory.query.toLowerCase().split(' ')
        const commonWords = queryWords.filter(word => memoryWords.includes(word))
        return commonWords.length > 0
      })
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, limit)

    return matches
  }

  /**
   * Clear all memories (for testing)
   */
  async clearAllMemories(): Promise<void> {
    inMemoryStorage.episodic = []
    inMemoryStorage.semantic = []
    inMemoryStorage.procedural = []
  }

  /**
   * Get all memories (for debugging)
   */
  async getAllMemories(): Promise<{ episodic: EpisodicMemory[], semantic: SemanticMemory[], procedural: ProceduralMemory[] }> {
    return {
      episodic: [...inMemoryStorage.episodic],
      semantic: [...inMemoryStorage.semantic], 
      procedural: [...inMemoryStorage.procedural]
    }
  }
}