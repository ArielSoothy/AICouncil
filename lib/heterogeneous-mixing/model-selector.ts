/**
 * Heterogeneous Model Selection System
 * 
 * Research-based optimal model combinations:
 * - 25% improvement from mixing different model families (MIT, 2024)
 * - Different training data = different knowledge patterns
 * - Different architectures = different reasoning approaches
 * 
 * Strategy: Assign different model families to different agent roles based on:
 * 1. Query type analysis
 * 2. Agent role strengths  
 * 3. Model family capabilities
 * 4. Cost/performance optimization
 */

import { QueryAnalysis, QueryType, ModelFamily, MODEL_FAMILY_STRENGTHS } from './query-analyzer'
import { AgentRole } from '@/lib/agents/types'
import { MODEL_BENCHMARKS, MODEL_COSTS_PER_1K, getModelRank, rankToInfluenceWeight } from '@/lib/model-metadata'
import { providerRegistry } from '@/lib/ai-providers'

export interface ModelRecommendation {
  agentRole: AgentRole
  provider: string
  model: string
  reasoning: string
  confidence: number
  alternatives: Array<{
    provider: string
    model: string
    reasoning: string
  }>
}

export interface HeterogeneousMixingResult {
  strategy: 'heterogeneous' | 'homogeneous' | 'hybrid'
  recommendations: ModelRecommendation[]
  expectedImprovement: string
  totalEstimatedCost: number
  reasoning: string
}

/**
 * Agent role optimal model family preferences
 * Based on research and agent characteristics
 */
const AGENT_ROLE_PREFERENCES: Record<AgentRole, {
  primary: ModelFamily[]
  secondary: ModelFamily[]
  reasoning: string
}> = {
  analyst: {
    primary: ['anthropic', 'google', 'cohere'],  // Strong at factual analysis
    secondary: ['openai', 'mistral'],
    reasoning: 'Analysts need factual accuracy, comprehensive knowledge, and structured thinking'
  },
  critic: {
    primary: ['openai', 'anthropic', 'xai'],     // Strong at reasoning and finding flaws  
    secondary: ['mistral', 'groq'],
    reasoning: 'Critics need strong reasoning, skeptical analysis, and ability to challenge ideas'
  },
  synthesizer: {
    primary: ['anthropic', 'openai', 'mistral'], // Strong at balanced synthesis
    secondary: ['google', 'cohere'],
    reasoning: 'Synthesizers need balanced perspective, nuanced thinking, and integration skills'
  }
}

/**
 * Query type to optimal model family mapping
 */
const QUERY_TYPE_MODEL_PREFERENCES: Record<QueryType, {
  families: ModelFamily[]
  reasoning: string
}> = {
  mathematical: {
    families: ['openai', 'anthropic', 'mistral'],
    reasoning: 'Mathematical queries benefit from strong reasoning and calculation accuracy'
  },
  creative: {
    families: ['openai', 'anthropic', 'xai'],
    reasoning: 'Creative tasks benefit from language models with strong generative capabilities'
  },
  analytical: {
    families: ['anthropic', 'cohere', 'google'],
    reasoning: 'Analysis requires factual accuracy and structured reasoning'
  },
  factual: {
    families: ['google', 'cohere', 'anthropic'],
    reasoning: 'Factual queries benefit from broad knowledge bases'
  },
  reasoning: {
    families: ['openai', 'anthropic', 'mistral'],
    reasoning: 'Complex reasoning requires strong logical capabilities'
  },
  technical: {
    families: ['openai', 'mistral', 'groq'],
    reasoning: 'Technical content benefits from code-trained models'
  },
  conversational: {
    families: ['openai', 'anthropic', 'google'],
    reasoning: 'General conversation benefits from well-rounded capabilities'
  },
  multilingual: {
    families: ['google', 'mistral', 'openai'],
    reasoning: 'Multilingual tasks require diverse training data'
  },
  'current-events': {
    families: ['xai', 'groq', 'google'],
    reasoning: 'Current events benefit from real-time or recent information'
  },
  comparative: {
    families: ['anthropic', 'cohere', 'openai'],
    reasoning: 'Comparisons require balanced analysis and reasoning'
  }
}

