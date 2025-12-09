/**
 * Trading Data Coordinator - Shared Data Fetching for All Trading Modes
 *
 * Purpose: Fetch ALL market data ONCE and share across all AI models
 * Benefits:
 * - 8-10x faster (1 fetch vs 64 individual fetches)
 * - 90% API call reduction
 * - All models analyze SAME data (fair comparison)
 * - Models WILL use data (embedded in prompt, can't ignore)
 *
 * Architecture:
 * - Uses modular data provider system (see lib/data-providers/)
 * - Easy to switch between Yahoo Finance, Alpaca, IBKR via environment variable
 * - Providers implement common interface for consistency
 *
 * Research Foundation:
 * - TradingAgents (2024): Specialized roles with shared context
 * - Multi-agent systems perform better with shared data for high-interdependency tasks
 */

import { getDataProvider } from '@/lib/data-providers';
import type { SharedTradingData } from '@/lib/data-providers';

// Re-export SharedTradingData for backward compatibility
export type { SharedTradingData };

/**
 * Fetch all market data for a symbol in ONE efficient call
 * Used by ALL trading modes to ensure consistency and efficiency
 *
 * This is now a thin wrapper around the modular data provider system.
 * The actual fetching logic lives in lib/data-providers/ for modularity.
 *
 * To switch providers, set environment variable:
 * - DATA_PROVIDER=yahoo  (default, free)
 * - DATA_PROVIDER=alpaca (requires API keys)
 * - DATA_PROVIDER=ibkr   (requires IB account)
 *
 * @param symbol - Stock ticker symbol (e.g., "TSLA", "AAPL")
 * @returns Complete market data package
 */
export async function fetchSharedTradingData(symbol: string): Promise<SharedTradingData> {
  try {
    // Get data provider (uses env var or defaults to Yahoo Finance)
    const provider = getDataProvider();

    // Fetch all data from provider
    const data = await provider.fetchMarketData(symbol);

    return data;
  } catch (error) {
    console.error(`❌ Error fetching trading data for ${symbol.toUpperCase()}:`, error);
    throw error;
  }
}

/**
 * Format COMPREHENSIVE shared trading data into readable prompt section
 *
 * ⚠️ DEPRECATED: This gives models too much data, preventing tool usage
 * Use formatMinimalDataForPrompt() instead to force exhaustive research
 */
