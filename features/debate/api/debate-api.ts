// Centralized API module for debate feature
// Handles all API calls with proper error handling and fallbacks

import { DebateConfig, DebateSession, StreamEvent } from '../types'

export class DebateAPI {
  private static readonly BASE_URL = '/api/agents/debate-stream'
  
  /**
   * Start a debate with streaming updates
   */
  static async startDebate(
    config: DebateConfig,
    onEvent: (event: StreamEvent) => void
  ): Promise<DebateSession> {
    try {
      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: config.query,
          agents: config.agents,
          rounds: config.rounds,
          responseMode: config.responseMode,
          round1Mode: config.mode,
          autoRound2: config.autoRound2,
          disagreementThreshold: config.disagreementThreshold,
          includeComparison: config.comparison?.enabled,
          comparisonModel: config.comparison?.model,
          includeConsensusComparison: config.consensus?.enabled,
          consensusModels: config.consensus?.models
        })
      })

      if (!response.ok) {
        throw new Error(`Debate API error: ${response.status}`)
      }

      return await this.handleStream(response, onEvent)
    } catch (error) {
      console.error('Debate API error:', error)
      throw error
    }
  }

  /**
   * Handle streaming response with proper error recovery
   */
  private static async handleStream(
    response: Response,
    onEvent: (event: StreamEvent) => void
  ): Promise<DebateSession> {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let session: Partial<DebateSession> = {
      id: crypto.randomUUID(),
      status: 'debating',
      rounds: [],
      startTime: Date.now()
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // Emit event for UI updates
              onEvent({
                type: data.type,
                data: data,
                timestamp: Date.now()
              })

              // Update session based on event type
              this.updateSession(session, data)
            } catch (err) {
              console.warn('Failed to parse SSE event:', err)
            }
          }
        }
      }

      session.status = 'completed'
      session.endTime = Date.now()
      return session as DebateSession
      
    } catch (error) {
      session.status = 'error'
      session.error = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Update session state based on stream events
   */
  private static updateSession(session: Partial<DebateSession>, event: any) {
    switch (event.type) {
      case 'round_started':
        if (!session.rounds) session.rounds = []
        session.rounds.push({
          roundNumber: event.round,
          responses: [],
          timestamp: event.timestamp
        })
        break
        
      case 'model_completed':
        const currentRound = session.rounds?.[session.rounds.length - 1]
        if (currentRound) {
          currentRound.responses.push({
            agentId: event.modelId,
            agentName: event.agentName || event.model,
            role: event.role || 'analyst',
            response: event.response,
            tokensUsed: event.tokensUsed || 0,
            duration: event.duration || 0,
            model: event.model,
            provider: event.provider
          })
        }
        break
        
      case 'synthesis_completed':
        session.synthesis = event.synthesis
        break
        
      case 'comparison_completed':
        session.comparison = event.comparison
        break
        
      case 'consensus_completed':
        session.consensus = event.consensus
        break
        
      case 'debate_completed':
        if (event.session) {
          Object.assign(session, event.session)
        }
        break
        
      case 'error':
        session.status = 'error'
        session.error = event.message
        break
    }
  }
}

/**
 * Separate API for comparison feature
 */
export class ComparisonAPI {
  static async compare(
    query: string,
    singleModel: any,
    multiModels: any[]
  ): Promise<any> {
    try {
      // This can be called independently
      const response = await fetch('/api/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, singleModel, multiModels })
      })
      
      if (!response.ok) {
        throw new Error(`Comparison API error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Comparison API failed, using fallback:', error)
      // Return a default comparison instead of failing
      return {
        singleModel: { response: 'Comparison unavailable' },
        multiModel: { response: 'Comparison unavailable' },
        improvement: { confidence: 0, recommendation: 'Unable to compare' }
      }
    }
  }
}

/**
 * Separate API for consensus feature
 */
export class ConsensusAPI {
  static async getConsensus(
    query: string,
    models: any[],
    responseMode: string
  ): Promise<any> {
    try {
      const response = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: query,  // Note: consensus API expects 'prompt' not 'query'
          models,
          responseMode 
        })
      })
      
      if (!response.ok) {
        throw new Error(`Consensus API error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Consensus API failed, using fallback:', error)
      // Return a default consensus instead of failing
      return {
        unifiedAnswer: 'Consensus unavailable',
        confidence: 0,
        responses: []
      }
    }
  }
}