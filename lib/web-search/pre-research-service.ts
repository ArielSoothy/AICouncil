/**
 * Pre-Research Service for Agent Debates
 *
 * Implements the pre-research stage pattern instead of relying on
 * models to autonomously call web search tools.
 *
 * Why this exists:
 * - Models have web search tools but choose NOT to call them (toolCalls: 0)
 * - Models are trained to answer directly, not "research first"
 * - Pre-research ensures consistent, high-quality evidence for all debates
 *
 * @see docs/architecture/PRE_RESEARCH_ARCHITECTURE.md
 */

import { analyzeQuery, QueryAnalysis } from '@/lib/heterogeneous-mixing/query-analyzer'
import { getContextExtractor, ExtractedContext } from './context-extractor'
import { getWebSearchService, WebSearchResult } from './web-search-service'

// Simple in-memory cache for pre-research results
const researchCache = new Map<string, CachedResearch>()

interface CachedResearch {
  results: PreResearchResult
  timestamp: number
  ttlMinutes: number
}

export interface PreResearchResult {
  query: string
  queryAnalysis: QueryAnalysis
  searchResults: SearchResultSet[]
  formattedContext: string
  sources: string[]
  searchesExecuted: number
  cacheHit: boolean
  researchTime: number
}

export interface SearchResultSet {
  searchQuery: string
  role: 'general' | 'analyst' | 'critic' | 'synthesizer'
  results: WebSearchResult | null
}

export interface PreResearchConfig {
  enabled: boolean
  maxSearches: number
  maxResultsPerSearch: number
  cacheEnabled: boolean
  ttlMinutes?: number
  roleSpecificQueries: boolean
  forceSearch?: boolean  // When true, always execute search regardless of query analysis
}

const DEFAULT_CONFIG: PreResearchConfig = {
  enabled: true,
  maxSearches: 4,
  maxResultsPerSearch: 5,
  cacheEnabled: true,
  ttlMinutes: 60,
  roleSpecificQueries: true,
  forceSearch: false
}

/**
 * Determine TTL based on query type
 * Current events need fresh data, factual queries can be cached longer
 */
function getTTLForQueryType(analysis: QueryAnalysis): number {
  switch (analysis.primaryType) {
    case 'current-events':
      return 15 // 15 minutes for time-sensitive info
    case 'factual':
      return 240 // 4 hours for stable facts
    case 'technical':
      return 240 // 4 hours for technical docs
    case 'analytical':
      return 60 // 1 hour for analysis
    case 'comparative':
      return 120 // 2 hours for comparisons
    default:
      return 60 // 1 hour default
  }
}

/**
 * Generate a cache key for the query
 */
function getCacheKey(query: string): string {
  // Simple hash - could be improved with better hashing
  return `pre-research-${query.toLowerCase().trim().replace(/\s+/g, '-').substring(0, 100)}`
}

/**
 * Check if cached result is still valid
 */
function isCacheValid(cached: CachedResearch): boolean {
  const now = Date.now()
  const ageMinutes = (now - cached.timestamp) / (1000 * 60)
  return ageMinutes < cached.ttlMinutes
}

/**
 * Generate search queries based on query analysis
 */
function generateSearchQueries(
  query: string,
  analysis: QueryAnalysis,
  config: PreResearchConfig
): Array<{ query: string; role: SearchResultSet['role'] }> {
  const queries: Array<{ query: string; role: SearchResultSet['role'] }> = []

  // Always include the original query
  queries.push({ query, role: 'general' })

  // Add time-specific context for current events
  const timePrefix = analysis.primaryType === 'current-events' ? '2024 2025 latest ' : ''

  if (config.roleSpecificQueries) {
    // Generate role-specific queries using keywords
    const keywords = analysis.keywords.slice(0, 3).join(' ')

    // Analyst query: Focus on data and facts
    if (queries.length < config.maxSearches) {
      queries.push({
        query: `${timePrefix}${keywords} research data statistics analysis`,
        role: 'analyst'
      })
    }

    // Critic query: Focus on problems and limitations
    if (queries.length < config.maxSearches) {
      queries.push({
        query: `${timePrefix}${keywords} problems issues limitations drawbacks`,
        role: 'critic'
      })
    }

    // Synthesizer query: Focus on comparisons and alternatives
    if (queries.length < config.maxSearches) {
      queries.push({
        query: `${timePrefix}${keywords} comparison alternatives best options recommendations`,
        role: 'synthesizer'
      })
    }
  }

  return queries.slice(0, config.maxSearches)
}

/**
 * Format search results into a structured RESEARCH CONTEXT for the prompt
 */
