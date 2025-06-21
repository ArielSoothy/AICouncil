export type ResponseLength = 'concise' | 'normal' | 'detailed';

export const generateModelPrompt = (userQuery: string, responseLength: ResponseLength = 'normal') => {
  const lengthInstructions = {
    concise: 'Answer with a numbered list or very brief phrase (maximum 10-15 words total).',
    normal: 'Answer in 3-5 sentences with key reasoning and context.',
    detailed: 'Provide comprehensive answer with examples, nuances, and full explanation (6+ sentences).'
  };

  // For concise mode, we want extremely brief, list-style responses
  const outputFormat = responseLength === 'concise' ? `
[MAIN ANSWER]
${lengthInstructions[responseLength]}
Examples: 
- For "top 3 AI coding tools for solo entrepreneurs": "1. GitHub Copilot 2. Cursor 3. Replit"
- For "best programming language": "Python (versatility, ease)"
- For yes/no questions: "Yes" or "No" with 1-2 word reason

[CONFIDENCE: XX%]
Rate your confidence 0-100%

CRITICAL: OUTPUT ONLY THE NUMBERED LIST/ANSWER AND CONFIDENCE. NO explanations, disclaimers, notes, context, or meta-commentary whatsoever.
` : `
[MAIN ANSWER]
Provide your clearest answer here. Write as if explaining to an intelligent person who isn't a specialist.
${lengthInstructions[responseLength]}

[CONFIDENCE: XX%]
Rate your confidence 0-100% based on:
- Quality of available data (40% weight)
- Clarity of the question (20% weight)  
- Your knowledge depth on this topic (40% weight)

[KEY EVIDENCE]
• Primary fact/research supporting this answer
• Source domain or field of knowledge (if applicable)
• One additional supporting point (if relevant)

[LIMITATIONS]
• What uncertainty remains?
• When would this answer NOT apply?
• What additional information would improve confidence?
`;

  return `
You are being consulted as part of a multi-AI consensus system for important decisions.

QUESTION: ${userQuery}

RESPONSE REQUIREMENTS:

1. BASE YOUR ANSWER ON:
   - Verified facts and established research
   - Scientific consensus where applicable
   - Real-world data and evidence
   - If no solid data exists, clearly state: "This is based on limited information"

2. STRUCTURE YOUR RESPONSE EXACTLY AS FOLLOWS:
${outputFormat}

3. CRITICAL RULES:
   - If unsure about anything, say: "I'm uncertain about X because Y"
   - Never invent statistics, dates, or sources
   - Use clear, simple language - avoid jargon unless essential
   - If the question is ambiguous, state your interpretation clearly
   - Be precise with qualifiers (usually, often, sometimes vs always, never)
   ${responseLength === 'concise' ? '- FOR CONCISE MODE: NO disclaimers, notes, warnings, or meta-commentary. Output ONLY the numbered list/answer and confidence percentage. Do not add phrases like "Note:", "Please note:", "It\'s worth mentioning:", "Keep in mind:", etc.' : ''}

4. QUALITY CHECK:
   Before responding, verify: "Would an intelligent non-expert understand this answer and trust its reasoning?"

Remember: Accuracy with acknowledged uncertainty is better than confident incorrectness.

${responseLength === 'concise' ? 'FINAL REMINDER FOR CONCISE MODE: Your entire response must be ONLY the numbered list/brief answer followed by confidence percentage. Absolutely NO additional text, explanations, disclaimers, or commentary of any kind.' : ''}

Your response should enable other AI systems to identify points of agreement and disagreement for consensus building.
`;
};

// Helper function to extract structured data from model responses
export const parseModelResponse = (response: string) => {
  const sections = {
    mainAnswer: '',
    confidence: 0,
    keyEvidence: [] as string[],
    limitations: [] as string[]
  };

  // Extract main answer
  const mainMatch = response.match(/\[MAIN ANSWER\](.*?)(?=\[CONFIDENCE|$)/s);
  if (mainMatch) {
    sections.mainAnswer = mainMatch[1].trim();
  }

  // Extract confidence
  const confMatch = response.match(/\[CONFIDENCE:\s*(\d+)%\]/);
  if (confMatch) {
    sections.confidence = parseInt(confMatch[1]);
  }

  // Extract evidence points (only if present - not in concise mode)
  const evidenceMatch = response.match(/\[KEY EVIDENCE\](.*?)(?=\[LIMITATIONS|$)/s);
  if (evidenceMatch) {
    sections.keyEvidence = evidenceMatch[1]
      .split('•')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  // Extract limitations (only if present - not in concise mode)
  const limitMatch = response.match(/\[LIMITATIONS\](.*?)$/s);
  if (limitMatch) {
    sections.limitations = limitMatch[1]
      .split('•')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  return sections;
};
