/**
 * Detects when agents are requesting more information and suggests follow-up questions
 */

export interface InformationRequest {
  detected: boolean
  missingInfo: string[]
  suggestedQuestions: string[]
  followUpQuestions?: string[]
  followUpPrompt?: string
  confidence?: number
}

export function detectInformationRequests(messages: any[]): InformationRequest {
  const requestPatterns = [
    /need(?:s)? (?:more|additional|further) (?:information|details|context|clarification)/gi,
    /require(?:s)? (?:more|additional|further) (?:information|details|context|clarification)/gi,
    /would (?:need|benefit from|help to know)/gi,
    /(?:what|which|how) (?:is|are) (?:your|the user's)/gi,
    /(?:please|could you) (?:provide|specify|clarify)/gi,
    /without (?:knowing|understanding|more information)/gi,
    /depends on (?:several|various|multiple) factors/gi,
    /to provide (?:a |an )?(?:accurate|precise|specific) (?:recommendation|answer)/gi
  ]
  
  const missingInfo: Set<string> = new Set()
  const suggestedQuestions: Set<string> = new Set()
  let detectionCount = 0
  
  messages.forEach(msg => {
    const content = msg.content || msg.response || ''
    
    // Check for information request patterns
    requestPatterns.forEach(pattern => {
      const matches = content.match(pattern)
      if (matches) {
        detectionCount += matches.length
      }
    })
    
    // Extract specific missing information mentions
    const budgetMatch = content.match(/budget|price (?:range|limit)|cost/gi)
    if (budgetMatch) {
      missingInfo.add('budget')
      suggestedQuestions.add('What is your budget range?')
    }
    
    const purposeMatch = content.match(/(?:primary |main )?(?:use|purpose|goal|objective)/gi)
    if (purposeMatch) {
      missingInfo.add('intended use')
      suggestedQuestions.add('What will you primarily use this for?')
    }
    
    const experienceMatch = content.match(/experience (?:level|with)|beginner|expert|intermediate/gi)
    if (experienceMatch) {
      missingInfo.add('experience level')
      suggestedQuestions.add('What is your experience level?')
    }
    
    const locationMatch = content.match(/location|where|country|region|local/gi)
    if (locationMatch) {
      missingInfo.add('location specifics')
      suggestedQuestions.add('Where are you located or where will this be used?')
    }
    
    const preferencesMatch = content.match(/preference|priority|important|feature/gi)
    if (preferencesMatch) {
      missingInfo.add('specific preferences')
      suggestedQuestions.add('What features are most important to you?')
    }
  })
  
  // Calculate confidence that more info is needed
  const confidence = Math.min(100, (detectionCount * 20) + (missingInfo.size * 15))
  
  return {
    detected: detectionCount > 0 || missingInfo.size > 0,
    missingInfo: Array.from(missingInfo),
    suggestedQuestions: Array.from(suggestedQuestions).slice(0, 3), // Limit to 3 questions
    confidence
  }
}

export function generateFollowUpPrompt(originalQuery: string, infoRequest: InformationRequest): string {
  if (!infoRequest.detected || infoRequest.suggestedQuestions.length === 0) {
    return ''
  }
  
  return `To provide more accurate recommendations for "${originalQuery}", please consider answering:

${infoRequest.suggestedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

You can add this information to your next query for more tailored results.`
}