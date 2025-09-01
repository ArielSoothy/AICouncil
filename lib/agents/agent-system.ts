import { 
  AgentConfig, 
  AgentMessage, 
  DebateRound, 
  DebateSession, 
  DebateRequest,
  DEBATE_CONFIG 
} from './types'
import { providerRegistry } from '@/lib/ai-providers'
import { generateDebatePrompt, generateRoundPrompt } from './debate-prompts'
import { calculateDisagreementScore } from './cost-calculator'
import { detectInformationRequests } from './information-detector'
import { v4 as uuidv4 } from 'uuid'

export class AgentDebateOrchestrator {
  private session: DebateSession
  private abortController: AbortController
  private request: DebateRequest
  
  constructor(request: DebateRequest) {
    this.request = request
    this.session = this.initializeSession(request)
    this.abortController = new AbortController()
  }
  
  private initializeSession(request: DebateRequest): DebateSession {
    return {
      id: uuidv4(),
      query: request.query,
      agents: request.agents.map(a => a.persona),
      rounds: [],
      round1Mode: request.round1Mode || 'agents',
      totalTokensUsed: 0,
      estimatedCost: 0,
      costBreakdown: {
        round1: 0,
        round2: 0,
        synthesis: 0
      },
      startTime: new Date(),
      status: 'initializing'
    }
  }
  
  async runDebate(): Promise<DebateSession> {
    try {
      this.session.status = 'debating'
      const plannedRounds = this.request.rounds || DEBATE_CONFIG.defaultRounds
      
      // Run first round
      await this.runRound(1)
      
      // Calculate disagreement after round 1
      if (this.session.rounds[0]?.messages.length > 1) {
        this.session.disagreementScore = calculateDisagreementScore(this.session.rounds[0].messages)
        
        // Check if we should pause for user decision
        if (this.request.autoRound2 === false && 
            plannedRounds === 1 && 
            this.session.disagreementScore > (this.request.disagreementThreshold || 0.6)) {
          this.session.status = 'awaiting-round2'
          this.session.waitingForRound2Decision = true
          return this.session
        }
        
        // Auto-trigger round 2 if conditions met
        if (this.request.autoRound2 && 
            this.session.disagreementScore > (this.request.disagreementThreshold || 0.6)) {
          await this.runRound(2)
        }
      }
      
      // Run additional rounds if specified
      for (let round = 2; round <= plannedRounds; round++) {
        if (this.session.rounds.length < round) {
          await this.runRound(round)
        }
        
        // Check for abort
        if (this.abortController.signal.aborted) {
          this.session.status = 'error'
          break
        }
      }
      
      // Synthesize final conclusion
      if (this.session.status === 'debating' || this.session.status === 'awaiting-round2') {
        this.session.status = 'synthesizing'
        await this.synthesizeDebate()
        
        // Detect if agents requested more information
        const allMessages = this.session.rounds.flatMap(r => r.messages)
        const infoRequest = detectInformationRequests(allMessages)
        if (infoRequest.detected) {
          this.session.informationRequest = {
            ...infoRequest,
            followUpPrompt: `For better recommendations, consider providing:\n${infoRequest.suggestedQuestions.join('\n')}`
          }
        }
        
        this.session.status = 'completed'
      }
      
      this.session.endTime = new Date()
      return this.session
      
    } catch (error) {
      this.session.status = 'error'
      this.session.endTime = new Date()
      throw error
    }
  }
  
  private async runRound(roundNumber: number): Promise<void> {
    const round: DebateRound = {
      roundNumber,
      messages: [],
      startTime: new Date()
    }
    
    // Get previous round messages for context
    const previousMessages = roundNumber > 1 ? 
      this.session.rounds[roundNumber - 2]?.messages || [] : []
    
    // Each agent responds in parallel
    const agentPromises = this.request.agents.map(async (agentConfig) => {
      const prompt = generateRoundPrompt(
        this.session.query,
        agentConfig.persona,
        roundNumber,
        previousMessages
      )
      
      return this.queryAgent(agentConfig, prompt, roundNumber)
    })
    
    const messages = await Promise.all(agentPromises)
    round.messages = messages.filter((m): m is AgentMessage => m !== null)
    round.endTime = new Date()
    
    // Update token usage and cost tracking
    const roundTokens = round.messages.reduce((sum, m) => sum + m.tokensUsed, 0)
    this.session.totalTokensUsed += roundTokens
    
    // Track cost per round
    const roundCost = this.calculateRoundCost(round.messages)
    if (roundNumber === 1) {
      this.session.costBreakdown!.round1 = roundCost
    } else if (roundNumber === 2) {
      this.session.costBreakdown!.round2 = roundCost
    }
    this.session.estimatedCost += roundCost
    
    this.session.rounds.push(round)
  }
  
