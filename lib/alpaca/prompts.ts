import type { AlpacaAccount, AlpacaPosition } from './types';

/**
 * Generate trading prompt for AI model
 */
export function generateTradingPrompt(
  account: AlpacaAccount,
  positions: AlpacaPosition[],
  date: string
): string {
  const positionsText = positions.length > 0
    ? positions.map(p => `- ${p.symbol}: ${p.qty} shares @ $${p.avg_entry_price} (Current: $${p.current_price}, P&L: $${p.unrealized_pl})`).join('\n')
    : '- No current positions';

  const maxPositionSize = parseFloat(account.portfolio_value) * 0.3;

  return `You are an AI trader in a 30-day paper trading competition.

CURRENT DATE: ${date}

YOUR ACCOUNT:
- Cash: $${account.cash}
- Portfolio Value: $${account.portfolio_value}
- Buying Power: $${account.buying_power}

CURRENT POSITIONS:
${positionsText}

TASK: Decide on ONE trade action for today.

RULES:
- Max 3 positions at once
- Max 30% of portfolio per position ($${maxPositionSize.toFixed(2)})
- Only trade well-known stocks (AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META)
- Market is CLOSED on weekends and holidays

RESPOND IN VALID JSON (NO OTHER TEXT):
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "AAPL",
  "quantity": 1,
  "reasoning": "Brief explanation (2-3 sentences)",
  "confidence": 0.75
}

IMPORTANT:
- Return ONLY valid JSON, nothing else
- Use "HOLD" if you don't want to trade today or market is closed
- Quantity must be a whole number
- You can only SELL stocks you currently own`;
}
