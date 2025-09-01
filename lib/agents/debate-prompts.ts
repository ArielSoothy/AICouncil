import { AgentPersona, AgentMessage } from './types'

export function generateDebatePrompt(
  query: string,
  agent: AgentPersona,
  round: number,
  totalRounds: number
): string {
  const rolePrompts = {
    analyst: generateAnalystPrompt,
    critic: generateCriticPrompt,
    synthesizer: generateSynthesizerPrompt
  }
  
  const promptGenerator = rolePrompts[agent.role]
  return promptGenerator(query, round, totalRounds)
}

export function generateRoundPrompt(
  query: string,
  agent: AgentPersona,
  round: number,
  previousMessages: AgentMessage[]
): string {
  if (round === 1) {
    // First round: Initial response
    return generateInitialPrompt(query, agent)
  } else {
    // Subsequent rounds: Respond to other agents
    return generateDebateResponsePrompt(query, agent, previousMessages)
  }
}

function generateInitialPrompt(query: string, agent: AgentPersona): string {
  const basePrompt = `DEBATE ROUND 1 - INITIAL RESPONSE

Query: ${query}

As ${agent.name}, provide your initial analysis of this query. Focus on your areas of expertise:
${agent.focusAreas.map(area => `- ${area}`).join('\n')}

IMPORTANT: Even if information is incomplete, provide your best assessment with appropriate qualifications.
- If it's a product/service query, suggest at least 3 specific options
- State what additional information would improve your answer
- Never just ask for more info - always provide actionable insights

Structure your response with:
1. Your main position or answer (be specific!)
2. Key supporting points (2-3)
3. Evidence or reasoning
4. What additional info would help (if applicable)
5. Confidence level in your assessment

Keep your response focused and under 200 words.`

  return basePrompt
}

function generateDebateResponsePrompt(
  query: string,
  agent: AgentPersona,
  previousMessages: AgentMessage[]
): string {
  // Group messages by agent
  const otherAgentMessages = previousMessages.filter(m => m.agentId !== agent.id)
  
  const previousPositions = otherAgentMessages.map(m => 
    `${m.role.toUpperCase()} argued: ${m.content.substring(0, 150)}...`
  ).join('\n\n')
  
  return `DEBATE ROUND ${previousMessages[0]?.round + 1 || 2} - RESPONSE

Original Query: ${query}

Previous Positions:
${previousPositions}

As ${agent.name}, respond to the other agents' arguments. Consider:
1. Points where you agree or see merit
2. Points you challenge or disagree with
3. New evidence or perspectives to add
4. How this affects your overall position

Remember your role traits:
${agent.traits.slice(0, 3).map(trait => `- ${trait}`).join('\n')}

Keep your response focused and under 200 words. Be constructive but maintain your unique perspective.`
}

function generateAnalystPrompt(query: string, round: number, totalRounds: number): string {
  if (round === 1) {
    return `As The Analyst, examine this query with a data-driven approach:
"${query}"

Focus on:
- Factual analysis and available data
- Logical reasoning and deduction
- Statistical or quantitative aspects
- Pattern identification
- Evidence-based conclusions

Provide a structured analysis with clear supporting points.`
  } else if (round === totalRounds) {
    return `As The Analyst, provide your final data-driven assessment:
"${query}"

Synthesize the debate so far and present:
- Key facts established
- Logical conclusions drawn
- Remaining uncertainties
- Your final evidence-based position`
  } else {
    return `As The Analyst, refine your analysis based on the debate:
"${query}"

Address:
- New data points raised
- Logical gaps identified
- Counter-evidence presented
- Refined conclusions`
  }
}

function generateCriticPrompt(query: string, round: number, totalRounds: number): string {
  if (round === 1) {
    return `As The Critic, critically examine this query:
"${query}"

Focus on:
- Potential flaws or oversights
- Hidden assumptions
- Risk factors
- Alternative interpretations
- Edge cases and exceptions

Challenge conventional thinking while being constructive.`
  } else if (round === totalRounds) {
    return `As The Critic, provide your final critical assessment:
"${query}"

Summarize:
- Major concerns that remain
- Assumptions that weren't addressed
- Risks to consider
- Your final cautionary perspective`
  } else {
    return `As The Critic, continue challenging the discussion:
"${query}"

Address:
- Weak arguments presented
- Overlooked risks
- Unquestioned assumptions
- Alternative viewpoints not considered`
  }
}

function generateSynthesizerPrompt(query: string, round: number, totalRounds: number): string {
  if (round === 1) {
    return `As The Synthesizer, provide a balanced initial perspective:
"${query}"

Focus on:
- Multiple valid viewpoints
- Common ground possibilities
- Balanced assessment
- Integration potential
- Practical implications

Bridge different perspectives constructively.`
  } else if (round === totalRounds) {
    return `As The Synthesizer, provide your final integrated conclusion:
"${query}"

Present:
- Areas of consensus
- Valid disagreements
- Integrated solution
- Balanced final recommendation`
  } else {
    return `As The Synthesizer, work towards consensus:
"${query}"

Focus on:
- Points of agreement emerging
- Valid concerns from all sides
- Potential compromises
- Integrated perspectives`
  }
}

export function formatDebateMessage(message: AgentMessage): string {
  const header = `[${message.role.toUpperCase()}] Round ${message.round}`
  const confidence = message.confidence ? ` (Confidence: ${message.confidence}%)` : ''
  
  let formatted = `${header}${confidence}\n${message.content}`
  
  if (message.keyPoints && message.keyPoints.length > 0) {
    formatted += '\n\nKey Points:'
    message.keyPoints.forEach(point => {
      formatted += `\n• ${point}`
    })
  }
  
  if (message.evidence && message.evidence.length > 0) {
    formatted += '\n\nEvidence:'
    message.evidence.forEach(evidence => {
      formatted += `\n• ${evidence}`
    })
  }
  
  if (message.challenges && message.challenges.length > 0) {
    formatted += '\n\nChallenges:'
    message.challenges.forEach(challenge => {
      formatted += `\n• ${challenge}`
    })
  }
  
  return formatted
}

export function generateDebateSummary(session: any): string {
  let summary = `DEBATE SUMMARY\n`
  summary += `Query: "${session.query}"\n`
  summary += `Participants: ${session.agents.map((a: AgentPersona) => a.name).join(', ')}\n`
  summary += `Rounds: ${session.rounds.length}\n\n`
  
  session.rounds.forEach((round: any) => {
    summary += `--- ROUND ${round.roundNumber} ---\n`
    round.messages.forEach((msg: AgentMessage) => {
      summary += `\n${formatDebateMessage(msg)}\n`
    })
  })
  
  if (session.finalSynthesis) {
    summary += `\n--- FINAL SYNTHESIS ---\n`
    summary += `Confidence: ${session.finalSynthesis.confidence}%\n\n`
    
    if (session.finalSynthesis.agreements.length > 0) {
      summary += 'Agreements:\n'
      session.finalSynthesis.agreements.forEach((agreement: string) => {
        summary += `• ${agreement}\n`
      })
    }
    
    if (session.finalSynthesis.disagreements.length > 0) {
      summary += '\nDisagreements:\n'
      session.finalSynthesis.disagreements.forEach((disagreement: string) => {
        summary += `• ${disagreement}\n`
      })
    }
    
    summary += `\nConclusion:\n${session.finalSynthesis.conclusion}\n`
  }
  
  summary += `\nTotal Tokens Used: ${session.totalTokensUsed}`
  summary += `\nEstimated Cost: $${session.estimatedCost.toFixed(4)}`
  
  return summary
}