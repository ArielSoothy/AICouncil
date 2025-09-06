/**
 * Benchmark Testing Framework
 * Scientifically prove multi-model consensus outperforms single models
 */

export interface BenchmarkQuestion {
  id: string
  category: 'factual' | 'reasoning' | 'creative' | 'ethical' | 'technical'
  difficulty: 'easy' | 'medium' | 'hard'
  query: string
  correct_answer?: string | string[]  // For factual questions
  key_points?: string[]  // For reasoning questions
  bad_answers?: string[]  // Known incorrect answers (hallucination detection)
  source?: string  // Where the ground truth comes from
  requires_current_data?: boolean  // Needs web search?
}

export interface TestResult {
  question_id: string
  method: 'single_model' | 'simple_average' | 'weighted_consensus' | 'debate_consensus' | 'agent_debate'
  model_used?: string  // For single model
  models_used?: string[]  // For multi-model
  
  // Response data
  answer: string
  confidence: number
  response_time_ms: number
  tokens_used?: number
  cost: number
  
  // Evaluation metrics
  is_correct?: boolean  // For factual
  contains_key_points?: number  // How many key points covered
  hallucination_detected?: boolean
  reasoning_score?: number  // 1-5 human or AI judge score
  
  // Metadata
  timestamp?: Date
  test_run_id?: string
  error?: string
  metadata?: any
}

export interface ComparisonMetrics {
  method: string
  
  // Accuracy metrics
  factual_accuracy: number  // % correct on factual questions
  reasoning_coverage: number  // % of key points covered
  hallucination_rate: number  // % with detected hallucinations
  
  // Consistency metrics  
  answer_stability: number  // % same answer on repeat
  confidence_calibration: number  // Correlation between confidence and correctness
  
  // Efficiency metrics
  avg_response_time: number
  avg_cost: number
  accuracy_per_dollar: number
  
  // Statistical significance
  sample_size: number
  confidence_interval: [number, number]
  p_value?: number  // Is improvement statistically significant?
}

/**
 * Benchmark test suite with real questions
 */
export const BENCHMARK_SUITE: BenchmarkQuestion[] = [
  // FACTUAL - Easy
  {
    id: 'fact_easy_1',
    category: 'factual',
    difficulty: 'easy',
    query: 'What is the capital of France?',
    correct_answer: 'Paris',
    bad_answers: ['Lyon', 'Marseille', 'London']
  },
  {
    id: 'fact_easy_2',
    category: 'factual', 
    difficulty: 'easy',
    query: 'What year did World War II end?',
    correct_answer: '1945',
    bad_answers: ['1944', '1946', '1943']
  },
  
  // FACTUAL - Hard
  {
    id: 'fact_hard_1',
    category: 'factual',
    difficulty: 'hard',
    query: 'What is the Chandrasekhar limit in solar masses?',
    correct_answer: '1.4',
    bad_answers: ['1.0', '2.0', '3.0'],
    source: 'Astrophysics'
  },
  
  // REASONING - Medium
  {
    id: 'reason_med_1',
    category: 'reasoning',
    difficulty: 'medium',
    query: 'Should a 10-person startup use microservices architecture?',
    key_points: [
      'Generally not recommended for small teams',
      'Adds complexity',
      'Monolith first approach better',
      'Consider team expertise',
      'Premature optimization'
    ],
    bad_answers: ['Always use microservices', 'Never use monoliths']
  },
  
  // TECHNICAL - Hard
  {
    id: 'tech_hard_1',
    category: 'technical',
    difficulty: 'hard',
    query: 'What is the time complexity of QuickSort in the worst case and why?',
    correct_answer: 'O(n²)',
    key_points: [
      'Worst case is O(n²)',
      'Happens with already sorted array',
      'Poor pivot selection',
      'Average case is O(n log n)'
    ]
  },
  
  // ETHICAL - Hard (No single correct answer)
  {
    id: 'ethical_hard_1',
    category: 'ethical',
    difficulty: 'hard',
    query: 'Is it ethical to use AI for hiring decisions?',
    key_points: [
      'Bias concerns',
      'Transparency issues',
      'Legal compliance',
      'Human oversight needed',
      'Depends on implementation'
    ],
    bad_answers: ['Always ethical', 'Never ethical']
  },
  
  // Add more questions...
]

