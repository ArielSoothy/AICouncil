/**
 * Test Utilities
 * 
 * Common functions and utilities for testing AI Council features.
 */

const API_BASE = 'http://localhost:3000';

/**
 * Create a standardized test agent configuration
 */
function createTestAgent(role, provider, model, name = null) {
  const roles = {
    'analyst': {
      name: name || 'Test Analyst',
      description: 'Data-driven analysis agent',
      systemPrompt: 'You are a helpful analyst who provides data-driven insights.',
      color: '#3B82F6',
      traits: ['analytical', 'detail-oriented'],
      focusAreas: ['data analysis', 'research']
    },
    'critic': {
      name: name || 'Test Critic', 
      description: 'Critical evaluation agent',
      systemPrompt: 'You are a skeptical critic who challenges assumptions.',
      color: '#EF4444',
      traits: ['skeptical', 'thorough'],
      focusAreas: ['critical analysis', 'problem identification']
    },
    'synthesizer': {
      name: name || 'Test Synthesizer',
      description: 'Synthesis and conclusion agent', 
      systemPrompt: 'You are a synthesizer who combines different perspectives.',
      color: '#10B981',
      traits: ['balanced', 'comprehensive'],
      focusAreas: ['synthesis', 'conclusion']
    }
  };

  return {
    provider,
    model,
    enabled: true,
    persona: {
      role,
      id: `${role}-test`,
      ...roles[role]
    }
  };
}

/**
 * Call the debate API and collect results
 */
async function callDebateAPI(payload, timeout = 60000) {
  const response = await fetch(`${API_BASE}/api/agents/debate-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enableWebSearch: false,
      includeComparison: false,
      includeConsensusComparison: false,
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  const results = {
    agentResponses: [],
    synthesis: null,
    rounds: new Set(),
    events: []
  };

  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Test timeout exceeded');
    }

    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          results.events.push(data);
          
          if (data.type === 'model_completed') {
            results.agentResponses.push({
              agentName: data.agentName,
              agentRole: data.agentRole,
              round: data.round,
              responsePreview: data.responsePreview,
              fullResponse: data.fullResponse,
              tokensUsed: data.tokensUsed,
              model: data.modelName
            });
            results.rounds.add(data.round);
          }
          
          if (data.type === 'synthesis_completed') {
            results.synthesis = data.synthesis;
            break; // End of debate
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  }

  return results;
}

/**
 * Analyze response format to determine if it's natural text or structured
 */
function analyzeResponseFormat(text) {
  if (!text || typeof text !== 'string') {
    return { type: 'INVALID', details: 'No text provided' };
  }

  // Check for numbered list pattern (1. 2. 3.)
  const numberedListPattern = /^\s*1\.\s+.*\n\s*2\.\s+.*\n\s*3\.\s+/;
  if (numberedListPattern.test(text)) {
    return { 
      type: 'STRUCTURED_LIST', 
      details: 'Contains numbered list (1. 2. 3.)' 
    };
  }

  // Check for bullet points
  const bulletPattern = /^\s*[•\-\*]\s+.*\n\s*[•\-\*]\s+.*\n\s*[•\-\*]\s+/;
  if (bulletPattern.test(text)) {
    return { 
      type: 'BULLET_LIST', 
      details: 'Contains bullet points' 
    };
  }

  // Check if it's very short (likely truncated or error)
  if (text.length < 30) {
    return { 
      type: 'TOO_SHORT', 
      details: `Only ${text.length} characters` 
    };
  }

  // Check if it looks like natural paragraph text
  const hasMultipleSentences = (text.match(/\./g) || []).length >= 2;
  const hasNaturalFlow = !text.includes('\n\n') || text.split('\n\n').length <= 2;
  
  if (hasMultipleSentences && hasNaturalFlow) {
    return { 
      type: 'NATURAL_TEXT', 
      details: 'Natural paragraph format' 
    };
  }

  return { 
    type: 'UNKNOWN', 
    details: 'Format not recognized' 
  };
}

/**
 * Create mock agent responses for testing
 */
function createMockAgentResponse(role, format = 'NATURAL_TEXT') {
  const mockResponses = {
    NATURAL_TEXT: {
      analyst: "Based on my analysis of current scooter market data, I've identified several key factors that influence the best value propositions. The most important considerations include fuel efficiency, maintenance costs, and initial purchase price within your budget constraints.",
      critic: "While the previous analysis covers basic factors, I must point out several critical limitations in this approach. The analysis fails to adequately consider long-term reliability issues, insurance costs, and the specific challenges of highway riding between Tel Aviv and Jerusalem.",
      synthesizer: "Drawing from both perspectives, I can provide a balanced evaluation that considers both the analytical data and the critical concerns raised. The optimal approach requires balancing immediate affordability with long-term value and safety considerations."
    },
    STRUCTURED_LIST: {
      analyst: "Based on market analysis:\n1. Honda PCX 150\n2. Yamaha SMAX 155\n3. Suzuki Burgman 200\nThe Honda PCX offers the best reliability.",
      critic: "Critical evaluation reveals:\n1. Budget constraints limit options\n2. Highway capability is questionable\n3. Maintenance costs vary significantly\nMost recommendations overlook practical limitations.",
      synthesizer: "Synthesis of recommendations:\n1. Kymco Downtown 300i\n2. Honda PCX 150\n3. Yamaha SMAX 155\nThe Kymco Downtown provides the best balance."
    }
  };

  return mockResponses[format][role] || "Mock response not found";
}

/**
 * Validate test environment
 */
async function validateTestEnvironment() {
  try {
    const response = await fetch(`${API_BASE}/api/models`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for a specified number of milliseconds
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Compare two responses for similarity
 */
function compareResponses(response1, response2) {
  if (!response1 || !response2) return 0;
  
  const words1 = response1.toLowerCase().split(/\s+/);
  const words2 = response2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / totalWords;
}

module.exports = {
  createTestAgent,
  callDebateAPI,
  analyzeResponseFormat,
  createMockAgentResponse,
  validateTestEnvironment,
  delay,
  compareResponses,
  API_BASE
};