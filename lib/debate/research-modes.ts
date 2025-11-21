/**
 * Research Modes for Debate Engine
 *
 * Based on MADR (Multi-Agent Debate Refinement) and Google DeepMind research:
 * - Centralized: One model gathers research, injects into all agents
 * - Distributed: Each agent conducts its own research independently
 * - Hybrid: Base research + agents can request additional searches
 *
 * @see https://arxiv.org/abs/2311.17371 - "Should we be going MAD?"
 * @see Google DeepMind Debate Protocol - "Doubly-efficient debate"
 */

export type ResearchMode = 'centralized' | 'distributed' | 'hybrid'

export interface ResearchModeConfig {
  id: ResearchMode
  name: string
  description: string
  icon: string
  pros: string[]
  cons: string[]
  recommendedFor: string[]
  estimatedTime: string
  estimatedCost: 'low' | 'medium' | 'high'
}

/**
 * Research Mode Configurations
 *
 * Academic backing:
 * - Centralized mirrors Google's approach: consistent facts prevent "obfuscated arguments"
 * - Distributed aligns with "heterogeneous agent discussion" (MIT 2024): different perspectives
 * - Hybrid combines both, similar to MADR's iterative refinement process
 */
export const RESEARCH_MODES: Record<ResearchMode, ResearchModeConfig> = {
  centralized: {
    id: 'centralized',
    name: 'Centralized Research',
    description: 'One model gathers all research, then shares findings with all debate agents',
    icon: '🎯',
    pros: [
      'Consistent facts for all agents',
      'Faster (single research phase)',
      'Lower cost (fewer API calls)',
      'Prevents conflicting "facts"',
      'Easier to verify sources'
    ],
    cons: [
      'Single model\'s search biases',
      'May miss diverse perspectives',
      'Research model becomes bottleneck'
    ],
    recommendedFor: [
      'Factual queries',
      'Quick decisions',
      'Budget-conscious usage',
      'When consistency matters most'
    ],
    estimatedTime: '10-15 seconds',
    estimatedCost: 'low'
  },

  distributed: {
    id: 'distributed',
    name: 'Distributed Research',
    description: 'Each agent conducts its own research independently using its preferred methods',
    icon: '🔀',
    pros: [
      'Diverse research perspectives',
      'Each model uses its strengths',
      'More comprehensive coverage',
      'Different sources discovered',
      'Reduces single-point bias'
    ],
    cons: [
      'Slower (multiple research phases)',
      'Higher cost (more API calls)',
      'May find conflicting "facts"',
      'Harder to reconcile sources'
    ],
    recommendedFor: [
      'Complex decisions',
      'When thoroughness matters',
      'Controversial topics',
      'When diverse perspectives needed'
    ],
    estimatedTime: '30-60 seconds',
    estimatedCost: 'high'
  },

  hybrid: {
    id: 'hybrid',
    name: 'Hybrid Research',
    description: 'Base research shared with all, plus agents can request additional targeted searches',
    icon: '🔄',
    pros: [
      'Balanced approach',
      'Consistent base + diverse additions',
      'Agents fill gaps they identify',
      'Best of both worlds',
      'Adaptive to query complexity'
    ],
    cons: [
      'Medium cost',
      'More complex to implement',
      'Research phases may overlap'
    ],
    recommendedFor: [
      'Medium-complexity decisions',
      'When unsure which mode is best',
      'Iterative exploration',
      'Domain-specific queries with general context'
    ],
    estimatedTime: '20-40 seconds',
    estimatedCost: 'medium'
  }
}

/**
 * Get recommended research mode based on query characteristics
 */
export function getRecommendedResearchMode(query: string, options?: {
  isTimeSensitive?: boolean
  isBudgetConstrained?: boolean
  isControversial?: boolean
  requiresDiversity?: boolean
}): ResearchMode {
  const {
    isTimeSensitive = false,
    isBudgetConstrained = false,
    isControversial = false,
    requiresDiversity = false
  } = options || {}

  // Time/budget sensitive → centralized
  if (isTimeSensitive || isBudgetConstrained) {
    return 'centralized'
  }

  // Controversial or needs diversity → distributed
  if (isControversial || requiresDiversity) {
    return 'distributed'
  }

  // Complex queries (long, multiple aspects) → hybrid
  const wordCount = query.split(/\s+/).length
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1
  const hasComparison = /vs|versus|compare|or|better|best/i.test(query)

  if (wordCount > 30 || hasMultipleQuestions || hasComparison) {
    return 'hybrid'
  }

  // Default to centralized (fastest, cheapest)
  return 'centralized'
}

/**
 * Research Mode Provider Interface
 * Each mode implements this to conduct research differently
 */
export interface ResearchProvider {
  mode: ResearchMode