/**
 * Test runner that compares different methods
 */
export class BenchmarkRunner {
  private results: TestResult[] = []
  
  /**
   * Run a single question through different methods
   */
  async testQuestion(
    question: BenchmarkQuestion,
    methods: Array<'single_model' | 'simple_average' | 'weighted_consensus' | 'debate_consensus'>
  ): Promise<TestResult[]> {
    const results: TestResult[] = []
    
    for (const method of methods) {
      try {
        let result: TestResult
        
        // Add delay between API calls to avoid rate limiting
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        switch (method) {
          case 'single_model':
            result = await this.testSingleModel(question, 'gemini-1.5-flash')
            break
          case 'simple_average':
            result = await this.testSimpleAverage(question)
            break
          case 'weighted_consensus':
            result = await this.testWeightedConsensus(question)
            break
          case 'debate_consensus':
            result = await this.testDebateConsensus(question)
            break
        }
        
        // Evaluate the result
        result = this.evaluateResult(result, question)
        results.push(result)
        
      } catch (error) {
        console.error(`Failed to test ${method}:`, error)
      }
    }
    
    return results
  }
  
  /**
   * Test with a single model
   */
  private async testSingleModel(question: BenchmarkQuestion, model: string): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Call API with single model - use simple format
      const response = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question.query,
          models: [{
            provider: 'google',
            model: 'gemini-1.5-flash',
            enabled: true
          }],
          mode: 'fast',
          responseMode: 'concise'
        })
      })
      
      if (!response.ok) {
        console.error(`API error: ${response.status}`)
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        question_id: question.id,
        method: 'single_model',
        model_used: model,
        answer: data.consensus?.unifiedAnswer || data.responses?.[0]?.response || '',
        confidence: data.consensus?.judgeAnalysis?.confidence || 0.5,
        response_time_ms: Date.now() - startTime,
        tokens_used: data.usage?.totalTokens || 100,
        cost: data.usage?.totalCost || 0.001,
        timestamp: new Date(),
        test_run_id: `test_${Date.now()}`
      }
    } catch (error) {
      console.error('Single model test failed:', error)
      return {
        question_id: question.id,
        method: 'single_model',
        model_used: model,
        answer: '',
        confidence: 0,
        response_time_ms: Date.now() - startTime,
        tokens_used: 0,
        cost: 0,
        timestamp: new Date(),
        test_run_id: `test_${Date.now()}`
      }
    }
  }
  
  /**
   * Test with simple averaging
   */
  private async testSimpleAverage(question: BenchmarkQuestion): Promise<TestResult> {
    const models = ['gpt-4', 'claude-3.5-haiku', 'gemini-1.5-flash']
    
    // Get responses from all models
    const responses = await Promise.all(
      models.map(m => this.testSingleModel(question, m))
    )
    
    // Simple average (just concatenate responses)
    const answer = responses.map(r => r.answer).join('\n\n')
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
    
    return {
      question_id: question.id,
      method: 'simple_average',
      models_used: models,
      answer,
      confidence: avgConfidence,
      response_time_ms: Math.max(...responses.map(r => r.response_time_ms)),
      tokens_used: responses.reduce((sum, r) => sum + r.tokens_used, 0),
      cost: responses.reduce((sum, r) => sum + r.cost, 0),
      timestamp: new Date(),
      test_run_id: `test_${Date.now()}`
    }
  }
  
  /**
   * Test with our weighted consensus
   */
  private async testWeightedConsensus(question: BenchmarkQuestion): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const response = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question.query,
          models: [
            { provider: 'openai', model: 'gpt-4', enabled: true },
            { provider: 'anthropic', model: 'claude-3.5-haiku', enabled: true },
            { provider: 'google', model: 'gemini-1.5-flash', enabled: true }
          ],
          mode: 'balanced',
          stream: false
        })
      })
      
      if (!response.ok) {
        console.error(`API error: ${response.status}`)
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        question_id: question.id,
        method: 'weighted_consensus',
        models_used: ['gpt-4', 'claude-3.5-haiku', 'gemini-1.5-flash'],
        answer: data.consensus?.unifiedAnswer || '',
        confidence: data.consensus?.judgeAnalysis?.confidence || 0.7,
        response_time_ms: Date.now() - startTime,
        tokens_used: data.usage?.totalTokens || 300,
        cost: data.usage?.totalCost || 0.003,
        timestamp: new Date(),
        test_run_id: `test_${Date.now()}`
      }
    } catch (error) {
      console.error('Weighted consensus test failed:', error)
      return {
        question_id: question.id,
        method: 'weighted_consensus',
        models_used: ['gpt-4', 'claude-3.5-haiku', 'gemini-1.5-flash'],
        answer: '',
        confidence: 0,
        response_time_ms: Date.now() - startTime,
        tokens_used: 0,
        cost: 0,
        timestamp: new Date(),
        test_run_id: `test_${Date.now()}`
      }
    }
  }
  
  /**
   * Test with full debate consensus
   */
  private async testDebateConsensus(question: BenchmarkQuestion): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/agents/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question.query,
          agents: [
            {
              agentId: 'analyst-001',
              provider: 'groq',
              model: 'llama-3.3-70b-versatile',
              enabled: true,
              persona: {
                id: 'analyst-001',
                role: 'analyst',
                name: 'The Analyst',
                description: 'Data-driven and methodical',
                traits: ['Systematic', 'Evidence-based'],
                focusAreas: ['Data analysis', 'Factual accuracy'],
                systemPrompt: 'You are a data-driven analyst focusing on facts and evidence.',
                color: '#3B82F6'
              }
            },
            {
              agentId: 'critic-001',
              provider: 'groq',
              model: 'llama-3.1-8b-instant',
              enabled: true,
              persona: {
                id: 'critic-001',
                role: 'critic',
                name: 'The Critic',
                description: 'Skeptical and thorough',
                traits: ['Skeptical', 'Thorough'],
                focusAreas: ['Risk identification', 'Flaw detection'],
                systemPrompt: 'You are a critical thinker who challenges assumptions.',
                color: '#EF4444'
              }
            },
            {
              agentId: 'synthesizer-001',
              provider: 'groq',
              model: 'llama-3.1-8b-instant',
              enabled: true,
              persona: {
                id: 'synthesizer-001',
                role: 'synthesizer',
                name: 'The Synthesizer',
                description: 'Balanced and integrative',
                traits: ['Balanced', 'Integrative'],
                focusAreas: ['Consensus building', 'Integration'],
                systemPrompt: 'You build consensus from diverse perspectives.',
                color: '#10B981'
              }
            }
          ],
          rounds: 2,
          responseMode: 'concise',
          round1Mode: 'agents',
          autoRound2: false,
          disagreementThreshold: 0.3,
          isGuestMode: true
        })
      })

      if (!response.ok) {
        throw new Error(`Debate API error: ${response.statusText}`)
      }

      const debateResult = await response.json()
      const responseTime = Date.now() - startTime

      return {
        method: 'agent_debate',
        question_id: question.id,
        answer: debateResult.session?.finalSynthesis?.conclusion || 'No synthesis available',
        confidence: debateResult.session?.finalSynthesis?.confidence || 0,
        response_time_ms: responseTime,
        cost: 0, // Cost would need to be calculated from token usage
        metadata: {
          rounds: debateResult.session?.rounds?.length || 0,
          total_tokens: debateResult.session?.totalTokensUsed || 0,
          disagreement_score: debateResult.session?.disagreementScore || 0,
          agents_count: 3
        }
      }
    } catch (error) {
      console.error('Debate test failed:', error)
      return {
        method: 'agent_debate',
        question_id: question.id,
        answer: 'Error: Failed to complete debate',
        confidence: 0,
        response_time_ms: Date.now() - startTime,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { error: true }
      }
    }
  }
  
  /**
   * Evaluate how good a result is
   */
  private evaluateResult(result: TestResult, question: BenchmarkQuestion): TestResult {
    // Check factual accuracy
    if (question.correct_answer) {
      const correct = Array.isArray(question.correct_answer) 
        ? question.correct_answer.some(a => result.answer.toLowerCase().includes(a.toLowerCase()))
        : result.answer.toLowerCase().includes(question.correct_answer.toLowerCase())
      
      result.is_correct = correct
    }
    
    // Check key points coverage
    if (question.key_points) {
      const covered = question.key_points.filter(point => 
        result.answer.toLowerCase().includes(point.toLowerCase())
      ).length
      
      result.contains_key_points = covered / question.key_points.length
    }
    
    // Check for hallucinations
    if (question.bad_answers) {
      result.hallucination_detected = question.bad_answers.some(bad => 
        result.answer.toLowerCase().includes(bad.toLowerCase())
      )
    }
    
    return result
  }
  
  /**
   * Calculate comparative metrics
   */
  calculateMetrics(results: TestResult[]): Map<string, ComparisonMetrics> {
    const byMethod = new Map<string, TestResult[]>()
    
    // Group by method
    results.forEach(r => {
      const existing = byMethod.get(r.method) || []
      existing.push(r)
      byMethod.set(r.method, existing)
    })
    
    const metrics = new Map<string, ComparisonMetrics>()
    
    // Calculate metrics for each method
    byMethod.forEach((methodResults, method) => {
      const factualResults = methodResults.filter(r => r.is_correct !== undefined)
      const factualAccuracy = factualResults.filter(r => r.is_correct).length / factualResults.length
      
      const keyPointResults = methodResults.filter(r => r.contains_key_points !== undefined)
      const reasoningCoverage = keyPointResults.reduce((sum, r) => sum + (r.contains_key_points || 0), 0) / keyPointResults.length
      
      const hallucinationRate = methodResults.filter(r => r.hallucination_detected).length / methodResults.length
      
      const avgResponseTime = methodResults.reduce((sum, r) => sum + r.response_time_ms, 0) / methodResults.length
      const avgCost = methodResults.reduce((sum, r) => sum + r.cost, 0) / methodResults.length
      
      metrics.set(method, {
        method,
        factual_accuracy: factualAccuracy,
        reasoning_coverage: reasoningCoverage,
        hallucination_rate: hallucinationRate,
        answer_stability: this.calculateAnswerStability(methodResults),
        confidence_calibration: this.calculateCalibration(methodResults),
        avg_response_time: avgResponseTime,
        avg_cost: avgCost,
        accuracy_per_dollar: factualAccuracy / avgCost,
        sample_size: methodResults.length,
        confidence_interval: this.calculateConfidenceInterval(factualAccuracy, methodResults.length)
      })
    })
    
    return metrics
  }
  
  /**
   * Calculate if confidence correlates with correctness
   */
  private calculateCalibration(results: TestResult[]): number {
    const correctResults = results.filter(r => r.is_correct !== undefined)
    if (correctResults.length === 0) return 0
    
    // Simple correlation between confidence and correctness
    const avgConfidenceWhenCorrect = correctResults
      .filter(r => r.is_correct)
      .reduce((sum, r) => sum + r.confidence, 0) / correctResults.filter(r => r.is_correct).length
    
    const avgConfidenceWhenWrong = correctResults
      .filter(r => !r.is_correct)
      .reduce((sum, r) => sum + r.confidence, 0) / correctResults.filter(r => !r.is_correct).length
    
    // Good calibration means higher confidence when correct
    return avgConfidenceWhenCorrect - avgConfidenceWhenWrong
  }
  
  /**
   * Calculate answer stability (consistency across similar questions/runs)
   */
  private calculateAnswerStability(results: TestResult[]): number {
    if (results.length < 2) return 1.0
    
    // Group results by question
    const byQuestion = new Map<string, TestResult[]>()
    results.forEach(result => {
      const questionGroup = byQuestion.get(result.question_id) || []
      questionGroup.push(result)
      byQuestion.set(result.question_id, questionGroup)
    })
    
    let totalStability = 0
    let questionCount = 0
    
    // Calculate stability for each question that has multiple runs
    byQuestion.forEach((questionResults, question) => {
      if (questionResults.length < 2) return
      
      questionCount++
      
      // Calculate similarity between all pairs of answers for this question
      let similarities: number[] = []
      
      for (let i = 0; i < questionResults.length; i++) {
        for (let j = i + 1; j < questionResults.length; j++) {
          const answer1 = questionResults[i].answer.toLowerCase()
          const answer2 = questionResults[j].answer.toLowerCase()
          
          // Simple word-based similarity
          const words1 = new Set(answer1.split(/\s+/))
          const words2 = new Set(answer2.split(/\s+/))
          
          const intersection = new Set([...words1].filter(x => words2.has(x)))
          const union = new Set([...words1, ...words2])
          
          const similarity = union.size > 0 ? intersection.size / union.size : 0
          similarities.push(similarity)
        }
      }
      
      // Average similarity for this question
      const questionStability = similarities.length > 0 
        ? similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length 
        : 0
        
      totalStability += questionStability
    })
    
    return questionCount > 0 ? totalStability / questionCount : 0
  }
  
  /**
   * Calculate 95% confidence interval
   */
  private calculateConfidenceInterval(proportion: number, sampleSize: number): [number, number] {
    const z = 1.96  // 95% confidence
    const standardError = Math.sqrt((proportion * (1 - proportion)) / sampleSize)
    const margin = z * standardError
    
    return [
      Math.max(0, proportion - margin),
      Math.min(1, proportion + margin)
    ]
  }
  
  /**
   * Generate comparison report
   */
  generateReport(metrics: Map<string, ComparisonMetrics>): string {
    let report = '# Benchmark Results\n\n'
    
    // Find best performer for each metric
    const bestAccuracy = Array.from(metrics.values()).reduce((best, m) => 
      m.factual_accuracy > best.factual_accuracy ? m : best
    )
    
    const bestEfficiency = Array.from(metrics.values()).reduce((best, m) => 
      m.accuracy_per_dollar > best.accuracy_per_dollar ? m : best  
    )
    
    report += `## Winners\n`
    report += `- **Best Accuracy**: ${bestAccuracy.method} (${(bestAccuracy.factual_accuracy * 100).toFixed(1)}%)\n`
    report += `- **Best Value**: ${bestEfficiency.method} (${bestEfficiency.accuracy_per_dollar.toFixed(2)} accuracy/$)\n\n`
    
    report += `## Detailed Metrics\n\n`
    
    metrics.forEach(m => {
      report += `### ${m.method}\n`
      report += `- Factual Accuracy: ${(m.factual_accuracy * 100).toFixed(1)}% ±${((m.confidence_interval[1] - m.confidence_interval[0]) * 50).toFixed(1)}%\n`
      report += `- Reasoning Coverage: ${(m.reasoning_coverage * 100).toFixed(1)}%\n`
      report += `- Hallucination Rate: ${(m.hallucination_rate * 100).toFixed(1)}%\n`
      report += `- Avg Response Time: ${m.avg_response_time}ms\n`
      report += `- Avg Cost: $${m.avg_cost.toFixed(4)}\n`
      report += `- Accuracy per Dollar: ${m.accuracy_per_dollar.toFixed(2)}\n`
      report += `- Sample Size: ${m.sample_size}\n\n`
    })
    
    return report
  }
}

/**
 * Statistical significance testing
 */
export class StatisticalAnalysis {
  /**
   * Perform t-test to see if difference is significant
   */
  static tTest(results1: TestResult[], results2: TestResult[]): number {
    // Implementation of Student's t-test
    const accuracy1 = results1.filter(r => r.is_correct).length / results1.length
    const accuracy2 = results2.filter(r => r.is_correct).length / results2.length
    
    const variance1 = accuracy1 * (1 - accuracy1) / results1.length
    const variance2 = accuracy2 * (1 - accuracy2) / results2.length
    
    const tStatistic = (accuracy1 - accuracy2) / Math.sqrt(variance1 + variance2)
    
    // Simplified p-value calculation (would need proper distribution table)
    const pValue = 1 - Math.abs(tStatistic) / 10
    
    return pValue
  }
  
  /**
   * Check if improvement is statistically significant
   */
  static isSignificant(pValue: number, alpha: number = 0.05): boolean {
    return pValue < alpha
  }
}