  private async queryAgent(
    config: AgentConfig, 
    prompt: string, 
    round: number
  ): Promise<AgentMessage | null> {
    try {
      const provider = providerRegistry.getProvider(config.provider)
      if (!provider) {
        throw new Error(`Provider ${config.provider} not found`)
      }
      
      // Use LLM mode for round 1 if specified
      const isLLMMode = round === 1 && this.request.round1Mode === 'llm'
      
      // Adjust prompt based on mode
      const fullPrompt = isLLMMode 
        ? `Please answer this query concisely and directly:\n\n${this.session.query}`
        : `${config.persona.systemPrompt}\n\n${prompt}`
      
      const result = await provider.query(fullPrompt, {
        ...config,
        maxTokens: isLLMMode ? 300 : DEBATE_CONFIG.tokenLimits.perResponse
      })
      
      // Parse response for key points
      const keyPoints = this.extractKeyPoints(result.response)
      const evidence = this.extractEvidence(result.response)
      const challenges = round > 1 ? this.extractChallenges(result.response) : []
      
      return {
        agentId: config.agentId,
        role: config.persona.role,
        round,
        content: result.response,
        timestamp: new Date(),
        tokensUsed: result.tokens.total,
        model: config.model,
        confidence: result.confidence,
        keyPoints,
        evidence,
        challenges
      }
    } catch (error) {
      console.error(`Agent ${config.agentId} query failed:`, error)
      return null
    }
  }
  
  private async synthesizeDebate(): Promise<void> {
    // Collect all messages from all rounds
    const allMessages = this.session.rounds.flatMap(r => r.messages)
    
    // Use the most capable available model for synthesis
    const synthesisModel = this.getBestAvailableModel()
    if (!synthesisModel) {
      throw new Error('No model available for synthesis')
    }
    
    const provider = providerRegistry.getProvider(synthesisModel.provider)
    if (!provider) {
      throw new Error('Provider not available for synthesis')
    }
    
    const synthesisPrompt = this.generateSynthesisPrompt(allMessages)
    
    const result = await provider.query(synthesisPrompt, {
      ...synthesisModel,
      maxTokens: 800
    })
    
    // Parse synthesis
    const synthesis = this.parseSynthesis(result.response)
    
    this.session.finalSynthesis = {
      content: synthesis.conclusion,
      confidence: synthesis.confidence,
      agreements: synthesis.agreements,
      disagreements: synthesis.disagreements,
      conclusion: synthesis.conclusion,
      tokensUsed: result.tokens.total
    }
    
    this.session.totalTokensUsed += result.tokens.total
  }
  
  private generateSynthesisPrompt(messages: AgentMessage[]): string {
    const roundsSummary = this.session.rounds.map(round => {
      const roundMessages = round.messages.map(m => 
        `${m.role.toUpperCase()}: ${m.content}`
      ).join('\n\n')
      return `Round ${round.roundNumber}:\n${roundMessages}`
    }).join('\n\n---\n\n')
    
    return `You are the Chief Judge synthesizing a multi-agent debate.

Query: ${this.session.query}

Debate Summary:
${roundsSummary}

IMPORTANT INSTRUCTIONS:
- Even if agents request more information, you MUST provide a best-effort answer based on available data
- If information is incomplete, provide qualified recommendations with appropriate disclaimers
- For product/service queries, provide at least 3 specific options with brief reasoning
- Never just say "need more information" - always give actionable insights

Please provide a final synthesis with:
1. Key agreements between agents
2. Main disagreements or tensions
3. Overall conclusion with SPECIFIC RECOMMENDATIONS
4. Confidence level (0-100)

For product/service recommendations, include:
- Top 3 specific options (even if general)
- Brief reason for each (1-2 sentences)
- Clear disclaimers about what additional info would improve the recommendation

Format your response as:
AGREEMENTS:
- [Agreement 1]
- [Agreement 2]

DISAGREEMENTS:
- [Disagreement 1]
- [Disagreement 2]

CONCLUSION:
[Provide specific, actionable recommendations even with limited info. For products: list top 3 with reasons]

Example for products:
Based on available data, here are 3 top options:
1. [Product Name] - [Brief reason why it's good]
2. [Product Name] - [Brief reason why it's good]
3. [Product Name] - [Brief reason why it's good]

Note: These recommendations would be more precise with [specific missing info].

CONFIDENCE: [0-100]`
  }
  