export function formatSharedDataForPrompt(data: SharedTradingData): string {
  return `
📊 REAL-TIME MARKET DATA FOR ${data.symbol}:

CURRENT PRICE: $${data.quote.price.toFixed(2)}
- Bid: $${data.quote.bid.toFixed(2)} | Ask: $${data.quote.ask.toFixed(2)} | Spread: $${data.quote.spread.toFixed(3)}
- Volume: ${data.quote.volume.toLocaleString()} shares
- Last updated: ${new Date(data.quote.timestamp).toLocaleString()}

TECHNICAL INDICATORS:
- RSI (14): ${data.technical.rsi.toFixed(2)} → ${data.technical.rsiSignal}
  ${data.technical.rsiSignal === 'Overbought' ? '⚠️ Potential reversal down' : data.technical.rsiSignal === 'Oversold' ? '⚠️ Potential bounce up' : '✓ Neutral zone'}

- MACD (12,26,9):
  • MACD Line: ${data.technical.macd.MACD.toFixed(3)}
  • Signal Line: ${data.technical.macd.signal.toFixed(3)}
  • Histogram: ${data.technical.macd.histogram.toFixed(3)} → ${data.technical.macd.trend}
  ${data.technical.macd.trend === 'Bullish' ? '✓ Bullish momentum' : '⚠️ Bearish momentum'}

- Moving Averages:
  • EMA 20: $${data.technical.ema20.toFixed(2)} ${data.quote.price > data.technical.ema20 ? '(Above ✓)' : '(Below ⚠️)'}
  • SMA 50: $${data.technical.sma50.toFixed(2)} ${data.quote.price > data.technical.sma50 ? '(Above ✓)' : '(Below ⚠️)'}
  • SMA 200: $${data.technical.sma200.toFixed(2)} ${data.quote.price > data.technical.sma200 ? '(Above ✓)' : '(Below ⚠️)'}

- Bollinger Bands (20,2):
  • Upper: $${data.technical.bollingerBands.upper.toFixed(2)}
  • Middle: $${data.technical.bollingerBands.middle.toFixed(2)}
  • Lower: $${data.technical.bollingerBands.lower.toFixed(2)}
  • Position: ${data.technical.bollingerBands.position}

KEY PRICE LEVELS:
- 30-Day Support: $${data.levels.support.toFixed(2)} ${((data.quote.price - data.levels.support) / data.levels.support * 100).toFixed(1)}% above
- 30-Day Resistance: $${data.levels.resistance.toFixed(2)} ${((data.levels.resistance - data.quote.price) / data.quote.price * 100).toFixed(1)}% above current
- 52-Week High: $${data.levels.yearHigh.toFixed(2)}
- 52-Week Low: $${data.levels.yearLow.toFixed(2)}

TREND ANALYSIS (Last 30 Days):
- Direction: ${data.trend.direction}
- Strength: ${data.trend.strength}
- Analysis: ${data.trend.analysis}

RECENT NEWS (Last 5 Articles):
${data.news.map((article, i) => `${i+1}. ${article.headline}
   Source: ${article.source} | ${new Date(article.timestamp).toLocaleDateString()}`).join('\n')}

PRICE ACTION (Last 30 Days):
- Highest: $${Math.max(...data.bars.map(b => b.high)).toFixed(2)}
- Lowest: $${Math.min(...data.bars.map(b => b.low)).toFixed(2)}
- Current vs 30-day avg: ${((data.quote.price - (data.bars.reduce((sum, b) => sum + b.close, 0) / data.bars.length)) / (data.bars.reduce((sum, b) => sum + b.close, 0) / data.bars.length) * 100).toFixed(1)}%

⚠️ CRITICAL INSTRUCTIONS:
- You MUST use the real-time data provided above in your analysis
- Do NOT say "Without recent trend data" or "Unable to retrieve indicators"
- Reference specific numbers: "RSI is ${data.technical.rsi.toFixed(2)}", "Current price is $${data.quote.price.toFixed(2)}"
- Your reasoning MUST cite the provided data (RSI values, MACD, support/resistance, news headlines)
- Use the trend analysis to inform your recommendation
`;
}

/**
 * Format MINIMAL shared data for exhaustive research mode
 *
 * Purpose: Provide only basic market validation info, forcing models to use tools
 * for comprehensive research (RSI, MACD, news, support/resistance, etc.)
 *
 * Philosophy: Real money decisions require exhaustive research, not shortcuts
 */
export function formatMinimalDataForPrompt(data: SharedTradingData): string {
  return `
📊 BASIC MARKET CONTEXT FOR ${data.symbol}:

CURRENT MARKET STATUS:
- Symbol: ${data.symbol}
- Current Price: $${data.quote.price.toFixed(2)}
- Market is OPEN and trading
- Last updated: ${new Date(data.quote.timestamp).toLocaleString()}

⚠️ RESEARCH MANDATE:
You have been provided with MINIMAL data intentionally. This is a REAL MONEY trading decision.
You MUST conduct EXHAUSTIVE research using ALL available tools before making any recommendation.

DO NOT rely on:
- Training data (outdated)
- Assumptions about current market conditions
- General market knowledge

YOU MUST gather REAL-TIME data by calling:
- get_stock_quote() for current price action
- get_price_bars() for trend analysis
- calculate_rsi() for momentum indicators
- calculate_macd() for trend strength
- get_stock_news() for recent catalysts
- get_support_resistance() for key levels
- get_volume_profile() for volume confirmation
- check_earnings_date() for upcoming events

🎯 RESEARCH STANDARD:
Minimum 4-5 tool calls expected for thoroughness. Quality over speed - take time to research properly.
Every decision impacts real money. No shortcuts allowed.
`;
}
