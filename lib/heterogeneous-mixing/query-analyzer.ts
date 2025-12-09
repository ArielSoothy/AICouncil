/**
 * Query Analysis System for Heterogeneous Model Mixing
 * 
 * Based on research finding: "25% improvement from mixing different model families"
 * Different training data = different knowledge patterns
 * Different architectures = different reasoning approaches
 */

export type QueryType = 
  | 'mathematical'    // Math, calculations, logic problems
  | 'creative'        // Writing, brainstorming, artistic
  | 'analytical'      // Data analysis, research, investigation  
  | 'factual'         // Knowledge retrieval, definitions, facts
  | 'reasoning'       // Complex reasoning, philosophy, ethics
  | 'technical'       // Programming, engineering, technical docs
  | 'conversational'  // General chat, explanations, discussion
  | 'multilingual'    // Non-English content
  | 'current-events'  // Time-sensitive, recent information
  | 'comparative'     // Comparisons, evaluations, recommendations

export type ModelFamily = 
  | 'openai'         // GPT family - strong at reasoning
  | 'anthropic'      // Claude family - strong at analysis  
  | 'google'         // Gemini family - strong at factual knowledge
  | 'groq'           // Llama family - strong at speed + tool use
  | 'xai'            // Grok family - strong at current events
  | 'mistral'        // Strong at technical content
  | 'cohere'         // Strong at enterprise use cases

export interface QueryAnalysis {
  primaryType: QueryType
  secondaryTypes: QueryType[]
  complexity: 'low' | 'medium' | 'high' | 'very-high'
  requiresWebSearch: boolean
  requiresMultiStep: boolean
  confidence: number
  keywords: string[]
  reasoning: string
}

export interface ModelFamilyStrengths {
  [key: string]: {
    queryTypes: QueryType[]
    strengths: string[]
    weaknesses: string[]
    optimalFor: string[]
  }
}

/**
 * Model family strengths based on benchmarks and research
 */
export const MODEL_FAMILY_STRENGTHS: ModelFamilyStrengths = {
  openai: {
    queryTypes: ['reasoning', 'mathematical', 'technical', 'conversational'],
    strengths: ['Complex reasoning', 'Mathematical accuracy', 'Code generation', 'Instruction following'],
    weaknesses: ['Knowledge cutoff', 'Factual hallucinations', 'Cost'],
    optimalFor: ['Problem solving', 'Programming', 'Analysis', 'Chain-of-thought reasoning']
  },
  anthropic: {
    queryTypes: ['analytical', 'reasoning', 'factual', 'conversational'],
    strengths: ['Safety', 'Nuanced analysis', 'Factual accuracy', 'Ethical reasoning'],
    weaknesses: ['Speed', 'Mathematical computation', 'Cost'],
    optimalFor: ['Research', 'Analysis', 'Safety-critical decisions', 'Detailed explanations']
  },
  google: {
    queryTypes: ['factual', 'multilingual', 'current-events', 'comparative'],
    strengths: ['Knowledge breadth', 'Multilingual', 'Integration with Google services', 'Speed'],
    weaknesses: ['Reasoning depth', 'Instruction following', 'Consistency'],
    optimalFor: ['Knowledge queries', 'Translation', 'Quick answers', 'Factual lookup']
  },
  groq: {
    queryTypes: ['technical', 'conversational', 'current-events', 'analytical'],
    strengths: ['Speed', 'Function calling', 'Tool use', 'Open source models'],
    weaknesses: ['Reasoning complexity', 'Knowledge depth', 'Consistency'],
    optimalFor: ['Tool use', 'Web search', 'Quick processing', 'Function calling']
  },
  xai: {
    queryTypes: ['current-events', 'conversational', 'creative', 'comparative'],
    strengths: ['Current events', 'Real-time information', 'Wit and humor', 'Twitter integration'],
    weaknesses: ['Academic tasks', 'Technical depth', 'Safety', 'Cost'],
    optimalFor: ['Current events', 'Social media analysis', 'Trend analysis', 'News summarization']
  },
  mistral: {
    queryTypes: ['technical', 'reasoning', 'multilingual', 'analytical'],
    strengths: ['European perspective', 'Technical content', 'Multilingual', 'Open source'],
    weaknesses: ['Knowledge breadth', 'Tool integration', 'Speed'],
    optimalFor: ['Technical documentation', 'European context', 'Multilingual content', 'Code analysis']
  },
  cohere: {
    queryTypes: ['analytical', 'factual', 'comparative', 'conversational'],
    strengths: ['Enterprise features', 'Search integration', 'RAG optimization', 'Accuracy'],
    weaknesses: ['Creative tasks', 'Mathematical reasoning', 'Speed'],
    optimalFor: ['Enterprise search', 'Document analysis', 'Business intelligence', 'RAG systems']
  }
}

/**
 * Query patterns for type detection
 */