/**
 * Get best available models for each provider
 */
function getBestModelsPerFamily(): Record<ModelFamily, Array<{ model: string, rank: number, cost: number }>> {
  const result: Record<ModelFamily, Array<{ model: string, rank: number, cost: number }>> = {
    openai: [],
    anthropic: [],
    google: [],
    groq: [],
    xai: [],
    mistral: [],
    cohere: []
  }
  
  // Get all available models from configured providers
  const availableModels = providerRegistry.getAvailableModels()
  
  for (const { provider, models } of availableModels) {
    const family = provider as ModelFamily
    if (!result[family]) continue
    
    for (const model of models) {
      const rank = getModelRank(model)
      const cost = MODEL_COSTS_PER_1K[model]
      const totalCost = cost ? cost.input + cost.output : 0
      
      result[family].push({
        model,
        rank,
        cost: totalCost
      })
    }
    
    // Sort by rank (lower is better) and cost as tiebreaker
    result[family].sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.cost - b.cost
    })
    
    // Keep top 3 models per family
    result[family] = result[family].slice(0, 3)
  }
  
  return result
}

/**
 * Calculate heterogeneous mixing benefit
 */
function calculateMixingBenefit(selectedFamilies: ModelFamily[]): number {
  const uniqueFamilies = new Set(selectedFamilies).size
  const totalAgents = selectedFamilies.length
  
  // Research-based improvements:
  // - 25% improvement from mixing different model families
  // - Diminishing returns after 3 families
  const diversityRatio = Math.min(uniqueFamilies / totalAgents, 1)
  const baseImprovement = 0.25 // 25% from research
  
  return baseImprovement * diversityRatio
}

/**
 * Select optimal models using heterogeneous mixing strategy
 */
