// Helper function for calling consensus API with proper error handling
export async function callConsensusAPI(
  baseUrl: string,
  query: string,
  models: Array<{ provider: string; model: string }>,
  responseMode: string = 'concise'
) {
  try {
    // Early return if no models or query
    if (!models || models.length === 0) {
      console.log('No models provided for consensus API')
      return null
    }
    
    if (!query || query.trim().length === 0) {
      console.error('No query provided for consensus API')
      return null
    }

    // Ensure models have the exact structure the consensus API expects
    const formattedModels = models.map(m => ({
      provider: m.provider || '',
      model: m.model || '',
      enabled: true
    }))

    // Filter out any invalid models
    const validModels = formattedModels.filter(m => 
      m.provider && m.model && m.provider !== 'undefined'
    )

    if (validModels.length === 0) {
      console.error('No valid models for consensus API')
      return null
    }

    const payload = {
      prompt: query,
      models: validModels,
      responseMode,
      isGuestMode: true
    }

    console.log('Consensus API request:', {
      prompt: query ? query.substring(0, 50) + '...' : 'NO PROMPT',
      models: validModels,
      modelCount: validModels.length,
      responseMode,
      payloadSize: JSON.stringify(payload).length,
      fullPayload: payload
    })

    const response = await fetch(`${baseUrl}/api/consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Consensus API error:', response.status, errorText)
      return null
    }

    const result = await response.json()
    console.log('Consensus API success, keys:', Object.keys(result))
    
    // Extract the consensus data in a consistent format
    if (result.consensus?.unifiedAnswer) {
      return {
        response: result.consensus.unifiedAnswer,
        unifiedAnswer: result.consensus.unifiedAnswer,
        models: validModels.map(m => `${m.provider}/${m.model}`),
        tokensUsed: result.totalTokensUsed || 0,
        responseTime: 0, // Will be calculated by caller
        cost: result.estimatedCost || 0,
        confidence: result.consensus.confidence || 0.8,
        judgeAnalysis: result.consensus.judgeAnalysis
      }
    }

    return null
  } catch (error) {
    console.error('Consensus API call failed:', error)
    return null
  }
}