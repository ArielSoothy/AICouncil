import { AgentMessage } from './types'

export interface DisagreementAnalysis {
  score: number
  reasons: DisagreementReason[]
  patterns: DisagreementPattern[]
  severity: 'low' | 'medium' | 'high'
  chainOfDisagreement: ChainLink[]
}

export interface DisagreementReason {
  type: 'factual' | 'methodological' | 'interpretive' | 'priority' | 'evidence' | 'assumption'
  description: string
  confidence: number
  agentsInvolved: string[]
  evidence: string[]
}

export interface DisagreementPattern {
  pattern: 'binary_opposition' | 'gradual_divergence' | 'evidence_conflict' | 'assumption_mismatch' | 'priority_difference'
  strength: number
  description: string
}

export interface ChainLink {
  round: number
  agent: string
  position: string
  reasoning: string
  responseToAgent?: string
  disagreementType: string
}

/**
 * Enhanced disagreement analysis for Phase 2: Chain-of-debate tracking
 * Tracks WHY models disagree, not just that they disagree
 */
export class DisagreementAnalyzer {
  
  /**
   * Analyze disagreements across all messages and rounds
   */
  static analyzeDisagreements(messages: AgentMessage[]): DisagreementAnalysis {
    console.log('[DEBUG] DisagreementAnalyzer.analyzeDisagreements() called with', messages.length, 'messages')
    
    const reasons = this.identifyDisagreementReasons(messages)
    console.log('[DEBUG] Identified', reasons.length, 'disagreement reasons')
    
    const patterns = this.identifyDisagreementPatterns(messages)
    console.log('[DEBUG] Identified', patterns.length, 'disagreement patterns')
    
    const chain = this.buildChainOfDisagreement(messages)
    console.log('[DEBUG] Built chain of disagreement with', chain.length, 'links')
    
    const score = this.calculateEnhancedDisagreementScore(messages, reasons, patterns)
    console.log('[DEBUG] Calculated disagreement score:', score)
    
    const severity = this.determineSeverity(score, reasons, patterns)
    console.log('[DEBUG] Determined severity:', severity)
    
    return {
      score,
      reasons,
      patterns,
      severity,
      chainOfDisagreement: chain
    }
  }
  
  /**
   * Identify specific reasons why agents disagree
   */
  private static identifyDisagreementReasons(messages: AgentMessage[]): DisagreementReason[] {
    const reasons: DisagreementReason[] = []
    
    // Group messages by round for comparison
    const messagesByRound = this.groupMessagesByRound(messages)
    
    for (const [round, roundMessages] of messagesByRound.entries()) {
      if (roundMessages.length < 2) continue
      
      // Factual disagreements - conflicting numbers, dates, names
      const factualConflicts = this.detectFactualConflicts(roundMessages)
      reasons.push(...factualConflicts)
      
      // Methodological disagreements - different approaches
      const methodConflicts = this.detectMethodologicalConflicts(roundMessages)
      reasons.push(...methodConflicts)
      
      // Evidence disagreements - citing different sources
      const evidenceConflicts = this.detectEvidenceConflicts(roundMessages)
      reasons.push(...evidenceConflicts)
      
      // Priority disagreements - different importance weighting  
      const priorityConflicts = this.detectPriorityConflicts(roundMessages)
      reasons.push(...priorityConflicts)
      
      // Assumption disagreements - different underlying assumptions
      const assumptionConflicts = this.detectAssumptionConflicts(roundMessages)
      reasons.push(...assumptionConflicts)
      
      // Interpretive disagreements - different interpretation of same data
      const interpretiveConflicts = this.detectInterpretiveConflicts(roundMessages)
      reasons.push(...interpretiveConflicts)
    }
    
    return reasons.filter(r => r.confidence > 0.3) // Filter low-confidence detections
  }
  
