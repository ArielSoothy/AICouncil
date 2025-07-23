import { StructuredModelResponse } from '@/types/consensus'

export type QueryType = 'financial' | 'technical' | 'medical' | 'legal' | 'general'
export type JudgeResponseMode = 'concise' | 'normal' | 'detailed'

export interface JudgeAnalysis {
  consensusScore: number
  hallucination: {
    riskLevel: 'None' | 'Low' | 'Medium' | 'High' | 'Critical'
    detectedIssues: string[]
    confidence: number
  }
  answerDistribution: {
    majorityPosition: string
    outlierPositions: string[]
    divergenceReasons: string[]
  }
  synthesis: {
    bestAnswer: string
    confidence: number
    rationale: string
  }
  decisionGuidance: {
    actionable: 'Yes' | 'Yes with caution' | 'No - needs human review'
    keyRisks: string[]
    missingInformation: string[]
  }
  uniqueInsights: string[]
  redFlags: string[]
  tokenUsage: number
}

export interface ConciseJudgeResult {
  consensusScore: number
  bestAnswer: string
  confidence: number
  actionable: 'Yes' | 'Caution' | 'No'
  riskLevel: 'None' | 'Low' | 'Medium' | 'High' | 'Critical'
  tokenUsage: number
}

// Domain-specific enhancements for different query types
const DOMAIN_ENHANCEMENTS = {
  financial: `
For this financial query, pay special attention to:
- Regulatory implications and compliance requirements
- Risk factors and potential downsides
- Market assumptions and their validity
- Numerical accuracy and calculation methods
- Time sensitivity of advice
`,
  technical: `
For this technical query, evaluate:
- Scalability concerns and performance implications
- Security implications and potential vulnerabilities
- Best practices and industry standards
- Implementation complexity and maintenance burden
- Technology compatibility and dependencies
`,
  medical: `
For this medical query, ensure:
- Advice is based on established medical evidence
- Include appropriate medical disclaimers
- Flag any potentially dangerous recommendations
- Consider individual variation and contraindications
- Emphasize need for professional medical consultation
`,
  legal: `
For this legal query, note:
- Jurisdictional considerations and applicable laws
- Precedent reliability and current legal status
- Clearly indicate this is not formal legal advice
- Consider the need for qualified legal counsel
- Flag any potentially problematic legal interpretations
`,
  general: ''
}

export function detectQueryType(userQuery: string): QueryType {
  const query = userQuery.toLowerCase()
  
  // Financial indicators - expanded patterns
  if (query.match(/\b(invest|investment|stock|stocks|money|financial|budget|cost|price|roi|profit|revenue|tax|taxes|loan|loans|mortgage|insurance|fund|funds|trading|market|markets|economy|economic|crypto|cryptocurrency|finance|portfolio|retirement|pension|401k|savings|wealth|capital|dividend|bond|bonds|mutual|etf|asset|assets|bank|banking)\b/)) {
    return 'financial'
  }
  
  // Technical indicators - expanded patterns  
  if (query.match(/\b(code|coding|programming|software|api|apis|database|databases|algorithm|algorithms|tech|technology|development|developer|framework|frameworks|library|libraries|security|server|servers|cloud|ai|ml|machine.learning|data.science|architecture|microservices|scalable|scalability|implementation|deploy|deployment|devops|backend|frontend|javascript|python|java|react|node|docker|kubernetes)\b/)) {
    return 'technical'
  }
  
  // Medical indicators - expanded patterns
  if (query.match(/\b(health|healthcare|medical|medicine|disease|diseases|treatment|treatments|doctor|doctors|patient|patients|symptom|symptoms|therapy|drug|drugs|medication|medications|clinical|diagnosis|hospital|hospitals|side.effects|dosage|prescription|pharma|pharmaceutical|surgery|condition|illness)\b/)) {
    return 'medical'
  }
  
  // Legal indicators - expanded patterns
  if (query.match(/\b(legal|legally|law|laws|court|courts|contract|contracts|rights|lawsuit|lawsuits|attorney|attorneys|lawyer|lawyers|regulation|regulations|compliance|liability|patent|patents|copyright|copyrighted|trademark|trademarks|license|licensing|terms.of.service|privacy.policy|gdpr|intellectual.property|litigation)\b/)) {
    return 'legal'
  }
  
  return 'general'
}

