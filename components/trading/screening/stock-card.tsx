'use client'

import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, ExternalLink, Zap, Target, RefreshCw, Bot, Star } from 'lucide-react'
import type { WinnersScore } from '@/lib/trading/screening/winners-scoring'
import type { StockResult, AnalysisResult } from './types'
import {
  getGapScore, getVolumeScore, getFloatScore, getBorrowFeeScore,
  getShortableScore, getBorrowDifficultyScore, getRelativeVolumeScore,
  ScoreBadge, formatNumber, formatCurrency, getScoreColor,
} from './scoring-utils'

const ANALYSIS_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'Best' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Fast' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', badge: 'Fastest' },
]

interface StockCardProps {
  stock: StockResult
  isExpanded: boolean
  onToggleExpand: () => void
  winnersScore: WinnersScore
  analysisResult?: AnalysisResult
  analyzingStock: string | null
  analysisMode: 'quick' | 'deep'
  setAnalysisMode: (mode: 'quick' | 'deep') => void
  analysisModel: string
  setAnalysisModel: (model: string) => void
  onAnalyze: (stock: StockResult) => void
}

export function StockCard({
  stock,
  isExpanded,
  onToggleExpand,
  winnersScore: wscore,
  analysisResult,
  analyzingStock,
  analysisMode,
  setAnalysisMode,
  analysisModel,
  setAnalysisModel,
  onAnalyze,
}: StockCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200">
      {/* Clickable Header Row */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-blue-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {stock.symbol}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                #{stock.rank + 1}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {stock.gap_direction === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`font-semibold ${stock.gap_direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stock.gap_percent > 0 ? '+' : ''}{stock.gap_percent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              ${stock.pre_market_price.toFixed(2)}
            </div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs text-gray-500 dark:text-gray-400">Volume</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {formatNumber(stock.pre_market_volume)}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(stock.score)}`}>
              {stock.score}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Score</div>
          </div>
        </div>
      </div>

      {/* Expanded Detail View */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {/* TradingView Chart */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Chart - {stock.symbol}
              </h4>
              <a
                href={`https://www.tradingview.com/chart/?symbol=${stock.symbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                Open in TradingView <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <iframe
                src={`https://www.tradingview.com/widgetembed/?symbol=${stock.symbol}&interval=5&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=1e222d&studies=[]&theme=dark&timezone=America%2FNew_York&withdateranges=0&hideideas=1&width=100%25&height=350`}
                style={{ width: '100%', height: 350, border: 'none' }}
                title={`${stock.symbol} Chart`}
              />
            </div>
          </div>

          {/* Winners Strategy Score */}
          <div className={`p-4 border-b ${
            wscore.conviction === 'HIGH' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            wscore.conviction === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
            'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Winners Strategy Score
              </h4>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${
                  wscore.conviction === 'HIGH' ? 'text-green-600' :
                  wscore.conviction === 'MEDIUM' ? 'text-amber-600' :
                  'text-gray-500'
                }`}>
                  {wscore.emoji} {wscore.total}/{wscore.maxPossible}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  wscore.conviction === 'HIGH' ? 'bg-green-500 text-white' :
                  wscore.conviction === 'MEDIUM' ? 'bg-amber-500 text-white' :
                  wscore.conviction === 'LOW' ? 'bg-gray-400 text-white' :
                  'bg-gray-300 text-gray-700'
                }`}>
                  {wscore.conviction}
                </span>
              </div>
            </div>

            {/* Momentum vs Squeeze Signals */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${
                wscore.momentum.signal === 'STRONG' ? 'bg-green-100 dark:bg-green-900/30' :
                wscore.momentum.signal === 'MODERATE' ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Momentum</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {wscore.momentum.signal}
                </div>
                <div className="text-xs text-gray-500">
                  {wscore.momentum.total}/{wscore.momentum.maxPossible} pts
                </div>
              </div>
              <div className={`p-3 rounded-lg ${
                wscore.squeeze.signal === 'HIGH' ? 'bg-red-100 dark:bg-red-900/30' :
                wscore.squeeze.signal === 'MEDIUM' ? 'bg-orange-100 dark:bg-orange-900/30' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">Squeeze</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Squeeze</span>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {wscore.squeeze.signal}
                </div>
                <div className="text-xs text-gray-500">
                  {wscore.squeeze.total}/{wscore.squeeze.maxPossible} pts
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-2">
              {wscore.breakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={item.met ? 'text-green-500' : 'text-gray-400'}>
                      {item.met ? '\u2713' : '\u25CB'}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{item.category}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-500">{item.value || '--'}</span>
                    <span className={`font-semibold ${item.met ? 'text-green-600' : 'text-gray-400'}`}>
                      +{item.points}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* Missing Data Warning */}
            {wscore.missingData.length > 0 && (
              <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400">
                Missing: {wscore.missingData.join(', ')} (Phase 3: TWS data)
              </div>
            )}

            {/* Recommendation */}
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {wscore.recommendation}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {wscore.entryTrigger}
              </div>
            </div>
          </div>

          {/* Metrics Grid - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* MOMENTUM Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Momentum Data
                <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">
                  Winners Strategy
                </span>
              </h4>
              <div className="space-y-3">
                {/* Gap % with score */}
                {(() => {
                  const gapScore = getGapScore(stock.gap_percent)
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Gap %</span>
                      <div className="flex items-center">
                        <span className={`font-semibold ${gapScore.color}`}>
                          {stock.gap_percent > 0 ? '+' : ''}{stock.gap_percent.toFixed(2)}%
                        </span>
                        <ScoreBadge score={gapScore} />
                      </div>
                    </div>
                  )
                })()}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pre-Market Price</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">${stock.pre_market_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Previous Close</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">${stock.previous_close.toFixed(2)}</span>
                </div>
                {/* PM Volume with score */}
                {(() => {
                  const volScore = getVolumeScore(stock.pre_market_volume)
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Pre-Market Volume</span>
                      <div className="flex items-center">
                        <span className={`font-semibold ${volScore.color}`}>{formatNumber(stock.pre_market_volume)}</span>
                        <ScoreBadge score={volScore} />
                      </div>
                    </div>
                  )
                })()}
                {/* Relative Volume */}
                {(() => {
                  const relVolScore = getRelativeVolumeScore(stock.relative_volume)
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        Relative Volume
                      </span>
                      {stock.relative_volume != null ? (
                        <div className="flex items-center">
                          <span className={`font-semibold ${relVolScore?.color || 'text-gray-900'}`}>
                            {stock.relative_volume.toFixed(1)}x
                          </span>
                          {relVolScore && <ScoreBadge score={relVolScore} />}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">--</span>
                      )}
                    </div>
                  )
                })()}
                {/* Average Volume (20d) */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    Avg Volume (20d)
                  </span>
                  {stock.avg_volume_20d ? (
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatNumber(stock.avg_volume_20d)}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic text-sm">--</span>
                  )}
                </div>
                {stock.bars?.vwap && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">VWAP</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">${stock.bars.vwap.toFixed(2)}</span>
                  </div>
                )}
                {stock.sentiment?.score && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sentiment</span>
                    <span className={`font-semibold ${stock.sentiment.score > 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                      {(stock.sentiment.score * 100).toFixed(0)}% bullish
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SQUEEZE POTENTIAL Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                Squeeze Potential
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded ml-auto">
                  Winners Strategy
                </span>
              </h4>
              <div className="space-y-3">
                {/* Float Shares */}
                {(() => {
                  const floatValue = stock.float_shares ?? stock.fundamentals?.float_shares
                  const floatScore = getFloatScore(floatValue)
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Float</span>
                      {floatValue ? (
                        <div className="flex items-center">
                          <span className={`font-semibold ${floatScore?.color || 'text-gray-900'}`}>
                            {formatNumber(floatValue)}
                          </span>
                          {floatScore && <ScoreBadge score={floatScore} />}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">--</span>
                      )}
                    </div>
                  )
                })()}

                {/* Borrow Fee Rate */}
                {(() => {
                  const feeScore = getBorrowFeeScore(stock.short_data?.short_fee_rate)
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Borrow Fee %</span>
                      {stock.short_data?.short_fee_rate != null ? (
                        <div className="flex items-center">
                          <span className={`font-semibold ${feeScore?.color || 'text-gray-900'}`}>
                            {stock.short_data.short_fee_rate.toFixed(1)}%
                          </span>
                          {feeScore && <ScoreBadge score={feeScore} />}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">--</span>
                      )}
                    </div>
                  )
                })()}

                {/* Borrow Difficulty */}
                {(() => {
                  const diffScore = getBorrowDifficultyScore(stock.short_data?.borrow_difficulty)
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Borrow Difficulty</span>
                      {stock.short_data?.borrow_difficulty ? (
                        <div className="flex items-center">
                          <span className={`font-semibold ${diffScore?.color || 'text-gray-900'}`}>
                            {stock.short_data.borrow_difficulty}
                          </span>
                          {diffScore && <ScoreBadge score={diffScore} />}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">--</span>
                      )}
                    </div>
                  )
                })()}

                {/* Shortable Shares */}
                {(() => {
                  const shortScore = getShortableScore(stock.short_data?.shortable_shares)
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Shortable Shares</span>
                      {stock.short_data?.shortable_shares ? (
                        <div className="flex items-center">
                          <span className={`font-semibold ${shortScore?.color || 'text-gray-900'}`}>
                            {formatNumber(stock.short_data.shortable_shares)}
                          </span>
                          {shortScore && <ScoreBadge score={shortScore} />}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">--</span>
                      )}
                    </div>
                  )
                })()}

                {/* Shares Outstanding */}
                {(() => {
                  const sharesValue = stock.shares_outstanding ?? stock.fundamentals?.shares_outstanding
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Shares Outstanding</span>
                      {sharesValue ? (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(sharesValue)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-sm">--</span>
                      )}
                    </div>
                  )
                })()}

                {/* Market Cap */}
                {stock.fundamentals?.market_cap && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Market Cap</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(stock.fundamentals.market_cap)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reddit Sentiment Section (Phase 4) */}
          {(stock.reddit_mentions !== undefined || stock.reddit_sentiment !== undefined) && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                Reddit Sentiment
                <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded ml-auto">
                  r/wallstreetbets + r/stocks
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">24h Mentions</span>
                  <span className={`text-lg font-bold ${
                    (stock.reddit_mentions || 0) > 10 ? 'text-green-600' :
                    (stock.reddit_mentions || 0) > 5 ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {stock.reddit_mentions || 0}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Sentiment</span>
                  <span className={`text-lg font-bold ${
                    stock.reddit_sentiment_label === 'VERY_BULLISH' ? 'text-green-600' :
                    stock.reddit_sentiment_label === 'BULLISH' ? 'text-green-500' :
                    stock.reddit_sentiment_label === 'BEARISH' ? 'text-red-500' :
                    stock.reddit_sentiment_label === 'VERY_BEARISH' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stock.reddit_sentiment_label?.replace('_', ' ') || 'N/A'}
                  </span>
                </div>
              </div>
              {stock.reddit_sentiment !== undefined && (
                <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Score:</span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          stock.reddit_sentiment > 0.2 ? 'bg-green-500' :
                          stock.reddit_sentiment < -0.2 ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, (stock.reddit_sentiment + 1) * 50))}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono">
                      {(stock.reddit_sentiment > 0 ? '+' : '')}{stock.reddit_sentiment.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* News & Catalyst Section (Phase 5) */}
          {(stock.news && stock.news.length > 0) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                News & Catalyst
                {stock.catalyst && stock.catalyst !== 'UNKNOWN' && stock.catalyst !== 'NO_NEWS' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    stock.catalyst === 'EARNINGS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                    stock.catalyst === 'FDA' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                    stock.catalyst === 'MERGER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                    stock.catalyst === 'SHORT_SQUEEZE' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                    stock.catalyst === 'OFFERING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {stock.catalyst === 'EARNINGS' ? 'Earnings' :
                     stock.catalyst === 'FDA' ? 'FDA' :
                     stock.catalyst === 'MERGER' ? 'M&A' :
                     stock.catalyst === 'SHORT_SQUEEZE' ? 'Squeeze' :
                     stock.catalyst === 'OFFERING' ? 'Offering' :
                     stock.catalyst === 'CONTRACT' ? 'Contract' :
                     stock.catalyst === 'ANALYST' ? 'Analyst' :
                     stock.catalyst}
                  </span>
                )}
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded ml-auto">
                  Alpaca News
                </span>
              </h4>
              <div className="space-y-2">
                {stock.news.map((article, idx) => (
                  <a
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors border border-blue-100 dark:border-blue-900"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                      {article.headline}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{article.source}</span>
                      <span>&bull;</span>
                      <span>{article.timestamp ? new Date(article.timestamp).toLocaleString() : 'Recent'}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis Result */}
          {analysisResult && (
            <div className={`p-4 border-t ${
              analysisResult.verdict === 'BUY'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : analysisResult.verdict === 'SKIP'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    analysisResult.verdict === 'BUY'
                      ? 'bg-green-500 text-white'
                      : analysisResult.verdict === 'SKIP'
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {analysisResult.verdict === 'BUY' ? 'BUY' :
                     analysisResult.verdict === 'SKIP' ? 'SKIP' : 'WATCH'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Confidence: {analysisResult.confidence}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {analysisResult.model && (
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                      {ANALYSIS_MODELS.find(m => m.id === analysisResult.model)?.badge || ''} {analysisResult.model}
                    </span>
                  )}
                  <span>{analysisResult.analysisTime}ms</span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reasons:</span>
                  <ul className="mt-1 space-y-1">
                    {analysisResult.reasons.map((reason, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-gray-400">&bull;</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                {analysisResult.entryTrigger && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entry Trigger:</span>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      {analysisResult.entryTrigger}
                    </p>
                  </div>
                )}
                {analysisResult.riskFlag && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-red-500 uppercase">Risk:</span>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {analysisResult.riskFlag}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode Toggle */}
              <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
                <button
                  onClick={() => setAnalysisMode('quick')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    analysisMode === 'quick'
                      ? 'bg-white dark:bg-gray-600 shadow-sm font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Quick
                </button>
                <button
                  onClick={() => setAnalysisMode('deep')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    analysisMode === 'deep'
                      ? 'bg-white dark:bg-gray-600 shadow-sm font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Deep
                </button>
              </div>

              {/* Model Selector */}
              <select
                value={analysisModel}
                onChange={(e) => setAnalysisModel(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {ANALYSIS_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.badge} {model.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onAnalyze(stock)}
                disabled={analyzingStock === stock.symbol}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {analyzingStock === stock.symbol ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : analysisResult ? (
                  <>
                    <Bot className="w-4 h-4" />
                    Re-analyze
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    Run AI Analysis
                  </>
                )}
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg transition-colors text-sm font-medium"
                title="Coming in Phase 3"
              >
                <Star className="w-4 h-4" />
                Add to Watchlist
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Score breakdown: Rank {40 - stock.rank * 2}/40 + Gap {Math.min(30, Math.abs(stock.gap_percent) * 3).toFixed(0)}/30 + Vol {Math.min(30, stock.pre_market_volume / 1_000_000 * 10).toFixed(0)}/30
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
