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
 * SIMPLIFIED Disagreement Analyzer with meaningful insights
 * Focus: Extract actual debates and meaningful differences
 */
export class DisagreementAnalyzer {
  
  static analyzeDisagreements(messages: AgentMessage[]): DisagreementAnalysis {
    
    if (messages.length < 2) {
      return {
        score: 0,
        reasons: [],
        patterns: [],
        severity: 'low',
        chainOfDisagreement: []
      }
    }
    
    const reasons = this.findMeaningfulDisagreements(messages)
    const patterns = this.identifyDebatePatterns(messages)
    const chain = this.buildSimpleChain(messages)
    
    // Simple scoring: more disagreements = higher score
    const score = Math.min(reasons.length / 3, 1) // Cap at 1.0
    const severity = score > 0.7 ? 'high' : score > 0.3 ? 'medium' : 'low'
    
    
    return {
      score,
      reasons,
      patterns,
      severity,
      chainOfDisagreement: chain
    }
  }
  
  /**
   * Find actual meaningful disagreements between agents
   */
  private static findMeaningfulDisagreements(messages: AgentMessage[]): DisagreementReason[] {
    const disagreements: DisagreementReason[] = []
    
    // 1. Look for explicit disagreement language
    const disagreementPhrases = [
      'however', 'but', 'disagree', 'contrary', 'contradicts', 'challenges', 
      'on the other hand', 'alternatively', 'instead', 'rather than'
    ]
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase()
      const hasDisagreement = disagreementPhrases.some(phrase => content.includes(phrase))
      
      if (hasDisagreement) {
        // Find the specific disagreement context
        let context = ''
        for (const phrase of disagreementPhrases) {
          const index = content.indexOf(phrase)
          if (index !== -1) {
            // Extract sentence with disagreement
            const start = Math.max(0, content.lastIndexOf('.', index))
            const end = content.indexOf('.', index + phrase.length)
            context = msg.content.slice(start, end > -1 ? end + 1 : undefined).trim()
            break
          }
        }
        
        if (context.length > 20) {
          disagreements.push({
            type: 'factual',
            description: `${msg.role} presents a counter-position: "${context}"`,
            confidence: 0.8,
            agentsInvolved: [msg.role],
            evidence: [`Direct disagreement phrase found`, `Context: ${context}`]
          })
        }
      }
    })
    
    // 2. Look for conflicting recommendations
    const recommendations = this.extractRecommendations(messages)
    if (recommendations.length > 1) {
      const conflictingRecs = this.compareRecommendations(recommendations)
      disagreements.push(...conflictingRecs)
    }
    
    // 3. Look for different conclusions/answers
    const conclusions = this.extractConclusions(messages)
    if (conclusions.length > 1) {
      disagreements.push({
        type: 'interpretive',
        description: 'Agents reach different conclusions about the main question',
        confidence: 0.7,
        agentsInvolved: conclusions.map(c => c.agent),
        evidence: conclusions.map(c => `${c.agent}: ${c.conclusion}`)
      })
    }
    
    return disagreements.slice(0, 5) // Limit to top 5
  }
  
  private static extractRecommendations(messages: AgentMessage[]): Array<{ agent: string; recommendation: string }> {
    const recommendations: Array<{ agent: string; recommendation: string }> = []

    messages.forEach(msg => {
      const sentences = msg.content.split(/[.!?]/)
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase()
        if (lower.includes('recommend') || lower.includes('should') || lower.includes('best option')) {
          recommendations.push({
            agent: msg.role,
            recommendation: sentence.trim()
          })
        }
      })
    })

    return recommendations
  }
  
  private static compareRecommendations(recommendations: Array<{ agent: string; recommendation: string }>): DisagreementReason[] {
    const conflicts: DisagreementReason[] = []

    if (recommendations.length > 1) {
      const firstRec = recommendations[0]
      const otherRecs = recommendations.slice(1)

      otherRecs.forEach(rec => {
        conflicts.push({
          type: 'methodological' as const,
          description: `${firstRec.agent} and ${rec.agent} recommend different solutions`,
          confidence: 0.75,
          agentsInvolved: [firstRec.agent, rec.agent],
          evidence: [
            `${firstRec.agent}: ${firstRec.recommendation}`,
            `${rec.agent}: ${rec.recommendation}`
          ]
        })
      })
    }

    return conflicts
  }
  
  private static extractConclusions(messages: AgentMessage[]): Array<{ agent: string; conclusion: string }> {
    const conclusions: Array<{ agent: string; conclusion: string }> = []

    messages.forEach(msg => {
      // Look for conclusive statements (last paragraph, "in conclusion", etc.)
      const paragraphs = msg.content.split('\n\n')
      const lastParagraph = paragraphs[paragraphs.length - 1]

      if (lastParagraph && lastParagraph.length > 30) {
        conclusions.push({
          agent: msg.role,
          conclusion: lastParagraph.trim().slice(0, 150) + (lastParagraph.length > 150 ? '...' : '')
        })
      }
    })

    return conclusions
  }
  
  private static identifyDebatePatterns(messages: AgentMessage[]): DisagreementPattern[] {
    const patterns: DisagreementPattern[] = []
    
    // Binary Opposition: agents taking opposite stances
    if (messages.length >= 2) {
      const hasOpposition = messages.some(msg => 
        msg.content.toLowerCase().includes('disagree') || 
        msg.content.toLowerCase().includes('contrary') ||
        msg.content.toLowerCase().includes('however')
      )
      
      if (hasOpposition) {
        patterns.push({
          pattern: 'binary_opposition' as const,
          strength: 0.8,
          description: 'Agents take opposing stances on key issues'
        })
      }
    }
    
    // Evidence Conflict: citing different sources
    const hasEvidenceCiting = messages.filter(msg => 
      msg.content.toLowerCase().includes('according to') ||
      msg.content.toLowerCase().includes('research shows') ||
      msg.content.toLowerCase().includes('data indicates')
    )
    
    if (hasEvidenceCiting.length > 1) {
      patterns.push({
        pattern: 'evidence_conflict' as const,
        strength: 0.6,
        description: 'Agents cite different sources or evidence'
      })
    }
    
    return patterns
  }
  
  private static buildSimpleChain(messages: AgentMessage[]): ChainLink[] {
    return messages.map((msg, index) => ({
      round: msg.round || 1,
      agent: msg.role,
      position: msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : ''),
      reasoning: 'Extracted from agent response',
      disagreementType: index === 0 ? 'initial_position' : 'counter_position'
    }))
  }
}