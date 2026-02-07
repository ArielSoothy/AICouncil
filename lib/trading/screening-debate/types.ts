/**
 * Screening-to-Debate Pipeline Types
 *
 * Bridge types connecting the pre-market screening system to the AI debate engine.
 * Screening data (TWS gaps, volume, short data, sentiment) becomes ground truth
 * context for Analyst/Critic/Synthesizer debate agents + Judge verdict.
 */

import type { StockResult } from '@/components/trading/screening/types'
import type { BrokerId } from '@/lib/brokers/types'

// ─── Judge Verdict (BUY/WATCH/SKIP for screening context) ─────────────────

export type ScreeningVerdict = 'BUY' | 'WATCH' | 'SKIP'

export interface ScreeningJudgeResult {
  verdict: ScreeningVerdict
  confidence: number // 0-100
  reasoning: string
  entryPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  positionSize: number | null // shares
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  riskRewardRatio: number | null
  keyBullPoints: string[]
  keyBearPoints: string[]
  timeHorizon: string // e.g., "Intraday", "1-3 days"
}

// ─── Per-Stock Debate Result ───────────────────────────────────────────────

export interface AgentDebateEntry {
  role: 'analyst' | 'critic' | 'synthesizer'
  model: string
  round: number
  content: string
  tokensUsed: number
  timestamp: string
}

export interface StockDebateResult {
  symbol: string
  screeningData: StockResult
  researchSummary: string
  debate: {
    round1: AgentDebateEntry[]
    round2: AgentDebateEntry[]
  }
  judgeVerdict: ScreeningJudgeResult
  tradeExecution?: {
    executed: boolean
    orderId?: string
    brokerId?: BrokerId
    filledPrice?: number
    quantity?: number
    error?: string
    timestamp?: string
  }
  duration: number // ms
  totalTokens: number
  estimatedCost: number
}

// ─── Daily Briefing (Full Session) ─────────────────────────────────────────

export interface DailyBriefing {
  id: string
  scanId: string | null
  startedAt: string
  completedAt: string | null
  status: 'running' | 'completed' | 'error'
  config: ScreeningDebateConfig
  stocksSelected: string[]
  results: StockDebateResult[]
  summary: {
    totalStocks: number
    buys: number
    watches: number
    skips: number
    tradesExecuted: number
    totalDuration: number
    totalTokens: number
    totalCost: number
  } | null
  error?: string
}

// ─── Configuration ─────────────────────────────────────────────────────────

export interface ScreeningDebateConfig {
  topN: number // 1-10, default 3
  symbols?: string[] // Optional: debate specific symbols instead of top N from scan
  analystModel: string
  criticModel: string
  synthesizerModel: string
  judgeModel: string // default: groq llama-3.3-70b-versatile (FREE)
  tier: string // PresetTier
  autoTrade: boolean
  brokerId: BrokerId
  maxPositionSize: number // max shares per trade
  minConfidence: number // 0-100, minimum judge confidence to execute trade
  researchTier: string // ResearchTier
  researchModel?: string
}

export const DEFAULT_SCREENING_DEBATE_CONFIG: ScreeningDebateConfig = {
  topN: 3,
  analystModel: 'llama-3.3-70b-versatile', // FREE via Groq
  criticModel: 'llama-3.3-70b-versatile',
  synthesizerModel: 'llama-3.3-70b-versatile',
  judgeModel: 'llama-3.3-70b-versatile',
  tier: 'free',
  autoTrade: false,
  brokerId: 'alpaca',
  maxPositionSize: 10,
  minConfidence: 75,
  researchTier: 'free',
}

// ─── SSE Event Types ───────────────────────────────────────────────────────

export type ScreeningDebateEventType =
  | 'briefing_started'
  | 'stocks_selected'
  | 'stock_debate_started'
  | 'research_started'
  | 'research_completed'
  | 'round_started'
  | 'agent_response'
  | 'round_completed'
  | 'judge_started'
  | 'judge_verdict'
  | 'trade_executed'
  | 'stock_debate_completed'
  | 'briefing_completed'
  | 'error'

export interface ScreeningDebateEvent {
  type: ScreeningDebateEventType
  timestamp: string
  data: Record<string, unknown>
}

// ─── Database Row (Supabase) ───────────────────────────────────────────────

export interface ScreeningDebateRow {
  id: string
  scan_id: string | null
  config: ScreeningDebateConfig
  stocks_selected: string[]
  results: StockDebateResult[]
  summary: DailyBriefing['summary']
  status: 'running' | 'completed' | 'error'
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}
