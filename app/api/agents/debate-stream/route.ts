import { NextRequest } from 'next/server'
import { AgentConfig, DEBATE_CONFIG, AgentMessage } from '@/lib/agents/types'
import { providerRegistry } from '@/lib/ai-providers'
import { generateRoundPrompt } from '@/lib/agents/debate-prompts'
import { MODEL_COSTS_PER_1K } from '@/lib/model-metadata'
import { enrichQueryWithWebSearch } from '@/lib/web-search/web-search-service'
import { getRoleBasedSearchService, type AgentSearchContext, type RoleBasedSearchResult } from '@/lib/web-search/role-based-search'
import { getContextExtractor, type DebateMessage } from '@/lib/web-search/context-extractor'
import { DisagreementAnalyzer } from '@/lib/agents/disagreement-analyzer'
import { executePreResearch, type PreResearchResult } from '@/lib/web-search/pre-research-service'
import { hasInternetAccess, getModelInfo, PROVIDER_NAMES, type Provider } from '@/lib/models/model-registry'
import { getFallbacksForModel, isResponseFailed, PROVIDER_FALLBACKS } from '@/lib/models/model-fallback'
import {
  createResearchCoordinator,
  logResearchDecision,
  type AgentSearchCapability,
  type ResearchDecision
} from '@/lib/research/research-coordinator'
// import { SimpleMemoryService } from '@/lib/memory/simple-memory-service' // Disabled - memory on backlog

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Parse request body first
  let body: any
  try {
    body = await request.json()
    console.log('Request body parsed successfully')
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError)
    return new Response('Invalid request body', { status: 400 })
  }
  const { 
    query, 
    agents = [], 
    responseMode = 'normal', 
    round1Mode = 'agents',
    rounds = 1,
    enableWebSearch = false,
    includeComparison = false,
    comparisonModel = null,
    includeConsensusComparison = false,
    consensusModels = []
  } = body
  
  console.log('Debate request received:', {
    hasQuery: !!query,
    agentsCount: agents.length,
    agents: agents.map((a: any) => ({ provider: a.provider, model: a.model })),
    rounds,
    responseMode,
    round1Mode
  })
  
  // Set token limits based on response mode - INCREASED for engaging debates
  const getTokenLimit = (mode: string) => {
    switch(mode) {
      case 'concise': return 300  // ~100 words (increased from 150)
      case 'normal': return 900   // ~300 words (increased from 450) 
      case 'detailed': return 1500 // ~500 words (increased from 900)
      default: return 900
    }
  }
  
  const tokenLimit = getTokenLimit(responseMode)
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('Stream started, checking agents...')
        console.log('Agents array:', JSON.stringify(agents))
        console.log('Comparison enabled:', includeComparison)
        console.log('Comparison model:', comparisonModel)
        
        // Check if we have agents
        if (!agents || agents.length === 0) {
          console.error('ERROR: No agents provided to debate')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error',
            message: 'No agents provided to debate',
            timestamp: Date.now()
          })}\n\n`))
          controller.close()
          return
        }
        
        console.log(`Found ${agents.length} agents, proceeding...`)
        console.log('Agent details:', agents.map((a: any, i: number) => ({ 
          index: i, 
          provider: a.provider, 
          model: a.model, 
          enabled: a.enabled,
          hasPersona: !!a.persona 
        })))
        
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'connected',
          totalModels: agents.length,
          timestamp: Date.now() 
        })}\n\n`))
        
        // MEMORY INTEGRATION: DISABLED - On backlog, focusing on research validation
        // Memory system will retrieve past experiences when re-enabled
        // See: docs/archived/MEMORY_IMPLEMENTATION_PLAN.md
        const MEMORY_ENABLED = false;
        let relevantMemories: any[] = []
        
        if (MEMORY_ENABLED) {
          // Memory retrieval code disabled but preserved
          console.log('Memory system currently disabled - focusing on research validation')
        }
        
        // ==================== SMART SEARCH PHASE ====================
        // Uses ResearchCoordinator for modular, maintainable research decisions
        // Academic best practice: "Research ONCE, debate MANY times"
        // - CPDE pattern: Centralized Planning, Decentralized Execution
        // - Du et al. (2023): Cross-validation reduces hallucinations by 40%
        // See: docs/architecture/PRE_RESEARCH_ARCHITECTURE.md
        let preResearchContext = ''
        let preResearchResult: PreResearchResult | null = null

        // Create research coordinator with current configuration
        // TODO: When centralized research (conductGeneralResearch) is re-enabled,
        //       pass hasCentralizedResearch: true and centralizedSourceCount from that result
        const researchCoordinator = createResearchCoordinator({
          enableWebSearch,
          hasCentralizedResearch: false, // Set to true when centralized research integration is added
          centralizedSourceCount: 0,     // Will be populated from conductGeneralResearch result
          forceDuckDuckGo: false         // For testing only
        })

        // Analyze search capabilities using the coordinator
        const agentSearchCapabilities = researchCoordinator.analyzeSearchCapabilities(agents)

        // Make research decision based on capabilities and configuration
        const researchDecision = researchCoordinator.makeResearchDecision(agentSearchCapabilities)
        logResearchDecision(researchDecision)

        // Extract for compatibility with existing code
        const modelsNeedingDuckDuckGo = researchDecision.modelsNeedingDuckDuckGo
        const modelsWithNativeSearch = researchDecision.modelsWithNativeSearch

        if (enableWebSearch) {
          // Send search capabilities to UI
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'search_capabilities',
            agents: agentSearchCapabilities,
            nativeSearchCount: modelsWithNativeSearch.length,
            duckDuckGoCount: modelsNeedingDuckDuckGo.length,
            researchDecision: {
              shouldRunDuckDuckGo: researchDecision.shouldRunDuckDuckGo,
              reason: researchDecision.reason
            },
            timestamp: Date.now()
          })}\n\n`))

          // Run DuckDuckGo based on coordinator's decision
          if (researchDecision.shouldRunDuckDuckGo) {
            console.log(`\n🦆 Starting DuckDuckGo pre-research for ${modelsNeedingDuckDuckGo.length} model(s)...`)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pre_research_started',
              message: `Gathering evidence for ${modelsNeedingDuckDuckGo.length} model(s) without native search...`,
              forModels: modelsNeedingDuckDuckGo.map((a) => a.model),
              timestamp: Date.now()
            })}\n\n`))

            try {
              preResearchResult = await executePreResearch(query, {
                enabled: true,
                maxSearches: 4,
                maxResultsPerSearch: 5,
                cacheEnabled: true,
                roleSpecificQueries: true,
                forceSearch: true
              })

              if (preResearchResult.formattedContext) {
                preResearchContext = preResearchResult.formattedContext
                console.log('✅ DuckDuckGo pre-research complete:', {
                  searchesExecuted: preResearchResult.searchesExecuted,
                  sourcesFound: preResearchResult.sources.length,
                  cacheHit: preResearchResult.cacheHit,
                  researchTime: preResearchResult.researchTime + 'ms'
                })

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'pre_research_completed',
                  searchesExecuted: preResearchResult.searchesExecuted,
                  sourcesFound: preResearchResult.sources.length,
                  sources: preResearchResult.sources.slice(0, 5),
                  cacheHit: preResearchResult.cacheHit,
                  researchTime: preResearchResult.researchTime,
                  queryType: preResearchResult.queryAnalysis.primaryType,
                  forModels: modelsNeedingDuckDuckGo.map((a) => a.model),
                  searchResults: preResearchResult.searchResults.map(sr => ({
                    role: sr.role,
                    searchQuery: sr.searchQuery,
                    resultsCount: sr.results?.results?.length || 0,
                    success: sr.results !== null
                  })),
                  timestamp: Date.now()
                })}\n\n`))
              }
            } catch (preResearchError) {
              console.warn('⚠️ DuckDuckGo pre-research failed:', preResearchError)
            }
          } else {
            // Coordinator decided to skip DuckDuckGo
            console.log(`\n✅ ${researchDecision.reason}`)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pre_research_skipped',
              reason: researchDecision.reason,
              agents: agentSearchCapabilities,
              timestamp: Date.now()
            })}\n\n`))
          }
        }
        // ==================== END SMART SEARCH PHASE ====================

        // Track all responses across rounds
        const allRoundResponses: any[] = []

        // Process each round
        for (let roundNum = 1; roundNum <= rounds; roundNum++) {
          console.log(`Starting round ${roundNum} of ${rounds} with ${agents.length} agents`)
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'round_started',
            round: roundNum,
            totalRounds: rounds,
            timestamp: Date.now()
          })}\n\n`))
          
          // Track model responses for this round
          const roundResponses: any[] = []
          
          // Process each agent/model sequentially so they can debate with each other
          // Order agents for proper debate flow: Analyst → Critic → Judge → Synthesizer
          const orderedAgents = [...agents].sort((a, b) => {
            const order = ['analyst', 'critic', 'judge', 'synthesizer']
            const aIndex = order.indexOf(a.persona?.role || 'analyst')
            const bIndex = order.indexOf(b.persona?.role || 'analyst')
            return aIndex - bIndex
          })
          
          // Run agents sequentially, not in parallel
          for (let i = 0; i < orderedAgents.length; i++) {
            const agentConfig = orderedAgents[i]
            const index = agents.indexOf(agentConfig) // Get original index for consistency
            console.log(`Processing agent ${index}: ${agentConfig.provider}/${agentConfig.model}`)
            console.log(`Agent config:`, JSON.stringify(agentConfig))
            const modelId = round1Mode === 'llm' 
              ? `${agentConfig.provider}-${agentConfig.model}-${index}`
              : agentConfig.agentId
            
            console.log(`ModelId for agent ${index}: ${modelId}`)
              
            try {
              // Send model started event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'model_started', 
                modelId,
                modelName: agentConfig.model,
                provider: agentConfig.provider,
                agentName: agentConfig.persona?.name || agentConfig.model,
                agentRole: agentConfig.persona?.role || 'analyst',
                round: roundNum,
                timestamp: Date.now()
              })}\n\n`))
              
              // Progressive Role-Based Web Search
              // Note: Centralized research phase removed - each agent does their own search now
              let enhancedQuery = query
              let webSearchResults = null
              let roleBasedSearchResult: RoleBasedSearchResult | null = null
              
              // MEMORY INTEGRATION: Enhance query with relevant memories
              if (relevantMemories.length > 0) {
                let memoryContext = '\n\n--- RELEVANT PAST EXPERIENCES ---\n'
                relevantMemories.forEach((memory, index) => {
                  memoryContext += `\nPast Experience ${index + 1}:\n`
                  memoryContext += `Query: "${memory.query}"\n`
                  memoryContext += `Consensus: "${memory.consensus_reached}"\n`
                  memoryContext += `Confidence: ${(memory.confidence_score * 100).toFixed(0)}%\n`
                  if (memory.disagreement_points?.length > 0) {
                    memoryContext += `Previous disagreements: ${memory.disagreement_points.join(', ')}\n`
                  }
                })
                memoryContext += '\n--- END PAST EXPERIENCES ---\n\n'
                memoryContext += 'Please consider these past experiences when forming your response, but focus on the current query.\n'
                
                enhancedQuery = query + memoryContext
                console.log(`🧠 MEMORY: Enhanced query with ${relevantMemories.length} past experiences`)
              }
              
              // Per-agent web search - each agent does their own research
              // Providers with native search: OpenAI, xAI, Google, Anthropic (use model's built-in search)
              // Providers needing DuckDuckGo fallback: Groq, Mistral, Cohere
              // Note: Google/Anthropic require SDK v2.x+ - will fallback gracefully if not available
              const providersWithNativeSearch = ['openai', 'xai', 'google', 'anthropic']
              const useNativeSearch = providersWithNativeSearch.includes(agentConfig.provider)

              if (enableWebSearch) {
                if (useNativeSearch) {
                  // Provider has native search - model will search on its own
                  console.log(`🔍 ${agentConfig.provider}: Using native web search capability`)
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'web_search_started',
                    query: query,
                    provider: agentConfig.provider + ' native',
                    agent: agentConfig.persona?.name || agentConfig.model,
                    role: agentConfig.persona?.role || 'analyst',
                    round: roundNum,
                    searchType: 'native',
                    timestamp: Date.now()
                  })}\n\n`))

                  // Mark as completed immediately - actual search happens during model query
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'web_search_completed',
                    query: query,
                    provider: agentConfig.provider + ' native',
                    agent: agentConfig.persona?.name || agentConfig.model,
                    role: agentConfig.persona?.role || 'analyst',
                    round: roundNum,
                    searchType: 'native',
                    resultsCount: 0, // Native search doesn't report count upfront
                    sources: [],
                    timestamp: Date.now()
                  })}\n\n`))
                } else {
                  // Use DuckDuckGo fallback for providers without native search
                try {
                  // Send progressive web search started event
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'web_search_started',
                    query: query,
                    provider: 'duckduckgo',
                    agent: agentConfig.persona?.name || agentConfig.model,
                    role: agentConfig.persona?.role || 'analyst',
                    round: roundNum,
                    searchType: 'role-based-progressive',
                    timestamp: Date.now()
                  })}\n\n`))
                  
                  // Prepare context for role-based search
                  const previousDebateMessages: DebateMessage[] = [
                    ...(roundNum > 1 ? allRoundResponses.filter(r => r.round === roundNum - 1) : []),
                    ...roundResponses
                  ].map(r => ({
                    role: r.agentConfig?.persona?.role || r.role || 'analyst',
                    content: r.content || r.response || '',
                    agentName: r.agentConfig?.persona?.name || r.agentName,
                    round: r.round || roundNum
                  }));
                  
                  const searchContext: AgentSearchContext = {
                    role: agentConfig.persona?.role || 'analyst',
                    round: roundNum,
                    previousMessages: previousDebateMessages.map(m => ({
                      role: m.role,
                      content: m.content,
                      agentName: m.agentName
                    })),
                    originalQuery: query
                  };
                  
                  // Perform role-based search
                  const roleBasedSearchService = getRoleBasedSearchService();
                  roleBasedSearchResult = await roleBasedSearchService.performRoleBasedSearch(searchContext);
                  
                  if (roleBasedSearchResult && roleBasedSearchResult.results.length > 0) {
                    // Format search results for prompt inclusion
                    const searchContext = roleBasedSearchService.formatSearchResultsForPrompt(roleBasedSearchResult);
                    enhancedQuery = enhancedQuery + searchContext;  // Preserve existing memory context
                    
                    // Prepare results for UI display
                    const allSources: string[] = [];
                    let totalResults = 0;
                    
                    roleBasedSearchResult.results.forEach(result => {
                      if (result.results) {
                        totalResults += result.results.length;
                        allSources.push(...result.results.map(r => r.url));
                      }
                    });
                    
                    webSearchResults = {
                      query: query,
                      sources: allSources,
                      resultsCount: totalResults,
                      searchQueries: roleBasedSearchResult.queries,
                      searchRationale: roleBasedSearchResult.searchRationale
                    };
                    
                    // Send progressive web search completed event
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'web_search_completed', 
                      query: query,
                      provider: 'duckduckgo',
                      agent: agentConfig.persona?.name || agentConfig.model,
                      role: agentConfig.persona?.role || 'analyst',
                      round: roundNum,
                      searchType: 'role-based-progressive',
                      searchQueries: roleBasedSearchResult.queries,
                      searchRationale: roleBasedSearchResult.searchRationale,
                      resultsCount: totalResults,
                      sources: allSources.slice(0, 5), // Show first 5 sources in UI
                      timestamp: Date.now()
                    })}\n\n`))
                  } else {
                    // Fallback to basic search if role-based search fails
                    console.log('Role-based search failed, falling back to basic search');
                    const enriched = await enrichQueryWithWebSearch(query, {
                      enabled: true,
                      provider: 'duckduckgo',
                      maxResults: 5,
                      cache: true,
                      includeInPrompt: true
                    });
                    
                    if (enriched.searchContext) {
                      enhancedQuery = enhancedQuery + enriched.searchContext;  // Preserve existing memory context
                      webSearchResults = {
                        query: enriched.query || query,
                        sources: enriched.sources || [],
                        resultsCount: enriched.sources?.length || 0
                      };
                      
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'web_search_completed', 
                        query: query,
                        provider: 'duckduckgo',
                        resultsCount: webSearchResults.resultsCount,
                        sources: webSearchResults.sources?.slice(0, 3) || [],
                        timestamp: Date.now()
                      })}\n\n`))
                    } else {
                      // Send web search failed event
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'web_search_failed', 
                        query: query,
                        provider: 'duckduckgo',
                        agent: agentConfig.persona?.name || agentConfig.model,
                        role: agentConfig.persona?.role || 'analyst',
                        round: roundNum,
                        reason: 'No results found',
                        timestamp: Date.now()
                      })}\n\n`))
                    }
                  }
                } catch (searchError) {
                  console.warn('Progressive web search failed for agent debate streaming:', searchError)
                  
                  // Send web search failed event
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'web_search_failed',
                    query: query,
                    provider: 'duckduckgo',
                    agent: agentConfig.persona?.name || agentConfig.model,
                    role: agentConfig.persona?.role || 'analyst',
                    round: roundNum,
                    searchType: 'role-based-progressive',
                    reason: searchError instanceof Error ? searchError.message : 'Unknown error',
                    timestamp: Date.now()
                  })}\n\n`))
                }
                } // End of else block (DuckDuckGo fallback)
              }
              
              // Generate appropriate prompt
              const isLLMMode = round1Mode === 'llm' && roundNum === 1
              // Only apply format instruction to LLM mode, not agent debate mode
              const formatInstruction = (responseMode === 'concise' && isLLMMode) 
                ? '\n\nFOR FINAL ANSWER: End with a clear conclusion in this format:\n\n1. [Specific recommendation]\n2. [Specific recommendation]\n3. [Specific recommendation]\n\n[One sentence explaining why #1 is best].\n\nBut FIRST provide your debate analysis and reasoning (aim for 80-100 words of debate content, then the numbered conclusion).'
                : ''
              // Inject pre-research context if available
              // This ensures all agents have access to the pre-gathered evidence
              const researchPrefix = preResearchContext
                ? `${preResearchContext}\n\n---\n\n`
                : ''

              let fullPrompt = isLLMMode
                ? `${researchPrefix}Please answer this query concisely and directly:\n\n${enhancedQuery}${formatInstruction}`
                : `${agentConfig.persona?.systemPrompt || ''}\n\n${researchPrefix}${generateRoundPrompt(
                    enhancedQuery,
                    agentConfig.persona || {
                      id: modelId,
                      role: 'analyst',
                      name: agentConfig.model,
                      description: 'Direct response',
                      traits: [],
                      focusAreas: [],
                      systemPrompt: '',
                      color: '#3B82F6'
                    },
                    roundNum,
                    [...(roundNum > 1 ? allRoundResponses.filter(r => r.round === roundNum - 1) : []), ...roundResponses] // Pass previous round + current round messages for context
                  )}`
              
              // Pass responseMode to debate prompts
              if (fullPrompt.includes('generateRoundPrompt')) {
                // Update the generateRoundPrompt call to pass responseMode
                const enhancedPrompt = generateRoundPrompt(
                  enhancedQuery,
                  agentConfig.persona || {
                    id: modelId,
                    role: 'analyst',
                    name: agentConfig.model,
                    description: 'Direct response',
                    traits: [],
                    focusAreas: [],
                    systemPrompt: '',
                    color: '#3B82F6'
                  },
                  roundNum,
                  [...(roundNum > 1 ? allRoundResponses.filter(r => r.round === roundNum - 1) : []), ...roundResponses],
                  responseMode // Pass the response mode
                );
                fullPrompt = `${agentConfig.persona?.systemPrompt || ''}\n\n${researchPrefix}${enhancedPrompt}`;
              }
              
              // Send thinking status with preview of prompt
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'model_thinking', 
                modelId,
                promptPreview: fullPrompt.substring(0, 200) + '...',
                timestamp: Date.now()
              })}\n\n`))
              
              const startTime = Date.now()
              let result = null
              let actualProvider = agentConfig.provider
              
              // Try primary provider first
              console.log(`Getting provider for ${agentConfig.provider}`)
              const provider = providerRegistry.getProvider(agentConfig.provider)
              if (!provider) {
                console.error(`Provider not found: ${agentConfig.provider}`)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'model_error', 
                  modelId,
                  round: roundNum,
                  error: `Provider ${agentConfig.provider} not available`,
                  timestamp: Date.now()
                })}\n\n`))
                return null
              }
              
              console.log(`Provider found for ${agentConfig.provider}, attempting query...`)

              // Use the native search flag determined earlier (from line ~204)
              // useNativeSearch is already set based on provider capability
              if (useNativeSearch && enableWebSearch) {
                console.log(`🔍 ${agentConfig.provider}: Using native web search (no DuckDuckGo needed)`)
              }

              if (provider) {
                // Try primary model first
                try {
                  result = await provider.query(fullPrompt, {
                    ...agentConfig,
                    maxTokens: tokenLimit,
                    useWebSearch: useNativeSearch && enableWebSearch
                  })

                  // Check if response is empty/failed
                  if (isResponseFailed(result?.response)) {
                    console.log(`[Fallback] ${agentConfig.provider}/${agentConfig.model} returned empty response, trying fallbacks`)
                    result = null // Reset to trigger fallback
                  }
                } catch (providerError: any) {
                  console.log(`[Fallback] ${agentConfig.provider}/${agentConfig.model} failed:`, providerError.message)
                  result = null
                }

                // If primary failed, try fallbacks
                if (!result) {
                  const fallbacks = getFallbacksForModel(agentConfig.model)
                  console.log(`[Fallback] Available fallbacks: ${fallbacks.map(f => `${f.provider}/${f.model}`).join(', ')}`)

                  for (const fallback of fallbacks.slice(0, 3)) { // Try up to 3 fallbacks
                    try {
                      const fallbackProvider = providerRegistry.getProvider(fallback.provider)
                      if (!fallbackProvider) continue

                      console.log(`[Fallback] Trying ${fallback.provider}/${fallback.model}...`)
                      result = await fallbackProvider.query(fullPrompt, {
                        provider: fallback.provider,
                        model: fallback.model,
                        enabled: true,
                        maxTokens: tokenLimit
                      })

                      if (!isResponseFailed(result?.response)) {
                        actualProvider = fallback.provider
                        console.log(`[Fallback] Success with ${fallback.provider}/${fallback.model}`)

                        // Notify frontend about fallback
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'fallback_used',
                          originalModel: agentConfig.model,
                          originalProvider: agentConfig.provider,
                          fallbackModel: fallback.model,
                          fallbackProvider: fallback.provider,
                          timestamp: Date.now()
                        })}\n\n`))
                        break
                      }
                      console.log(`[Fallback] ${fallback.provider}/${fallback.model} also returned empty`)
                    } catch (fallbackError: any) {
                      console.log(`[Fallback] ${fallback.provider}/${fallback.model} failed:`, fallbackError.message)
                    }
                  }
                }
              }

              if (!result || isResponseFailed(result?.response)) {
                throw new Error(`All providers failed for ${modelId} (including fallbacks)`)
              }
              
              const endTime = Date.now()
              
              // Debug the result structure
              console.log(`[DEBUG] Agent ${modelId} FULL result object:`, JSON.stringify(result, null, 2))
              
              // Use consistent preview format - just first 150 chars like other systems
              const standardizedPreview = result.response?.substring(0, 150) + (result.response?.length > 150 ? '...' : '') || 'No response';
              
              // Send model completed event with standardized preview and search info
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'model_completed', 
                modelId,
                modelName: actualProvider !== agentConfig.provider ? `${agentConfig.model} (via ${actualProvider})` : agentConfig.model,
                provider: actualProvider,
                agentName: agentConfig.persona?.name || agentConfig.model,
                agentRole: agentConfig.persona?.role || 'analyst',
                round: roundNum,
                responsePreview: standardizedPreview,
                keyPoints: [],
                fullResponse: result.response,
                tokensUsed: result.tokens.total,
                duration: endTime - startTime,
                timestamp: endTime,
                searchQueries: roleBasedSearchResult?.queries || [],
                searchRationale: roleBasedSearchResult?.searchRationale || null
              })}\n\n`))
              
              // Create proper AgentMessage structure for context passing
              const agentMessage = {
                agentId: agentConfig.agentId || modelId,
                agentConfig: agentConfig, // Include full agent config for search context
                role: agentConfig.persona?.role || 'analyst',
                round: roundNum,
                content: result.response,
                response: result.response, // Also include as 'response' for compatibility
                timestamp: new Date(endTime).toISOString(),
                tokensUsed: result.tokens.total,
                model: `${agentConfig.provider}/${agentConfig.model}`,
                confidence: 0.85,
                keyPoints: [],
                evidence: [],
                challenges: [],
                searchQueries: roleBasedSearchResult?.queries || [],
                searchRationale: roleBasedSearchResult?.searchRationale || null,
                webSearchResults: roleBasedSearchResult // Include search results for context
              }
              
              // Add to round responses for context passing to next agents
              roundResponses.push(agentMessage)
            } catch (error) {
              // Send model error event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'model_error', 
                modelId,
                round: roundNum,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
              })}\n\n`))
            }
          } // End of sequential agent processing loop
          
          // Add this round's responses to the total
          allRoundResponses.push(...roundResponses)
          
          // Send round completed event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'round_completed',
            round: roundNum,
            totalResponses: roundResponses.length,
            timestamp: Date.now()
          })}\n\n`))
        }
        
        // Simple comparison - query single model if requested
        let comparisonData = null
        let consensusData = null
        
        if (includeComparison && comparisonModel) {
          try {
            console.log(`Starting comparison with ${comparisonModel.provider}/${comparisonModel.model}`)
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'comparison_started',
              model: comparisonModel.model,
              timestamp: Date.now()
            })}\n\n`))
            
            const provider = providerRegistry.getProvider(comparisonModel.provider)
            if (provider) {
              const startTime = Date.now()
              const comparisonQuery = responseMode === 'concise' 
                ? `${query}\n\nProvide ONLY a simple numbered list. NO headers, NO explanations, NO details, NO years:\n\n1. [Name only]\n2. [Name only]\n3. [Name only]\n\n[One short sentence about #1].`
                : query
              const result = await provider.query(comparisonQuery, {
                ...comparisonModel,
                enabled: true,
                maxTokens: tokenLimit
              })
              
              if (result) {
                // Calculate actual cost based on model
                const modelKey = `${comparisonModel.provider}/${comparisonModel.model}` as keyof typeof MODEL_COSTS_PER_1K
                const modelCost = MODEL_COSTS_PER_1K[modelKey] || MODEL_COSTS_PER_1K[comparisonModel.model as keyof typeof MODEL_COSTS_PER_1K] || { input: 0, output: 0 }
                const actualCost = ((result.tokens?.prompt || 0) * modelCost.input + (result.tokens?.completion || 0) * modelCost.output) / 1000
                
                comparisonData = {
                  model: comparisonModel.model,
                  response: result.response,
                  tokensUsed: result.tokens?.total || 0,
                  responseTime: Date.now() - startTime,
                  cost: actualCost,
                  confidence: 0.7 // Single model baseline confidence
                }
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'comparison_completed',
                  comparison: comparisonData,
                  timestamp: Date.now()
                })}\n\n`))
              }
            }
          } catch (error) {
            console.error('Comparison failed:', error)
          }
        }
        
        // Query consensus if requested - SIMPLIFIED: just use the same models from the debate
        if (includeComparison && includeConsensusComparison) {
          try {
            console.log('Starting consensus comparison for three-way display')
            
            // Use the SAME models that just debated
            const consensusModelsToUse = agents.map((agent: { provider: string; model: string }) => ({
              provider: agent.provider,
              model: agent.model,
              enabled: true
            }))

            console.log('Using these models for consensus:', consensusModelsToUse)

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'consensus_comparison_started',
              models: consensusModelsToUse.map((m: { provider: string; model: string }) => `${m.provider}/${m.model}`),
              timestamp: Date.now()
            })}\n\n`))
            
            const consensusStartTime = Date.now()
            
            // Call consensus API directly with proper format
            const consensusPayload = {
              prompt: query, // consensus API expects 'prompt' not 'query'
              models: consensusModelsToUse,
              responseMode,
              isGuestMode: true
            }
            
            console.log('Calling consensus API with payload:', JSON.stringify(consensusPayload, null, 2))
            
            const consensusResponse = await fetch(`${request.nextUrl.origin}/api/consensus`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(consensusPayload)
            })
            
            if (consensusResponse.ok) {
              const result = await consensusResponse.json()
              console.log('Consensus API success! Judge analysis:', result.consensus?.judgeAnalysis)
              
              // Extract the consensus data with judge answer
              consensusData = {
                response: result.consensus?.unifiedAnswer || 'No consensus generated',
                unifiedAnswer: result.consensus?.unifiedAnswer || 'No consensus generated',
                judgeAnswer: result.consensus?.judgeAnalysis?.bestAnswer || result.consensus?.unifiedAnswer,
                confidence: result.consensus?.confidence || result.consensus?.judgeAnalysis?.confidence || 0,
                models: consensusModelsToUse.map((m: { provider: string; model: string }) => `${m.provider}/${m.model}`),
                tokensUsed: result.totalTokensUsed || 0,
                cost: result.estimatedCost || 0,
                responseTime: (Date.now() - consensusStartTime) / 1000,
                judgeAnalysis: result.consensus?.judgeAnalysis
              }
              
              console.log('Consensus data prepared:', consensusData)
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'consensus_comparison_completed',
                consensus: consensusData,
                timestamp: Date.now()
              })}\n\n`))
            } else {
              const errorText = await consensusResponse.text()
              console.error('Consensus API failed:', consensusResponse.status, errorText)
            }
          } catch (error) {
            console.error('Consensus comparison error:', error)
          }
        }
        
        // Phase 2: Chain-of-debate tracking - Generate disagreement analysis
        console.log('[DEBUG] DEBATE-STREAM: Starting disagreement analysis')
        let disagreementAnalysis = null
        let disagreementScore = 0
        
        // Convert all responses to AgentMessage format for analysis
        const agentMessages: AgentMessage[] = allRoundResponses.map((response, index) => ({
          agentId: response.agentConfig?.persona?.id || `agent-${index}`,
          role: (response.agentConfig?.persona?.role as any) || 'analyst',
          round: response.round || 1,
          content: response.content || response.response || '',
          timestamp: new Date(),
          tokensUsed: response.tokensUsed || 0,
          model: response.agentConfig?.model || 'unknown'
        }))
        
        if (agentMessages.length > 0) {
          try {
            console.log('[DEBUG] DEBATE-STREAM: Running disagreement analysis with', agentMessages.length, 'messages')
            disagreementAnalysis = DisagreementAnalyzer.analyzeDisagreements(agentMessages)
            disagreementScore = disagreementAnalysis.score
            console.log('[DEBUG] DEBATE-STREAM: Disagreement analysis completed:', {
              score: disagreementScore,
              reasons: disagreementAnalysis.reasons.length,
              patterns: disagreementAnalysis.patterns.length,
              chainLength: disagreementAnalysis.chainOfDisagreement.length
            })
          } catch (error) {
            console.error('[DEBUG] DEBATE-STREAM: Error in disagreement analysis:', error)
          }
        } else {
          console.log('[DEBUG] DEBATE-STREAM: No messages for disagreement analysis')
        }
        
        console.log('Starting synthesis with consensusData:', !!consensusData)
        
        // Start synthesis phase
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'synthesis_started',
          timestamp: Date.now()
        })}\n\n`))
        
        // Create synthesis using Gemini with fallback to Groq
        try {
          const concisenessInstruction = responseMode === 'concise'
            ? '\n\nIMPORTANT: For CONCLUSION, provide EXACTLY this format (extract 3 specific recommendations from the debate):\n\n1. [Specific product/option name only]\n2. [Specific product/option name only]\n3. [Specific product/option name only]\n\n[One short sentence about why #1 is recommended].\n\nIf fewer than 3 options were discussed, intelligently suggest additional relevant options based on the debate context.'
            : responseMode === 'detailed'
            ? '\n\nProvide comprehensive analysis with detailed explanations and thorough reasoning.'
            : '\n\nProvide balanced analysis incorporating the full debate discussion.'

          const synthesisPrompt = `You are the Chief Judge synthesizing an expert multi-agent debate. Your job is to deliver CLEAR, ACTIONABLE recommendations.

Query: ${query}

FULL DEBATE TRANSCRIPT:
${allRoundResponses.map((r, i) => `
===== AGENT ${i + 1}: ${r.agentConfig?.persona?.name || r.agentConfig?.model || 'Unknown'} =====
Role: ${r.agentConfig?.persona?.role || r.role || 'Unknown'}
Round: ${r.round || 1}

${r.content || r.response || 'No content'}
`).join('\n')}

As Chief Judge, synthesize this debate into CLEAR RECOMMENDATIONS. Users need actionable answers, not summaries.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

### TOP 3 RECOMMENDATIONS

1. **[Specific Recommendation Name]**: [2-3 sentence explanation of WHY this is recommended, with specific details mentioned by agents]

2. **[Specific Recommendation Name]**: [2-3 sentence explanation]

3. **[Specific Recommendation Name]**: [2-3 sentence explanation]

### AGREEMENTS
- [Specific point all/most agents agreed on]
- [Another agreement point]
- [Third agreement point]

### DISAGREEMENTS
- [Specific disagreement - what Agent X said vs Agent Y]
- [Another disagreement with context]

### CONCLUSION
${concisenessInstruction ? 'Brief summary' : 'Comprehensive final verdict'} explaining which recommendation you endorse most strongly and why.

CONFIDENCE: [Number 1-100 based on how much agents agreed and quality of evidence]

### FOLLOW-UP QUESTIONS
- [Optional: Questions that would help refine the recommendation]

IMPORTANT: Be SPECIFIC. If agents mentioned specific hotels, products, or options - NAME THEM. Users want answers, not generic advice.`

          // Try Gemini first, fallback to Groq if it fails or returns empty
          let synthesisResult = null
          let usedProvider = 'google'

          const googleProvider = providerRegistry.getProvider('google')
          if (googleProvider) {
            try {
              synthesisResult = await googleProvider.query(synthesisPrompt, {
                provider: 'google',
                model: 'gemini-2.0-flash',  // Use working model instead of untested gemini-2.5-flash
                enabled: true,
                maxTokens: responseMode === 'detailed' ? 1200 : 800
              })

              // CRITICAL: Check if Gemini returned empty response
              if (!synthesisResult || !synthesisResult.response || synthesisResult.response.trim().length < 50) {
                console.warn('⚠️  Gemini returned empty or too short synthesis response:', {
                  hasResult: !!synthesisResult,
                  hasError: !!synthesisResult?.error,
                  errorMsg: synthesisResult?.error || 'none',
                  responseLength: synthesisResult?.response?.length || 0,
                  responsePreview: (synthesisResult?.response || 'null').substring(0, 100)
                })
                synthesisResult = null // Force fallback to Groq
              } else {
                console.log('✅ Gemini synthesis succeeded, response length:', synthesisResult.response.length)
              }
            } catch (googleError: any) {
              console.error('❌ Google AI failed:', googleError.message)
              console.error('Google AI error stack:', googleError.stack?.substring(0, 500))
              synthesisResult = null
            }
          }

          // Fallback to Groq 70B if Gemini failed or returned empty
          if (!synthesisResult) {
            const groqProvider = providerRegistry.getProvider('groq')
            if (groqProvider) {
              console.log('📝 Using Groq Llama 3.3 70B for synthesis (Gemini fallback)')
              usedProvider = 'groq'
              try {
                synthesisResult = await groqProvider.query(synthesisPrompt, {
                  provider: 'groq',
                  model: 'llama-3.3-70b-versatile',
                  enabled: true,
                  maxTokens: responseMode === 'detailed' ? 1200 : 800
                })

                // Check if Groq 70B also returned empty
                if (!synthesisResult || !synthesisResult.response || synthesisResult.response.trim().length < 50) {
                  console.warn('⚠️  Groq 70B returned empty, trying Llama 3.1 8B...')

                  // Try smaller model as third fallback
                  try {
                    synthesisResult = await groqProvider.query(synthesisPrompt, {
                      provider: 'groq',
                      model: 'llama-3.1-8b-instant',
                      enabled: true,
                      maxTokens: responseMode === 'detailed' ? 1200 : 800
                    })

                    if (synthesisResult && synthesisResult.response && synthesisResult.response.trim().length >= 50) {
                      console.log('✅ Groq Llama 8B synthesis succeeded')
                      usedProvider = 'groq-8b'
                    } else {
                      console.warn('⚠️  Groq 8B also returned empty')
                      synthesisResult = null
                    }
                  } catch (smallModelError: any) {
                    console.error('❌ Groq 8B also failed:', smallModelError.message)
                    synthesisResult = null
                  }
                }
              } catch (groqError: any) {
                console.error('❌ Groq 70B failed for synthesis:', groqError.message)
                synthesisResult = null
              }
            }
          }

          // Final fallback: Create basic synthesis from agent responses if all LLMs failed
          if (!synthesisResult || !synthesisResult.response) {
            console.warn('⚠️  All synthesis providers failed, creating fallback synthesis')
            usedProvider = 'fallback'

            // Create a simple summary from the last round responses
            const lastRoundResponses = allRoundResponses.filter(r => r.round === rounds)
            const summaryPoints = lastRoundResponses.map((r, i) =>
              `${i + 1}. ${r.agentConfig?.persona?.name || 'Agent'}: ${(r.content || r.response || '').substring(0, 200)}...`
            ).join('\n\n')

            synthesisResult = {
              id: 'fallback-synthesis',
              provider: 'fallback',
              model: 'fallback',
              response: `### TOP 3 RECOMMENDATIONS\n\n1. **Review Individual Agent Responses**: Each agent provided unique insights that should be considered together.\n\n2. **Compare Agent Perspectives**: The Analyst, Critic, Judge, and Synthesizer each approached the query differently.\n\n3. **Consider All Viewpoints**: Multiple perspectives were offered across the debate rounds.\n\n### AGREEMENTS\n- All agents provided substantive analysis on the query\n- Multiple perspectives were considered\n- Agents engaged with the core question meaningfully\n\n### DISAGREEMENTS\n- Agents had different approaches and focus areas\n- Various recommendations emerged from the debate\n\n### CONCLUSION\n\nBased on the agent debate:\n\n${summaryPoints}\n\nCONFIDENCE: 60\n\nThe agents provided diverse insights. Review the individual agent responses above for detailed analysis.`,
              confidence: 0.6,
              responseTime: 0,
              tokens: { prompt: 0, completion: 0, total: 0 },
              timestamp: new Date().toISOString()
            }
          }

          if (synthesisResult) {
            
            // Parse synthesis content with better extraction
            const content = synthesisResult.response
            
            // Debug: log the raw synthesis for inspection
            console.log('Raw synthesis response (first 500 chars):', content.substring(0, 500))
            
            // Extract conclusion FIRST - this is the main answer
            let conclusion = ''
            const conclusionMatch = content.match(/#+\s*\d*\.?\s*CONCLUSION:?\s*(?:Your synthesized answer.*?\n)?([\s\S]+?)(?=\n\s*#+\s*\d*\.?\s*(?:FOLLOW[- ]UP|$)|\[Synthesized by|$)/i)
            if (conclusionMatch) {
              conclusion = conclusionMatch[1]
                .split('\n')
                .filter(line => !line.trim().startsWith('#') && !line.match(/^Your synthesized answer/i))
                .map(line => line.replace(/\*\*(.+?)\*\*/g, '$1').trim())
                .filter(line => line.length > 0)
                .join('\n')
                .trim()
            }
            
            // Extract ONLY the bullet points from agreements section
            let agreements: string[] = []
            const agreementsMatch = content.match(/#+\s*\d*\.?\s*AGREEMENTS?:?\s*(?:.*?\n)?([\s\S]+?)(?=\n\s*#+\s*\d*\.?\s*(?:DISAGREEMENTS?|CONCLUSION)|$)/i)
            if (agreementsMatch) {
              // Look for lines starting with *, -, • or numbered lists
              const lines = agreementsMatch[1].split('\n')
              agreements = lines
                .filter(line => /^\s*[\*\-•]\s+|^\s*\d+\.\s+/.test(line))
                .map(line => {
                  return line
                    .replace(/^\s*[\*\-•]\s+/, '') // Remove bullets
                    .replace(/^\s*\d+\.\s+/, '') // Remove numbers
                    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
                    .split(':')[0] // Take only the title part
                    .trim()
                })
                .filter(line => line.length > 10)
                .slice(0, 5) // Limit to 5 key points
            }
            
            // Extract ONLY the bullet points from disagreements section  
            let disagreements: string[] = []
            const disagreementsMatch = content.match(/#+\s*\d*\.?\s*DISAGREEMENTS?:?\s*(?:.*?\n)?([\s\S]+?)(?=\n\s*#+\s*\d*\.?\s*(?:CONCLUSION|FOLLOW)|$)/i)
            if (disagreementsMatch) {
              // Look for lines starting with *, -, • or numbered lists
              const lines = disagreementsMatch[1].split('\n')
              disagreements = lines
                .filter(line => /^\s*[\*\-•]\s+|^\s*\d+\.\s+/.test(line))
                .map(line => {
                  return line
                    .replace(/^\s*[\*\-•]\s+/, '') // Remove bullets
                    .replace(/^\s*\d+\.\s+/, '') // Remove numbers
                    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
                    .split(':')[0] // Take only the title part
                    .trim()
                })
                .filter(line => line.length > 10)
                .slice(0, 5) // Limit to 5 key points
            }
            
            // Extract confidence (only if explicitly provided, otherwise default to 80%)
            const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i)
            const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.80
            
            // Extract follow-up questions if present
            let followUpQuestions: string[] = []
            const followUpMatch = content.match(/#+\s*\d*\.?\s*(?:FOLLOW[- ]UP QUESTIONS?|ADDITIONAL INFORMATION):?\s*(?:.*?\n)?([\s\S]+?)(?=\n\s*\[Synthesized by|$)/i)
            if (followUpMatch) {
              // Look for numbered questions
              const lines = followUpMatch[1].split('\n')
              followUpQuestions = lines
                .filter(line => /^\s*\d+\.\s+/.test(line) || /^\s*[\*\-•]\s+/.test(line))
                .map(line => {
                  return line
                    .replace(/^\s*\d+\.\s+/, '') // Remove numbers
                    .replace(/^\s*[\*\-•]\s+/, '') // Remove bullets
                    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
                    .trim()
                })
                .filter(line => line.length > 10 && line.includes('?')) // Must be a question
            }
            
            console.log('Synthesis parsing:', {
              agreementsCount: agreements.length,
              disagreementsCount: disagreements.length,
              hasConclusion: conclusion.length > 0,
              confidence,
              followUpQuestionsCount: followUpQuestions.length
            })
            
            const synthesis = {
              content: `${content}\n\n[Synthesized by: ${
                usedProvider === 'groq' ? 'Llama 3.3 70B (Groq)' :
                usedProvider === 'fallback' ? 'Fallback Synthesis' :
                'Gemini 2.5 Flash (Google)'
              }]`,
              conclusion,
              agreements,
              disagreements,
              confidence,
              tokensUsed: synthesisResult.tokens.total || 500,
              informationRequest: {
                detected: followUpQuestions.length > 0,
                followUpQuestions,
                suggestedQuestions: followUpQuestions // Same questions for now
              },
              synthesisProvider: usedProvider
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'synthesis_completed',
              synthesis,
              comparisonResponse: comparisonData,
              consensusComparison: consensusData,
              disagreementAnalysis,
              disagreementScore,
              timestamp: Date.now()
            })}\n\n`))
            
            // Collect training data
            try {
              const trainingPayload = {
                type: 'debate',
                session: {
                  id: `debate-${Date.now()}`,
                  query,
                  agents: agents.map((a: { persona?: { name?: string; role?: string }; model?: string }, i: number) => ({
                    id: `agent-${i}`,
                    name: a.persona?.name || a.model || `Model ${i+1}`,
                    role: a.persona?.role || 'analyst'
                  })),
                  rounds: [{
                    roundNumber: rounds,
                    messages: allRoundResponses.map(r => ({
                      agent: r.agentConfig?.persona?.name || r.agentName || 'unknown',
                      message: r.content || r.response,
                      model: r.agentConfig ? `${r.agentConfig.provider}/${r.agentConfig.model}` : r.model,
                      tokens: r.tokensUsed
                    })),
                    startTime: new Date()
                  }],
                  finalSynthesis: {
                    content: synthesis.content,
                    conclusion: synthesis.conclusion,
                    confidence: synthesis.confidence,
                    agreements: synthesis.agreements,
                    disagreements: synthesis.disagreements,
                    tokensUsed: synthesis.tokensUsed
                  },
                  totalTokensUsed: allRoundResponses.reduce((sum, r) => sum + (r.tokensUsed || 0), 0) + synthesis.tokensUsed,
                  estimatedCost: allRoundResponses.reduce((sum, r) => sum + (r.cost || 0), 0),
                  startTime: new Date(Date.now() - 5000),
                  endTime: new Date(),
                  status: 'completed'
                }
              }
              
              // Send to memory API (non-blocking)
              fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/memory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trainingPayload)
              }).then(res => {
                if (res.ok) console.log('Training data collected successfully')
              }).catch(err => console.log('Failed to collect training data:', err))
            } catch (err) {
              console.log('Training data error:', err)
            }
          } else {
            // Fallback if no Google provider or if overloaded
            // Create a simple consensus from the responses
            const synthesis = {
              content: `Based on the ${allRoundResponses.length} model responses, here's a summary:\n\n${allRoundResponses.map((r, i) => `Model ${i+1}: ${(r.content || r.response || 'No content').substring(0, 200)}...`).join('\n\n')}`,
              conclusion: allRoundResponses[0]?.content || allRoundResponses[0]?.response || 'Unable to generate synthesis',
              agreements: [],
              disagreements: [],
              confidence: 0.5,
              tokensUsed: 0,
              informationRequest: {
                detected: false,
                followUpQuestions: [],
                suggestedQuestions: []
              }
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'synthesis_completed',
              synthesis,
              comparisonResponse: comparisonData,
              consensusComparison: consensusData,
              disagreementAnalysis,
              disagreementScore,
              timestamp: Date.now()
            })}\n\n`))
          }
        } catch (synthError) {
          console.error('Synthesis error:', synthError)
          // Send basic synthesis on error - use first response as fallback
          const synthesis = {
            content: `Synthesis Error: ${synthError instanceof Error ? synthError.message : 'Unknown error'}\n\nUsing first model response as fallback:\n\n${allRoundResponses[0]?.response || 'No responses available'}`,
            conclusion: allRoundResponses[0]?.response || 'Unable to synthesize responses',
            agreements: [],
            disagreements: [],
            confidence: 0.25,
            tokensUsed: 0,
            informationRequest: {
              detected: false,
              followUpQuestions: []
            }
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'synthesis_completed',
            synthesis,
            comparisonResponse: comparisonData,
            consensusComparison: consensusData,
            disagreementAnalysis,
            disagreementScore,
            timestamp: Date.now()
          })}\n\n`))
        }
        
        // Training data will be collected via the synthesis data sent above
        
        // MEMORY INTEGRATION: DISABLED - Store this debate as episodic memory
        // Memory storage disabled - focusing on research validation
        if (false) { // Disabled memory storage
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'memory_storage_started',
            message: 'Storing debate experience in memory...',
            timestamp: Date.now()
          })}\n\n`))
          
          console.log('💾 MEMORY STORAGE: Storing episodic memory from completed debate...')
          
          // Extract synthesis data from the last successful synthesis
          let finalSynthesis = null
          for (let i = allRoundResponses.length - 1; i >= 0; i--) {
            if (allRoundResponses[i]?.synthesis) {
              finalSynthesis = allRoundResponses[i].synthesis
              break
            }
          }
          
          const episodicMemory = {
            query: query,
            agents_used: agents.map((agent: any) => `${agent.provider}/${agent.model}`),
            consensus_reached: finalSynthesis?.conclusion || 'No clear consensus reached',
            confidence_score: finalSynthesis?.confidence || 0.5,
            disagreement_points: finalSynthesis?.disagreements || [],
            resolution_method: 'streaming_agent_debate',
            total_tokens_used: allRoundResponses.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
            estimated_cost: allRoundResponses.reduce((sum, r) => sum + (r.cost || 0), 0),
            response_time_ms: Date.now() - Date.now(), // Would need startTime tracking
            follow_up_questions: finalSynthesis?.informationRequest?.suggestedQuestions || []
          }
          
          // const storedMemory = await memoryService.storeEpisodicMemory(episodicMemory)
          const storedMemory: { id?: string } | null = null // Memory disabled
          console.log(`✅ MEMORY STORAGE: Stored episodic memory: ${storedMemory?.id}`)
          
          // Also store semantic memory for high confidence results
          if (finalSynthesis?.confidence && finalSynthesis.confidence > 0.7) {
            const semanticMemory = {
              fact: finalSynthesis.conclusion,
              category: 'learned_fact' as const,
              source: `AI Council streaming debate with ${agents.length} agents`,
              confidence: finalSynthesis.confidence,
              contexts: [query.split(' ').slice(0, 3).join(' ')],
              last_used: new Date(),
              validations: 1
            }
            
            // const storedSemantic = await memoryService.storeSemanticMemory(semanticMemory)
            const storedSemantic: { id?: string } | null = null // Memory disabled
            console.log(`✅ MEMORY STORAGE: Stored high-confidence semantic memory: ${storedSemantic?.id}`)
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'memory_stored',
            message: 'Experience saved to memory for future debates',
            memoryId: storedMemory?.id,
            timestamp: Date.now()
          })}\n\n`))
          
        } catch (memoryError) {
          console.error('💾 MEMORY STORAGE ERROR:', memoryError)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'memory_storage_error',
            message: 'Failed to store experience, but debate completed successfully',
            timestamp: Date.now()
          })}\n\n`))
        }
        } // End of disabled memory storage block
        
        // Send final completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'debate_completed',
          totalRounds: rounds,
          timestamp: Date.now()
        })}\n\n`))
        
      } catch (error) {
        // Send error event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        })}\n\n`))
      } finally {
        // Close the stream
        controller.close()
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  })
}