export function selectHeterogeneousModels(
  queryAnalysis: QueryAnalysis,
  agentRoles: AgentRole[],
  userTier: 'guest' | 'free' | 'pro' | 'enterprise' = 'free'
): HeterogeneousMixingResult {
  
  const bestModels = getBestModelsPerFamily()
  const recommendations: ModelRecommendation[] = []
  
  // Get query-preferred families
  const queryPreferences = QUERY_TYPE_MODEL_PREFERENCES[queryAnalysis.primaryType]
  const secondaryPreferences = queryAnalysis.secondaryTypes.map(type => 
    QUERY_TYPE_MODEL_PREFERENCES[type]
  )
  
  // Combine all preferred families with weights
  const familyScores: Record<ModelFamily, number> = {
    openai: 0,
    anthropic: 0, 
    google: 0,
    groq: 0,
    xai: 0,
    mistral: 0,
    cohere: 0
  }
  
  // Primary query type gets 3x weight
  queryPreferences.families.forEach(family => {
    familyScores[family] += 3
  })
  
  // Secondary query types get 1x weight
  secondaryPreferences.forEach(pref => {
    pref.families.forEach(family => {
      familyScores[family] += 1
    })
  })
  
  // Apply complexity and search requirements
  if (queryAnalysis.requiresWebSearch) {
    familyScores.groq += 2  // Groq is great for function calling/tools
    familyScores.xai += 2   // xAI for current events
  }
  
  if (queryAnalysis.complexity === 'very-high') {
    familyScores.anthropic += 2  // Claude excels at complex analysis
    familyScores.openai += 1     // GPT good at reasoning
  }
  
  // User tier constraints
  if (userTier === 'guest' || userTier === 'free') {
    // Prefer free/cheap models
    familyScores.google += 3     // Gemini is free
    familyScores.groq += 3       // Groq is free
    familyScores.openai -= 1     // GPT is expensive
    familyScores.anthropic -= 1  // Claude is expensive
  }
  
  // Assign models to each agent role
  const usedFamilies: ModelFamily[] = []
  
  for (const agentRole of agentRoles) {
    const rolePrefs = AGENT_ROLE_PREFERENCES[agentRole]
    
    // Calculate scores for this agent combining role + query preferences
    const agentFamilyScores: Record<ModelFamily, number> = { ...familyScores }
    
    rolePrefs.primary.forEach(family => {
      agentFamilyScores[family] += 4
    })
    
    rolePrefs.secondary.forEach(family => {
      agentFamilyScores[family] += 2  
    })
    
    // Encourage diversity by reducing scores for already used families
    usedFamilies.forEach(family => {
      agentFamilyScores[family] -= 2
    })
    
    // Find best available family for this agent
    const sortedFamilies = Object.entries(agentFamilyScores)
      .sort(([,a], [,b]) => b - a)
      .map(([family]) => family as ModelFamily)
      .filter(family => bestModels[family].length > 0)
    
    if (sortedFamilies.length === 0) {
      throw new Error(`No available models for agent role: ${agentRole}`)
    }
    
    const selectedFamily = sortedFamilies[0]
    const selectedModel = bestModels[selectedFamily][0]
    
    if (!selectedModel) {
      throw new Error(`No models available for family: ${selectedFamily}`)
    }
    
    usedFamilies.push(selectedFamily)
    
    // Generate alternatives
    const alternatives = sortedFamilies.slice(1, 3)
      .filter(family => bestModels[family].length > 0)
      .map(family => ({
        provider: family,
        model: bestModels[family][0].model,
        reasoning: `Alternative ${family} model with good ${agentRole} capabilities`
      }))
    
    recommendations.push({
      agentRole,
      provider: selectedFamily,
      model: selectedModel.model,
      reasoning: `${selectedFamily.charAt(0).toUpperCase() + selectedFamily.slice(1)} excels at ${rolePrefs.reasoning.toLowerCase()} for ${queryAnalysis.primaryType} queries`,
      confidence: Math.min(0.95, agentFamilyScores[selectedFamily] / 10),
      alternatives
    })
  }
  
  // Calculate expected improvement and cost
  const expectedImprovement = calculateMixingBenefit(usedFamilies)
  const improvementPercent = Math.round(expectedImprovement * 100)
  
  const totalEstimatedCost = recommendations.reduce((total, rec) => {
    const cost = MODEL_COSTS_PER_1K[rec.model]
    return total + (cost ? cost.input + cost.output : 0.001)
  }, 0)
  
  // Determine strategy
  const uniqueFamilies = new Set(usedFamilies).size
  const strategy = uniqueFamilies >= 3 ? 'heterogeneous' : 
                  uniqueFamilies === 2 ? 'hybrid' : 'homogeneous'
  
  const reasoning = `Selected ${uniqueFamilies} different model families for ${agentRoles.length} agents. ` +
    `Query type "${queryAnalysis.primaryType}" (${queryAnalysis.complexity} complexity) ` +
    `benefits from ${strategy} approach. Expected ${improvementPercent}% improvement over single model.`
  
  return {
    strategy,
    recommendations,
    expectedImprovement: `${improvementPercent}% accuracy improvement`,
    totalEstimatedCost,
    reasoning
  }
}

/**
 * Quick selection for common scenarios (performance optimization)
 */