const QUERY_PATTERNS = {
  mathematical: [
    /\b(calculate|compute|solve|equation|formula|math|arithmetic|algebra|geometry|statistics)\b/i,
    /\b(sum|average|mean|median|derivative|integral|probability|percentage)\b/i,
    /[0-9]+\s*[\+\-\*\/\=\^]/,
    /\$[0-9,]+|\b[0-9]+%|\b[0-9]+\.[0-9]+/
  ],
  creative: [
    /\b(write|create|generate|compose|draft|brainstorm|imagine|story|poem|creative)\b/i,
    /\b(artistic|design|marketing|brand|campaign|slogan|creative brief)\b/i,
    /\b(novel|fiction|character|plot|narrative|screenplay)\b/i
  ],
  analytical: [
    /\b(analyze|examine|investigate|research|study|evaluate|assess|compare)\b/i,
    /\b(data|trends|patterns|insights|findings|conclusions|hypothesis)\b/i,
    /\b(pros and cons|advantages|disadvantages|strengths|weaknesses)\b/i
  ],
  factual: [
    /\b(what is|define|definition|explain|describe|who|where|when|how many)\b/i,
    /\b(fact|information|knowledge|encyclopedia|reference|lookup)\b/i,
    /\b(history|biography|geography|science|biology|chemistry|physics)\b/i
  ],
  reasoning: [
    /\b(why|because|reason|logic|argument|philosophy|ethics|moral|debate)\b/i,
    /\b(if.*then|cause.*effect|implication|consequence|therefore|hence)\b/i,
    /\b(critical thinking|decision|judgment|reasoning|rationale)\b/i
  ],
  technical: [
    /\b(code|programming|software|algorithm|function|api|database|system)\b/i,
    /\b(javascript|python|react|node|sql|git|docker|aws|azure|cloud)\b/i,
    /\b(debug|error|fix|optimize|architecture|design pattern|framework)\b/i
  ],
  conversational: [
    /\b(hello|hi|thanks|please|help|can you|could you|would you)\b/i,
    /\b(opinion|think|feel|believe|suggest|recommend|advice)\b/i,
    /\b(chat|talk|discuss|conversation|general|casual)\b/i
  ],
  multilingual: [
    /[^\x00-\x7F]/,  // Non-ASCII characters
    /\b(translate|translation|language|français|español|deutsch|中文|日本語)\b/i
  ],
  'current-events': [
    /\b(news|current|recent|today|yesterday|this week|latest|breaking)\b/i,
    /\b(2024|2025|now|currently|presently|at the moment)\b/i,
    /\b(trending|viral|happening|update|development)\b/i
  ],
  comparative: [
    /\b(vs|versus|compare|comparison|better|best|worse|worst|prefer)\b/i,
    /\b(difference|similar|contrast|alternative|option|choice)\b/i,
    /\b(ranking|top|list|recommend|suggestion|which should)\b/i
  ]
}

/**
 * Analyze query to determine type and characteristics
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const normalizedQuery = query.toLowerCase().trim()
  
  // Score each query type
  const typeScores: Record<QueryType, number> = {
    mathematical: 0,
    creative: 0,
    analytical: 0,
    factual: 0,
    reasoning: 0,
    technical: 0,
    conversational: 0,
    multilingual: 0,
    'current-events': 0,
    comparative: 0
  }
  
  // Calculate scores based on pattern matching
  for (const [type, patterns] of Object.entries(QUERY_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = normalizedQuery.match(pattern)
      if (matches) {
        typeScores[type as QueryType] += matches.length
      }
    }
  }
  
  // Special scoring adjustments
  if (query.length > 500) typeScores.analytical += 2
  if (query.includes('?')) typeScores.factual += 1
  if (query.split(' ').length < 5) typeScores.conversational += 1
  if (/\b(urgent|asap|quickly|fast|immediate)\b/i.test(query)) typeScores['current-events'] += 1
  
  // Sort by score to get primary and secondary types
  const sortedTypes = Object.entries(typeScores)
    .sort(([,a], [,b]) => b - a)
    .filter(([,score]) => score > 0)
  
  const primaryType = sortedTypes[0]?.[0] as QueryType || 'conversational'
  const secondaryTypes = sortedTypes.slice(1, 3).map(([type]) => type as QueryType)
  
  // Determine complexity
  const complexityIndicators = [
    query.length > 200,
    query.split('.').length > 3,
    /\b(multiple|several|various|complex|detailed|comprehensive)\b/i.test(query),
    secondaryTypes.length > 1,
    typeScores[primaryType] < 2  // Ambiguous queries are often complex
  ]
  
  const complexityScore = complexityIndicators.filter(Boolean).length
  const complexity = complexityScore >= 4 ? 'very-high' : 
                    complexityScore >= 3 ? 'high' : 
                    complexityScore >= 2 ? 'medium' : 'low'
  
  // Check if web search is needed
  const requiresWebSearch = typeScores['current-events'] > 0 ||
                           /\b(latest|recent|current|2024|2025|news|price|stock)\b/i.test(query)
  
  // Check if multi-step reasoning is needed
  const requiresMultiStep = complexity === 'high' || complexity === 'very-high' ||
                           typeScores.analytical > 2 || typeScores.reasoning > 2
  
  // Calculate confidence (higher when primary type dominates)
  const totalScore = Object.values(typeScores).reduce((a, b) => a + b, 0)
  const primaryScore = typeScores[primaryType]
  const confidence = totalScore > 0 ? Math.min(0.95, primaryScore / totalScore + 0.3) : 0.5
  
  // Extract keywords (most relevant terms)
  const keywords = extractKeywords(query, 5)
  
  // Generate reasoning
  const reasoning = generateReasoning(primaryType, secondaryTypes, complexity, requiresWebSearch)
  
  return {
    primaryType,
    secondaryTypes,
    complexity,
    requiresWebSearch,
    requiresMultiStep,
    confidence,
    keywords,
    reasoning
  }
}

/**
 * Extract key terms from query
 */
function extractKeywords(query: string, limit: number): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can'])
  
  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
  
  // Simple frequency counting
  const frequency: Record<string, number> = {}
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([word]) => word)
}

/**
 * Generate reasoning explanation
 */
function generateReasoning(primary: QueryType, secondary: QueryType[], complexity: string, requiresWebSearch: boolean): string {
  const parts = [
    `Primary type: ${primary}`,
    secondary.length > 0 ? `Secondary: ${secondary.join(', ')}` : null,
    `Complexity: ${complexity}`,
    requiresWebSearch ? 'Requires current information' : null
  ].filter(Boolean)
  
  return parts.join(', ')
}