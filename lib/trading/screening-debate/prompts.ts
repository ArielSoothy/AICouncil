/**
 * Screening-Enhanced Debate Prompts
 *
 * Injects real screening data (gap%, volume, short data, sentiment, news)
 * as ground truth context for each debate agent role.
 *
 * Flow: Screening data + research findings → Agent prompts → Debate
 */

import type { StockResult } from '@/components/trading/screening/types'

/**
 * Format screening data into a structured context block for debate agents.
 * This data is FACTUAL (from TWS) and treated as ground truth.
 */
export function formatScreeningDataForPrompt(stock: StockResult): string {
  const sections: string[] = []

  sections.push(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRE-MARKET SCREENING DATA (GROUND TRUTH)
Symbol: ${stock.symbol} | Rank: #${stock.rank} | Score: ${stock.score}/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GAP DATA:
- Gap: ${stock.gap_percent > 0 ? '+' : ''}${stock.gap_percent.toFixed(2)}% (${stock.gap_direction})
- Pre-Market Price: $${stock.pre_market_price.toFixed(2)}
- Previous Close: $${stock.previous_close.toFixed(2)}
- Pre-Market Volume: ${formatNumber(stock.pre_market_volume)}`)

  if (stock.relative_volume !== undefined) {
    sections.push(`- Relative Volume: ${stock.relative_volume.toFixed(1)}x avg`)
  }

  if (stock.avg_volume_20d !== undefined) {
    sections.push(`- 20-Day Avg Volume: ${formatNumber(stock.avg_volume_20d)}`)
  }

  // Fundamentals
  const pe = stock.fundamentals?.pe_ratio
  const marketCap = stock.fundamentals?.market_cap
  const floatShares = stock.float_shares || stock.fundamentals?.float_shares
  const sharesOutstanding = stock.shares_outstanding || stock.fundamentals?.shares_outstanding

  if (pe !== undefined || marketCap !== undefined || floatShares !== undefined) {
    sections.push(`
FUNDAMENTALS:`)
    if (pe !== undefined) sections.push(`- P/E Ratio: ${pe.toFixed(1)}`)
    if (marketCap !== undefined) sections.push(`- Market Cap: $${formatLargeNumber(marketCap)}`)
    if (floatShares !== undefined) sections.push(`- Float: ${formatLargeNumber(floatShares)} shares`)
    if (sharesOutstanding !== undefined) sections.push(`- Shares Outstanding: ${formatLargeNumber(sharesOutstanding)}`)
  }

  // Short data
  if (stock.short_data) {
    sections.push(`
SHORT DATA:`)
    if (stock.short_data.shortable_shares !== undefined)
      sections.push(`- Shortable Shares: ${formatNumber(stock.short_data.shortable_shares)}`)
    if (stock.short_data.borrow_difficulty !== undefined)
      sections.push(`- Borrow Difficulty: ${stock.short_data.borrow_difficulty}`)
    if (stock.short_data.short_fee_rate !== undefined)
      sections.push(`- Short Fee Rate: ${stock.short_data.short_fee_rate.toFixed(1)}%`)
  }

  // VWAP / Bars
  if (stock.bars) {
    sections.push(`
PRICE LEVELS:`)
    if (stock.bars.vwap !== undefined) sections.push(`- VWAP: $${stock.bars.vwap.toFixed(2)}`)
    if (stock.bars.high !== undefined) sections.push(`- Pre-Market High: $${stock.bars.high.toFixed(2)}`)
  }

  // Sentiment
  if (stock.sentiment) {
    sections.push(`
MARKET SENTIMENT:`)
    if (stock.sentiment.score !== undefined)
      sections.push(`- Sentiment Score: ${stock.sentiment.score.toFixed(2)}`)
    if (stock.sentiment.mentions !== undefined)
      sections.push(`- Social Mentions: ${stock.sentiment.mentions}`)
  }

  // Reddit sentiment
  if (stock.reddit_sentiment !== undefined) {
    sections.push(`- Reddit Sentiment: ${stock.reddit_sentiment.toFixed(2)} (${stock.reddit_sentiment_label || 'N/A'})`)
    if (stock.reddit_mentions !== undefined)
      sections.push(`- Reddit Mentions: ${stock.reddit_mentions}`)
  }

  // News/Catalyst
  if (stock.news && stock.news.length > 0) {
    sections.push(`
RECENT NEWS:`)
    for (const item of stock.news.slice(0, 3)) {
      sections.push(`- [${item.source}] ${item.headline}`)
    }
  }
  if (stock.catalyst) {
    sections.push(`- Catalyst: ${stock.catalyst}`)
  }

  return sections.join('\n')
}

/**
 * Generate Analyst prompt with screening context
 */
export function generateScreeningAnalystPrompt(
  screeningContext: string,
  researchFindings: string,
  round: number,
  previousRound?: { analyst: string; critic: string; synthesizer: string }
): string {
  if (round === 1) {
    return `You are the ANALYST agent in a pre-market screening debate.

Your role: Analyze momentum, setup quality, and entry opportunity for this screened stock.

${screeningContext}

${researchFindings}

FOCUS YOUR ANALYSIS ON:
1. Gap sustainability: Is this gap supported by volume and catalysts?
2. Setup quality: Does price action + volume suggest a tradeable setup?
3. Entry timing: Where should a trader enter? At open? On pullback?
4. Momentum signals: VWAP position, relative volume, pre-market trend
5. Risk/reward: Potential upside vs downside from current levels

Provide your analysis as a structured trading thesis. Include specific price levels.

Return ONLY a JSON response:
{
  "thesis": "Your complete analysis",
  "action": "BUY" | "WATCH" | "SKIP",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "confidence": 0-100,
  "keyPoints": ["point1", "point2", "point3"]
}`
  }

  return `You are the ANALYST agent in Round 2 of a pre-market screening debate.

Review the full Round 1 discussion and refine your position.

${screeningContext}

${researchFindings}

ROUND 1 POSITIONS:
- Analyst: ${previousRound?.analyst}
- Critic: ${previousRound?.critic}
- Synthesizer: ${previousRound?.synthesizer}

Based on the Critic's challenges and Synthesizer's integration, provide your REFINED analysis.
Address any valid concerns raised. Adjust your confidence and price levels if warranted.

Return ONLY a JSON response:
{
  "thesis": "Your refined analysis addressing Round 1 feedback",
  "action": "BUY" | "WATCH" | "SKIP",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "confidence": 0-100,
  "keyPoints": ["point1", "point2", "point3"]
}`
}

/**
 * Generate Critic prompt with screening context
 */
export function generateScreeningCriticPrompt(
  screeningContext: string,
  researchFindings: string,
  round: number,
  analystResponse: string,
  previousRound?: { analyst: string; critic: string; synthesizer: string }
): string {
  if (round === 1) {
    return `You are the CRITIC agent in a pre-market screening debate.

Your role: Challenge the Analyst's thesis and identify risks the market may be overlooking.

${screeningContext}

${researchFindings}

THE ANALYST'S POSITION:
${analystResponse}

CHALLENGE THESE ASPECTS:
1. Gap fade risk: What % of similar gaps fade by noon? Historical patterns?
2. Volume sustainability: Is this genuine demand or just pre-market noise?
3. Short squeeze trap: Could shorts be right? What's the bear case?
4. Catalyst validity: Is the catalyst priced in? How material is it?
5. Market conditions: Does the broader market support this trade?
6. Liquidity risk: Can you actually exit at these prices?

Be constructively skeptical. Identify the BIGGEST risk the Analyst missed.

Return ONLY a JSON response:
{
  "thesis": "Your critical analysis",
  "action": "BUY" | "WATCH" | "SKIP",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "confidence": 0-100,
  "keyPoints": ["point1", "point2", "point3"],
  "biggestRisk": "The single biggest risk"
}`
  }

  return `You are the CRITIC agent in Round 2 of a pre-market screening debate.

${screeningContext}

${researchFindings}

ROUND 1 POSITIONS:
- Analyst: ${previousRound?.analyst}
- Critic: ${previousRound?.critic}
- Synthesizer: ${previousRound?.synthesizer}

The Analyst refined their position. Evaluate if they addressed your concerns.
Have they mitigated the risks, or are there still unresolved issues?

Return ONLY a JSON response:
{
  "thesis": "Your refined critique",
  "action": "BUY" | "WATCH" | "SKIP",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "confidence": 0-100,
  "keyPoints": ["point1", "point2", "point3"],
  "biggestRisk": "The single biggest remaining risk"
}`
}

/**
 * Generate Synthesizer prompt with screening context
 */
export function generateScreeningSynthesizerPrompt(
  screeningContext: string,
  researchFindings: string,
  round: number,
  analystResponse: string,
  criticResponse: string,
  previousRound?: { analyst: string; critic: string; synthesizer: string }
): string {
  if (round === 1) {
    return `You are the SYNTHESIZER agent in a pre-market screening debate.

Your role: Integrate the Analyst's opportunity thesis and the Critic's risk assessment into a balanced, actionable recommendation.

${screeningContext}

${researchFindings}

THE ANALYST SAYS:
${analystResponse}

THE CRITIC SAYS:
${criticResponse}

SYNTHESIZE BY:
1. Which Analyst arguments hold up against the Critic's challenges?
2. Which Critic concerns are material vs overblown?
3. What's the risk-adjusted opportunity here?
4. If BUY: Define exact entry, stop, target with position sizing rationale
5. If WATCH: What trigger would upgrade this to a BUY?
6. If SKIP: What would need to change for reconsideration?

Return ONLY a JSON response:
{
  "thesis": "Your synthesis integrating both perspectives",
  "action": "BUY" | "WATCH" | "SKIP",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "confidence": 0-100,
  "keyPoints": ["point1", "point2", "point3"],
  "consensusLevel": "strong" | "moderate" | "weak"
}`
  }

  return `You are the SYNTHESIZER agent in Round 2 of a pre-market screening debate.

${screeningContext}

${researchFindings}

ROUND 1 POSITIONS:
- Analyst: ${previousRound?.analyst}
- Critic: ${previousRound?.critic}
- Synthesizer: ${previousRound?.synthesizer}

This is your FINAL synthesis. Produce a definitive, actionable recommendation.
Account for all arguments from both rounds.

Return ONLY a JSON response:
{
  "thesis": "Your final synthesis and definitive recommendation",
  "action": "BUY" | "WATCH" | "SKIP",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "confidence": 0-100,
  "keyPoints": ["point1", "point2", "point3"],
  "consensusLevel": "strong" | "moderate" | "weak"
}`
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}
