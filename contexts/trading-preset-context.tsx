'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './auth-context'
import { PresetTier } from '@/lib/config/model-presets'
import { IS_PRODUCTION } from '@/lib/utils/environment'
import type { ResearchModelPreset } from '@/types/research-agents'

/**
 * Global Model Tier Context
 *
 * Manages the global Free/Pro/Max tier selection that applies to ALL modes across the app:
 * - Consensus Mode (/)
 * - Agent Debate Mode (/agents)
 * - Trading Modes (/trading): Consensus Trade, Debate Trade
 * - Ultra Mode (/ultra)
 * - Arena Mode (/arena)
 *
 * Features:
 * - Single source of truth for tier selection across entire app
 * - Smart defaults based on user subscription tier
 * - Session-scoped state (no persistence needed)
 * - Consumed by all mode components that use AI models
 *
 * Production behavior:
 * - Defaults to 'free' tier (SUB tiers require local CLI, not available on Vercel)
 * - Pro/Max tiers locked until Stripe integration
 */

interface GlobalModelTierContextType {
  globalTier: PresetTier
  setGlobalTier: (preset: PresetTier) => void
  researchModel: ResearchModelPreset
  setResearchModel: (model: ResearchModelPreset) => void
}

const GlobalModelTierContext = createContext<GlobalModelTierContextType | undefined>(undefined)

// Default tier: 'free' in production (SUB tiers don't work on Vercel), 'sub-pro' in dev
const DEFAULT_TIER: PresetTier = IS_PRODUCTION ? 'free' : 'sub-pro'

export function GlobalModelTierProvider({ children }: { children: ReactNode }) {
  const { userTier } = useAuth()
  const [globalTier, setGlobalTier] = useState<PresetTier>(DEFAULT_TIER)
  const [researchModel, setResearchModel] = useState<ResearchModelPreset>('gpt-mini')

  // Smart default: Sync with user subscription tier on mount
  useEffect(() => {
    if (userTier) {
      // Map subscription tiers to preset tiers
      const presetMapping: Record<string, PresetTier> = {
        free: 'free',
        pro: 'pro',
        enterprise: 'max',
      }

      // In production, default to 'free' if no valid mapping (SUB tiers don't work on Vercel)
      const mappedPreset = presetMapping[userTier] || DEFAULT_TIER
      setGlobalTier(mappedPreset)
    }
  }, [userTier])

  return (
    <GlobalModelTierContext.Provider value={{ globalTier, setGlobalTier, researchModel, setResearchModel }}>
      {children}
    </GlobalModelTierContext.Provider>
  )
}

/**
 * Hook to access global model tier state
 * Use this in ALL mode components across the app to read/update the global tier
 */
export function useGlobalModelTier() {
  const context = useContext(GlobalModelTierContext)
  if (context === undefined) {
    throw new Error('useGlobalModelTier must be used within a GlobalModelTierProvider')
  }
  return context
}

// Legacy exports for backwards compatibility during migration
export const TradingPresetProvider = GlobalModelTierProvider
export const useTradingPreset = useGlobalModelTier