  /**
   * Conduct research for the debate
   * @param query - The user's query
   * @param agents - The agents participating in debate
   * @param onProgress - Progress callback for UI updates
   * @returns Research results per agent (or shared for centralized)
   */
  conductResearch(
    query: string,
    agents: AgentConfig[],
    onProgress?: (event: ResearchProgressEvent) => void
  ): Promise<ResearchResults>
}

export interface AgentConfig {
  agentId: string
  role: 'analyst' | 'critic' | 'judge' | 'synthesizer'
  provider: string
  model: string
}

export interface ResearchProgressEvent {
  type: 'research_start' | 'agent_research_start' | 'search_complete' | 'research_complete'
  mode: ResearchMode
  agentId?: string
  step?: string
  progress?: number // 0-100
  sourcesFound?: number
  timestamp: number
}

export interface ResearchResults {
  mode: ResearchMode

  /**
   * Shared research (for centralized mode, or base research for hybrid)
   */
  sharedResearch?: ResearchFindings

  /**
   * Per-agent research (for distributed mode, or additional research for hybrid)
   */
  agentResearch?: Record<string, ResearchFindings>

  /**
   * Total sources found across all research
   */
  totalSources: number

  /**
   * Total time spent researching
   */
  totalDuration: number

  /**
   * Estimated cost of research
   */
  estimatedCost: number
}

export interface ResearchFindings {
  query: string
  sources: SourceInfo[]
  factualFindings: string
  expertPerspectives: string[]
  evidenceQuality: 'high' | 'medium' | 'low'
  confidence: number // 0-100
  searchQueries: string[]
  duration: number
  timestamp: Date
}

export interface SourceInfo {
  url: string
  title: string
  snippet: string
  relevance: number // 0-100
  trustScore?: number // 0-100
}

/**
 * Format research for injection into agent prompts
 */
export function formatResearchForPrompt(
  research: ResearchResults,
  agentId?: string
): string {
  const { mode, sharedResearch, agentResearch } = research

  let researchSection = `
--- RESEARCH FINDINGS (Mode: ${mode.toUpperCase()}) ---

`

  // Add shared research
  if (sharedResearch) {
    researchSection += `**SHARED RESEARCH** (${sharedResearch.sources.length} sources, ${sharedResearch.evidenceQuality} quality):

${sharedResearch.factualFindings}

Sources: ${sharedResearch.sources.map(s => s.title || s.url).join(', ')}

`
  }

  // Add agent-specific research (for distributed/hybrid)
  if (agentResearch && agentId && agentResearch[agentId]) {
    const agentFindings = agentResearch[agentId]
    researchSection += `**YOUR ADDITIONAL RESEARCH** (${agentFindings.sources.length} sources):

${agentFindings.factualFindings}

`
  }

  researchSection += `--- END RESEARCH FINDINGS ---

CRITICAL INSTRUCTIONS:
- Base your analysis ONLY on the research findings provided above
- DO NOT invent facts, studies, or statistics
- Cite specific sources when making claims
- If research doesn't cover something, state "insufficient data on [topic]"
- Your role is to ANALYZE the research, not create new research

`

  return researchSection
}

/**
 * Merge multiple research findings (for hybrid mode or aggregation)
 */
export function mergeResearchFindings(
  findings: ResearchFindings[]
): ResearchFindings {
  if (findings.length === 0) {
    throw new Error('Cannot merge empty findings array')
  }

  if (findings.length === 1) {
    return findings[0]
  }

  // Combine all sources (deduplicate by URL)
  const sourceMap = new Map<string, SourceInfo>()
  findings.forEach(f => {
    f.sources.forEach(s => {
      if (!sourceMap.has(s.url)) {
        sourceMap.set(s.url, s)
      }
    })
  })

  // Combine findings text
  const combinedFindings = findings
    .map(f => f.factualFindings)
    .filter(Boolean)
    .join('\n\n---\n\n')

  // Combine perspectives (deduplicate)
  const allPerspectives = [...new Set(findings.flatMap(f => f.expertPerspectives))]

  // Average confidence and determine quality
  const avgConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length
  const qualities = findings.map(f => f.evidenceQuality)
  const qualityScore = {
    high: 3,
    medium: 2,
    low: 1
  }
  const avgQualityScore = qualities.reduce((sum, q) => sum + qualityScore[q], 0) / qualities.length
  const evidenceQuality: 'high' | 'medium' | 'low' =
    avgQualityScore >= 2.5 ? 'high' :
    avgQualityScore >= 1.5 ? 'medium' : 'low'

  return {
    query: findings[0].query,
    sources: Array.from(sourceMap.values()),
    factualFindings: combinedFindings,
    expertPerspectives: allPerspectives,
    evidenceQuality,
    confidence: Math.round(avgConfidence),
    searchQueries: [...new Set(findings.flatMap(f => f.searchQueries))],
    duration: findings.reduce((sum, f) => sum + f.duration, 0),
    timestamp: new Date()
  }
}

export default RESEARCH_MODES
