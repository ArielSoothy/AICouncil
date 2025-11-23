import { CostService, TierType } from './cost-service'
import { hasInternetAccess as registryHasInternetAccess, PROVIDER_NAMES } from '@/lib/models/model-registry'

export class ModelService {
  /**
   * Get display name for provider
   */
  static getProviderName(provider: string): string {
    return PROVIDER_NAMES[provider as keyof typeof PROVIDER_NAMES] || provider
  }

  /**
   * Check if model has internet access
   * Uses centralized MODEL_REGISTRY as single source of truth
   */
  static hasInternetAccess(model: string): boolean {
    return registryHasInternetAccess(model)
  }
  
  /**
   * Get model label with cost and features
   */
  static getModelLabel(provider: string, model: string): string {
    const isFree = CostService.isFreeModel(model)
    const costDisplay = CostService.formatCostDisplay(model)
    const internetIcon = this.hasInternetAccess(model) ? ' 🌐' : ''
    
    return `${model}${internetIcon} ${isFree ? '(Free)' : `(${costDisplay})`}`
  }
  
  /**
   * Get model information for display
   */
  static getModelInfo(model: string) {
    return {
      name: model,
      tier: CostService.getModelTier(model),
      costs: CostService.getModelCosts(model),
      efficiency: CostService.getCostEfficiency(model),
      efficiencyBadge: CostService.getEfficiencyBadge(model),
      efficiencyLabel: CostService.getEfficiencyLabel(model),
      isFree: CostService.isFreeModel(model),
      hasInternet: this.hasInternetAccess(model),
      costDisplay: CostService.formatCostDisplay(model)
    }
  }
  
  /**
   * Get tier colors for UI
   */
  static getTierColors(): Record<TierType, string> {
    return {
      free: 'text-green-600 bg-green-50 dark:bg-green-900/20',
      budget: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      balanced: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
      premium: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
      flagship: 'text-red-600 bg-red-50 dark:bg-red-900/20'
    }
  }
  
  /**
   * Get tier labels for UI
   */
  static getTierLabels(): Record<TierType, string> {
    return {
      free: 'FREE',
      budget: 'BUDGET',
      balanced: 'BALANCED',
      premium: 'PREMIUM',
      flagship: 'FLAGSHIP'
    }
  }
  
  /**
   * Get efficiency information
   */
  static getEfficiencyInfo() {
    return {
      badges: {
        '🆓': 'Free',
        '💰': 'Great Value',
        '⚖️': 'Balanced',
        '💎': 'Premium', 
        '🏆': 'Flagship'
      },
      description: '🆓 Free • 💰 Great Value • ⚖️ Balanced • 💎 Premium • 🏆 Flagship'
    }
  }
}