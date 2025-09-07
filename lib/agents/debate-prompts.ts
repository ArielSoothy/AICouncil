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
  previousMessages: AgentMessage[],
  responseMode: string = 'normal'
): string {
  // ENGAGING DEBATE APPROACH: Real debate from the start
  if (round === 1) {
    if (previousMessages.length === 0) {
      // First agent: Strong opening statement that invites debate
      return generateDebateOpeningPrompt(query, agent, responseMode)
    } else {
      // Other agents in Round 1: Respond to and challenge previous agents
      return generateDebateResponsePrompt(query, agent, previousMessages, responseMode)
    }
  } else {
    // Round 2+: Continue the debate with deeper analysis
    return generateContinuedDebatePrompt(query, agent, previousMessages)
  }
}

function generateDebateOpeningPrompt(query: string, agent: AgentPersona, responseMode: string = 'normal'): string {
  const basePrompt = `🎭 MULTI-AGENT DEBATE - OPENING STATEMENT (ROUND 1)

Query: ${query}

As ${agent.name}, you are opening this important debate. Your role is to present a compelling position that will spark meaningful discussion with other expert agents.

Your expertise areas:
${agent.focusAreas.map(area => `• ${area}`).join('\n')}

Key agent traits to embody:
${agent.traits.slice(0, 4).map(trait => `• ${trait}`).join('\n')}

🔥 ROUND 1 OBJECTIVES - EVIDENCE-BASED POSITION:
1. **Take a STRONG position** - Be confident in your expertise, don't hedge unnecessarily
2. **CITE SPECIFIC EVIDENCE** - Each claim must be supported with:
   - Data points, studies, or statistics when available
   - Real-world examples or case studies
   - Expert opinions or established principles
   - Clear sources (even if approximate: "According to industry studies..." "Recent research shows...")
3. **Present 3-4 key arguments** with detailed reasoning and evidence
4. **Be specific and actionable** - if recommending options, name specific examples with evidence
5. **FORCE DISAGREEMENT** - Make at least 2 claims that could reasonably be challenged:
   - Bold predictions or assessments
   - Strong preferences between alternatives
   - Definitive statements about cause-and-effect
6. **Show your work** - explain your reasoning process clearly with evidence trail

🎯 EVIDENCE REQUIREMENTS:
- Every major claim needs backing evidence
- Use phrases like: "Based on...", "Research indicates...", "Data shows...", "Industry analysis reveals..."
- If you don't have exact data, use reasonable estimates: "Approximately...", "Studies suggest...", "Evidence indicates..."

Remember: This is Round 1 of a STRUCTURED DEBATE. Other expert agents will challenge your position with counter-evidence in Round 2. Present arguments that are both evidence-based and controversial enough to debate.

${responseMode === 'concise' 
    ? 'Be direct and impactful - aim for 100-150 words but pack them with strong, evidence-backed arguments that demand challenge.'
    : 'Be thorough and engaging - aim for 300-400 words with solid evidence for each major point to give other agents substantial material to counter.'
  }

🎯 Your opening statement should make other agents think "I have evidence that contradicts this!"

Begin your response now:`

  return basePrompt
}

function generateInitialPrompt(query: string, agent: AgentPersona): string {
  const basePrompt = `MULTI-AGENT DEBATE - ROUND 1 OPENING STATEMENT

Query: ${query}

As ${agent.name}, you are the FIRST speaker in this debate. Your role is to present a clear position that other agents will respond to and challenge. Focus on your areas of expertise:
${agent.focusAreas.map(area => `- ${area}`).join('\n')}

DEBATE CONTEXT: You know that a Critic will challenge your position and a Synthesizer will build on the discussion. Present arguments that invite productive disagreement and deeper analysis.

Your opening statement should:
1. **Take a clear position** - Don't hedge too much, be willing to make claims
2. **Present 2-3 strong supporting arguments** with evidence
3. **Anticipate counterarguments** - briefly acknowledge potential objections
4. **Be specific** - If it's a recommendation query, suggest concrete options
5. **State your confidence level** and what additional info would strengthen your case

Remember: This is a DEBATE. Be confident in your expertise while remaining open to challenge.

Keep focused and under 200 words.`

  return basePrompt
}

