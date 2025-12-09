/**
 * Training Data Collection System
 * Collects and formats data for model training from user interactions
 * This creates our proprietary dataset - a key competitive moat
 */

export interface TrainingDataPoint {
  id: string
  created_at: Date
  
  // Input
  query: string
  context?: string // Any additional context provided
  query_type?: string // Classification of query type
  
  // Multiple model outputs (for comparison training)
  model_responses: {
    model: string
    response: string
    confidence?: number
    tokens_used: number
    response_time_ms: number
  }[]
  
  // Consensus output (ground truth)
  consensus: {
    final_answer: string
    confidence: number
    agreements: string[]
    disagreements: string[]
    synthesis_method: string
  }
  
  // Quality signals
  user_feedback?: {
    helpful: boolean
    rating?: number // 1-5
    preferred_response?: string // Which model's response user preferred
    corrections?: string // User's corrections to the answer
  }
  
  // Metadata for filtering
  metadata: {
    domain?: string // legal, medical, technical, etc.
    complexity: number // 0-1 score
    tokens_total: number
    cost: number
    debate_rounds: number
    models_agreed: boolean
    required_follow_up: boolean
  }
}

export interface TrainingDatasetStats {
  total_samples: number
  high_quality_samples: number // rating >= 4 or helpful = true
  samples_by_domain: Record<string, number>
  samples_by_complexity: {
    simple: number // complexity < 0.3
    medium: number // 0.3 <= complexity < 0.7
    complex: number // complexity >= 0.7
  }
  average_confidence: number
  ready_for_training: boolean // true if we have enough high-quality samples
}

export interface ModelTrainingFormat {
  // Format for fine-tuning (e.g., OpenAI fine-tuning format)
  messages: {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[]
  
  // Optional: Include multiple completions for preference learning
  completions?: {
    model: string
    content: string
    rating?: number
  }[]
}

/**
 * Convert our training data to various model training formats
 */
export class TrainingDataFormatter {
  /**
   * Format for OpenAI fine-tuning
   */
  static toOpenAIFormat(data: TrainingDataPoint): ModelTrainingFormat {
    return {
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that provides accurate, consensus-based answers by considering multiple perspectives.'
        },
        {
          role: 'user',
          content: data.query
        },
        {
          role: 'assistant',
          content: data.consensus.final_answer
        }
      ]
    }
  }

  /**
   * Format for Anthropic Constitutional AI training
   */
  static toAnthropicFormat(data: TrainingDataPoint): any {
    return {
      prompt: `\n\nHuman: ${data.query}\n\nAssistant:`,
      completion: ` ${data.consensus.final_answer}`,
      metadata: {
        confidence: data.consensus.confidence,
        user_rating: data.user_feedback?.rating
      }
    }
  }

  /**
   * Format for preference learning (RLHF)
   */
  static toPreferenceFormat(data: TrainingDataPoint): any {
    if (!data.user_feedback?.preferred_response) {
      return null
    }

    const preferred = data.model_responses.find(
      r => r.model === data.user_feedback?.preferred_response
    )
    
    const rejected = data.model_responses.find(
      r => r.model !== data.user_feedback?.preferred_response
    )

    if (!preferred || !rejected) return null

    return {
      prompt: data.query,
      chosen: preferred.response,
      rejected: rejected.response,
      chosen_model: preferred.model,
      rejected_model: rejected.model
    }
  }

  /**
   * Format for multi-task learning (includes reasoning)
   */
  static toReasoningFormat(data: TrainingDataPoint): any {
    const reasoning = `
Analysis of responses:
- Agreements: ${data.consensus.agreements.join('; ')}
- Disagreements: ${data.consensus.disagreements.join('; ')}
- Synthesis approach: ${data.consensus.synthesis_method}
- Confidence: ${(data.consensus.confidence * 100).toFixed(0)}%
    `.trim()

    return {
      instruction: data.query,
      reasoning: reasoning,
      output: data.consensus.final_answer,
      metadata: data.metadata
    }
  }

  /**
   * Create augmented training samples with variations
   */
  static augmentTrainingData(data: TrainingDataPoint): TrainingDataPoint[] {
    const augmented: TrainingDataPoint[] = [data]

    // Create variation with context
    if (data.metadata.complexity > 0.5) {
      augmented.push({
        ...data,
        id: `${data.id}_contextual`,
        query: `Given the following context, ${data.query.toLowerCase()}`,
        context: 'Previous discussion established key points.'
      })
    }

    // Create concise version
    augmented.push({
      ...data,
      id: `${data.id}_concise`,
      query: `${data.query} (Please be concise)`,
      consensus: {
        ...data.consensus,
        final_answer: data.consensus.final_answer.split('.')[0] + '.'
      }
    })

    return augmented
  }
}