  private parseSynthesis(response: string): {
    agreements: string[]
    disagreements: string[]
    conclusion: string
    confidence: number
  } {
    const agreements: string[] = []
    const disagreements: string[] = []
    let conclusion = ''
    let confidence = 70
    
    // Parse agreements
    const agreementsMatch = response.match(/AGREEMENTS?:?\s*([\s\S]*?)(?=DISAGREEMENTS?:|$)/i)
    if (agreementsMatch) {
      const items = agreementsMatch[1].match(/[-•]\s*(.+)/g) || []
      agreements.push(...items.map(item => item.replace(/[-•]\s*/, '').trim()))
    }
    
    // Parse disagreements
    const disagreementsMatch = response.match(/DISAGREEMENTS?:?\s*([\s\S]*?)(?=CONCLUSION:|$)/i)
    if (disagreementsMatch) {
      const items = disagreementsMatch[1].match(/[-•]\s*(.+)/g) || []
      disagreements.push(...items.map(item => item.replace(/[-•]\s*/, '').trim()))
    }
    
    // Parse conclusion - be more generous with the match
    const conclusionMatch = response.match(/CONCLUSION:?\s*([\s\S]*?)(?=CONFIDENCE:|$)/i)
    if (conclusionMatch) {
      conclusion = conclusionMatch[1].trim()
    }
    
    // If no conclusion found with the label, try to extract it differently
    if (!conclusion) {
      // Look for the section after disagreements and before confidence
      const afterDisagreements = response.split(/DISAGREEMENTS?:/i)[1]
      if (afterDisagreements) {
        const beforeConfidence = afterDisagreements.split(/CONFIDENCE:/i)[0]
        if (beforeConfidence) {
          // Remove any bullet points that were part of disagreements
          const lines = beforeConfidence.split('\n').filter(line => 
            !line.trim().startsWith('-') && 
            !line.trim().startsWith('•') &&
            line.trim().length > 0
          )
          if (lines.length > 0) {
            conclusion = lines.join('\n').trim()
          }
        }
      }
    }
    
    // If still no conclusion, try to find recommendations or "Based on" patterns
    if (!conclusion) {
      const recommendationMatch = response.match(/(?:Based on|Recommendations?:|Top \d+|Best options?:)([\s\S]*?)(?=CONFIDENCE:|$)/i)
      if (recommendationMatch) {
        conclusion = recommendationMatch[1].trim()
      }
    }
    
    // Last resort: use everything after disagreements that's not confidence
    if (!conclusion && response.includes('DISAGREEMENT')) {
      const parts = response.split(/DISAGREEMENTS?:/i)
      if (parts[1]) {
        const content = parts[1].split(/CONFIDENCE:/i)[0]
        // Clean up the content
        conclusion = content
          .split('\n')
          .filter(line => line.trim().length > 0)
          .join('\n')
          .trim()
      }
    }
    
    // Parse confidence
    const confidenceMatch = response.match(/CONFIDENCE:?\s*(\d+)/i)
    if (confidenceMatch) {
      confidence = Math.min(100, Math.max(0, parseInt(confidenceMatch[1])))
    }
    
    return { agreements, disagreements, conclusion, confidence }
  }
  