  /**
   * Identify patterns of disagreement across rounds
   */
  private static identifyDisagreementPatterns(messages: AgentMessage[]): DisagreementPattern[] {
    const patterns: DisagreementPattern[] = []
    
    // Binary opposition pattern - clear yes/no, agree/disagree splits
    const binaryPattern = this.detectBinaryOpposition(messages)
    if (binaryPattern) patterns.push(binaryPattern)
    
    // Gradual divergence pattern - agents start similar then diverge
    const divergencePattern = this.detectGradualDivergence(messages)
    if (divergencePattern) patterns.push(divergencePattern)
    
    // Evidence conflict pattern - agents cite contradicting evidence
    const evidencePattern = this.detectEvidenceConflictPattern(messages)
    if (evidencePattern) patterns.push(evidencePattern)
    
    // Assumption mismatch pattern - different starting assumptions
    const assumptionPattern = this.detectAssumptionMismatch(messages)
    if (assumptionPattern) patterns.push(assumptionPattern)
    
    // Priority difference pattern - same facts, different priorities
    const priorityPattern = this.detectPriorityDifference(messages)
    if (priorityPattern) patterns.push(priorityPattern)
    
    return patterns
  }
  
  /**
   * Build chain of disagreement showing how positions evolve
   */
  private static buildChainOfDisagreement(messages: AgentMessage[]): ChainLink[] {
    const chain: ChainLink[] = []
    const messagesByRound = this.groupMessagesByRound(messages)
    
    for (const [round, roundMessages] of messagesByRound.entries()) {
      for (const message of roundMessages) {
        // Extract position and reasoning
        const position = this.extractPosition(message.content)
        const reasoning = this.extractReasoning(message.content)
        
        // Identify what/who they're responding to
        const responseToAgent = this.identifyResponseTarget(message, messages)
        const disagreementType = this.classifyDisagreementType(message, messages)
        
        chain.push({
          round,
          agent: message.role,
          position,
          reasoning,
          responseToAgent,
          disagreementType
        })
      }
    }
    
    return chain
  }
  
  /**
   * Calculate enhanced disagreement score incorporating reasons and patterns
   */
  private static calculateEnhancedDisagreementScore(
    messages: AgentMessage[], 
    reasons: DisagreementReason[], 
    patterns: DisagreementPattern[]
  ): number {
    let score = 0
    
    // Base score from simple disagreement indicators
    const baseScore = this.calculateBasicDisagreementScore(messages)
    score += baseScore * 0.3
    
    // Score from disagreement reasons (weighted by type)
    const reasonWeights = {
      'factual': 0.8,       // High impact - conflicting facts
      'evidence': 0.7,      // High impact - different sources
      'methodological': 0.6, // Medium-high - different approaches
      'interpretive': 0.5,  // Medium - same data, different interpretation
      'priority': 0.4,      // Medium-low - same facts, different priorities
      'assumption': 0.6     // Medium-high - different starting points
    }
    
    reasons.forEach(reason => {
      const weight = reasonWeights[reason.type] || 0.4
      score += (reason.confidence * weight * 0.4) // Max 0.4 contribution from reasons
    })
    
    // Score from disagreement patterns
    patterns.forEach(pattern => {
      const patternWeight = pattern.strength * 0.1 // Max 0.3 from patterns
      score += patternWeight
    })
    
    // Normalize to 0-1 range
    return Math.min(1, Math.max(0, score))
  }
  
  /**
   * Determine severity level based on analysis
   */
  private static determineSeverity(
    score: number, 
    reasons: DisagreementReason[], 
    patterns: DisagreementPattern[]
  ): 'low' | 'medium' | 'high' {
    // High severity indicators
    const hasFactualConflicts = reasons.some(r => r.type === 'factual' && r.confidence > 0.7)
    const hasStrongPatterns = patterns.some(p => p.strength > 0.8)
    const highReasonCount = reasons.filter(r => r.confidence > 0.6).length > 2
    
    if (score > 0.7 || hasFactualConflicts || hasStrongPatterns || highReasonCount) {
      return 'high'
    }
    
    if (score > 0.4 || reasons.length > 1 || patterns.length > 0) {
      return 'medium'
    }
    
    return 'low'
  }
  
  // Helper methods for detecting specific types of disagreements
  
  private static detectFactualConflicts(messages: AgentMessage[]): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []
    
    // Extract numbers and check for conflicts
    const numberExtractions = messages.map(msg => ({
      agent: msg.role,
      numbers: this.extractNumbers(msg.content),
      content: msg.content
    }))
    
    // Compare numbers between agents
    for (let i = 0; i < numberExtractions.length - 1; i++) {
      for (let j = i + 1; j < numberExtractions.length; j++) {
        const conflicts_found = this.findNumberConflicts(
          numberExtractions[i], 
          numberExtractions[j]
        )
        conflicts.push(...conflicts_found)
      }
    }
    
