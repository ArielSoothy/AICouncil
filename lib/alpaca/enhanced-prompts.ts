import type { AlpacaAccount, AlpacaPosition } from './types';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';

/**
 * Enhanced trading prompts with timeframe-specific analysis
 * Based on professional trading research and best practices
 */

interface TimeframePromptConfig {
  analysisDepth: string;
  keyMetrics: string[];
  riskRewardMin: string;
  stopLossGuidance: string;
  entryExitFocus: string;
}

const TIMEFRAME_CONFIGS: Record<TradingTimeframe, TimeframePromptConfig> = {
  day: {
    analysisDepth: 'INTRADAY TECHNICAL ANALYSIS',
    keyMetrics: [
      'Support/Resistance levels',
      'Intraday momentum (RSI, MACD)',
      'Volume profile (high/low/average)',
      'Price action patterns',
      'News/catalyst events'
    ],
    riskRewardMin: '2:1',
    stopLossGuidance: 'Place stop-loss 1-2% below support level or recent swing low',
    entryExitFocus: 'Precise entry timing at support/resistance with tight stops'
  },
  swing: {
    analysisDepth: 'SHORT-TERM TREND & PATTERN ANALYSIS',
    keyMetrics: [
      'Trend direction (uptrend/downtrend/sideways)',
      'Breakout/breakdown potential',
      'Sector rotation signals',
      'Upcoming earnings/events (next 2 weeks)',
      'Technical setup quality (patterns, indicators)'
    ],
    riskRewardMin: '2:1 to 3:1',
    stopLossGuidance: 'Place stop-loss 3-5% below key support or pattern invalidation point',
    entryExitFocus: 'Trend continuation or reversal setups with swing highs/lows'
  },
  position: {
    analysisDepth: 'MEDIUM-TERM FUNDAMENTAL + TECHNICAL ANALYSIS',
    keyMetrics: [
      'Company fundamentals (revenue growth, profit margins)',
      'Earnings outlook (next quarter and forward guidance)',
      'Industry trends and competitive positioning',
      'Medium-term technical trend',
      'Valuation metrics (P/E, PEG ratio)'
    ],
    riskRewardMin: '3:1',
    stopLossGuidance: 'Place stop-loss 7-10% below entry or major support level',
    entryExitFocus: 'Fundamental strength confirmation with technical entry timing'
  },
  longterm: {
    analysisDepth: 'LONG-TERM FUNDAMENTAL & VALUATION ANALYSIS',
    keyMetrics: [
      'Fair value vs current price (DCF, comparative valuation)',
      '3-5 year growth potential and market opportunity',
      'Competitive moat sustainability',
      'Management quality and capital allocation',
      'Dividend sustainability and growth (if applicable)',
      'Macro economic tailwinds/headwinds'
    ],
    riskRewardMin: '5:1',
    stopLossGuidance: 'Place stop-loss 15-20% below entry or use time-based exit if thesis breaks',
    entryExitFocus: 'Buy undervalued quality with long-term catalysts'
  }
};

export function generateEnhancedTradingPrompt(
  account: AlpacaAccount,
  positions: AlpacaPosition[],
  date: string,
  timeframe: TradingTimeframe,
  targetSymbol?: string
): string {
  const config = TIMEFRAME_CONFIGS[timeframe];
  const positionsText = positions.length > 0
    ? positions.map(p => `- ${p.symbol}: ${p.qty} shares @ $${p.avg_entry_price} (Current: $${p.current_price}, P&L: $${p.unrealized_pl})`).join('\n')
    : '- No current positions';

  const maxPositionSize = parseFloat(account.portfolio_value) * 0.3;
  const minRiskReward = config.riskRewardMin;
  const normalizedSymbol = targetSymbol?.toUpperCase().trim();

  return `You are a PROFESSIONAL AI TRADER with expertise in ${config.analysisDepth}.

CURRENT DATE: ${date}
TRADING TIMEFRAME: ${timeframe.toUpperCase()}

YOUR ACCOUNT:
- Cash: $${account.cash}
- Portfolio Value: $${account.portfolio_value}
- Buying Power: $${account.buying_power}

CURRENT POSITIONS:
${positionsText}

TRADING CONSTRAINTS:
- Max 3 positions at once
- Max 30% of portfolio per position ($${maxPositionSize.toFixed(2)})
${normalizedSymbol
  ? `- 🎯 TARGET STOCK: ${normalizedSymbol} - YOU MUST ANALYZE THIS STOCK ONLY
- Provide BUY/SELL/HOLD recommendation specifically for ${normalizedSymbol}
- Do NOT recommend any other stock besides ${normalizedSymbol}`
  : '- Only trade well-known stocks (AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, AMD, INTC)'}
- Market is CLOSED on weekends and holidays

PROFESSIONAL ANALYSIS REQUIRED:

${config.keyMetrics.map((metric, i) => `${i + 1}. ${metric}`).join('\n')}

RISK MANAGEMENT RULES:
- Minimum Risk:Reward Ratio: ${minRiskReward}
- ${config.stopLossGuidance}
- ${config.entryExitFocus}
- Never risk more than 2% of portfolio on a single trade

YOUR TASK: Provide a COMPREHENSIVE trade recommendation for ${timeframe} trading${normalizedSymbol ? ` on ${normalizedSymbol}` : ''}.

RESPOND IN VALID JSON FORMAT:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "AAPL",
  "quantity": 10,
  "entryPrice": 150.25,
  "stopLoss": 145.50,
  "takeProfit": 160.00,
  "riskRewardRatio": "3.2:1",
  "reasoning": {
    "bullishCase": "Why this trade could work (2-3 sentences)",
    "bearishCase": "What could go wrong (1-2 sentences)",
    "technicalAnalysis": "Key technical levels and patterns",
    "fundamentalAnalysis": "Company/sector fundamentals (if applicable)",
    "sentiment": "Market sentiment and positioning",
    "timing": "Why now is the right time to enter/exit"
  },
  "confidence": 0.75,
  "timeHorizon": "${timeframe}",
  "keyLevels": {
    "support": 145.00,
    "resistance": 165.00
  }
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, nothing else
- Use "HOLD" if no favorable ${minRiskReward} risk:reward setup exists
- Ensure riskRewardRatio meets minimum ${minRiskReward}
- Calculate stop-loss and take-profit levels precisely
- Provide both bullish AND bearish perspectives
- Quantity must be a whole number
- You can only SELL stocks you currently own
- EntryPrice should be realistic based on current market price

Remember: Professional traders only take high-probability setups with favorable risk:reward ratios. If the setup isn't there, it's better to HOLD and wait for a better opportunity.`;
}

// Helper to extract risk-reward ratio
export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): string {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const ratio = reward / risk;
  return `${ratio.toFixed(1)}:1`;
}

// Validate if trade meets minimum risk:reward requirements
export function meetsRiskRewardRequirement(
  riskRewardRatio: string,
  timeframe: TradingTimeframe
): boolean {
  const ratio = parseFloat(riskRewardRatio.split(':')[0]);
  const config = TIMEFRAME_CONFIGS[timeframe];
  const minRatio = parseFloat(config.riskRewardMin.split(':')[0]);
  return ratio >= minRatio;
}
