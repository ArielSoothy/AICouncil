import { NextRequest } from 'next/server'
import { AgentConfig, DEBATE_CONFIG, AgentMessage } from '@/lib/agents/types'
import { providerRegistry } from '@/lib/ai-providers'
import { generateRoundPrompt } from '@/lib/agents/debate-prompts'
import { MODEL_COSTS_PER_1K } from '@/lib/model-metadata'
import { enrichQueryWithWebSearch } from '@/lib/web-search/web-search-service'
import { getRoleBasedSearchService, type AgentSearchContext, type RoleBasedSearchResult } from '@/lib/web-search/role-based-search'
import { getContextExtractor, type DebateMessage } from '@/lib/web-search/context-extractor'
import { DisagreementAnalyzer } from '@/lib/agents/disagreement-analyzer'
import { SimpleMemoryService } from '@/lib/memory/simple-memory-service'

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
        
        // MEMORY INTEGRATION: Initialize memory service and retrieve relevant memories
        const memoryService = new SimpleMemoryService('guest-user')
        let relevantMemories: any[] = []
        
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'memory_search_started',
            message: 'Searching for relevant past experiences...',
            timestamp: Date.now()
          })}\n\n`))
          
          relevantMemories = await memoryService.searchEpisodicMemories(query, 3)
          console.log(`🧠 MEMORY RETRIEVAL: Found ${relevantMemories.length} relevant memories for query: "${query.substring(0, 50)}..."`)
          
          if (relevantMemories.length > 0) {
            console.log('📚 MEMORY INSIGHTS: Past experiences found:')
            relevantMemories.forEach((memory, index) => {
              console.log(`  ${index + 1}. "${memory.consensus_reached.substring(0, 100)}..." (confidence: ${memory.confidence_score})`)
            })
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'memory_found',
              count: relevantMemories.length,
              message: `Found ${relevantMemories.length} relevant past experience${relevantMemories.length > 1 ? 's' : ''} to inform this debate`,
              timestamp: Date.now()
            })}\n\n`))
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'memory_empty',
              message: 'No past experiences found - this is a fresh discussion',
              timestamp: Date.now()
            })}\n\n`))
          }
        } catch (memoryError) {
          console.warn('🧠 MEMORY RETRIEVAL ERROR:', memoryError)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'memory_error',
            message: 'Memory search failed, continuing without past context',
            timestamp: Date.now()
          })}\n\n`))
        }
        
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
          // Order agents for proper debate flow: Analyst → Critic → Synthesizer
          const orderedAgents = [...agents].sort((a, b) => {
            const order = ['analyst', 'critic', 'synthesizer']
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
              let enhancedQuery = query
              let webSearchResults = null
              let roleBasedSearchResult: RoleBasedSearchResult | null = null
              
              if (enableWebSearch) {
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
                    enhancedQuery = query + searchContext;
                    
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
                      enhancedQuery = query + enriched.searchContext;
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
              }
              
              // Generate appropriate prompt
              const isLLMMode = round1Mode === 'llm' && roundNum === 1
              // Only apply format instruction to LLM mode, not agent debate mode
              const formatInstruction = (responseMode === 'concise' && isLLMMode) 
                ? '\n\nFOR FINAL ANSWER: End with a clear conclusion in this format:\n\n1. [Specific recommendation]\n2. [Specific recommendation]\n3. [Specific recommendation]\n\n[One sentence explaining why #1 is best].\n\nBut FIRST provide your debate analysis and reasoning (aim for 80-100 words of debate content, then the numbered conclusion).'
                : ''
              let fullPrompt = isLLMMode 
                ? `Please answer this query concisely and directly:\n\n${enhancedQuery}${formatInstruction}`
                : `${agentConfig.persona?.systemPrompt || ''}\n\n${generateRoundPrompt(
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
                fullPrompt = `${agentConfig.persona?.systemPrompt || ''}\n\n${enhancedPrompt}`;
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
              if (provider) {
                try {
                  result = await provider.query(fullPrompt, {
                    ...agentConfig,
                    maxTokens: tokenLimit
                  })
                } catch (providerError: any) {
                  console.log(`${agentConfig.provider} failed for ${modelId}, trying fallback:`, providerError.message)
                  
                  // Fallback logic based on provider
                  if (agentConfig.provider === 'google') {
                    // Google failed, try Groq
                    const groqProvider = providerRegistry.getProvider('groq')
                    if (groqProvider) {
                      actualProvider = 'groq'
                      result = await groqProvider.query(fullPrompt, {
                        provider: 'groq',
                        model: 'llama-3.3-70b-versatile',
                        enabled: true,
                        maxTokens: tokenLimit
                      })
                    }
                  } else if (agentConfig.provider === 'groq') {
                    // Groq failed, try Google
                    const googleProvider = providerRegistry.getProvider('google')
                    if (googleProvider) {
                      actualProvider = 'google'
                      result = await googleProvider.query(fullPrompt, {
                        provider: 'google',
                        model: 'llama-3.3-70b-versatile',
                        enabled: true,
                        maxTokens: tokenLimit
                      })
                    }
                  }
                }
              }
              
              if (!result) {
                throw new Error(`All providers failed for ${modelId}`)
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
            const consensusModelsToUse = agents.map(agent => ({
              provider: agent.provider,
              model: agent.model,
              enabled: true
            }))
            
            console.log('Using these models for consensus:', consensusModelsToUse)
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'consensus_comparison_started',
              models: consensusModelsToUse.map(m => `${m.provider}/${m.model}`),
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
                models: consensusModelsToUse.map(m => `${m.provider}/${m.model}`),
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
        
        // Create synthesis using Gemini
        try {
          const concisenessInstruction = responseMode === 'concise' 
            ? '\n\nIMPORTANT: For CONCLUSION, provide EXACTLY this format (extract 3 specific recommendations from the debate):\n\n1. [Specific product/option name only]\n2. [Specific product/option name only]\n3. [Specific product/option name only]\n\n[One short sentence about why #1 is recommended].\n\nIf fewer than 3 options were discussed, intelligently suggest additional relevant options based on the debate context.'
            : responseMode === 'detailed'
            ? '\n\nProvide comprehensive analysis with detailed explanations and thorough reasoning.'
            : '\n\nProvide balanced analysis incorporating the full debate discussion.'
            
          const synthesisPrompt = `You are the Chief Judge synthesizing an expert multi-agent debate. These agents engaged in substantive discussion with longer, more detailed arguments.

Query: ${query}

FULL DEBATE TRANSCRIPT:
${allRoundResponses.map((r, i) => `
===== AGENT ${i + 1}: ${r.agentConfig?.persona?.name || r.agentConfig?.model || 'Unknown'} =====
Role: ${r.agentConfig?.persona?.role || r.role || 'Unknown'}
Round: ${r.round || 1}

${r.content || r.response || 'No content'}
`).join('\n')}

As Chief Judge, synthesize this rich debate into a comprehensive analysis:

1. AGREEMENTS: What key points did multiple agents converge on? (bullet points)
2. DISAGREEMENTS: Where did agents clash and why? What were the core tensions? (bullet points) 
3. CONCLUSION: Your expert synthesis drawing from the best arguments across all agents${concisenessInstruction}
4. FOLLOW-UP QUESTIONS (optional): If more context would strengthen the recommendation, what specific questions should the user answer?

The agents provided substantial analysis - your synthesis should reflect that depth and nuance.

Format your response with clear sections using markdown headers (###).`

          // Try Gemini first, fallback to Groq if overloaded
          let synthesisResult = null
          let usedProvider = 'google'
          
          const googleProvider = providerRegistry.getProvider('google')
          if (googleProvider) {
            try {
              synthesisResult = await googleProvider.query(synthesisPrompt, {
                provider: 'google',
                model: 'gemini-2.5-flash',
                enabled: true,
                maxTokens: responseMode === 'detailed' ? 1200 : 800
              })
            } catch (googleError: any) {
              console.log('Google AI failed, trying Groq fallback:', googleError.message)
              
              // Fallback to Groq Llama 3.3 70B
              const groqProvider = providerRegistry.getProvider('groq')
              if (groqProvider) {
                usedProvider = 'groq'
                synthesisResult = await groqProvider.query(synthesisPrompt, {
                  provider: 'groq',
                  model: 'llama-3.3-70b-versatile',
                  enabled: true,
                  maxTokens: responseMode === 'detailed' ? 1200 : 800
                })
              }
            }
          }
          
          // If no Google provider, try Groq directly
          if (!synthesisResult) {
            const groqProvider = providerRegistry.getProvider('groq')
            if (groqProvider) {
              usedProvider = 'groq'
              synthesisResult = await groqProvider.query(synthesisPrompt, {
                provider: 'groq',
                model: 'llama-3.3-70b-versatile',
                enabled: true,
                maxTokens: responseMode === 'detailed' ? 1200 : 800
              })
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
              content: `${content}\n\n[Synthesized by: ${usedProvider === 'groq' ? 'Llama 3.3 70B (Groq)' : 'Gemini 2.5 Flash (Google)'}]`,
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
                  agents: agents.map((a, i) => ({
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
        
        // MEMORY INTEGRATION: Store this debate as episodic memory
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
          
          const storedMemory = await memoryService.storeEpisodicMemory(episodicMemory)
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
            
            const storedSemantic = await memoryService.storeSemanticMemory(semanticMemory)
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