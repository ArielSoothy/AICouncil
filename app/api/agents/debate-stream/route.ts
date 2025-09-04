import { NextRequest } from 'next/server'
import { AgentConfig, DEBATE_CONFIG } from '@/lib/agents/types'
import { providerRegistry } from '@/lib/ai-providers'
import { generateRoundPrompt } from '@/lib/agents/debate-prompts'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Parse request body first
  const body = await request.json()
  const { 
    query, 
    agents = [], 
    responseMode = 'normal', 
    round1Mode = 'llm',
    rounds = 1
  } = body
  
  // Set token limits based on response mode
  const getTokenLimit = (mode: string) => {
    switch(mode) {
      case 'concise': return 150  // ~50 words
      case 'normal': return 450   // ~150 words
      case 'detailed': return 900  // ~300 words
      default: return 450
    }
  }
  
  const tokenLimit = getTokenLimit(responseMode)
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'connected',
          totalModels: agents.length,
          timestamp: Date.now() 
        })}\n\n`))
        
        // Track all responses across rounds
        const allRoundResponses: any[] = []
        
        // Process each round
        for (let roundNum = 1; roundNum <= rounds; roundNum++) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'round_started',
            round: roundNum,
            totalRounds: rounds,
            timestamp: Date.now()
          })}\n\n`))
          
          // Track model responses for this round
          const roundResponses: any[] = []
          
          // Process each agent/model in parallel but track individual completions
          const agentPromises = agents.map(async (agentConfig: AgentConfig, index: number) => {
            const modelId = round1Mode === 'llm' 
              ? `${agentConfig.provider}-${agentConfig.model}-${index}`
              : agentConfig.agentId
              
            try {
              // Send model started event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'model_started', 
                modelId,
                modelName: agentConfig.model,
                provider: agentConfig.provider,
                round: roundNum,
                timestamp: Date.now()
              })}\n\n`))
              
              // Generate appropriate prompt
              const isLLMMode = round1Mode === 'llm' && roundNum === 1
              const fullPrompt = isLLMMode 
                ? `Please answer this query concisely and directly:\n\n${query}`
                : `${agentConfig.persona?.systemPrompt || ''}\n\n${generateRoundPrompt(
                    query,
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
                    roundResponses // Pass previous responses for context
                  )}`
              
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
              const provider = providerRegistry.getProvider(agentConfig.provider)
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
                        model: 'gemini-2.5-flash',
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
              
              // Extract key points from response for preview
              const keyPoints = result.response
                .split('\n')
                .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
                .slice(0, 3)
                .join('\n')
              
              // Send model completed event with preview
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'model_completed', 
                modelId,
                modelName: actualProvider !== agentConfig.provider ? `${agentConfig.model} (via ${actualProvider})` : agentConfig.model,
                provider: actualProvider,
                round: roundNum,
                responsePreview: result.response.substring(0, 300) + '...',
                keyPoints,
                fullResponse: result.response,
                tokensUsed: result.tokens.total,
                duration: endTime - startTime,
                timestamp: endTime
              })}\n\n`))
              
              roundResponses.push({
                modelId,
                agentConfig,
                response: result.response,
                tokensUsed: result.tokens.total,
                duration: endTime - startTime
              })
              
              return result
            } catch (error) {
              // Send model error event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'model_error', 
                modelId,
                round: roundNum,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
              })}\n\n`))
              return null
            }
          })
          
          // Wait for all models in this round to complete
          await Promise.allSettled(agentPromises)
          
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
        
        // Start synthesis phase
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'synthesis_started',
          timestamp: Date.now()
        })}\n\n`))
        
        // Create synthesis using Gemini
        try {
          const synthesisPrompt = `You are the Chief Judge synthesizing a multi-agent debate.

Query: ${query}

Debate Summary:
${allRoundResponses.map((r, i) => `
Model ${i + 1} (${r.agentConfig.model}):
${r.response.substring(0, 500)}...
`).join('\n')}

Please provide:
1. AGREEMENTS: Key points where models agree
2. DISAGREEMENTS: Points of contention
3. CONCLUSION: Your synthesized answer based on the consensus
4. FOLLOW-UP QUESTIONS (optional): If more information would help provide a better answer, list specific questions the user could answer

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
            
            // Extract confidence
            const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i)
            const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.75
            
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
                    name: a.persona.name,
                    role: a.persona.role
                  })),
                  rounds: [{
                    roundNumber: rounds,
                    messages: allRoundResponses.map(r => ({
                      agent: r.agentName || 'unknown',
                      message: r.response,
                      model: r.modelUsed || r.model,
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
              content: `Based on the ${allRoundResponses.length} model responses, here's a summary:\n\n${allRoundResponses.map((r, i) => `Model ${i+1}: ${r.response.substring(0, 200)}...`).join('\n\n')}`,
              conclusion: allRoundResponses[0]?.response || 'Unable to generate synthesis',
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
            timestamp: Date.now()
          })}\n\n`))
        }
        
        // Training data will be collected via the synthesis data sent above
        
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