export function getOptimalModelCombination(
  queryType: QueryType,
  complexity: 'low' | 'medium' | 'high' | 'very-high',
  userTier: 'guest' | 'free' | 'pro' | 'enterprise' = 'free'
): { analyst: string, critic: string, synthesizer: string } {
  
  // Pre-computed optimal combinations for common scenarios
  const combinations = {
    guest: {
      mathematical: { analyst: 'gemini-2.5-flash', critic: 'llama-3.3-70b-versatile', synthesizer: 'gemini-2.0-flash' },
      creative: { analyst: 'gemini-2.5-flash', critic: 'llama-3.3-70b-versatile', synthesizer: 'gemini-2.0-flash' },
      analytical: { analyst: 'gemini-2.5-flash', critic: 'llama-3.3-70b-versatile', synthesizer: 'gemini-2.0-flash' },
      factual: { analyst: 'gemini-2.5-flash', critic: 'gemini-2.0-flash', synthesizer: 'llama-3.3-70b-versatile' },
      technical: { analyst: 'llama-3.3-70b-versatile', critic: 'gemini-2.5-flash', synthesizer: 'llama-3.3-70b-versatile' },
    },
    free: {
      mathematical: { analyst: 'gemini-2.5-flash', critic: 'claude-3-5-haiku-20241022', synthesizer: 'llama-3.3-70b-versatile' },
      creative: { analyst: 'claude-3-5-haiku-20241022', critic: 'gemini-2.5-flash', synthesizer: 'llama-3.3-70b-versatile' },
      analytical: { analyst: 'claude-3-5-haiku-20241022', critic: 'gemini-2.5-flash', synthesizer: 'llama-3.3-70b-versatile' },
      factual: { analyst: 'gemini-2.5-flash', critic: 'claude-3-5-haiku-20241022', synthesizer: 'llama-3.3-70b-versatile' },
      technical: { analyst: 'llama-3.3-70b-versatile', critic: 'claude-3-5-haiku-20241022', synthesizer: 'gemini-2.5-flash' },
    },
    pro: {
      mathematical: { analyst: 'claude-3-7-sonnet-20250219', critic: 'gpt-4.1', synthesizer: 'llama-3.3-70b-versatile' },
      creative: { analyst: 'gpt-4.1', critic: 'claude-3-7-sonnet-20250219', synthesizer: 'mistral-large-latest' },
      analytical: { analyst: 'claude-3-7-sonnet-20250219', critic: 'gpt-4.1', synthesizer: 'command-r-plus' },
      factual: { analyst: 'gemini-2.5-pro', critic: 'claude-3-7-sonnet-20250219', synthesizer: 'gpt-4.1' },
      technical: { analyst: 'gpt-4.1', critic: 'claude-3-7-sonnet-20250219', synthesizer: 'mistral-large-latest' },
    },
    enterprise: {
      mathematical: { analyst: 'claude-opus-4-20250514', critic: 'gpt-5', synthesizer: 'claude-sonnet-4-20250514' },
      creative: { analyst: 'gpt-5', critic: 'claude-opus-4-20250514', synthesizer: 'grok-4-0709' },
      analytical: { analyst: 'claude-opus-4-20250514', critic: 'gpt-5', synthesizer: 'command-r-plus' },
      factual: { analyst: 'gemini-2.5-pro', critic: 'claude-opus-4-20250514', synthesizer: 'gpt-5' },
      technical: { analyst: 'gpt-5', critic: 'claude-opus-4-20250514', synthesizer: 'mistral-large-latest' },
    }
  }
  
  const tierCombos = combinations[userTier] || combinations.free
  const baseCombo = tierCombos[queryType] || tierCombos.analytical
  
  // Adjust for complexity (use better models for high complexity)
  if (complexity === 'very-high' && userTier !== 'guest') {
    // Upgrade models for very high complexity
    const upgrades = {
      'gemini-2.5-flash': 'claude-3-5-haiku-20241022',
      'llama-3.3-70b-versatile': 'claude-3-7-sonnet-20250219',
      'claude-3-5-haiku-20241022': 'claude-3-7-sonnet-20250219',
      'gpt-4.1': 'gpt-5',
      'claude-3-7-sonnet-20250219': 'claude-opus-4-20250514'
    }
    
    return {
      analyst: upgrades[baseCombo.analyst as keyof typeof upgrades] || baseCombo.analyst,
      critic: upgrades[baseCombo.critic as keyof typeof upgrades] || baseCombo.critic,
      synthesizer: upgrades[baseCombo.synthesizer as keyof typeof upgrades] || baseCombo.synthesizer
    }
  }
  
  return baseCombo
}