function generateDebateResponsePrompt(
  query: string,
  agent: AgentPersona,
  previousMessages: AgentMessage[],
  responseMode: string = 'normal'
): string {
  // Group messages by agent
  const otherAgentMessages = previousMessages.filter(m => m.agentId !== agent.id)
  
  // Create condensed or full summaries based on mode
  const previousPositions = responseMode === 'concise' 
    ? otherAgentMessages.map(m => 
        `${m.role.toUpperCase()}: ${extractKeyPoints(m.content)}`
      ).join('\n')
    : otherAgentMessages.map(m => 
        `${m.role.toUpperCase()} argued: ${m.content.substring(0, 200)}...`
      ).join('\n\n')
  
  const wordTarget = responseMode === 'concise' ? '100-150 words' : '250-350 words'
  const debateStyle = responseMode === 'concise' 
    ? 'Be direct and punchy. Make your key points clearly and challenge efficiently.'
    : 'This is a REAL debate - don\'t just politely add your perspective. Challenge assumptions, point out flaws, defend positions, and make compelling counter-arguments.'
  
  return `🔥 ROUND 1 RESPONSE - EVIDENCE-BASED COUNTER-CHALLENGE

Original Query: ${query}

Previous Arguments to Address:
${previousPositions}

As ${agent.name}, it's time to enter this debate! Your role is to challenge previous positions with superior evidence and reasoning.

Your expertise areas:
${agent.focusAreas.map(area => `• ${area}`).join('\n')}

Your key traits to embody:
${agent.traits.slice(0, 4).map(trait => `• ${trait}`).join('\n')}

🎯 ROUND 1 RESPONSE OBJECTIVES - COUNTER-EVIDENCE:
1. **CHALLENGE WITH SUPERIOR EVIDENCE** - For each major disagreement, provide:
   - Counter-data or contradictory studies
   - Alternative examples or case studies  
   - Different expert opinions or analysis
   - Evidence gaps in their arguments
2. **Address specific claims** - Quote or reference what previous agents said, then counter with evidence
3. **FORCE DEEPER DISAGREEMENT** - Don't just add perspective, actively challenge:
   - "The Analyst claims X, but evidence shows Y..."
   - "This contradicts recent research that demonstrates..."
   - "Industry data reveals the opposite pattern..."
4. **Present your evidence-backed alternative** - What's YOUR take with supporting data?
5. **Expose evidence gaps** - Point out unsupported claims: "No evidence was provided for..."
6. **Make it confrontational** - Use strong disagreement language:
   - "I strongly disagree with [Agent] because the evidence shows..."
   - "While [Agent] claims X, data clearly demonstrates Y..."
   - "This assessment ignores critical evidence..."

🎯 EVIDENCE COMBAT REQUIREMENTS:
- Counter every major claim with specific opposing evidence
- Use phrases: "However, data shows...", "Contrary evidence indicates...", "Research contradicts this by..."
- Call out unsupported claims: "This lacks evidence..." "No data supports..."
- Present competing evidence: "Alternative studies show..." "Different analysis reveals..."

${debateStyle}

Remember: This is ROUND 1 - establish MAXIMUM DISAGREEMENT with evidence. Round 2 will resolve conflicts. Your job now is to create productive tension through superior evidence.

Aim for ${wordTarget} with focused counter-evidence.

⚔️ Challenge their evidence now with superior data:`
}

// Helper function to extract key points for concise mode
function extractKeyPoints(content: string): string {
  // Extract the most important sentences (first sentence + any numbered points + conclusion)
  const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 10);
  const keyParts = [];
  
  // Add first sentence
  if (sentences[0]) keyParts.push(sentences[0].trim());
  
  // Add any numbered recommendations
  const numberedPoints = sentences.filter(s => /^\s*[123]\./.test(s.trim()));
  if (numberedPoints.length > 0) {
    keyParts.push(numberedPoints.join(', '));
  }
  
  // Keep it under 50 words total
  const result = keyParts.join('. ').substring(0, 200);
  return result + (result.length >= 200 ? '...' : '.');
}

function generateContinuedDebatePrompt(
  query: string,
  agent: AgentPersona,
  previousMessages: AgentMessage[]
): string {
  // Get all messages from previous rounds
  const roundHistory = previousMessages.map((m, i) => 
    `Round ${m.round} - ${m.role.toUpperCase()}: ${m.content.substring(0, 180)}...`
  ).join('\n\n')
  
  return `🔄 ROUND 2 - EVIDENCE SYNTHESIS & RESOLUTION

Original Query: ${query}

Debate History So Far:
${roundHistory}

As ${agent.name}, Round 2 has different objectives! You've heard conflicting evidence from Round 1. Now it's time to RESOLVE disagreements through deeper analysis and evidence synthesis.

Your expertise areas:
${agent.focusAreas.map(area => `• ${area}`).join('\n')}

🧠 ROUND 2 OBJECTIVES - RESOLUTION THROUGH EVIDENCE:
1. **EVIDENCE SYNTHESIS** - Analyze conflicting evidence from Round 1:
   - Which evidence is stronger and why?
   - What are the quality/reliability differences?
   - Where can opposing evidence coexist?
   - What evidence gaps remain unresolved?
2. **REFINED POSITION** - Based on all evidence presented:
   - Acknowledge where opponents had valid points
   - Strengthen your position with additional evidence
   - Adjust your stance where evidence demands it
   - Maintain disagreement only where evidence truly conflicts
3. **RESOLVE OR MAINTAIN CONFLICTS** - For each major disagreement:
   - Attempt resolution through better evidence analysis
   - If resolution impossible, explain exactly why evidence conflicts
   - Propose ways to resolve evidence gaps (testing, research needed)
4. **PUSH TOWARD SYNTHESIS** - Help move toward practical conclusion:
   - What specific actions does the evidence support?
   - What are the evidence-based trade-offs?
   - Where do we have sufficient vs insufficient evidence?

🎯 EVIDENCE RESOLUTION FRAMEWORK:
- "Based on the evidence exchange, I now see..."
- "While I initially argued X, the evidence for Y is compelling because..."
- "The evidence clearly supports X over Y due to..."
- "We lack sufficient evidence to resolve X, suggesting we need..."

This is ROUND 2 - move from CONFLICT toward RESOLUTION. Show how the evidence exchange has refined your thinking and moved us closer to an optimal, evidence-based solution.

Aim for 250-350 words focused on evidence synthesis and practical resolution.

🎯 Synthesize the evidence toward resolution:`
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