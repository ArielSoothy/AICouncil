/**
 * Research Agents Types - CLIENT-SAFE
 *
 * This file contains ONLY types and constants that can be safely
 * imported in client-side code (React components, contexts).
 *
 * IMPORTANT: Do NOT import any server-side code here!
 * - NO yahoo-finance2
 * - NO fs/path/crypto modules
 * - NO database connections
 *
 * Server-side implementation is in lib/agents/research-agents.ts
 */

import type { TradingTimeframe } from '@/components/trading/timeframe-selector'
import type { ResearchAgentRole } from '@/types/research-progress'

// ============================================================================
// Research Model Configuration (Client-safe)
// ============================================================================

export type ResearchTier = 'free' | 'pro' | 'max' | 'sub-pro' | 'sub-max';

export interface TierModelConfig {
  model: string;
  provider: 'groq' | 'anthropic' | 'openai' | 'google';
  displayName: string;
  hasToolSupport?: boolean; // Whether this model supports tool calling for research
}

/**
 * RESEARCH MODEL PRESETS
 *
 * Cost comparison per 1M tokens:
 *   - Sonnet 4.5: $3.00 in / $15.00 out (default, powerful)
 *   - Haiku 4.5:  $1.00 in / $5.00 out (3x cheaper!)
 *   - Gemini 2.5 Flash: $0.30 in / $2.50 out (FREE tier available!)
 *   - GPT-4.1 Mini: $0.15 in / $0.60 out (cheapest paid, 4x cheaper than Gemini)
 *
 * Priority order for fallback: gemini-flash → gpt-mini → haiku → sonnet
 * NOTE: Llama 70B removed - Groq AI SDK doesn't reliably enforce tool calling
 */
export type ResearchModelPreset = 'sonnet' | 'haiku' | 'gemini' | 'gemini-flash' | 'gpt-mini';

export const RESEARCH_MODEL_PRESETS: Record<ResearchModelPreset, TierModelConfig> = {
  sonnet: {
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    displayName: 'Claude 4.5 Sonnet',
    hasToolSupport: true,
  },
  haiku: {
    model: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    displayName: 'Claude 4.5 Haiku ($)',
    hasToolSupport: true,
  },
  // Legacy alias - now points to gemini-flash
  gemini: {
    model: 'gemini-2.5-flash',
    provider: 'google',
    displayName: 'Gemini 2.5 Flash (FREE)',
    hasToolSupport: true, // AI SDK supports tool calling for Gemini 2.5+
  },
  // Recommended FREE option
  'gemini-flash': {
    model: 'gemini-2.5-flash',
    provider: 'google',
    displayName: 'Gemini 2.5 Flash (FREE)',
    hasToolSupport: true,
  },
  // Cheapest paid option (4x cheaper than Gemini on output)
  'gpt-mini': {
    model: 'gpt-4.1-mini',
    provider: 'openai',
    displayName: 'GPT-4.1 Mini (Budget)',
    hasToolSupport: true,
  },
};

// ============================================================================
// Research Report Types (Client-safe for display)
// ============================================================================

export interface ResearchAgentResult {
  agent: ResearchAgentRole;
  model: string;
  provider: string;
  toolsUsed: boolean;
  toolCallCount: number;
  toolNames: string[];
  findings: string; // Raw research output
  responseTime: number;
  tokensUsed: number;
  error?: string;
}

export interface ResearchReport {
  symbol: string;
  timeframe: TradingTimeframe;
  technical: ResearchAgentResult;
  fundamental: ResearchAgentResult;
  sentiment: ResearchAgentResult;
  risk: ResearchAgentResult;
  totalToolCalls: number;
  researchDuration: number; // ms
  timestamp: Date;
  minimalDataProvided: string; // What basic data agents started with
}
