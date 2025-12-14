/**
 * Research Coordinator
 *
 * Centralizes research decision-making for Agent Debate mode.
 * Follows academic best practices:
 * - "Centralized Planning, Decentralized Execution" (CPDE)
 * - "Research ONCE, debate MANY times"
 *
 * Academic Sources:
 * - Multi-Agent Collaboration Survey (arxiv 2025): CPDE pattern
 * - Du et al. (2023): Cross-validation reduces hallucinations by 40%
 * - ICML 2024 MAD Strategies: 15% accuracy with same factual basis
 *
 * @see docs/architecture/PRE_RESEARCH_ARCHITECTURE.md
 */

import { hasInternetAccess, getModelInfo, PROVIDER_NAMES, type Provider } from '@/lib/models/model-registry'

// ============================================================================
// Types
// ============================================================================

export interface AgentSearchCapability {
  role: string
  model: string
  provider: string
  hasNativeSearch: boolean
  searchProvider: string
}

export interface ResearchDecision {
  /** Whether to run DuckDuckGo pre-research */
  shouldRunDuckDuckGo: boolean
  /** Reason for the decision (for logging/debugging) */
  reason: string
  /** Models that need DuckDuckGo */
  modelsNeedingDuckDuckGo: AgentSearchCapability[]
  /** Models with native search */
  modelsWithNativeSearch: AgentSearchCapability[]
}

export interface ResearchCoordinatorConfig {
  /** Whether web search is enabled for the debate */
  enableWebSearch: boolean
  /** Whether centralized research (from conductGeneralResearch) already ran */
  hasCentralizedResearch: boolean
  /** Number of sources from centralized research */
  centralizedSourceCount: number
  /** Force DuckDuckGo even if centralized research exists (for testing) */
  forceDuckDuckGo?: boolean
}

// ============================================================================
// Research Coordinator Class
// ============================================================================

export class ResearchCoordinator {
  private config: ResearchCoordinatorConfig

  constructor(config: ResearchCoordinatorConfig) {
    this.config = config
  }

  /**
   * Analyze search capabilities for a set of agents
   */
  analyzeSearchCapabilities(agents: Array<{ model: string; provider: string; persona?: { role?: string } }>): AgentSearchCapability[] {
    return agents.map((agent) => {
      const modelHasNative = hasInternetAccess(agent.model)
      const modelInfo = getModelInfo(agent.model)
      const providerName = modelInfo?.provider ? PROVIDER_NAMES[modelInfo.provider as Provider] : 'Unknown'

      return {
        role: agent.persona?.role || 'Unknown',
        model: agent.model,
        provider: providerName,
        hasNativeSearch: modelHasNative,
        searchProvider: modelHasNative ? `${providerName} Native` : 'DuckDuckGo'
      }
    })
  }

  /**
   * Decide whether to run DuckDuckGo pre-research
   *
   * Decision logic (following academic best practices):
   * 1. If web search is disabled -> no DuckDuckGo
   * 2. If centralized research already ran with good sources -> skip DuckDuckGo
   * 3. If all models have native search -> skip DuckDuckGo
   * 4. Otherwise -> run DuckDuckGo for models that need it
   */
  makeResearchDecision(capabilities: AgentSearchCapability[]): ResearchDecision {
    const modelsNeedingDuckDuckGo = capabilities.filter(a => !a.hasNativeSearch)
    const modelsWithNativeSearch = capabilities.filter(a => a.hasNativeSearch)

    // Case 1: Web search disabled
    if (!this.config.enableWebSearch) {
      return {
        shouldRunDuckDuckGo: false,
        reason: 'Web search disabled',
        modelsNeedingDuckDuckGo: [],
        modelsWithNativeSearch
      }
    }

    // Case 2: Force DuckDuckGo (for testing)
    if (this.config.forceDuckDuckGo) {
      return {
        shouldRunDuckDuckGo: modelsNeedingDuckDuckGo.length > 0,
        reason: 'Forced DuckDuckGo (testing mode)',
        modelsNeedingDuckDuckGo,
        modelsWithNativeSearch
      }
    }

    // Case 3: Centralized research already ran with sufficient sources
    // Academic best practice: "Research ONCE, debate MANY times"
    if (this.config.hasCentralizedResearch && this.config.centralizedSourceCount >= 3) {
      return {
        shouldRunDuckDuckGo: false,
        reason: `Skipping DuckDuckGo - centralized research already complete (${this.config.centralizedSourceCount} sources)`,
        modelsNeedingDuckDuckGo: [],
        modelsWithNativeSearch
      }
    }

    // Case 4: All models have native search
    if (modelsNeedingDuckDuckGo.length === 0) {
      return {
        shouldRunDuckDuckGo: false,
        reason: 'All models have native search capability',
        modelsNeedingDuckDuckGo: [],
        modelsWithNativeSearch
      }
    }

    // Case 5: Some models need DuckDuckGo
    return {
      shouldRunDuckDuckGo: true,
      reason: `${modelsNeedingDuckDuckGo.length} model(s) need DuckDuckGo pre-research`,
      modelsNeedingDuckDuckGo,
      modelsWithNativeSearch
    }
  }

  /**
   * Get config for logging/debugging
   */
  getConfig(): ResearchCoordinatorConfig {
    return { ...this.config }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a research coordinator with the given configuration
 */
export function createResearchCoordinator(config: Partial<ResearchCoordinatorConfig>): ResearchCoordinator {
  const fullConfig: ResearchCoordinatorConfig = {
    enableWebSearch: config.enableWebSearch ?? false,
    hasCentralizedResearch: config.hasCentralizedResearch ?? false,
    centralizedSourceCount: config.centralizedSourceCount ?? 0,
    forceDuckDuckGo: config.forceDuckDuckGo ?? false
  }

  return new ResearchCoordinator(fullConfig)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log research decision with emoji for clarity
 */
export function logResearchDecision(decision: ResearchDecision): void {
  console.log('\n=== Research Decision ===')
  console.log(`   Result: ${decision.shouldRunDuckDuckGo ? '🦆 Run DuckDuckGo' : '✅ Skip DuckDuckGo'}`)
  console.log(`   Reason: ${decision.reason}`)
  console.log(`   Native Search Models: ${decision.modelsWithNativeSearch.length}`)
  decision.modelsWithNativeSearch.forEach(m => {
    console.log(`     - ${m.role} (${m.model}): ${m.searchProvider}`)
  })
  console.log(`   DuckDuckGo Models: ${decision.modelsNeedingDuckDuckGo.length}`)
  decision.modelsNeedingDuckDuckGo.forEach(m => {
    console.log(`     - ${m.role} (${m.model}): ${m.searchProvider}`)
  })
  console.log('========================\n')
}

/**
 * Check if a provider has native search capability
 * Uses the centralized model registry
 */
export function providerHasNativeSearch(provider: string): boolean {
  const providersWithNative = ['openai', 'xai', 'google', 'anthropic', 'perplexity']
  return providersWithNative.includes(provider.toLowerCase())
}