function formatResearchContext(
  searchResults: SearchResultSet[],
  analysis: QueryAnalysis
): string {
  const validResults = searchResults.filter(sr => sr.results && sr.results.results.length > 0)

  if (validResults.length === 0) {
    return ''
  }

  let context = '\n\n📚 RESEARCH CONTEXT (Pre-gathered evidence for your analysis):\n'
  context += '─'.repeat(60) + '\n\n'

  // Add query analysis context
  context += `Query Type: ${analysis.primaryType} (${analysis.complexity} complexity)\n`
  if (analysis.requiresWebSearch) {
    context += 'Note: This query benefits from current information.\n'
  }
  context += '\n'

  // Group results by role
  const roleOrder: SearchResultSet['role'][] = ['general', 'analyst', 'critic', 'synthesizer']
  const roleLabels: Record<SearchResultSet['role'], string> = {
    general: '📰 General Research',
    analyst: '📊 Data & Analysis',
    critic: '⚠️ Limitations & Concerns',
    synthesizer: '🔄 Comparisons & Alternatives'
  }

  for (const role of roleOrder) {
    const roleResults = validResults.filter(sr => sr.role === role)

    for (const sr of roleResults) {
      if (!sr.results) continue

      context += `### ${roleLabels[role]}\n`
      context += `Search: "${sr.searchQuery}"\n\n`

      for (const result of sr.results.results.slice(0, 3)) {
        context += `**${result.title}**\n`
        context += `${result.snippet}\n`
        context += `Source: ${result.url}\n\n`
      }
    }
  }

  context += '─'.repeat(60) + '\n'
  context += '\n⚡ USE THE RESEARCH ABOVE to support your arguments with evidence.\n'
  context += 'When citing, reference the source URL.\n\n'

  return context
}

/**
 * Execute pre-research for a debate query
 *
 * This is the main entry point. Call this BEFORE starting the debate
 * to gather evidence that will be injected into agent prompts.
 */
export async function executePreResearch(
  query: string,
  config: Partial<PreResearchConfig> = {}
): Promise<PreResearchResult> {
  const startTime = Date.now()
  const fullConfig: PreResearchConfig = { ...DEFAULT_CONFIG, ...config }

  console.log('🔬 Pre-Research: Starting for query:', query.substring(0, 100))

  // Check cache first
  if (fullConfig.cacheEnabled) {
    const cacheKey = getCacheKey(query)
    const cached = researchCache.get(cacheKey)

    if (cached && isCacheValid(cached)) {
      console.log('✅ Pre-Research: Cache hit!')
      return {
        ...cached.results,
        cacheHit: true,
        researchTime: Date.now() - startTime
      }
    }
  }

  // Analyze the query
  const queryAnalysis = analyzeQuery(query)
  console.log('🔍 Pre-Research: Query analysis:', {
    primaryType: queryAnalysis.primaryType,
    complexity: queryAnalysis.complexity,
    requiresWebSearch: queryAnalysis.requiresWebSearch,
    keywords: queryAnalysis.keywords
  })

  // Skip search if not needed (unless forceSearch is true - user explicitly enabled web search)
  const shouldSkip = !fullConfig.enabled ||
    (!fullConfig.forceSearch && !queryAnalysis.requiresWebSearch && queryAnalysis.complexity === 'low')

  if (shouldSkip) {
    console.log('⏭️ Pre-Research: Skipping - not needed for this query type')
    return {
      query,
      queryAnalysis,
      searchResults: [],
      formattedContext: '',
      sources: [],
      searchesExecuted: 0,
      cacheHit: false,
      researchTime: Date.now() - startTime
    }
  }

  console.log('🔬 Pre-Research: Proceeding with search (forceSearch:', fullConfig.forceSearch, ')')

  // Generate search queries
  const searchQueries = generateSearchQueries(query, queryAnalysis, fullConfig)
  console.log('🔎 Pre-Research: Generated', searchQueries.length, 'search queries')

  // Execute searches in parallel
  const searchService = getWebSearchService({
    enabled: true,
    provider: 'duckduckgo',
    maxResults: fullConfig.maxResultsPerSearch,
    cache: true,
    includeInPrompt: false
  })

  const searchPromises = searchQueries.map(async ({ query: searchQuery, role }) => {
    try {
      const results = await searchService.search(searchQuery)
      return { searchQuery, role, results }
    } catch (error) {
      console.warn('Pre-Research: Search failed for:', searchQuery, error)
      return { searchQuery, role, results: null }
    }
  })

  const searchResults = await Promise.all(searchPromises)
  const successfulSearches = searchResults.filter(sr => sr.results !== null)
  console.log('✅ Pre-Research: Completed', successfulSearches.length, '/', searchResults.length, 'searches')

  // Format results
  const formattedContext = formatResearchContext(searchResults, queryAnalysis)

  // Collect unique sources
  const sources = Array.from(new Set(
    searchResults
      .filter(sr => sr.results)
      .flatMap(sr => sr.results!.results.map(r => r.url))
  ))

  const result: PreResearchResult = {
    query,
    queryAnalysis,
    searchResults,
    formattedContext,
    sources,
    searchesExecuted: searchResults.length,
    cacheHit: false,
    researchTime: Date.now() - startTime
  }

  // Cache the result
  if (fullConfig.cacheEnabled) {
    const cacheKey = getCacheKey(query)
    const ttl = fullConfig.ttlMinutes || getTTLForQueryType(queryAnalysis)
    researchCache.set(cacheKey, {
      results: result,
      timestamp: Date.now(),
      ttlMinutes: ttl
    })
    console.log('💾 Pre-Research: Cached with TTL', ttl, 'minutes')
  }

  console.log('🔬 Pre-Research: Complete in', result.researchTime, 'ms,', sources.length, 'sources found')

  return result
}

/**
 * Clear the pre-research cache
 */
export function clearPreResearchCache(): void {
  researchCache.clear()
  console.log('🧹 Pre-Research: Cache cleared')
}

/**
 * Get cache statistics
 */
export function getPreResearchCacheStats(): { size: number; keys: string[] } {
  return {
    size: researchCache.size,
    keys: Array.from(researchCache.keys())
  }
}
