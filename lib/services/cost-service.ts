import { AgentMessage } from '@/lib/agents/types'

// Model cost data - centralized from multiple components
const MODEL_COSTS_PER_1K = {
  // OpenAI Models
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4o': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
  
  // Anthropic Models
  'claude-opus-4-1-20250514': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.0008, output: 0.004 },
  'claude-2.1': { input: 0.008, output: 0.024 },
  'claude-2.0': { input: 0.008, output: 0.024 },
  
  // Google Models (Free)
  'gemini-2.5-pro': { input: 0, output: 0 },
  'gemini-2.5-flash': { input: 0, output: 0 },
  'gemini-2.0-flash': { input: 0, output: 0 },
  'gemini-2.0-flash-lite': { input: 0, output: 0 },
  'gemini-1.5-flash': { input: 0, output: 0 },
  'gemini-1.5-flash-8b': { input: 0, output: 0 },
  
  // Groq Models (Free)
  'llama-3.3-70b-versatile': { input: 0, output: 0 },
  'llama-3.1-8b-instant': { input: 0, output: 0 },
  'gemma2-9b-it': { input: 0, output: 0 },
  
  // Other Providers
  'grok-2-latest': { input: 0.002, output: 0.01 },
  'grok-2-mini': { input: 0.0005, output: 0.002 },
  'sonar-pro': { input: 0.005, output: 0.005 },
  'sonar-small': { input: 0.0005, output: 0.0005 },
  'mistral-large-latest': { input: 0.003, output: 0.009 },
  'mistral-small-latest': { input: 0.001, output: 0.003 },
  'command-r-plus': { input: 0.003, output: 0.015 },
  'command-r': { input: 0.0005, output: 0.0015 }
} as const

export type TierType = 'free' | 'budget' | 'balanced' | 'premium' | 'flagship'

export class CostService {
  /**
   * Get cost information for a model
   */
  static getModelCosts(model: string) {
    return MODEL_COSTS_PER_1K[model as keyof typeof MODEL_COSTS_PER_1K] || { input: 0.001, output: 0.003 }
  }
  
  /**
   * Calculate cost for a message based on token usage
   */
  static calculateMessageCost(message: AgentMessage): number {
    const costs = this.getModelCosts(message.model)
    // Rough estimate: 70% input, 30% output of total tokens
    const inputTokens = message.tokensUsed * 0.7
    const outputTokens = message.tokensUsed * 0.3
    return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output)
  }
  
  /**
   * Calculate synthesis cost (typically uses free models)
   */
  static calculateSynthesisCost(tokens: number): number {
    // Most synthesis uses free models like llama-3.3-70b-versatile or gemini
    // But fallback might use paid models
    const costs = { input: 0.001, output: 0.003 } // Conservative fallback estimate
    const inputTokens = tokens * 0.7
    const outputTokens = tokens * 0.3
    return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output)
  }
  
  /**
   * Get cost efficiency (lower is better, cost per token)
   */
  static getCostEfficiency(model: string): number {
    const cost = this.getModelCosts(model)
    if (cost.input === 0 && cost.output === 0) return 0
    // Average of input and output cost per token
    return (cost.input + cost.output) / 2
  }
  
  /**
   * Get efficiency badge emoji based on cost
   */
  static getEfficiencyBadge(model: string): string {
    const efficiency = this.getCostEfficiency(model)
    if (efficiency === 0) return '🆓'
    if (efficiency < 0.002) return '💰'  // Great value
    if (efficiency < 0.01) return '⚖️'   // Balanced
    if (efficiency < 0.05) return '💎'   // Premium
    return '🏆' // Flagship
  }
  
  /**
   * Get efficiency label based on cost
   */
  static getEfficiencyLabel(model: string): string {
    const efficiency = this.getCostEfficiency(model)
    if (efficiency === 0) return 'Free'
    if (efficiency < 0.002) return 'Great Value'
    if (efficiency < 0.01) return 'Balanced'
    if (efficiency < 0.05) return 'Premium'
    return 'Flagship'
  }
  
  /**
   * Get model tier based on cost
   */
  static getModelTier(model: string): TierType {
    const efficiency = this.getCostEfficiency(model)
    if (efficiency === 0) return 'free'
    if (efficiency < 0.002) return 'budget'
    if (efficiency < 0.01) return 'balanced'
    if (efficiency < 0.05) return 'premium'
    return 'flagship'
  }
  
  /**
   * Check if model is free
   */
  static isFreeModel(model: string): boolean {
    const costs = this.getModelCosts(model)
    return costs.input === 0 && costs.output === 0
  }
  
  /**
   * Format cost display string
   */
  static formatCostDisplay(model: string): string {
    const cost = this.getModelCosts(model)
    if (this.isFreeModel(model)) return 'FREE'
    return `$${cost.input.toFixed(4)}/$${cost.output.toFixed(4)} per 1K`
  }
  
  /**
   * Get all model costs (for external use)
   */
  static getAllModelCosts() {
    return MODEL_COSTS_PER_1K
  }
}