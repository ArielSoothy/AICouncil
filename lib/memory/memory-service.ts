import { createClient } from '@/lib/supabase/client'
import { 
  EpisodicMemory, 
  SemanticMemory, 
  ProceduralMemory, 
  Memory,
  MemorySearchOptions,
  MemoryRetrievalResult,
  MemoryStats,
  MemoryImpact
} from './types'
import { 
  TrainingDataPoint,
  TrainingDataQuality,
  TrainingDataFormatter,
  TrainingDatasetStats
} from './training-data'

/**
 * Memory Service
 * Manages episodic, semantic, and procedural memory for AI agents
 */
export class MemoryService {
  private supabase: ReturnType<typeof createClient>
  private userId: string | null

  constructor(userId?: string | null) {
    this.supabase = createClient()
    this.userId = userId || null
  }

  /**
   * Store episodic memory from a debate session
   */
  async storeEpisodicMemory(memory: Omit<EpisodicMemory, 'id' | 'created_at' | 'updated_at' | 'type'>): Promise<EpisodicMemory | null> {
    try {
      // Generate simple embedding (in production, use proper embedding service)
      const embedding = this.generateSimpleEmbedding(memory.query)

      const { data, error } = await this.supabase
        .from('episodic_memory')
        .insert({
          user_id: this.userId,
          query: memory.query,
          query_embedding: embedding,
          agents_used: memory.agents_used,
          consensus_reached: memory.consensus_reached,
          confidence_score: memory.confidence_score,
          disagreement_points: memory.disagreement_points || null,
          resolution_method: memory.resolution_method || null,
          total_tokens_used: memory.total_tokens_used,
          estimated_cost: memory.estimated_cost,
          response_time_ms: memory.response_time_ms,
          follow_up_questions: memory.follow_up_questions || null,
          user_feedback: memory.user_feedback || null,
          metadata: memory.metadata || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error storing episodic memory:', error)
        return null
      }

      return { ...data, type: 'episodic' } as EpisodicMemory
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
      const embedding = this.generateSimpleEmbedding(memory.fact)

      // First check if this fact already exists
      const { data: existing } = await this.supabase
        .from('semantic_memory')
        .select()
        .eq('user_id', this.userId || '')
        .eq('fact', memory.fact)
        .eq('category', memory.category)
        .single()

      if (existing) {
        // Update existing fact
        const { data, error } = await this.supabase
          .from('semantic_memory')
          .update({
            confidence: Math.min(1, existing.confidence * 1.1), // Increase confidence
            validations: existing.validations + 1,
            last_used: new Date().toISOString(),
            contexts: [...new Set([...(existing.contexts || []), ...(memory.contexts || [])])]
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating semantic memory:', error)
          return null
        }

        return { ...data, type: 'semantic' } as SemanticMemory
      }

      // Create new fact
      const { data, error } = await this.supabase
        .from('semantic_memory')
        .insert({
          user_id: this.userId,
          fact: memory.fact,
          fact_embedding: embedding,
          category: memory.category,
          source: memory.source,
          confidence: memory.confidence,
          validations: memory.validations || 1,
          last_used: memory.last_used || new Date().toISOString(),
          contexts: memory.contexts || [],
          metadata: memory.metadata || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error storing semantic memory:', error)
        return null
      }

      return { ...data, type: 'semantic' } as SemanticMemory
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
      // Check if rule exists
      const { data: existing } = await this.supabase
        .from('procedural_memory')
        .select()
        .eq('user_id', this.userId || '')
        .eq('rule_name', memory.rule_name)
        .single()

      if (existing) {
        // Update success rate and usage count
        const newSuccessRate = (existing.success_rate * existing.usage_count + memory.success_rate) / (existing.usage_count + 1)
        
        const { data, error } = await this.supabase
          .from('procedural_memory')
          .update({
            success_rate: newSuccessRate,
            usage_count: existing.usage_count + 1,
            query_patterns: [...new Set([...(existing.query_patterns || []), ...(memory.query_patterns || [])])],
            agent_configuration: memory.agent_configuration || existing.agent_configuration
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating procedural memory:', error)
          return null
        }

        return { ...data, type: 'procedural' } as ProceduralMemory
      }

      // Create new rule
      const { data, error } = await this.supabase
        .from('procedural_memory')
        .insert({
          user_id: this.userId,
          rule_name: memory.rule_name,
          condition: memory.condition,
          action: memory.action,
          success_rate: memory.success_rate || 0,
          usage_count: memory.usage_count || 1,
          query_patterns: memory.query_patterns || [],
          agent_configuration: memory.agent_configuration || null,
          metadata: memory.metadata || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error storing procedural memory:', error)
        return null
      }

      return { ...data, type: 'procedural' } as ProceduralMemory
    } catch (err) {
      console.error('Failed to store procedural memory:', err)
      return null
    }
  }

  /**
   * Retrieve relevant memories for a query
   */
  async retrieveRelevantMemories(query: string, options?: MemorySearchOptions): Promise<MemoryRetrievalResult[]> {
    const results: MemoryRetrievalResult[] = []
    const queryEmbedding = this.generateSimpleEmbedding(query)
    const limit = options?.limit || 5

    try {
      // Search episodic memories
      if (!options?.type || options.type === 'episodic') {
        const { data: episodicMemories } = await this.supabase
          .from('episodic_memory')
          .select()
          .eq('user_id', this.userId || '')
          .order('confidence_score', { ascending: false })
          .limit(limit)

        if (episodicMemories) {
          for (const memory of episodicMemories) {
            const similarity = this.calculateSimilarity(queryEmbedding, memory.query_embedding)
            if (similarity > (options?.threshold || 0.7)) {
              results.push({
                memory: { ...memory, type: 'episodic' } as EpisodicMemory,
                relevance_score: similarity,
                reason: `Similar past debate with ${(similarity * 100).toFixed(0)}% similarity`
              })
            }
          }
        }
      }

      // Search semantic memories
      if (!options?.type || options.type === 'semantic') {
        const { data: semanticMemories } = await this.supabase
          .from('semantic_memory')
          .select()
          .eq('user_id', this.userId || '')
          .order('confidence', { ascending: false })
          .limit(limit)

        if (semanticMemories) {
          for (const memory of semanticMemories) {
            // Check if fact is relevant to query
            const relevance = this.calculateRelevance(query, memory.fact)
            if (relevance > (options?.threshold || 0.5)) {
              results.push({
                memory: { ...memory, type: 'semantic' } as SemanticMemory,
                relevance_score: relevance,
                reason: `Relevant ${memory.category} knowledge`
              })
            }
          }
        }
      }

      // Search procedural memories
      if (!options?.type || options.type === 'procedural') {
        const { data: proceduralMemories } = await this.supabase
          .from('procedural_memory')
          .select()
          .eq('user_id', this.userId || '')
          .order('success_rate', { ascending: false })
          .limit(limit)

        if (proceduralMemories) {
          for (const memory of proceduralMemories) {
            // Check if query matches any patterns
            const matches = memory.query_patterns?.some((pattern: string) => 
              query.toLowerCase().includes(pattern.toLowerCase())
            )
            if (matches) {
              results.push({
                memory: { ...memory, type: 'procedural' } as ProceduralMemory,
                relevance_score: memory.success_rate,
                reason: `Matching rule: ${memory.rule_name}`
              })
            }
          }
        }
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance_score - a.relevance_score)
      return results.slice(0, limit)

    } catch (err) {
      console.error('Failed to retrieve memories:', err)
      return []
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats | null> {
    try {
      // Get counts for each memory type
      const [episodicCount, semanticCount, proceduralCount] = await Promise.all([
        this.supabase.from('episodic_memory').select('*', { count: 'exact', head: true }).eq('user_id', this.userId || ''),
        this.supabase.from('semantic_memory').select('*', { count: 'exact', head: true }).eq('user_id', this.userId || ''),
        this.supabase.from('procedural_memory').select('*', { count: 'exact', head: true }).eq('user_id', this.userId || '')
      ])

      // Get average confidence
      const { data: episodicData } = await this.supabase
        .from('episodic_memory')
        .select('confidence_score, agents_used')
        .eq('user_id', this.userId || '')

      const avgConfidence = episodicData?.length 
        ? episodicData.reduce((sum, m) => sum + m.confidence_score, 0) / episodicData.length
        : 0

      // Get most used models
      const modelCounts = new Map<string, number>()
      episodicData?.forEach(m => {
        m.agents_used?.forEach((agent: string) => {
          modelCounts.set(agent, (modelCounts.get(agent) || 0) + 1)
        })
      })
      const mostUsedModels = Array.from(modelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([model]) => model)

      return {
        total_memories: (episodicCount.count || 0) + (semanticCount.count || 0) + (proceduralCount.count || 0),
        episodic_count: episodicCount.count || 0,
        semantic_count: semanticCount.count || 0,
        procedural_count: proceduralCount.count || 0,
        avg_confidence: avgConfidence,
        most_used_models: mostUsedModels,
        common_query_patterns: [],
        improvement_rate: 0 // Will calculate once we have enough data
      }
    } catch (err) {
      console.error('Failed to get memory stats:', err)
      return null
    }
  }

  /**
   * Calculate memory impact on a debate
   */
  calculateMemoryImpact(
    memoriesUsed: MemoryRetrievalResult[],
    originalCost: number,
    originalTime: number
  ): MemoryImpact {
    const episodicMemories = memoriesUsed.filter(m => m.memory.type === 'episodic')
    const semanticMemories = memoriesUsed.filter(m => m.memory.type === 'semantic')
    const proceduralMemories = memoriesUsed.filter(m => m.memory.type === 'procedural')

    // Calculate accuracy boost based on memory types used
    const accuracyBoost = 
      episodicMemories.length * 0.15 + // 15% per similar past experience
      semanticMemories.length * 0.1 + // 10% per relevant fact
      proceduralMemories.length * 0.2 // 20% per matching rule

    // Calculate cost reduction (if we can reuse past responses)
    const costReduction = episodicMemories.length > 0 ? 0.6 : 0 // 60% if we have similar past debates

    // Calculate time saved
    const timeSaved = episodicMemories.length > 0 ? originalTime * 0.5 : 0

    // Confidence increase from memory
    const avgRelevance = memoriesUsed.reduce((sum, m) => sum + m.relevance_score, 0) / (memoriesUsed.length || 1)
    const confidenceIncrease = avgRelevance * 0.2 // Up to 20% confidence boost

    return {
      memories_used: memoriesUsed.length,
      accuracy_boost: Math.min(0.4, accuracyBoost), // Cap at 40%
      cost_reduction: costReduction,
      time_saved_ms: Math.round(timeSaved),
      confidence_increase: confidenceIncrease
    }
  }

  /**
   * Simple embedding generation (placeholder - use OpenAI/Cohere in production)
   */
  private generateSimpleEmbedding(text: string): number[] {
    // This is a very simple hash-based embedding for demo purposes
    // In production, use OpenAI embeddings or similar
    const words = text.toLowerCase().split(/\s+/)
    const embedding: number[] = new Array(128).fill(0)
    
    words.forEach((word, i) => {
      const hash = this.hashCode(word)
      const index = Math.abs(hash) % 128
      embedding[index] += 1 / (i + 1) // Weight by position
    })

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => val / (magnitude || 1))
  }

  /**
   * Calculate similarity between embeddings
   */
  private calculateSimilarity(embedding1: any, embedding2: any): number {
    if (!embedding1 || !embedding2) return 0
    
    const e1 = Array.isArray(embedding1) ? embedding1 : embedding1
    const e2 = Array.isArray(embedding2) ? embedding2 : embedding2
    
    if (!Array.isArray(e1) || !Array.isArray(e2)) return 0
    if (e1.length !== e2.length) return 0

    // Cosine similarity
    let dotProduct = 0
    for (let i = 0; i < e1.length; i++) {
      dotProduct += e1[i] * e2[i]
    }
    
    return Math.max(0, Math.min(1, dotProduct))
  }

  /**
   * Calculate relevance of a fact to a query
   */
  private calculateRelevance(query: string, fact: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/))
    const factWords = new Set(fact.toLowerCase().split(/\s+/))
    
    let overlap = 0
    queryWords.forEach(word => {
      if (factWords.has(word)) overlap++
    })
    
    return overlap / Math.max(queryWords.size, 1)
  }

  /**
   * Simple hash function
   */
  private hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }

  /**
   * Store training data from a debate session
   */
  async storeTrainingData(data: Omit<TrainingDataPoint, 'id' | 'created_at'>): Promise<boolean> {
    try {
      // Store in a separate training_data table (we'll create this)
      const { error } = await this.supabase
        .from('training_data')
        .insert({
          user_id: this.userId,
          query: data.query,
          context: data.context,
          query_type: data.query_type,
          model_responses: data.model_responses,
          consensus: data.consensus,
          user_feedback: data.user_feedback,
          metadata: data.metadata,
          quality_score: TrainingDataQuality.calculateQualityScore(data as TrainingDataPoint)
        })

      if (error) {
        console.error('Error storing training data:', error)
        return false
      }

      // Also store as episodic memory for retrieval
      await this.storeEpisodicMemory({
        query: data.query,
        agents_used: data.model_responses.map(r => r.model),
        consensus_reached: data.consensus.final_answer,
        confidence_score: data.consensus.confidence,
        disagreement_points: data.consensus.disagreements,
        total_tokens_used: data.metadata.tokens_total,
        estimated_cost: data.metadata.cost,
        response_time_ms: data.model_responses[0]?.response_time_ms || 0,
        user_feedback: data.user_feedback
      })

      return true
    } catch (err) {
      console.error('Failed to store training data:', err)
      return false
    }
  }

  /**
   * Get training dataset statistics
   */
  async getTrainingDataStats(): Promise<TrainingDatasetStats | null> {
    try {
      const { data, count } = await this.supabase
        .from('training_data')
        .select('*', { count: 'exact' })
        .eq('user_id', this.userId || '')

      if (!data) {
        return null
      }

      // Calculate stats
      const highQualitySamples = data.filter((d: any) => 
        d.quality_score >= 0.7 || d.user_feedback?.rating >= 4
      ).length

      const domainCounts: Record<string, number> = {}
      const complexityCounts = { simple: 0, medium: 0, complex: 0 }
      let totalConfidence = 0

      data.forEach((d: any) => {
        // Domain counts
        const domain = d.metadata?.domain || 'general'
        domainCounts[domain] = (domainCounts[domain] || 0) + 1

        // Complexity counts
        const complexity = d.metadata?.complexity || 0
        if (complexity < 0.3) complexityCounts.simple++
        else if (complexity < 0.7) complexityCounts.medium++
        else complexityCounts.complex++

        // Confidence sum
        totalConfidence += d.consensus?.confidence || 0
      })

      return {
        total_samples: count || 0,
        high_quality_samples: highQualitySamples,
        samples_by_domain: domainCounts,
        samples_by_complexity: complexityCounts,
        average_confidence: data.length > 0 ? totalConfidence / data.length : 0,
        ready_for_training: (count || 0) >= 1000 && highQualitySamples >= 500
      }
    } catch (err) {
      console.error('Failed to get training stats:', err)
      return null
    }
  }

  /**
   * Export training data in various formats
   */
  async exportTrainingData(format: 'jsonl' | 'csv' | 'openai' | 'anthropic'): Promise<string | null> {
    try {
      const { data } = await this.supabase
        .from('training_data')
        .select('*')
        .eq('user_id', this.userId || '')
        .gte('quality_score', 0.7) // Only high-quality data
        .limit(10000)

      if (!data || data.length === 0) {
        return null
      }

      switch (format) {
        case 'jsonl':
        case 'openai':
          return data
            .map((d: any) => JSON.stringify(TrainingDataFormatter.toOpenAIFormat(d)))
            .join('\n')

        case 'anthropic':
          return data
            .map((d: any) => JSON.stringify(TrainingDataFormatter.toAnthropicFormat(d)))
            .join('\n')

        case 'csv':
          // Simple CSV export
          const headers = ['query', 'answer', 'confidence', 'rating']
          const rows = data.map((d: any) => [
            d.query,
            d.consensus?.final_answer || '',
            d.consensus?.confidence || 0,
            d.user_feedback?.rating || 0
          ])
          return [headers, ...rows].map(row => row.join(',')).join('\n')

        default:
          return null
      }
    } catch (err) {
      console.error('Failed to export training data:', err)
      return null
    }
  }
}