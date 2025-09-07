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
import { DisagreementAnalyzer } from './disagreement-analyzer'
import { detectInformationRequests } from './information-detector'
import { enrichQueryWithWebSearch } from '@/lib/web-search/web-search-service'
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
      
      // Calculate enhanced disagreement analysis after round 1
      if (this.session.rounds[0]?.messages.length > 1) {
        console.log(`[DEBUG] Running disagreement analysis after round 1`)
        const allMessages = this.session.rounds.flatMap(r => r.messages)
        console.log(`[DEBUG] Found ${allMessages.length} messages for analysis (round 1)`)
        this.session.disagreementAnalysis = DisagreementAnalyzer.analyzeDisagreements(allMessages)
        this.session.disagreementScore = this.session.disagreementAnalysis.score
        console.log(`[DEBUG] Round 1 disagreement analysis completed:`, {
          score: this.session.disagreementScore,
          reasons: this.session.disagreementAnalysis.reasons.length,
          patterns: this.session.disagreementAnalysis.patterns.length
        })
        
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
        
        // Update disagreement analysis after each round (moved outside conditional)
        if (this.session.rounds.length >= round) {
          console.log(`[DEBUG] Running disagreement analysis after round ${round}`)
          const allMessages = this.session.rounds.flatMap(r => r.messages)
          console.log(`[DEBUG] Found ${allMessages.length} messages for analysis`)
          this.session.disagreementAnalysis = DisagreementAnalyzer.analyzeDisagreements(allMessages)
          this.session.disagreementScore = this.session.disagreementAnalysis.score
          console.log(`[DEBUG] Disagreement analysis completed:`, {
            score: this.session.disagreementScore,
            reasons: this.session.disagreementAnalysis.reasons.length,
            patterns: this.session.disagreementAnalysis.patterns.length
          })
        }
        
        // Check for abort
        if (this.abortController.signal.aborted) {
          this.session.status = 'error'
          break
        }
      }
      
      // Final disagreement analysis after all rounds (Phase 2: Chain-of-debate tracking)
      if (this.session.status !== 'error' && this.session.rounds.length > 0) {
        console.log(`[DEBUG] Running final disagreement analysis after all rounds`)
        const allMessages = this.session.rounds.flatMap(r => r.messages)
        console.log(`[DEBUG] Found ${allMessages.length} total messages for final analysis`)
        
        if (allMessages.length > 0) {
          this.session.disagreementAnalysis = DisagreementAnalyzer.analyzeDisagreements(allMessages)
          this.session.disagreementScore = this.session.disagreementAnalysis.score
          console.log(`[DEBUG] Final disagreement analysis completed:`, {
            score: this.session.disagreementScore,
            reasons: this.session.disagreementAnalysis.reasons.length,
            patterns: this.session.disagreementAnalysis.patterns.length,
            chainLength: this.session.disagreementAnalysis.chainOfDisagreement.length
          })
        }
      }
      
      // Synthesize final conclusion (only if not error status)
      console.log('[DEBUG] PRE-SYNTHESIS: Current session status:', this.session.status)
      console.log('[DEBUG] PRE-SYNTHESIS: Checking synthesis conditions...')
      if (this.session.status !== 'error' && (this.session.status === 'debating' || this.session.status === 'awaiting-round2')) {
        console.log('[DEBUG] PRE-SYNTHESIS: Conditions met, starting synthesis')
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
      } else {
        console.log('[DEBUG] PRE-SYNTHESIS: Conditions NOT met. Session status:', this.session.status)
        console.log('[DEBUG] PRE-SYNTHESIS: Skipping synthesis')
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
    const previousRoundMessages = roundNumber > 1 ? 
      this.session.rounds[roundNumber - 2]?.messages || [] : []
    
    // Order agents for proper debate flow: Analyst → Critic → Synthesizer
    const orderedAgents = [...this.request.agents].sort((a, b) => {
      const order = ['analyst', 'critic', 'synthesizer']
      const aIndex = order.indexOf(a.persona.role)
      const bIndex = order.indexOf(b.persona.role)
      return aIndex - bIndex
    })
    
    // Each agent responds sequentially, seeing previous agents' responses
    const messages: (AgentMessage | null)[] = []
    for (let i = 0; i < orderedAgents.length; i++) {
      const agentConfig = orderedAgents[i]
      
      // Combine previous round messages with current round messages from agents who already responded
      const currentRoundMessages = messages.filter((m): m is AgentMessage => m !== null)
      const allPreviousMessages = [...previousRoundMessages, ...currentRoundMessages]
      
      // Process agent with previous context
      
      const prompt = generateRoundPrompt(
        this.session.query,
        agentConfig.persona,
        roundNumber,
        allPreviousMessages
      )
      
      const message = await this.queryAgent(agentConfig, prompt, roundNumber)
      messages.push(message)
    }
    
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
      
      // Enrich query with web search if enabled (only for first round to avoid redundant searches)
      let enhancedPrompt = prompt
      if (this.request.enableWebSearch && round === 1) {
        try {
          const enriched = await enrichQueryWithWebSearch(this.session.query, {
            enabled: true,
            provider: 'duckduckgo',
            maxResults: 5,
            cache: true,
            includeInPrompt: true
          })
          
          if (enriched.searchContext) {
            enhancedPrompt = prompt + enriched.searchContext
          }
        } catch (searchError) {
          console.warn('Web search failed for agent debate:', searchError)
          // Continue without web search if it fails
        }
      }
      
      // Adjust prompt based on mode
      const fullPrompt = isLLMMode 
        ? `Please answer this query concisely and directly:\n\n${this.session.query}`
        : `${config.persona.systemPrompt}\n\n${enhancedPrompt}`
      
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
    console.log('[DEBUG] === SYNTHESIS FUNCTION STARTED ===')
    try {
      // Collect all messages from all rounds
      const allMessages = this.session.rounds.flatMap(r => r.messages)
      console.log('[DEBUG] SYNTHESIS: Collected', allMessages.length, 'messages from rounds')
      
      // Phase 2: Chain-of-debate tracking - Generate disagreement analysis
      console.log('[DEBUG] SYNTHESIS: Running disagreement analysis with', allMessages.length, 'messages')
      if (allMessages.length > 0) {
        try {
          console.log('[DEBUG] SYNTHESIS: About to call DisagreementAnalyzer.analyzeDisagreements')
          this.session.disagreementAnalysis = DisagreementAnalyzer.analyzeDisagreements(allMessages)
          this.session.disagreementScore = this.session.disagreementAnalysis.score
          console.log('[DEBUG] SYNTHESIS: Disagreement analysis completed successfully:', {
            score: this.session.disagreementScore,
            reasons: this.session.disagreementAnalysis.reasons.length,
            patterns: this.session.disagreementAnalysis.patterns.length,
            chainLength: this.session.disagreementAnalysis.chainOfDisagreement.length
          })
        } catch (error) {
          console.error('[DEBUG] SYNTHESIS: Error in disagreement analysis:', error)
        }
      } else {
        console.log('[DEBUG] SYNTHESIS: No messages found for disagreement analysis')
      }
      
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
      const synthesis = this.parseSynthesis(result.response || '')
      
      this.session.finalSynthesis = {
        content: synthesis.conclusion,
        confidence: synthesis.confidence,
        agreements: synthesis.agreements,
        disagreements: synthesis.disagreements,
        conclusion: synthesis.conclusion,
        rawResponse: result.response || '', // Store the full raw response for consistency
        tokensUsed: result.tokens.total
      }
      
      this.session.totalTokensUsed += result.tokens.total
    } catch (error) {
      console.error('Error during synthesis:', error)
      
      // Provide a fallback synthesis
      this.session.finalSynthesis = {
        content: 'Unable to generate synthesis due to an error. Please review the individual agent responses above.',
        confidence: 0,
        agreements: [],
        disagreements: [],
        conclusion: 'Unable to generate synthesis due to an error. Please review the individual agent responses above.',
        rawResponse: 'Unable to generate synthesis due to an error. Please review the individual agent responses above.',
        tokensUsed: 0
      }
    }
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
3. Overall conclusion with THE ACTUAL ANSWER TO THE USER'S QUESTION
4. Confidence level (0-100)

CRITICAL: The CONCLUSION section MUST contain the actual answer to the user's question, not a generic statement.

Format your response as:
AGREEMENTS:
- [Agreement 1]
- [Agreement 2]

DISAGREEMENTS:
- [Disagreement 1]
- [Disagreement 2]

CONCLUSION:
[THE ACTUAL ANSWER TO THE QUESTION - BE SPECIFIC]

For the query about motorcycles/scooters in Israel, the conclusion should be like:
"Based on the analysis, the top 3 options for a second-hand motorcycle/scooter up to 500cc in Israel are:
1. Yamaha TMAX 500/530 - Excellent for commuting with automatic transmission and weather protection
2. Honda PCX 150 - Fuel efficient, reliable, and widely available in the used market
3. Kymco Downtown 300i - Good balance of power and practicality with ample storage

These models offer the best combination of reliability, fuel economy, and suitability for daily commuting in Israeli conditions."

For other queries, provide similarly specific, actionable answers that directly address what was asked.

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
    const conclusionMatch = response.match(/CONCLUSION:?\s*([\s\S]*?)(?=CONFIDENCE:|INFORMATION REQUEST:|$)/i)
    if (conclusionMatch && conclusionMatch[1].trim()) {
      conclusion = conclusionMatch[1].trim()
    }
    
    // If no conclusion found with the label, try multiple patterns
    if (!conclusion) {
      
      // Pattern 1: Look for content after DISAGREEMENTS and before CONFIDENCE
      const afterDisagreementsMatch = response.match(/DISAGREEMENTS?:[\s\S]*?\n\n([\s\S]*?)(?=CONFIDENCE:|INFORMATION REQUEST:|$)/i)
      if (afterDisagreementsMatch && afterDisagreementsMatch[1]) {
        const potentialConclusion = afterDisagreementsMatch[1].trim()
        // Make sure it's not just bullet points
        if (potentialConclusion && !potentialConclusion.match(/^[-•]/)) {
          conclusion = potentialConclusion
        }
      }
      
      // Pattern 2: Look for "Based on" statements
      if (!conclusion) {
        const basedOnMatch = response.match(/Based on[^:]*?[:,]\s*([\s\S]*?)(?=\n\n|CONFIDENCE:|INFORMATION REQUEST:|$)/i)
        if (basedOnMatch) {
          conclusion = basedOnMatch[0].trim() // Include the "Based on" part
        }
      }
      
      // Pattern 3: Look for numbered recommendations (1. 2. 3. etc)
      if (!conclusion) {
        const numberedMatch = response.match(/(?:^|\n)((?:1\.\s*.+(?:\n(?:2|3|4|5)\.\s*.+)*))(?:\n|$)/m)
        if (numberedMatch) {
          conclusion = numberedMatch[1].trim()
        }
      }
      
      // Pattern 4: Look for "Recommendations" or "Top" patterns
      if (!conclusion) {
        const recommendationMatch = response.match(/(?:Recommendations?|Top \d+|Best options?):?\s*([\s\S]*?)(?=CONFIDENCE:|INFORMATION REQUEST:|$)/i)
        if (recommendationMatch && recommendationMatch[1].trim()) {
          conclusion = recommendationMatch[1].trim()
        }
      }
      
      // Pattern 5: Extract main content paragraphs (not bullet points)
      if (!conclusion) {
        const lines = response.split('\n')
        const contentLines: string[] = []
        let skipNext = false
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          
          // Skip headers and bullet points
          if (line.match(/^(AGREEMENTS?|DISAGREEMENTS?|CONFIDENCE|INFORMATION REQUEST):/i)) {
            skipNext = true
            continue
          }
          if (line.match(/^[-•]/) || line.length < 20) {
            continue
          }
          if (skipNext && line.length < 50) {
            skipNext = false
            continue
          }
          
          // This looks like content
          if (line.length > 30) {
            contentLines.push(line)
            skipNext = false
          }
        }
        
        if (contentLines.length > 0) {
          conclusion = contentLines.join('\n').trim()
        }
      }
    }
    
    // Final fallback: Create a conclusion from the synthesis
    if (!conclusion || conclusion.length < 20) {
      
      // Try to extract something meaningful from the whole response
      const cleanedResponse = response
        .replace(/AGREEMENTS?:[\s\S]*?(?=DISAGREEMENTS?:|CONCLUSION:|$)/i, '')
        .replace(/DISAGREEMENTS?:[\s\S]*?(?=CONCLUSION:|$)/i, '')
        .replace(/CONFIDENCE:\s*\d+%?/i, '')
        .replace(/INFORMATION REQUEST:[\s\S]*$/i, '')
        .trim()
      
      if (cleanedResponse.length > 50) {
        conclusion = cleanedResponse
      } else if (agreements.length > 0 || disagreements.length > 0) {
        // Generate a conclusion from agreements/disagreements
        conclusion = 'Based on the agent analysis:\n\n'
        
        if (agreements.length > 0) {
          conclusion += 'Key consensus points:\n'
          agreements.slice(0, 3).forEach(a => {
            conclusion += `• ${a}\n`
          })
        }
        
        if (disagreements.length > 0) {
          if (agreements.length > 0) conclusion += '\n'
          conclusion += 'Areas requiring further consideration:\n'
          disagreements.slice(0, 3).forEach(d => {
            conclusion += `• ${d}\n`
          })
        }
        
        conclusion += '\nFor detailed insights, review the individual agent responses above.'
      } else {
        // Absolute fallback
        conclusion = 'The agents have completed their analysis. Please review the individual responses above for their detailed perspectives on your query.'
      }
    }
    
    // Clean up the conclusion
    conclusion = conclusion
      .replace(/^CONCLUSION:?\s*/i, '') // Remove label if still present
      .replace(/\n{3,}/g, '\n\n') // Normalize newlines
      .trim()
    
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
    // Return the best FREE model for synthesis
    // Priority: Gemini 2.0 Flash > Llama 3.3 70B > Gemini 1.5 Pro > any other free model
    const providers = providerRegistry.getConfiguredProviders()
    
    // Try Google Gemini first (FREE and powerful)
    const google = providers.find(p => p.name === 'Google')
    if (google) {
      // Try Gemini 2.0 Flash Experimental first (newest and best free model)
      if (google.models.includes('gemini-2.0-flash-exp')) {
        return {
          provider: 'google',
          model: 'gemini-2.0-flash-exp',
          enabled: true,
          agentId: 'synthesizer',
          persona: this.session.agents[0]
        }
      }
      // Try Gemini 1.5 Pro
      if (google.models.includes('gemini-1.5-pro-latest')) {
        return {
          provider: 'google',
          model: 'gemini-1.5-pro-latest',
          enabled: true,
          agentId: 'synthesizer',
          persona: this.session.agents[0]
        }
      }
      // Try Gemini 2.5 Flash
      if (google.models.includes('gemini-2.5-flash')) {
        return {
          provider: 'google',
          model: 'gemini-2.5-flash',
          enabled: true,
          agentId: 'synthesizer',
          persona: this.session.agents[0]
        }
      }
    }
    
    // Try Groq next (FREE with rate limits)
    const groq = providers.find(p => p.name === 'Groq')
    if (groq) {
      // Try Llama 3.3 70B (best free Groq model)
      if (groq.models.includes('llama-3.3-70b-versatile')) {
        return {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          enabled: true,
          agentId: 'synthesizer',
          persona: this.session.agents[0]
        }
      }
      // Try any Llama model
      const llamaModel = groq.models.find(m => m.includes('llama'))
      if (llamaModel) {
        return {
          provider: 'groq',
          model: llamaModel,
          enabled: true,
          agentId: 'synthesizer',
          persona: this.session.agents[0]
        }
      }
    }
    
    // Fallback to any available model
    if (providers.length > 0 && providers[0].models.length > 0) {
      // Map provider name to lowercase format used elsewhere
      const providerNameMap: Record<string, string> = {
        'OpenAI': 'openai',
        'Anthropic': 'anthropic',
        'Google': 'google',
        'Groq': 'groq',
        'xAI': 'xai',
        'Mistral': 'mistral',
        'Cohere': 'cohere',
        'Perplexity': 'perplexity'
      }
      
      const providerKey = providerNameMap[providers[0].name] || providers[0].name.toLowerCase()
      
      return {
        provider: providerKey as any,
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