    return conflicts
  }
  
  private static detectMethodologicalConflicts(messages: AgentMessage[]): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []
    
    // Look for different methodology indicators
    const methodKeywords = [
      'approach', 'method', 'strategy', 'technique', 'process', 'way',
      'should', 'recommend', 'suggest', 'propose', 'prefer'
    ]
    
    const approaches = messages.map(msg => ({
      agent: msg.role,
      approaches: this.extractApproaches(msg.content, methodKeywords),
      content: msg.content
    }))
    
    // Compare approaches
    if (approaches.length > 1 && approaches.some(a => a.approaches.length > 0)) {
      const conflictingApproaches = this.findApproachConflicts(approaches)
      conflicts.push(...conflictingApproaches)
    }
    
    return conflicts
  }
  
  private static detectEvidenceConflicts(messages: AgentMessage[]): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []
    
    // Extract evidence citations
    const evidencePattern = /(?:according to|based on|research shows|studies indicate|data suggests|evidence shows|as per|source:|cited in)([^.]+)/gi
    
    const evidenceMap = messages.map(msg => ({
      agent: msg.role,
      evidence: this.extractMatches(msg.content, evidencePattern),
      content: msg.content
    }))
    
    // Look for contradicting evidence
    const evidenceConflicts = this.findEvidenceConflicts(evidenceMap)
    conflicts.push(...evidenceConflicts)
    
    return conflicts
  }
  
  private static detectPriorityConflicts(messages: AgentMessage[]): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []
    
    // Priority indicators
    const priorityKeywords = [
      'most important', 'priority', 'crucial', 'critical', 'key', 'primary',
      'secondary', 'less important', 'focus on', 'emphasize', 'prioritize'
    ]
    
    const priorities = messages.map(msg => ({
      agent: msg.role,
      priorities: this.extractPriorities(msg.content, priorityKeywords),
      content: msg.content
    }))
    
    const priorityConflicts = this.findPriorityConflicts(priorities)
    conflicts.push(...priorityConflicts)
    
    return conflicts
  }
  
  private static detectAssumptionConflicts(messages: AgentMessage[]): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []
    
    // Assumption indicators
    const assumptionKeywords = [
      'assume', 'assuming', 'given that', 'if we consider', 'provided that',
      'taking into account', 'based on the premise', 'presuppose'
    ]
    
    const assumptions = messages.map(msg => ({
      agent: msg.role,
      assumptions: this.extractAssumptions(msg.content, assumptionKeywords),
      content: msg.content
    }))
    
    const assumptionConflicts = this.findAssumptionConflicts(assumptions)
    conflicts.push(...assumptionConflicts)
    
    return conflicts
  }
  
  private static detectInterpretiveConflicts(messages: AgentMessage[]): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []
    
    // Interpretive indicators
    const interpretiveKeywords = [
      'interpret', 'means', 'suggests', 'indicates', 'implies', 'shows',
      'demonstrates', 'reveals', 'points to', 'conclusion'
    ]
    
    const interpretations = messages.map(msg => ({
      agent: msg.role,
      interpretations: this.extractInterpretations(msg.content, interpretiveKeywords),
      content: msg.content
    }))
    
    const interpretiveConflicts = this.findInterpretiveConflicts(interpretations)
    conflicts.push(...interpretiveConflicts)
    
    return conflicts
  }
  
  // Pattern detection methods
  
  private static detectBinaryOpposition(messages: AgentMessage[]): DisagreementPattern | null {
    const content = messages.map(m => m.content.toLowerCase()).join(' ')
    
    const yesIndicators = ['yes', 'agree', 'correct', 'true', 'support', 'endorse']
    const noIndicators = ['no', 'disagree', 'incorrect', 'false', 'oppose', 'reject']
    
    const hasYes = yesIndicators.some(word => content.includes(word))
    const hasNo = noIndicators.some(word => content.includes(word))
    
    if (hasYes && hasNo) {
      return {
        pattern: 'binary_opposition',
        strength: 0.8,
        description: 'Agents show clear yes/no or agree/disagree split'
      }
    }
    
    return null
  }
  
  private static detectGradualDivergence(messages: AgentMessage[]): DisagreementPattern | null {
    if (messages.length < 3) return null
    
    // Track confidence and position similarity across rounds
    const messagesByRound = this.groupMessagesByRound(messages)
    
    if (messagesByRound.size < 2) return null
    
    let divergenceStrength = 0
    let previousRoundSimilarity = 1
    
    for (const [round, roundMessages] of messagesByRound.entries()) {
      if (round === 1) continue // Skip first round
      
      const currentSimilarity = this.calculateMessageSimilarity(roundMessages)
      
      if (currentSimilarity < previousRoundSimilarity) {
        divergenceStrength += (previousRoundSimilarity - currentSimilarity)
      }
      
      previousRoundSimilarity = currentSimilarity
    }
    
    if (divergenceStrength > 0.3) {
      return {
        pattern: 'gradual_divergence',
        strength: Math.min(1, divergenceStrength),
        description: 'Agents start with similar positions but gradually diverge'
      }
    }
    
    return null
  }
  
  // Utility methods
  
  private static groupMessagesByRound(messages: AgentMessage[]): Map<number, AgentMessage[]> {
    const grouped = new Map<number, AgentMessage[]>()
    
    for (const message of messages) {
      if (!grouped.has(message.round)) {
        grouped.set(message.round, [])
      }
      grouped.get(message.round)!.push(message)
    }
    
    return grouped
  }
  
  private static calculateBasicDisagreementScore(messages: AgentMessage[]): number {
    if (messages.length < 2) return 0
    
    // Simple similarity check - if responses are very different, disagreement is high
    const responses = messages.map(m => m.content.toLowerCase())
    
    let totalSimilarity = 0
    let comparisons = 0
    
    for (let i = 0; i < responses.length - 1; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateStringSimilarity(responses[i], responses[j])
        totalSimilarity += similarity
        comparisons++
      }
    }
    
    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 1
    
    // Lower similarity = higher disagreement
    return Math.max(0, 1 - avgSimilarity)
  }
  
  private static calculateStringSimilarity(str1: string, str2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(str1.split(/\s+/).map(w => w.replace(/[.,!?;]/, '')))
    const words2 = new Set(str2.split(/\s+/).map(w => w.replace(/[.,!?;]/, '')))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
  
  private static calculateMessageSimilarity(messages: AgentMessage[]): number {
    if (messages.length < 2) return 1
    
    let totalSimilarity = 0
    let comparisons = 0
    
    for (let i = 0; i < messages.length - 1; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        totalSimilarity += this.calculateStringSimilarity(
          messages[i].content.toLowerCase(),
          messages[j].content.toLowerCase()
        )
        comparisons++
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 1
  }
  
  private static extractNumbers(content: string): number[] {
    const matches = content.match(/\d+(?:\.\d+)?/g)
    return matches ? matches.map(n => parseFloat(n)) : []
  }
  
  private static extractMatches(content: string, pattern: RegExp): string[] {
    const matches = content.matchAll(pattern)
    return Array.from(matches).map(match => match[1]?.trim() || match[0]?.trim()).filter(Boolean)
  }
  
  private static extractPosition(content: string): string {
    // Extract main position/recommendation from content
    const sentences = content.split(/[.!?]+/)
    
    // Look for recommendation patterns
    const recPattern = /(?:recommend|suggest|propose|advise|best|top|should)/i
    const recSentence = sentences.find(s => recPattern.test(s))
    
    if (recSentence) {
      return recSentence.trim().substring(0, 200) + '...'
    }
    
    // Fallback to first substantial sentence
    const substantialSentence = sentences.find(s => s.trim().length > 50)
    return substantialSentence ? substantialSentence.trim().substring(0, 200) + '...' : content.substring(0, 200) + '...'
  }
  
  private static extractReasoning(content: string): string {
    // Extract reasoning/justification from content
    const reasoningPatterns = [
      /because\s+(.+?)(?:\.|$)/gi,
      /since\s+(.+?)(?:\.|$)/gi,
      /due to\s+(.+?)(?:\.|$)/gi,
      /as\s+(.+?)(?:\.|$)/gi
    ]
    
    for (const pattern of reasoningPatterns) {
      const matches = content.matchAll(pattern)
      const reasons = Array.from(matches).map(m => m[1]?.trim()).filter(Boolean)
      if (reasons.length > 0) {
        return reasons.join('; ').substring(0, 200) + '...'
      }
    }
    
    // Fallback - return middle portion of content as likely reasoning
    const sentences = content.split(/[.!?]+/)
    if (sentences.length > 2) {
      const middle = Math.floor(sentences.length / 2)
      return sentences[middle]?.trim().substring(0, 200) + '...' || ''
    }
    
    return ''
  }
  
  private static identifyResponseTarget(message: AgentMessage, allMessages: AgentMessage[]): string | undefined {
    const content = message.content.toLowerCase()
    
    // Look for explicit references to other agents
    const agentRefs = ['analyst', 'critic', 'synthesizer']
    for (const ref of agentRefs) {
      if (content.includes(ref) && ref !== message.role) {
        return ref
      }
    }
    
    // Look for response patterns
    const responsePatterns = [
      /(?:disagree with|challenge|respond to|as mentioned by)/i,
      /(?:however|but|although|while)\s+(?:the\s+)?(\w+)/i
    ]
    
    for (const pattern of responsePatterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1] || 'previous agent'
      }
    }
    
    return undefined
  }
  
  private static classifyDisagreementType(message: AgentMessage, allMessages: AgentMessage[]): string {
    const content = message.content.toLowerCase()
    
    if (content.includes('disagree') || content.includes('incorrect')) {
      return 'direct_disagreement'
    }
    
    if (content.includes('however') || content.includes('but') || content.includes('although')) {
      return 'qualified_disagreement'
    }
    
    if (content.includes('alternative') || content.includes('different approach')) {
      return 'alternative_approach'
    }
    
    if (content.includes('additional') || content.includes('also consider')) {
      return 'additional_consideration'
    }
    
    return 'implicit_disagreement'
  }
  
  // Placeholder implementations for complex detection methods
  // These would be implemented with more sophisticated NLP in production
  
  private static findNumberConflicts(extraction1: any, extraction2: any): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []
    
    // Simple number conflict detection
    if (extraction1.numbers.length > 0 && extraction2.numbers.length > 0) {
      const maxDiff = Math.abs(Math.max(...extraction1.numbers) - Math.max(...extraction2.numbers))
      
      if (maxDiff > 50) { // Threshold for significant number difference
        conflicts.push({
          type: 'factual',
          description: `Conflicting numbers: ${extraction1.agent} cites different values than ${extraction2.agent}`,
          confidence: Math.min(0.9, maxDiff / 100),
          agentsInvolved: [extraction1.agent, extraction2.agent],
          evidence: [`Agent ${extraction1.agent}: ${extraction1.numbers.join(', ')}`, `Agent ${extraction2.agent}: ${extraction2.numbers.join(', ')}`]
        })
      }
    }
    
    return conflicts
  }
  
  private static extractApproaches(content: string, keywords: string[]): string[] {
    const approaches: string[] = []
    
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}[^.]*`, 'gi')
      const matches = content.match(pattern)
      if (matches) {
        approaches.push(...matches)
      }
    }
    
    return approaches
  }
  
  private static findApproachConflicts(approaches: any[]): DisagreementReason[] {
    // Simplified approach conflict detection
    return []
  }
  
  private static findEvidenceConflicts(evidenceMap: any[]): DisagreementReason[] {
    // Simplified evidence conflict detection
    return []
  }
  
  private static extractPriorities(content: string, keywords: string[]): string[] {
    // Simplified priority extraction
    return []
  }
  
  private static findPriorityConflicts(priorities: any[]): DisagreementReason[] {
    // Simplified priority conflict detection
    return []
  }
  
  private static extractAssumptions(content: string, keywords: string[]): string[] {
    // Simplified assumption extraction
    return []
  }
  
  private static findAssumptionConflicts(assumptions: any[]): DisagreementReason[] {
    // Simplified assumption conflict detection
    return []
  }
  
  private static extractInterpretations(content: string, keywords: string[]): string[] {
    // Simplified interpretation extraction
    return []
  }
  
  private static findInterpretiveConflicts(interpretations: any[]): DisagreementReason[] {
    // Simplified interpretive conflict detection
    return []
  }
  
  private static detectEvidenceConflictPattern(messages: AgentMessage[]): DisagreementPattern | null {
    // Simplified evidence conflict pattern detection
    return null
  }
  
  private static detectAssumptionMismatch(messages: AgentMessage[]): DisagreementPattern | null {
    // Simplified assumption mismatch detection
    return null
  }
  
  private static detectPriorityDifference(messages: AgentMessage[]): DisagreementPattern | null {
    // Simplified priority difference detection
    return null
  }
}