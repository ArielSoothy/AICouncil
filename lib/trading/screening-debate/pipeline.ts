/**
 * Screening-to-Debate Pipeline Orchestrator
 *
 * Fetches top N stocks from screening_scans, runs research + 2-round debate
 * per stock, then runs a judge for BUY/WATCH/SKIP verdict.
 *
 * Stocks are debated SEQUENTIALLY to respect API rate limits.
 * Uses existing research cache, provider factory, and model fallback systems.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { runResearchAgents, type ResearchReport, type ResearchTier, type ResearchModelPreset } from '@/lib/agents/research-agents'
import { ResearchCache } from '@/lib/trading/research-cache'
import { getProviderForTier, isSubscriptionTier } from '@/lib/ai-providers/provider-factory'
import { getProviderForModel as getProviderFromConfig } from '@/lib/trading/models-config'
import { getFallbackModel, recordModelFailure, getModelDisplayName } from '@/lib/trading/model-fallback'
import { generateScreeningJudgePrompt, parseScreeningJudgeResponse } from '@/lib/trading/judge-system'
import { extractJSON } from '@/lib/trading/json-extraction'
import { executeScreeningTrade } from './trade-executor'
import {
  formatScreeningDataForPrompt,
  generateScreeningAnalystPrompt,
  generateScreeningCriticPrompt,
  generateScreeningSynthesizerPrompt,
} from './prompts'
import type {
  ScreeningDebateConfig,
  ScreeningDebateEvent,
  StockDebateResult,
  AgentDebateEntry,
  DailyBriefing,
  ScreeningDebateRow,
} from './types'
import type { StockResult } from '@/components/trading/screening/types'
import type { PresetTier } from '@/lib/config/model-presets'
import type { TradingTimeframe } from '@/components/trading/timeframe-selector'

// Minimal account stub for research agents (screening doesn't require broker auth)
const SCREENING_ACCOUNT = {
  id: 'screening',
  account_number: 'screening',
  status: 'active',
  currency: 'USD',
  buying_power: '0',
  cash: '0',
  portfolio_value: '0',
  equity: '0',
  last_equity: '0',
}

const researchCache = new ResearchCache()

// ─── Provider helper ───────────────────────────────────────────────────────

function getProviderName(modelId: string): string {
  return getProviderFromConfig(modelId) || 'groq'
}

async function queryModel(
  prompt: string,
  modelId: string,
  tier: PresetTier,
  maxTokens = 2000
): Promise<{ response: string; modelUsed: string; tokensUsed: number }> {
  const providerType = getProviderName(modelId)
  const { provider, error: providerError } = getProviderForTier(tier, providerType)

  if (providerError || !provider) {
    throw new Error(providerError || `No provider for ${providerType}`)
  }

  try {
    const result = await provider.query(prompt, {
      model: modelId,
      provider: providerType,
      temperature: 0.2,
      maxTokens,
      enabled: true,
      useTools: false,
      maxSteps: 1,
    })
    return {
      response: result.response,
      modelUsed: modelId,
      tokensUsed: result.tokens?.total || 0,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    recordModelFailure(modelId, msg)

    // Sub tiers: no fallback
    if (isSubscriptionTier(tier)) {
      throw new Error(`Sub tier error (no fallback): ${msg}`)
    }

    // Try fallback
    const fallbackId = getFallbackModel(modelId, [modelId])
    if (fallbackId) {
      return queryModel(prompt, fallbackId, tier, maxTokens)
    }
    throw new Error(`All fallbacks exhausted for ${modelId}: ${msg}`)
  }
}

// ─── Fetch top stocks from latest screening scan ───────────────────────────

export async function fetchTopScreenedStocks(
  topN: number,
  scanId?: string
): Promise<{ stocks: StockResult[]; scanId: string | null }> {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('screening_scans')
    .select('id, stocks, scanned_at')
    .order('scanned_at', { ascending: false })
    .limit(1)

  if (scanId) {
    query = supabase
      .from('screening_scans')
      .select('id, stocks, scanned_at')
      .eq('id', scanId)
      .limit(1)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    throw new Error('No screening scan found. Run a screening scan first.')
  }

  // Parse stocks from JSONB
  const allStocks: StockResult[] = Array.isArray(data.stocks)
    ? data.stocks
    : []

  // Sort by score descending and take top N
  const sorted = allStocks
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topN)

  return { stocks: sorted, scanId: data.id }
}

// ─── Run debate for a single stock ─────────────────────────────────────────

export async function debateSingleStock(
  stock: StockResult,
  config: ScreeningDebateConfig,
  emit: (event: ScreeningDebateEvent) => void
): Promise<StockDebateResult> {
  const startTime = Date.now()
  let totalTokens = 0
  const debateEntries: { round1: AgentDebateEntry[]; round2: AgentDebateEntry[] } = {
    round1: [],
    round2: [],
  }

  const tier = config.tier as PresetTier
  const screeningContext = formatScreeningDataForPrompt(stock)

  // ── Research Phase ──────────────────────────────────────────────────────
  emit({
    type: 'research_started',
    timestamp: new Date().toISOString(),
    data: { symbol: stock.symbol },
  })

  let researchReport: ResearchReport | null = null
  let researchSummary = ''

  try {
    // Check cache first
    researchReport = await researchCache.get(stock.symbol, 'day' as TradingTimeframe)

    if (!researchReport) {
      researchReport = await runResearchAgents(
        stock.symbol,
        'day' as TradingTimeframe,
        SCREENING_ACCOUNT,
        (config.researchTier || 'free') as ResearchTier,
        undefined,
        config.researchModel as ResearchModelPreset | undefined
      )
      await researchCache.set(stock.symbol, 'day' as TradingTimeframe, researchReport)
    }

    researchSummary = formatResearchForDebate(researchReport)
  } catch (researchError) {
    // Continue with screening data only if research fails
    researchSummary = '[Research unavailable - using screening data only]'
    console.error(`Research failed for ${stock.symbol}:`, researchError)
  }

  emit({
    type: 'research_completed',
    timestamp: new Date().toISOString(),
    data: {
      symbol: stock.symbol,
      toolCalls: researchReport?.totalToolCalls || 0,
      cached: !!researchReport,
    },
  })

  // ── Round 1 ──────────────────────────────────────────────────────────────
  emit({
    type: 'round_started',
    timestamp: new Date().toISOString(),
    data: { symbol: stock.symbol, round: 1 },
  })

  // Analyst R1
  const analystR1Prompt = generateScreeningAnalystPrompt(screeningContext, researchSummary, 1)
  const analystR1 = await queryModel(analystR1Prompt, config.analystModel, tier)
  totalTokens += analystR1.tokensUsed
  debateEntries.round1.push(makeEntry('analyst', analystR1, 1))
  emit({ type: 'agent_response', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, role: 'analyst', round: 1, model: analystR1.modelUsed } })

  // Critic R1
  const criticR1Prompt = generateScreeningCriticPrompt(screeningContext, researchSummary, 1, analystR1.response)
  const criticR1 = await queryModel(criticR1Prompt, config.criticModel, tier)
  totalTokens += criticR1.tokensUsed
  debateEntries.round1.push(makeEntry('critic', criticR1, 1))
  emit({ type: 'agent_response', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, role: 'critic', round: 1, model: criticR1.modelUsed } })

  // Synthesizer R1
  const synthR1Prompt = generateScreeningSynthesizerPrompt(screeningContext, researchSummary, 1, analystR1.response, criticR1.response)
  const synthR1 = await queryModel(synthR1Prompt, config.synthesizerModel, tier)
  totalTokens += synthR1.tokensUsed
  debateEntries.round1.push(makeEntry('synthesizer', synthR1, 1))
  emit({ type: 'agent_response', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, role: 'synthesizer', round: 1, model: synthR1.modelUsed } })

  emit({ type: 'round_completed', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, round: 1 } })

  // ── Round 2 ──────────────────────────────────────────────────────────────
  emit({ type: 'round_started', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, round: 2 } })

  const round1Summary = {
    analyst: analystR1.response,
    critic: criticR1.response,
    synthesizer: synthR1.response,
  }

  // Analyst R2
  const analystR2Prompt = generateScreeningAnalystPrompt(screeningContext, researchSummary, 2, round1Summary)
  const analystR2 = await queryModel(analystR2Prompt, config.analystModel, tier)
  totalTokens += analystR2.tokensUsed
  debateEntries.round2.push(makeEntry('analyst', analystR2, 2))
  emit({ type: 'agent_response', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, role: 'analyst', round: 2, model: analystR2.modelUsed } })

  // Critic R2
  const criticR2Prompt = generateScreeningCriticPrompt(screeningContext, researchSummary, 2, analystR2.response, round1Summary)
  const criticR2 = await queryModel(criticR2Prompt, config.criticModel, tier)
  totalTokens += criticR2.tokensUsed
  debateEntries.round2.push(makeEntry('critic', criticR2, 2))
  emit({ type: 'agent_response', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, role: 'critic', round: 2, model: criticR2.modelUsed } })

  // Synthesizer R2
  const synthR2Prompt = generateScreeningSynthesizerPrompt(screeningContext, researchSummary, 2, analystR2.response, criticR2.response, round1Summary)
  const synthR2 = await queryModel(synthR2Prompt, config.synthesizerModel, tier)
  totalTokens += synthR2.tokensUsed
  debateEntries.round2.push(makeEntry('synthesizer', synthR2, 2))
  emit({ type: 'agent_response', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, role: 'synthesizer', round: 2, model: synthR2.modelUsed } })

  emit({ type: 'round_completed', timestamp: new Date().toISOString(), data: { symbol: stock.symbol, round: 2 } })

  // ── Judge ────────────────────────────────────────────────────────────────
  emit({ type: 'judge_started', timestamp: new Date().toISOString(), data: { symbol: stock.symbol } })

  const judgePrompt = generateScreeningJudgePrompt(
    stock.symbol,
    screeningContext,
    {
      round1: { analyst: analystR1.response, critic: criticR1.response, synthesizer: synthR1.response },
      round2: { analyst: analystR2.response, critic: criticR2.response, synthesizer: synthR2.response },
    }
  )

  const judgeResult = await queryModel(judgePrompt, config.judgeModel, tier, 1500)
  totalTokens += judgeResult.tokensUsed

  const judgeVerdict = parseScreeningJudgeResponse(judgeResult.response)

  emit({
    type: 'judge_verdict',
    timestamp: new Date().toISOString(),
    data: {
      symbol: stock.symbol,
      verdict: judgeVerdict.verdict,
      confidence: judgeVerdict.confidence,
      model: judgeResult.modelUsed,
    },
  })

  // ── Trade Execution (if auto-trade enabled + BUY verdict) ─────────────────
  let tradeExecution = undefined
  if (config.autoTrade && judgeVerdict.verdict === 'BUY') {
    const tradeResult = await executeScreeningTrade(
      stock.symbol,
      judgeVerdict,
      config,
      '' // debateId not yet available at stock level - will be set in pipeline
    )
    tradeExecution = tradeResult

    if (tradeResult.executed) {
      emit({
        type: 'trade_executed',
        timestamp: new Date().toISOString(),
        data: {
          symbol: stock.symbol,
          orderId: tradeResult.orderId,
          quantity: tradeResult.quantity,
          brokerId: tradeResult.brokerId,
        },
      })
    }
  }

  const duration = Date.now() - startTime
  // Rough cost estimate: $0.0002 per 1K tokens for free models
  const estimatedCost = (totalTokens / 1000) * 0.0002

  return {
    symbol: stock.symbol,
    screeningData: stock,
    researchSummary,
    debate: debateEntries,
    judgeVerdict,
    tradeExecution,
    duration,
    totalTokens,
    estimatedCost,
  }
}

// ─── Full briefing pipeline ────────────────────────────────────────────────

export async function runScreeningDebatePipeline(
  config: ScreeningDebateConfig,
  emit: (event: ScreeningDebateEvent) => void,
  scanId?: string
): Promise<DailyBriefing> {
  const briefingId = crypto.randomUUID()
  const startedAt = new Date().toISOString()
  const supabase = getSupabaseAdmin()

  emit({
    type: 'briefing_started',
    timestamp: startedAt,
    data: { briefingId, config },
  })

  // Create initial DB row
  await supabase.from('screening_debates').insert({
    id: briefingId,
    scan_id: scanId || null,
    config,
    stocks_selected: [],
    results: [],
    status: 'running',
    started_at: startedAt,
  })

  try {
    // Fetch top stocks
    const { stocks, scanId: resolvedScanId } = await fetchTopScreenedStocks(config.topN, scanId)

    if (stocks.length === 0) {
      throw new Error('No stocks found in screening scan')
    }

    const stockSymbols = stocks.map(s => s.symbol)

    emit({
      type: 'stocks_selected',
      timestamp: new Date().toISOString(),
      data: { symbols: stockSymbols, count: stocks.length },
    })

    // Update DB with selected stocks
    await supabase
      .from('screening_debates')
      .update({ stocks_selected: stockSymbols, scan_id: resolvedScanId })
      .eq('id', briefingId)

    // Debate each stock sequentially
    const results: StockDebateResult[] = []

    for (const stock of stocks) {
      emit({
        type: 'stock_debate_started',
        timestamp: new Date().toISOString(),
        data: { symbol: stock.symbol, index: results.length + 1, total: stocks.length },
      })

      try {
        const result = await debateSingleStock(stock, config, emit)
        results.push(result)

        emit({
          type: 'stock_debate_completed',
          timestamp: new Date().toISOString(),
          data: {
            symbol: stock.symbol,
            verdict: result.judgeVerdict.verdict,
            confidence: result.judgeVerdict.confidence,
            duration: result.duration,
          },
        })
      } catch (stockError) {
        console.error(`Debate failed for ${stock.symbol}:`, stockError)
        emit({
          type: 'error',
          timestamp: new Date().toISOString(),
          data: {
            symbol: stock.symbol,
            error: stockError instanceof Error ? stockError.message : 'Unknown error',
          },
        })
        // Continue to next stock
      }
    }

    // Build summary
    const summary = {
      totalStocks: stocks.length,
      buys: results.filter(r => r.judgeVerdict.verdict === 'BUY').length,
      watches: results.filter(r => r.judgeVerdict.verdict === 'WATCH').length,
      skips: results.filter(r => r.judgeVerdict.verdict === 'SKIP').length,
      tradesExecuted: results.filter(r => r.tradeExecution?.executed).length,
      totalDuration: Date.now() - new Date(startedAt).getTime(),
      totalTokens: results.reduce((acc, r) => acc + r.totalTokens, 0),
      totalCost: results.reduce((acc, r) => acc + r.estimatedCost, 0),
    }

    const completedAt = new Date().toISOString()

    // Update DB with final results
    await supabase
      .from('screening_debates')
      .update({
        results,
        summary,
        status: 'completed',
        completed_at: completedAt,
      })
      .eq('id', briefingId)

    const briefing: DailyBriefing = {
      id: briefingId,
      scanId: resolvedScanId,
      startedAt,
      completedAt,
      status: 'completed',
      config,
      stocksSelected: stockSymbols,
      results,
      summary,
    }

    emit({
      type: 'briefing_completed',
      timestamp: completedAt,
      data: { summary },
    })

    return briefing
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    const completedAt = new Date().toISOString()

    // Update DB with error
    await supabase
      .from('screening_debates')
      .update({
        status: 'error',
        error_message: errorMsg,
        completed_at: completedAt,
      })
      .eq('id', briefingId)

    emit({
      type: 'error',
      timestamp: completedAt,
      data: { error: errorMsg },
    })

    return {
      id: briefingId,
      scanId: scanId || null,
      startedAt,
      completedAt,
      status: 'error',
      config,
      stocksSelected: [],
      results: [],
      summary: null,
      error: errorMsg,
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeEntry(
  role: 'analyst' | 'critic' | 'synthesizer',
  result: { response: string; modelUsed: string; tokensUsed: number },
  round: number
): AgentDebateEntry {
  return {
    role,
    model: result.modelUsed,
    round,
    content: result.response,
    tokensUsed: result.tokensUsed,
    timestamp: new Date().toISOString(),
  }
}

function formatResearchForDebate(report: ResearchReport): string {
  const sections = [
    `RESEARCH REPORT (${report.totalToolCalls} tool calls, ${(report.researchDuration / 1000).toFixed(1)}s):`,
    '',
    'TECHNICAL:', report.technical.findings.slice(0, 1500),
    '',
    'FUNDAMENTAL:', report.fundamental.findings.slice(0, 1500),
    '',
    'SENTIMENT:', report.sentiment.findings.slice(0, 1500),
    '',
    'RISK:', report.risk.findings.slice(0, 1500),
  ]
  return sections.join('\n')
}