/**
 * Training data quality assessor
 */
export class TrainingDataQuality {
  /**
   * Assess if a data point is high quality for training
   */
  static isHighQuality(data: TrainingDataPoint): boolean {
    // High user rating
    if (data.user_feedback?.rating && data.user_feedback.rating >= 4) {
      return true
    }

    // High confidence consensus
    if (data.consensus.confidence >= 0.8) {
      return true
    }

    // User marked as helpful
    if (data.user_feedback?.helpful) {
      return true
    }

    // Models mostly agreed (low disagreement is good training signal)
    if (data.metadata.models_agreed && data.consensus.confidence >= 0.7) {
      return true
    }

    return false
  }

  /**
   * Calculate quality score (0-1)
   */
  static calculateQualityScore(data: TrainingDataPoint): number {
    let score = 0
    
    // User feedback weight: 40%
    if (data.user_feedback) {
      if (data.user_feedback.helpful) score += 0.2
      if (data.user_feedback.rating) {
        score += (data.user_feedback.rating / 5) * 0.2
      }
    }

    // Consensus confidence weight: 30%
    score += data.consensus.confidence * 0.3

    // Model agreement weight: 20%
    if (data.metadata.models_agreed) score += 0.2

    // Complexity handling weight: 10%
    // Complex queries that got good results are valuable
    if (data.metadata.complexity > 0.7 && data.consensus.confidence > 0.7) {
      score += 0.1
    }

    return Math.min(1, score)
  }

  /**
   * Check if dataset is ready for training
   */
  static isDatasetReady(stats: TrainingDatasetStats): {
    ready: boolean
    reasons: string[]
  } {
    const reasons: string[] = []
    
    if (stats.total_samples < 1000) {
      reasons.push(`Need more samples: ${stats.total_samples}/1000`)
    }

    if (stats.high_quality_samples < 500) {
      reasons.push(`Need more high-quality samples: ${stats.high_quality_samples}/500`)
    }

    const domainCoverage = Object.keys(stats.samples_by_domain).length
    if (domainCoverage < 5) {
      reasons.push(`Need more domain diversity: ${domainCoverage}/5 domains`)
    }

    if (stats.average_confidence < 0.7) {
      reasons.push(`Average confidence too low: ${(stats.average_confidence * 100).toFixed(0)}%`)
    }

    return {
      ready: reasons.length === 0,
      reasons
    }
  }
}

/**
 * Export formats for different training platforms
 */
export class TrainingDataExporter {
  /**
   * Export to JSONL for OpenAI fine-tuning
   */
  static toJSONL(data: TrainingDataPoint[]): string {
    return data
      .filter(d => TrainingDataQuality.isHighQuality(d))
      .map(d => JSON.stringify(TrainingDataFormatter.toOpenAIFormat(d)))
      .join('\n')
  }

  /**
   * Export to CSV for analysis
   */
  static toCSV(data: TrainingDataPoint[]): string {
    const headers = [
      'id',
      'query',
      'consensus_answer',
      'confidence',
      'user_rating',
      'complexity',
      'domain',
      'models_agreed'
    ].join(',')

    const rows = data.map(d => [
      d.id,
      `"${d.query.replace(/"/g, '""')}"`,
      `"${d.consensus.final_answer.replace(/"/g, '""')}"`,
      d.consensus.confidence,
      d.user_feedback?.rating || '',
      d.metadata.complexity,
      d.metadata.domain || '',
      d.metadata.models_agreed
    ].join(','))

    return [headers, ...rows].join('\n')
  }

  /**
   * Export to Parquet for efficient storage (structure only)
   */
  static toParquetSchema(): any {
    return {
      schema: {
        id: 'UTF8',
        query: 'UTF8',
        consensus_answer: 'UTF8',
        confidence: 'FLOAT',
        user_rating: 'INT32',
        complexity: 'FLOAT',
        domain: 'UTF8',
        models_agreed: 'BOOL',
        created_at: 'TIMESTAMP_MILLIS'
      }
    }
  }
}