  private extractKeyPoints(response: string): string[] {
    const points: string[] = []
    
    // Look for numbered points
    const numberedPoints = response.match(/\d+\.\s+(.+)/g) || []
    points.push(...numberedPoints.map(p => p.replace(/\d+\.\s+/, '').trim()))
    
    // Look for bullet points
    const bulletPoints = response.match(/[-•]\s+(.+)/g) || []
    points.push(...bulletPoints.map(p => p.replace(/[-•]\s+/, '').trim()))
    
    return points.slice(0, 5) // Limit to 5 key points
  }
  
  private extractEvidence(response: string): string[] {
    const evidence: string[] = []
    
    // Look for phrases indicating evidence
    const evidencePatterns = [
      /(?:studies show|research indicates|data suggests|evidence shows|according to)\s+(.+?)(?:\.|,|;)/gi,
      /(?:based on|as shown by|demonstrated by)\s+(.+?)(?:\.|,|;)/gi,
      /(?:\d+%|\d+ percent)\s+(.+?)(?:\.|,|;)/gi
    ]
    
    evidencePatterns.forEach(pattern => {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          evidence.push(match[0].trim())
        }
      }
    })
    
    return evidence.slice(0, 3) // Limit to 3 evidence points
  }
  
  private extractChallenges(response: string): string[] {
    const challenges: string[] = []
    
    // Look for challenging language
    const challengePatterns = [
      /(?:however|but|although|while|contrary to)\s+(.+?)(?:\.|,|;)/gi,
      /(?:disagree|challenge|question|dispute)\s+(.+?)(?:\.|,|;)/gi,
      /(?:flaw|issue|problem|concern)\s+(.+?)(?:\.|,|;)/gi
    ]
    
    challengePatterns.forEach(pattern => {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[0]) {
          challenges.push(match[0].trim())
        }
      }
    })
    
    return challenges.slice(0, 3) // Limit to 3 challenges
  }
  
  private getAgentConfig(agentId: string): AgentConfig | null {
    // Find the agent config from the request
    const config = this.request.agents.find(a => a.agentId === agentId)
    return config || null
  }
  
  private getBestAvailableModel(): AgentConfig | null {
    // Return the best available model for synthesis
    // Priority: Claude Opus 4 > GPT-4o > Claude Sonnet > GPT-4 > Others
    const providers = providerRegistry.getConfiguredProviders()
    
    // Try Claude Opus 4 first
    const anthropic = providers.find(p => p.name === 'Anthropic')
    if (anthropic && anthropic.models.includes('claude-opus-4-20250514')) {
      return {
        provider: 'anthropic',
        model: 'claude-opus-4-20250514',
        enabled: true,
        agentId: 'synthesizer',
        persona: this.session.agents[0]
      }
    }
    
    // Try GPT-4o
    const openai = providers.find(p => p.name === 'OpenAI')
    if (openai && openai.models.includes('gpt-4o')) {
      return {
        provider: 'openai',
        model: 'gpt-4o',
        enabled: true,
        agentId: 'synthesizer',
        persona: this.session.agents[0]
      }
    }
    
    // Fallback to any available model
    if (providers.length > 0 && providers[0].models.length > 0) {
      return {
        provider: providers[0].name.toLowerCase(),
        model: providers[0].models[0],
        enabled: true,
        agentId: 'synthesizer',
        persona: this.session.agents[0]
      }
    }
    
    return null
  }
  
  private calculateRoundCost(messages: AgentMessage[]): number {
    // Import MODEL_COSTS_PER_1K from model metadata
    const MODEL_COSTS: any = {
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4o': { input: 0.01, output: 0.03 },
      'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      // Add more models as needed
    }
    
    let totalCost = 0
    messages.forEach(msg => {
      const costs = MODEL_COSTS[msg.model] || { input: 0.001, output: 0.003 }
      // Rough estimate: 70% input, 30% output of total tokens
      const inputTokens = msg.tokensUsed * 0.7
      const outputTokens = msg.tokensUsed * 0.3
      totalCost += (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output)
    })
    
    return totalCost
  }
  
  abort(): void {
    this.abortController.abort()
  }
  
  getSession(): DebateSession {
    return this.session
  }
}