export function generateJudgePrompt(
  responses: StructuredModelResponse[], 
  userQuery: string, 
  mode: JudgeResponseMode = 'normal'
): string {
  const queryType = detectQueryType(userQuery)
  const successfulResponses = responses.filter(r => !r.error && r.response.trim())
  
  if (successfulResponses.length === 0) {
    return "No valid responses to analyze."
  }

  const basePrompt = `You are the Chief Decision Synthesizer for Consensus AI, the trust layer for enterprise AI decisions. Your analysis can impact million-dollar decisions.

ORIGINAL QUERY: "${userQuery}"

MODEL RESPONSES:
${successfulResponses.map((r, i) => `
[${r.model}] (Confidence: ${r.parsed?.confidence || 'Not provided'}):
${r.parsed?.mainAnswer || r.response}
${r.parsed?.keyEvidence?.length ? `Evidence: ${r.parsed.keyEvidence.join(', ')}` : ''}
${r.parsed?.limitations?.length ? `Limitations: ${r.parsed.limitations.join(', ')}` : ''}
---`).join('\n')}`

  // Mode-specific output format
  const outputFormat = mode === 'concise' ? `
Provide ONLY a JSON response with this structure:
{
  "consensusScore": 85,
  "bestAnswer": "Your synthesized response in 1-2 sentences",
  "confidence": 85,
  "actionable": "Yes|Caution|No",
  "riskLevel": "None|Low|Medium|High|Critical",
  "keyRisks": ["Risk 1", "Risk 2"],
  "redFlags": ["Flag 1 if any"]
}

CRITICAL: Output ONLY valid JSON. No explanations or formatting.` : `
Provide your analysis in this EXACT format:

## 🎯 CONSENSUS SCORE
[XX%] - Calculate based on semantic agreement, not just keyword matching. Consider if models agree on core concepts even with different wording.

## 🔍 HALLUCINATION DETECTION
- Risk Level: [None/Low/Medium/High/Critical]
- Detected Issues: [List any factual errors, inconsistencies, or confabulations]
- Confidence in Detection: [XX%]

## 📊 ANSWER DISTRIBUTION
- Majority Position: [What most models agree on]
- Outlier Positions: [Divergent answers and which models]
- Why They Diverge: [Root cause of disagreement]

## 💡 SYNTHESIS
THE BEST ANSWER: [Your synthesized response incorporating the strongest insights from all models]

CONFIDENCE: [XX%] with rationale

## ⚠️ DECISION GUIDANCE
- Can you act on this? [Yes/Yes with caution/No - needs human review]
- Key Risks: [What could go wrong if you follow this advice]
- Missing Information: [What else you'd need for higher confidence]

## 🎨 UNIQUE INSIGHTS
[What each model uniquely contributed that others missed]

## 🚨 RED FLAGS
[Any concerns that require immediate attention]`

  const domainEnhancement = DOMAIN_ENHANCEMENTS[queryType] || ''
  
  return basePrompt + '\n\n' + outputFormat + domainEnhancement
}

