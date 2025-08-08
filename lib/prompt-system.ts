export type ResponseLength = 'concise' | 'normal' | 'detailed';

export const generateModelPrompt = (userQuery: string, responseLength: ResponseLength = 'normal') => {
  const lengthInstructions = {
    concise: 'Answer with a ranked numbered list of SINGLE-WORD or MINIMAL-TOKEN items (e.g., "MBA, MSc, BSc"). No sentences.',
    normal: 'Answer in 3-5 sentences with key reasoning and context.',
    detailed: 'Provide comprehensive answer with examples, nuances, and full explanation (6+ sentences).'
  };

  // For concise mode, we want extremely brief, list-style responses
  const outputFormat = responseLength === 'concise' ? `
 [MAIN ANSWER]
 ${lengthInstructions[responseLength]}
 Examples:
 - best degree for founders? => "1. MBA 2. MSc 3. BSc"
 - top 3 coding tools => "1. Copilot 2. Cursor 3. Replit"
 - yes/no => "Yes" or "No"

 [CONFIDENCE: XX%]
 Rate your confidence 0-100%

 CRITICAL: OUTPUT ONLY THE NUMBERED LIST WITH SINGLE-WORD/MINIMAL-TOKEN ITEMS AND THE CONFIDENCE. NO sentences, NO explanations, NO meta-commentary.
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
    ${responseLength === 'concise' ? '- FOR CONCISE MODE: Only one-word/minimal tokens in the numbered list. No extra words.' : ''}

4. QUALITY CHECK:
   Before responding, verify: "Would an intelligent non-expert understand this answer and trust its reasoning?"

Remember: Accuracy with acknowledged uncertainty is better than confident incorrectness.

 ${responseLength === 'concise' ? 'FINAL REMINDER FOR CONCISE MODE: ONLY the numbered list of single-word/minimal-token items and the confidence percentage. Nothing else.' : ''}

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
