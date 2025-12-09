/**
 * Memory System Types
 * Three types of memory for AI agents:
 * 1. Episodic - Past events and interactions
 * 2. Semantic - Facts and knowledge
 * 3. Procedural - Rules and behaviors
 */

export interface BaseMemory {
  id: string
  created_at: Date
  updated_at: Date
  user_id?: string | null
  metadata?: Record<string, any>
}

/**
 * Episodic Memory - Stores past debates and interactions
 * Used to recall how similar problems were solved before
 */
export interface EpisodicMemory extends BaseMemory {
  type: 'episodic'
  query: string
  query_embedding?: number[] // Vector embedding for similarity search
  agents_used: string[] // Which models/agents were used
  consensus_reached: string
  confidence_score: number
  disagreement_points?: string[]
  resolution_method?: string
  total_tokens_used: number
  estimated_cost: number
  response_time_ms: number
  follow_up_questions?: string[]
  user_feedback?: {
    helpful: boolean
    rating?: number
    comments?: string
  }
}

/**
 * Semantic Memory - Stores facts and domain knowledge
 * Used to remember user preferences and learned information
 */
export interface SemanticMemory extends BaseMemory {
  type: 'semantic'
  fact: string
  fact_embedding?: number[] // Vector embedding for similarity search
  category: 'user_preference' | 'domain_knowledge' | 'learned_fact'
  source: string // Where this fact came from
  confidence: number // How confident we are in this fact
  validations: number // How many times this fact has been validated
  last_used?: Date
  contexts: string[] // In what contexts this fact applies
}

/**
 * Procedural Memory - Stores rules and resolution patterns
 * Used to remember how to handle specific types of queries
 */
export interface ProceduralMemory extends BaseMemory {
  type: 'procedural'
  rule_name: string
  condition: string // When to apply this rule
  action: string // What to do
  success_rate: number // How often this rule works
  usage_count: number
  query_patterns: string[] // Example queries this rule applies to
  agent_configuration?: {
    preferred_models?: string[]
    debate_rounds?: number
    response_mode?: 'concise' | 'normal' | 'detailed'
  }
}

export type Memory = EpisodicMemory | SemanticMemory | ProceduralMemory

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  query?: string
  type?: Memory['type']
  user_id?: string | null
  limit?: number
  threshold?: number // Similarity threshold for vector search
  category?: string
  timeRange?: {
    start: Date
    end: Date
  }
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  total_memories: number
  episodic_count: number
  semantic_count: number
  procedural_count: number
  avg_confidence: number
  most_used_models: string[]
  common_query_patterns: string[]
  improvement_rate: number // How much memory improves accuracy
}

/**
 * Memory retrieval result
 */
export interface MemoryRetrievalResult<T extends Memory = Memory> {
  memory: T
  relevance_score: number
  reason: string // Why this memory was retrieved
}

/**
 * Memory impact on debate
 */
export interface MemoryImpact {
  memories_used: number
  accuracy_boost: number // Percentage improvement
  cost_reduction: number // Percentage cost saved
  time_saved_ms: number
  confidence_increase: number
}