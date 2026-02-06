export interface ScoreDisplay {
  points: number
  maxPoints: number
  color: string
  bgColor: string
  threshold: string
}

export interface FlowLogEntry {
  timestamp: string
  message: string
  status: 'running' | 'success' | 'error'
}

export interface StockResult {
  symbol: string
  rank: number
  gap_percent: number
  gap_direction: 'up' | 'down'
  pre_market_volume: number
  pre_market_price: number
  previous_close: number
  // Root level data from API
  float_shares?: number  // API returns at root level
  shares_outstanding?: number  // API returns at root level
  fundamentals?: {
    pe_ratio?: number
    market_cap?: number
    float_shares?: number  // Also check nested for backwards compatibility
    shares_outstanding?: number
  }
  short_data?: {
    shortable_shares?: number
    borrow_difficulty?: string
    short_fee_rate?: number
  }
  ratios?: {
    roe?: number
    debt_to_equity?: number
  }
  bars?: {
    vwap?: number
    high?: number
  }
  sentiment?: {
    score?: number
    mentions?: number
  }
  // Relative Volume data
  avg_volume_20d?: number
  relative_volume?: number
  // Reddit Sentiment (Phase 4)
  reddit_mentions?: number
  reddit_sentiment?: number
  reddit_sentiment_label?: string
  // News/Catalyst (Phase 5)
  news?: Array<{
    headline: string
    source: string
    timestamp: string
    url: string
  }>
  catalyst?: string
  score: number
}

export interface ScanParameters {
  min_gap_percent: number
  min_volume: number
  min_price: number
  max_price: number
  max_market_cap: number
  max_results: number
  scan_code: string
  include_sentiment: boolean
}

export interface ScreeningResponse {
  stocks: StockResult[]
  total_scanned: number
  total_returned: number
  execution_time_seconds: number
  timestamp: string
  scan_parameters?: ScanParameters
}

export interface AnalysisResult {
  verdict: 'BUY' | 'WATCH' | 'SKIP'
  confidence: number
  reasons: string[]
  entryTrigger?: string
  riskFlag?: string
  analysisTime: number
  model?: string
}

export type SortField = 'rank' | 'gap_percent' | 'score' | 'pre_market_volume' | 'pre_market_price'
export type SortDirection = 'asc' | 'desc'

export interface EnrichedStock {
  symbol: string
  rank: number
  exchange?: string
  conid?: number
  gap_percent: number
  gap_direction: string
  pre_market_price: number
  previous_close: number
  pre_market_volume: number
  momentum_score: number
  score: number
  // Phase 3 data
  shortable_shares?: number
  borrow_difficulty?: string
  short_fee_rate?: number
  shares_outstanding?: number
  float_shares?: number
  // Relative Volume data
  avg_volume_20d?: number
  relative_volume?: number
  // Reddit Sentiment (Phase 4)
  reddit_mentions?: number
  reddit_sentiment?: number
  reddit_sentiment_label?: string
  // Phase 5: News
  news?: Array<{ headline: string; source: string; timestamp: string; url: string }>
  catalyst?: string
}
