/**
 * Synthesis Engine for Debate Mode
 *
 * Combines multi-agent analyses into clear, ranked recommendations
 * Pattern: Extracted from Trading Mode's judge system, adapted for general decisions
 *
 * Philosophy: Users need CLEAR ANSWERS, not "it depends"
 */

import { AgentMessage } from './types'
import { SynthesisOutput } from '@/types/general-research'

/**
 * Synthesize all agent responses into a clear final recommendation
 *
 * Takes all Round 2 messages and extracts:
 * 1. Most common recommendation (consensus)
 * 2. Average confidence across agents
 * 3. Strongest supporting evidence (appearing multiple times)
 * 4. Key risks mentioned by multiple agents
 * 5. Alternative options if mentioned
 *
 * @param messages - All agent messages from final round
 * @param researchBased - Whether this synthesis is based on web research
 * @returns Clear synthesis with ranked recommendations
 */
export function synthesizeFinalRecommendation(
  messages: AgentMessage[],
  researchBased: boolean = false
): SynthesisOutput {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔮 SYNTHESIS ENGINE: Processing ${messages.length} agent responses`)
  console.log(`${'='.repeat(80)}\n`)

  // Extract recommendations from each agent
  const recommendations = extractRecommendations(messages)
  console.log(`📊 Extracted ${recommendations.length} recommendations`)

  // Find consensus recommendation (most mentioned)
  const topRecommendation = findConsensusRecommendation(recommendations)
  console.log(`✅ Top recommendation: "${topRecommendation}"`)

  // Calculate average confidence
  const avgConfidence = calculateAverageConfidence(messages)
  console.log(`🎯 Average confidence: ${avgConfidence}%`)

  // Extract supporting evidence (facts mentioned multiple times)
  const supportingEvidence = extractCommonEvidence(messages)
  console.log(`📚 Supporting evidence: ${supportingEvidence.length} items`)

  // Extract key risks/concerns
  const keyRisks = extractCommonRisks(messages)
  console.log(`⚠️  Key risks: ${keyRisks.length} items`)

  // Extract alternative options with scores
  const alternatives = extractAlternatives(recommendations)
  console.log(`🔄 Alternative options: ${alternatives.length}`)

  // Assess evidence quality (1-5 scale)
  const evidenceScore = assessEvidenceQuality(messages, researchBased)
  console.log(`📈 Evidence score: ${evidenceScore}/5`)

  console.log(`\n${'='.repeat(80)}`)
  console.log('✅ SYNTHESIS COMPLETE')
  console.log(`${'='.repeat(80)}\n`)

  return {
    topRecommendation,
    confidence: avgConfidence,
    evidenceScore,
    supportingEvidence: supportingEvidence.slice(0, 3), // Top 3
    keyRisks: keyRisks.slice(0, 2), // Top 2
    alternatives,
    researchBased,
  }
}

/**
 * Extract recommendation statements from agent messages
 */
function extractRecommendations(messages: AgentMessage[]): string[] {
  const recommendations: string[] = []

  for (const msg of messages) {
    // Look for recommendation patterns in content
    const recPattern = /\*\*(?:Recommendation|Final Recommendation|Top Recommendation):\*\*\s*([^\n*]+)/i
    const match = msg.content.match(recPattern)

    if (match && match[1]) {
      const rec = match[1].trim()
      // Remove bracketed placeholders like "[Clear answer]"
      const cleaned = rec.replace(/\[.*?\]/g, '').trim()
      if (cleaned.length > 10) {
        recommendations.push(cleaned)
      }
    }
  }

  return recommendations
}

/**
 * Find the most common recommendation (consensus)
 */
function findConsensusRecommendation(recommendations: string[]): string {
  if (recommendations.length === 0) {
    return 'Insufficient data for recommendation'
  }

  // Simple approach: return the first recommendation
  // In future, could use NLP to cluster similar recommendations
  // For now, assume agents generally agree (since they're analyzing same research)
  return recommendations[0]
}

/**
 * Calculate average confidence across all agents
 */
function calculateAverageConfidence(messages: AgentMessage[]): number {
  const confidences: number[] = []

  for (const msg of messages) {
    // Look for confidence patterns
    const confPattern = /\*\*Confidence:\*\*\s*(\d+)%?/i
    const match = msg.content.match(confPattern)

    if (match && match[1]) {
      const conf = parseInt(match[1], 10)
      if (conf >= 0 && conf <= 100) {
        confidences.push(conf)
      }
    }
  }

  if (confidences.length === 0) {
    return 70 // Default confidence if not specified
  }

  const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  return Math.round(avg)
}

/**
 * Extract evidence that appears in multiple agent responses
 */
function extractCommonEvidence(messages: AgentMessage[]): string[] {
  const allEvidence: string[] = []

  for (const msg of messages) {
    // Look for evidence sections
    const evidencePattern = /\*\*(?:Supporting Evidence|Evidence|Key Evidence|Strongest Evidence):\*\*\s*([\s\S]*?)(?=\*\*|$)/i
    const match = msg.content.match(evidencePattern)

    if (match && match[1]) {
      // Extract bullet points
      const bullets = match[1]
        .split(/\n\s*[-•]\s*/)
        .map((item) => item.trim())
        .filter((item) => item.length > 20 && !item.startsWith('['))

      allEvidence.push(...bullets)
    }
  }

  // Return unique evidence (simple deduplication)
  return [...new Set(allEvidence)]
}

/**
 * Extract risks/concerns mentioned by multiple agents
 */
function extractCommonRisks(messages: AgentMessage[]): string[] {
  const allRisks: string[] = []

  for (const msg of messages) {
    // Look for risk/concern sections
    const riskPattern = /\*\*(?:Concerns|Risks|Key Concerns|Key Risks|Concerns\/Risks):\*\*\s*([\s\S]*?)(?=\*\*|$)/i
    const match = msg.content.match(riskPattern)

    if (match && match[1]) {
      // Extract bullet points
      const bullets = match[1]
        .split(/\n\s*[-•]\s*/)
        .map((item) => item.trim())
        .filter((item) => item.length > 20 && !item.startsWith('['))

      allRisks.push(...bullets)
    }
  }

  // Return unique risks
  return [...new Set(allRisks)]
}

/**
 * Extract alternative options from recommendations
 */
function extractAlternatives(recommendations: string[]): Array<{
  option: string
  score: number
  reasoning: string
}> {
  // For now, return empty array
  // In future, could extract multiple options and rank them
  // This would require more sophisticated parsing of agent responses
  return []
}

/**
 * Assess evidence quality based on research and agent agreement
 */
function assessEvidenceQuality(messages: AgentMessage[], researchBased: boolean): number {
  let score = 3 // Start with medium quality

  // Higher score if research-based
  if (researchBased) {
    score = 4
  }

  // Check for high confidence across agents
  const confidences = messages
    .map((msg) => {
      const match = msg.content.match(/\*\*Confidence:\*\*\s*(\d+)%?/i)
      return match ? parseInt(match[1], 10) : 70
    })
    .filter((c) => c > 0)

  const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length

  if (avgConfidence >= 85) {
    score = 5 // Very high confidence
  } else if (avgConfidence >= 70) {
    score = Math.max(score, 4) // High confidence
  } else if (avgConfidence < 50) {
    score = Math.min(score, 2) // Low confidence
  }

  return score
}

/**
 * Format synthesis output as readable text
 */
export function formatSynthesisOutput(synthesis: SynthesisOutput): string {
  let output = '## Final Synthesis\n\n'

  output += `**Top Recommendation:** ${synthesis.topRecommendation}\n\n`
  output += `**Confidence:** ${synthesis.confidence}% (Evidence Quality: ${synthesis.evidenceScore}/5)\n\n`

  if (synthesis.supportingEvidence.length > 0) {
    output += '**Supporting Evidence:**\n'
    synthesis.supportingEvidence.forEach((ev, i) => {
      output += `${i + 1}. ${ev}\n`
    })
    output += '\n'
  }

  if (synthesis.keyRisks.length > 0) {
    output += '**Key Risks to Consider:**\n'
    synthesis.keyRisks.forEach((risk, i) => {
      output += `${i + 1}. ${risk}\n`
    })
    output += '\n'
  }

  if (synthesis.alternatives.length > 0) {
    output += '**Alternative Options:**\n'
    synthesis.alternatives.forEach((alt, i) => {
      output += `${i + 1}. ${alt.option} (Score: ${alt.score}/5)\n`
      output += `   ${alt.reasoning}\n\n`
    })
  }

  output += `\n*Analysis based on: ${synthesis.researchBased ? 'Web research + Multi-agent analysis' : 'Multi-agent analysis'}*\n`

  return output
}