export function parseJudgeResponse(response: string, mode: JudgeResponseMode): JudgeAnalysis | ConciseJudgeResult {
  if (mode === 'concise') {
    try {
      // Clean and parse JSON response
      let cleanText = response.trim()
      
      // Remove markdown code blocks
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Extract JSON from text if it's embedded in other content
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanText = jsonMatch[0]
      }
      
      // Remove any trailing text after JSON
      const jsonEnd = cleanText.lastIndexOf('}')
      if (jsonEnd !== -1) {
        cleanText = cleanText.substring(0, jsonEnd + 1)
      }
      
      console.log('Attempting to parse judge JSON:', cleanText)
      
      const parsed = JSON.parse(cleanText)
      
      // Validate required fields and provide defaults
      const result = {
        consensusScore: Math.min(Math.max(parsed.consensusScore || 50, 0), 100),
        bestAnswer: parsed.bestAnswer || 'Unable to synthesize response',
        confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
        actionable: ['Yes', 'Caution', 'No'].includes(parsed.actionable) ? parsed.actionable : 'Caution',
        riskLevel: ['None', 'Low', 'Medium', 'High', 'Critical'].includes(parsed.riskLevel) ? parsed.riskLevel : 'Medium',
        tokenUsage: 0 // Will be filled by caller
      } as ConciseJudgeResult
      
      console.log('Successfully parsed judge response:', result)
      return result
      
    } catch (error) {
      console.error('Failed to parse concise judge response:', error)
      console.error('Raw response was:', response)
      return {
        consensusScore: 50,
        bestAnswer: 'Unable to parse judge analysis',
        confidence: 30,
        actionable: 'No',
        riskLevel: 'High',
        tokenUsage: 0
      } as ConciseJudgeResult
    }
  }

  // Parse detailed response format
  try {
    const sections = response.split('##').filter(s => s.trim())
    const result: Partial<JudgeAnalysis> = {}

    sections.forEach(section => {
      const lines = section.trim().split('\n').filter(l => l.trim())
      const header = lines[0]?.toLowerCase() || ''

      if (header.includes('consensus score')) {
        const scoreLine = lines.find(l => l.includes('%'))
        if (scoreLine) {
          const match = scoreLine.match(/(\d+)%/)
          result.consensusScore = match ? parseInt(match[1]) : 50
        }
      } else if (header.includes('hallucination')) {
        const riskLine = lines.find(l => l.toLowerCase().includes('risk level'))
        const issuesLines = lines.filter(l => l.toLowerCase().includes('detected issues'))
        const confidenceLine = lines.find(l => l.toLowerCase().includes('confidence in detection'))
        
        result.hallucination = {
          riskLevel: extractValue(riskLine, ['None', 'Low', 'Medium', 'High', 'Critical']) as any || 'Medium',
          detectedIssues: issuesLines.map(l => l.split(':')[1]?.trim()).filter(Boolean),
          confidence: extractPercentage(confidenceLine) || 75
        }
      } else if (header.includes('synthesis')) {
        const bestAnswerLine = lines.find(l => l.toLowerCase().includes('the best answer'))
        const confidenceLine = lines.find(l => l.toLowerCase().includes('confidence'))
        
        result.synthesis = {
          bestAnswer: bestAnswerLine?.split(':')[1]?.trim() || 'Unable to synthesize',
          confidence: extractPercentage(confidenceLine) || 75,
          rationale: lines.slice(-1)[0] || 'No rationale provided'
        }
      }
      // Add other section parsers as needed...
    })

    return {
      consensusScore: result.consensusScore || 50,
      hallucination: result.hallucination || { riskLevel: 'Medium', detectedIssues: [], confidence: 50 },
      answerDistribution: { majorityPosition: '', outlierPositions: [], divergenceReasons: [] },
      synthesis: result.synthesis || { bestAnswer: 'Analysis incomplete', confidence: 50, rationale: '' },
      decisionGuidance: { actionable: 'Yes with caution', keyRisks: [], missingInformation: [] },
      uniqueInsights: [],
      redFlags: [],
      tokenUsage: 0
    } as JudgeAnalysis

  } catch (error) {
    console.error('Failed to parse detailed judge response:', error)
    return {
      consensusScore: 50,
      bestAnswer: 'Unable to parse analysis',
      confidence: 30,
      actionable: 'No',
      riskLevel: 'High',
      tokenUsage: 0
    } as ConciseJudgeResult
  }
}

function extractValue(line: string | undefined, validValues: string[]): string | undefined {
  if (!line) return undefined
  const found = validValues.find(val => line.toLowerCase().includes(val.toLowerCase()))
  return found
}

function extractPercentage(line: string | undefined): number | undefined {
  if (!line) return undefined
  const match = line.match(/(\d+)%/)
  return match ? parseInt(match[1]) : undefined
}
