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
  console.log(`[DEBUG PROMPT] ${agent.name} Round ${round}: ${previousMessages.length} previous messages`)
  
  // ENGAGING DEBATE APPROACH: Real debate from the start
  if (round === 1) {
    if (previousMessages.length === 0) {
      // First agent: Strong opening statement that invites debate
      console.log(`[DEBUG PROMPT] Using DEBATE OPENING prompt for ${agent.name}`)
      return generateDebateOpeningPrompt(query, agent, responseMode)
    } else {
      // Other agents in Round 1: Respond to and challenge previous agents
      console.log(`[DEBUG PROMPT] Using DEBATE RESPONSE prompt for ${agent.name}`)
      return generateDebateResponsePrompt(query, agent, previousMessages, responseMode)
    }
  } else {
    // Round 2+: Continue the debate with deeper analysis
    console.log(`[DEBUG PROMPT] Using CONTINUED DEBATE prompt for ${agent.name} with ${previousMessages.length} previous messages`)
    return generateContinuedDebatePrompt(query, agent, previousMessages)
  }
}

function generateDebateOpeningPrompt(query: string, agent: AgentPersona, responseMode: string = 'normal'): string {
  const basePrompt = `🎭 MULTI-AGENT DEBATE - OPENING STATEMENT

Query: ${query}

As ${agent.name}, you are opening this important debate. Your role is to present a compelling position that will spark meaningful discussion with other expert agents.

Your expertise areas:
${agent.focusAreas.map(area => `• ${area}`).join('\n')}

Key agent traits to embody:
${agent.traits.slice(0, 4).map(trait => `• ${trait}`).join('\n')}

🔥 DEBATE GUIDELINES:
1. **Take a STRONG position** - Be confident in your expertise, don't hedge unnecessarily
2. **Present 3-4 key arguments** with detailed reasoning and evidence
3. **Anticipate counterarguments** - acknowledge what others might challenge
4. **Be specific and actionable** - if recommending options, name specific examples
5. **Invite challenge** - make claims that other agents can meaningfully debate
6. **Show your work** - explain your reasoning process clearly

Remember: This is a DEBATE, not a report. Other expert agents will challenge your position. Present arguments that are both strong enough to defend and interesting enough to debate.

${responseMode === 'concise' 
    ? 'Be direct and impactful - aim for 100-150 words but pack them with strong arguments that demand response.'
    : 'Be thorough and engaging - aim for 300-400 words to give other agents substantial material to work with.'
  }

🎯 Your opening statement should make other agents think "I need to respond to that!"

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
  
  return `🔥 DEBATE RESPONSE - CHALLENGE AND COUNTER

Original Query: ${query}

Previous Arguments to Address:
${previousPositions}

As ${agent.name}, it's time to enter this debate! Your role is to thoughtfully challenge, build upon, or redirect the discussion based on your expertise.

Your expertise areas:
${agent.focusAreas.map(area => `• ${area}`).join('\n')}

Your key traits to embody:
${agent.traits.slice(0, 4).map(trait => `• ${trait}`).join('\n')}

🎯 DEBATE RESPONSE FRAMEWORK:
1. **Address specific claims** - Quote or reference what previous agents said
2. **Challenge with evidence** - Where do you disagree and why?
3. **Build on good points** - What do they get right that you can expand on?
4. **Present your alternative** - What's YOUR take on the solution/answer?
5. **Raise new considerations** - What did they miss from your expertise area?
6. **Make it personal** - Use "I disagree with [Agent] because..." or "While [Agent] makes a good point about X, they overlook Y..."

${debateStyle}

Aim for ${wordTarget} to give substance to your position.

⚔️ Enter the debate now with conviction:`
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
  
  return `🔄 CONTINUED DEBATE - ROUND ${previousMessages[0]?.round + 1 || 2}

Original Query: ${query}

Debate History So Far:
${roundHistory}

As ${agent.name}, the debate continues! You've heard from other agents and it's time to deepen the discussion, refine positions, or mount stronger counter-arguments.

Your expertise areas:
${agent.focusAreas.map(area => `• ${area}`).join('\n')}

🧠 ADVANCED DEBATE TACTICS:
1. **Synthesize and challenge** - What patterns do you see in others' arguments? What's missing?
2. **Double down or pivot** - Strengthen your previous position OR acknowledge where you might adjust
3. **Expose weak points** - Where are the logical gaps in opposing arguments?
4. **Bring new evidence** - What additional insights can your expertise provide?
5. **Force difficult decisions** - Push for specifics, trade-offs, or prioritization
6. **Bridge or differentiate** - Find unexpected common ground OR sharpen disagreements

This is round ${previousMessages[0]?.round + 1 || 2} - the stakes are higher. Don't repeat yourself; evolve the discussion. Show how this extended debate is leading to better insights.

Aim for 200-300 words with more nuanced arguments.

🚀 Advance the debate with deeper analysis:`
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