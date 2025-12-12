/**
 * Trading Scoring Engine - Deterministic Signal Calculation
 *
 * Purpose: Convert raw market data into deterministic trading signals
 *
 * Philosophy:
 * - Same inputs MUST produce same outputs (reproducible for real money)
 * - Explicit rules, not AI guesswork
 * - Timeframe-adjusted weights (day trading ≠ long-term investing)
 * - AI explains the scores, doesn't create them
 *
 * Academic Foundation:
 * - Hybrid ML-LLM optimal weight: 0.40-0.45 (PMC 2025)
 * - Multi-agent debate: 13.2% improvement with voting (ACL 2025)
 *
 * Created: December 11, 2025
 */

import type { SharedTradingData, FundamentalData, TechnicalIndicators, TrendAnalysis } from '@/lib/data-providers/types';
import type { TradingTimeframe } from '@/components/trading/timeframe-selector';

// ============================================================================
// SIGNAL TYPES
// ============================================================================

export type Signal = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK';
export type Recommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface SignalScore {
  signal: Signal;
  strength: SignalStrength;
  score: number; // -1 to +1
  confidence: number; // 0 to 1
  reasoning: string;
}

export interface CategoryScore {
  category: 'technical' | 'fundamental' | 'sentiment' | 'trend';
  score: SignalScore;
  factors: string[];
}

export interface TradingScore {
  symbol: string;
  timestamp: string;
  inputHash: string; // For reproducibility audit

  // Individual category scores
  technical: CategoryScore;
  fundamental: CategoryScore;
  sentiment: CategoryScore;
  trend: CategoryScore;

  // Weighted final score
  weightedScore: number; // -1 to +1
  recommendation: Recommendation;
  confidence: number; // 0 to 1

  // Decision factors
  bullishFactors: string[];
  bearishFactors: string[];

  // Risk metrics
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  riskRewardRatio: string;
}

// ============================================================================
// TIMEFRAME WEIGHTS (Research-based)
// ============================================================================

interface CategoryWeights {
  technical: number;
  fundamental: number;
  sentiment: number;
  trend: number;
}

const TIMEFRAME_WEIGHTS: Record<TradingTimeframe, CategoryWeights> = {
  day: {
    technical: 0.45,    // Day trading: Technical dominates
    fundamental: 0.10,  // Less relevant for intraday
    sentiment: 0.25,    // News can move stocks fast
    trend: 0.20,        // Short-term trend matters
  },
  swing: {
    technical: 0.35,    // Swing: Balanced approach
    fundamental: 0.20,  // Earnings matter
    sentiment: 0.25,    // Catalysts important
    trend: 0.20,        // Trend continuation
  },
  position: {
    technical: 0.25,    // Position: Fundamentals grow
    fundamental: 0.35,  // Company health critical
    sentiment: 0.20,    // Sentiment still matters
    trend: 0.20,        // Medium-term trend
  },
  longterm: {
    technical: 0.15,    // Long-term: Fundamentals dominate
    fundamental: 0.45,  // Valuation is key
    sentiment: 0.15,    // Less noise
    trend: 0.25,        // Long-term trend
  },
};

// ============================================================================
// SCORING FUNCTIONS (Pure, Deterministic)
// ============================================================================

/**
 * Score technical indicators
 * Rules are explicit and reproducible
 */
export function scoreTechnical(
  technical: TechnicalIndicators,
  price: number,
  levels: { support: number; resistance: number }
): CategoryScore {
  const factors: string[] = [];
  let totalScore = 0;
  let factorCount = 0;

  // RSI Analysis (weight: 25%)
  if (technical.rsi !== undefined) {
    if (technical.rsi < 30) {
      totalScore += 1; // Oversold = Bullish
      factors.push(`RSI ${technical.rsi.toFixed(1)} (Oversold - Bullish)`);
    } else if (technical.rsi > 70) {
      totalScore -= 1; // Overbought = Bearish
      factors.push(`RSI ${technical.rsi.toFixed(1)} (Overbought - Bearish)`);
    } else if (technical.rsi < 45) {
      totalScore += 0.3; // Slightly oversold
      factors.push(`RSI ${technical.rsi.toFixed(1)} (Slightly low)`);
    } else if (technical.rsi > 55) {
      totalScore -= 0.3; // Slightly overbought
      factors.push(`RSI ${technical.rsi.toFixed(1)} (Slightly high)`);
    } else {
      factors.push(`RSI ${technical.rsi.toFixed(1)} (Neutral)`);
    }
    factorCount++;
  }

  // MACD Analysis (weight: 25%)
  if (technical.macd) {
    if (technical.macd.histogram > 0 && technical.macd.trend === 'Bullish') {
      totalScore += 1;
      factors.push(`MACD Bullish (histogram: ${technical.macd.histogram.toFixed(2)})`);
    } else if (technical.macd.histogram < 0 && technical.macd.trend === 'Bearish') {
      totalScore -= 1;
      factors.push(`MACD Bearish (histogram: ${technical.macd.histogram.toFixed(2)})`);
    } else {
      totalScore += technical.macd.histogram > 0 ? 0.3 : -0.3;
      factors.push(`MACD ${technical.macd.trend} (histogram: ${technical.macd.histogram.toFixed(2)})`);
    }
    factorCount++;
  }

  // Moving Average Analysis (weight: 25%)
  const aboveEMA20 = price > technical.ema20;
  const aboveSMA50 = price > technical.sma50;
  const aboveSMA200 = price > technical.sma200;

  const maScore = [aboveEMA20, aboveSMA50, aboveSMA200].filter(Boolean).length;
  if (maScore === 3) {
    totalScore += 1;
    factors.push('Price above all MAs (Strong Bullish)');
  } else if (maScore === 2) {
    totalScore += 0.5;
    factors.push(`Price above ${maScore}/3 MAs (Bullish)`);
  } else if (maScore === 1) {
    totalScore -= 0.3;
    factors.push(`Price above ${maScore}/3 MAs (Weak)`);
  } else {
    totalScore -= 1;
    factors.push('Price below all MAs (Strong Bearish)');
  }
  factorCount++;

  // Support/Resistance Analysis (weight: 25%)
  const distanceToSupport = ((price - levels.support) / price) * 100;
  const distanceToResistance = ((levels.resistance - price) / price) * 100;

  if (distanceToSupport < 3) {
    totalScore += 0.8; // Near support = good entry
    factors.push(`Near support ($${levels.support.toFixed(2)}, ${distanceToSupport.toFixed(1)}% away)`);
  } else if (distanceToResistance < 3) {
    totalScore -= 0.5; // Near resistance = risky entry
    factors.push(`Near resistance ($${levels.resistance.toFixed(2)}, ${distanceToResistance.toFixed(1)}% away)`);
  }
  factorCount++;

  // Bollinger Band position
  if (technical.bollingerBands) {
    if (technical.bollingerBands.position === 'Below Lower') {
      totalScore += 0.5; // Oversold bounce potential
      factors.push('Below lower Bollinger Band (oversold)');
    } else if (technical.bollingerBands.position === 'Above Upper') {
      totalScore -= 0.5; // Overbought
      factors.push('Above upper Bollinger Band (overbought)');
    }
  }

  // Normalize score to -1 to +1
  const normalizedScore = Math.max(-1, Math.min(1, totalScore / factorCount));

  return {
    category: 'technical',
    score: scoreToSignal(normalizedScore),
    factors,
  };
}

/**
 * Score fundamental data
 * Rules are explicit for valuation assessment
 */
export function scoreFundamental(
  fundamentals: FundamentalData | undefined,
  price: number
): CategoryScore {
  const factors: string[] = [];

  if (!fundamentals) {
    return {
      category: 'fundamental',
      score: {
        signal: 'NEUTRAL',
        strength: 'WEAK',
        score: 0,
        confidence: 0.3,
        reasoning: 'No fundamental data available',
      },
      factors: ['Fundamental data unavailable'],
    };
  }

  let totalScore = 0;
  let factorCount = 0;

  // P/E Analysis
  if (fundamentals.pe !== null) {
    if (fundamentals.pe < 15) {
      totalScore += 1; // Undervalued
      factors.push(`P/E ${fundamentals.pe.toFixed(1)} (Undervalued)`);
    } else if (fundamentals.pe > 35) {
      totalScore -= 0.5; // Expensive
      factors.push(`P/E ${fundamentals.pe.toFixed(1)} (Expensive)`);
    } else if (fundamentals.pe > 25) {
      factors.push(`P/E ${fundamentals.pe.toFixed(1)} (Above average)`);
    } else {
      totalScore += 0.3;
      factors.push(`P/E ${fundamentals.pe.toFixed(1)} (Reasonable)`);
    }
    factorCount++;
  }

  // Forward P/E vs Trailing P/E (growth signal)
  if (fundamentals.pe !== null && fundamentals.forwardPe !== null) {
    if (fundamentals.forwardPe < fundamentals.pe * 0.85) {
      totalScore += 0.5; // Earnings growth expected
      factors.push(`Forward P/E ${fundamentals.forwardPe.toFixed(1)} < Trailing (Growth expected)`);
    } else if (fundamentals.forwardPe > fundamentals.pe * 1.15) {
      totalScore -= 0.3; // Earnings decline expected
      factors.push(`Forward P/E ${fundamentals.forwardPe.toFixed(1)} > Trailing (Decline expected)`);
    }
    factorCount++;
  }

  // EPS Analysis
  if (fundamentals.eps !== null) {
    if (fundamentals.eps > 0) {
      totalScore += 0.3; // Profitable
      factors.push(`EPS $${fundamentals.eps.toFixed(2)} (Profitable)`);
    } else {
      totalScore -= 0.5; // Unprofitable
      factors.push(`EPS $${fundamentals.eps.toFixed(2)} (Unprofitable)`);
    }
    factorCount++;
  }

  // Beta (Risk Assessment)
  if (fundamentals.beta !== null) {
    if (fundamentals.beta > 1.5) {
      totalScore -= 0.2; // High volatility risk
      factors.push(`Beta ${fundamentals.beta.toFixed(2)} (High volatility)`);
    } else if (fundamentals.beta < 0.8) {
      totalScore += 0.2; // Low volatility
      factors.push(`Beta ${fundamentals.beta.toFixed(2)} (Low volatility)`);
    } else {
      factors.push(`Beta ${fundamentals.beta.toFixed(2)} (Market average)`);
    }
    factorCount++;
  }

  // Analyst Target Price
  if (fundamentals.targetPrice !== null && price > 0) {
    const upside = ((fundamentals.targetPrice - price) / price) * 100;
    if (upside > 20) {
      totalScore += 0.8;
      factors.push(`Analyst target $${fundamentals.targetPrice.toFixed(2)} (+${upside.toFixed(0)}% upside)`);
    } else if (upside > 10) {
      totalScore += 0.4;
      factors.push(`Analyst target $${fundamentals.targetPrice.toFixed(2)} (+${upside.toFixed(0)}% upside)`);
    } else if (upside < -10) {
      totalScore -= 0.5;
      factors.push(`Analyst target $${fundamentals.targetPrice.toFixed(2)} (${upside.toFixed(0)}% downside)`);
    }
    factorCount++;
  }

  // Analyst Recommendation
  if (fundamentals.recommendationKey) {
    const rec = fundamentals.recommendationKey.toLowerCase();
    if (rec.includes('buy') || rec.includes('strong')) {
      totalScore += 0.5;
      factors.push(`Analyst rating: ${fundamentals.recommendationKey.toUpperCase()}`);
    } else if (rec.includes('sell') || rec.includes('under')) {
      totalScore -= 0.5;
      factors.push(`Analyst rating: ${fundamentals.recommendationKey.toUpperCase()}`);
    }
    factorCount++;
  }

  // Dividend (income signal)
  if (fundamentals.dividendYield !== null && fundamentals.dividendYield > 2) {
    totalScore += 0.2;
    factors.push(`Dividend yield ${fundamentals.dividendYield.toFixed(2)}%`);
    factorCount++;
  }

  // 52-week performance
  if (fundamentals.fiftyTwoWeekChange !== null) {
    if (fundamentals.fiftyTwoWeekChange > 30) {
      totalScore += 0.3; // Strong momentum
      factors.push(`52-week change: +${fundamentals.fiftyTwoWeekChange.toFixed(1)}% (Strong momentum)`);
    } else if (fundamentals.fiftyTwoWeekChange < -20) {
      totalScore -= 0.3; // Downtrend
      factors.push(`52-week change: ${fundamentals.fiftyTwoWeekChange.toFixed(1)}% (Downtrend)`);
    }
    factorCount++;
  }

  // Normalize score
  const normalizedScore = factorCount > 0 ? Math.max(-1, Math.min(1, totalScore / factorCount)) : 0;

  return {
    category: 'fundamental',
    score: scoreToSignal(normalizedScore),
    factors,
  };
}

/**
 * Score trend analysis
 */
export function scoreTrend(trend: TrendAnalysis): CategoryScore {
  const factors: string[] = [];
  let score = 0;

  // Direction
  if (trend.direction === 'Uptrend') {
    score += 0.6;
    factors.push(`Trend: Uptrend`);
  } else if (trend.direction === 'Downtrend') {
    score -= 0.6;
    factors.push(`Trend: Downtrend`);
  } else {
    factors.push(`Trend: Sideways`);
  }

  // Strength modifier
  if (trend.strength === 'Strong') {
    score *= 1.3;
    factors.push(`Strength: Strong`);
  } else if (trend.strength === 'Weak') {
    score *= 0.7;
    factors.push(`Strength: Weak`);
  } else {
    factors.push(`Strength: Moderate`);
  }

  // Clamp to -1 to +1
  score = Math.max(-1, Math.min(1, score));

  return {
    category: 'trend',
    score: scoreToSignal(score),
    factors,
  };
}

/**
 * Score news sentiment (simplified - just count positive/negative headlines)
 */
export function scoreSentiment(
  news: Array<{ headline: string }>,
  fundamentals?: FundamentalData
): CategoryScore {
  const factors: string[] = [];
  let positiveCount = 0;
  let negativeCount = 0;

  // Simple keyword-based sentiment (deterministic)
  const positiveKeywords = ['beat', 'exceeds', 'growth', 'upgrade', 'buy', 'bullish', 'raises', 'strong', 'record', 'surge', 'gain', 'profit'];
  const negativeKeywords = ['miss', 'below', 'decline', 'downgrade', 'sell', 'bearish', 'cuts', 'weak', 'loss', 'drop', 'fall', 'warning'];

  for (const article of news) {
    const headline = article.headline.toLowerCase();
    const isPositive = positiveKeywords.some(kw => headline.includes(kw));
    const isNegative = negativeKeywords.some(kw => headline.includes(kw));

    if (isPositive && !isNegative) {
      positiveCount++;
    } else if (isNegative && !isPositive) {
      negativeCount++;
    }
  }

  // Calculate sentiment score
  const totalSentimentArticles = positiveCount + negativeCount;
  let sentimentScore = 0;

  if (totalSentimentArticles > 0) {
    sentimentScore = (positiveCount - negativeCount) / totalSentimentArticles;
    factors.push(`News sentiment: ${positiveCount} positive, ${negativeCount} negative`);
  } else {
    factors.push('News sentiment: Neutral (no strong signals)');
  }

  // Add analyst recommendation to sentiment
  if (fundamentals?.recommendationKey) {
    const rec = fundamentals.recommendationKey.toLowerCase();
    if (rec.includes('buy')) {
      sentimentScore += 0.2;
      factors.push(`Analyst consensus: ${fundamentals.recommendationKey}`);
    } else if (rec.includes('sell')) {
      sentimentScore -= 0.2;
      factors.push(`Analyst consensus: ${fundamentals.recommendationKey}`);
    }
  }

  // Clamp to -1 to +1
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

  return {
    category: 'sentiment',
    score: scoreToSignal(sentimentScore),
    factors,
  };
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate complete trading score from market data
 *
 * This is the main entry point - produces DETERMINISTIC scores
 * from the same input data, every time.
 */
export function calculateTradingScore(
  data: SharedTradingData,
  timeframe: TradingTimeframe
): TradingScore {
  const weights = TIMEFRAME_WEIGHTS[timeframe];

  // Calculate individual category scores
  const technicalScore = scoreTechnical(
    data.technical,
    data.quote.price,
    { support: data.levels.support, resistance: data.levels.resistance }
  );

  const fundamentalScore = scoreFundamental(data.fundamentals, data.quote.price);
  const trendScore = scoreTrend(data.trend);
  const sentimentScore = scoreSentiment(data.news, data.fundamentals);

  // Calculate weighted final score
  const weightedScore =
    technicalScore.score.score * weights.technical +
    fundamentalScore.score.score * weights.fundamental +
    trendScore.score.score * weights.trend +
    sentimentScore.score.score * weights.sentiment;

  // Determine recommendation
  const recommendation = scoreToRecommendation(weightedScore);

  // Calculate confidence (based on data quality and signal agreement)
  const scores = [
    technicalScore.score.score,
    fundamentalScore.score.score,
    trendScore.score.score,
    sentimentScore.score.score,
  ];
  const signAgreement = scores.filter(s => Math.sign(s) === Math.sign(weightedScore)).length / scores.length;
  const confidence = Math.min(
    0.95,
    (fundamentalScore.score.confidence + signAgreement) / 2
  );

  // Collect factors
  const bullishFactors = [
    ...technicalScore.factors.filter(f => f.includes('Bullish') || f.includes('Oversold') || f.includes('support')),
    ...fundamentalScore.factors.filter(f => f.includes('Undervalued') || f.includes('upside') || f.includes('buy')),
    ...trendScore.factors.filter(f => f.includes('Uptrend') || f.includes('Strong')),
    ...sentimentScore.factors.filter(f => f.includes('positive')),
  ];

  const bearishFactors = [
    ...technicalScore.factors.filter(f => f.includes('Bearish') || f.includes('Overbought') || f.includes('resistance')),
    ...fundamentalScore.factors.filter(f => f.includes('Expensive') || f.includes('downside') || f.includes('sell')),
    ...trendScore.factors.filter(f => f.includes('Downtrend')),
    ...sentimentScore.factors.filter(f => f.includes('negative')),
  ];

  // Calculate risk levels
  const stopLossPercent = timeframe === 'day' ? 0.02 : timeframe === 'swing' ? 0.04 : timeframe === 'position' ? 0.08 : 0.15;
  const takeProfitMultiplier = timeframe === 'day' ? 2 : timeframe === 'swing' ? 2.5 : timeframe === 'position' ? 3 : 5;

  const suggestedStopLoss = Math.min(data.quote.price * (1 - stopLossPercent), data.levels.support * 0.99);
  const risk = data.quote.price - suggestedStopLoss;
  const suggestedTakeProfit = data.quote.price + (risk * takeProfitMultiplier);
  const riskRewardRatio = `${takeProfitMultiplier.toFixed(1)}:1`;

  // Generate input hash for reproducibility audit
  const inputHash = generateInputHash(data, timeframe);

  return {
    symbol: data.symbol,
    timestamp: new Date().toISOString(),
    inputHash,

    technical: technicalScore,
    fundamental: fundamentalScore,
    sentiment: sentimentScore,
    trend: trendScore,

    weightedScore,
    recommendation,
    confidence,

    bullishFactors,
    bearishFactors,

    suggestedStopLoss,
    suggestedTakeProfit,
    riskRewardRatio,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert numeric score to Signal object
 */
function scoreToSignal(score: number): SignalScore {
  let signal: Signal;
  let strength: SignalStrength;

  if (score > 0.6) {
    signal = 'BULLISH';
    strength = 'STRONG';
  } else if (score > 0.3) {
    signal = 'BULLISH';
    strength = 'MODERATE';
  } else if (score > 0.1) {
    signal = 'BULLISH';
    strength = 'WEAK';
  } else if (score < -0.6) {
    signal = 'BEARISH';
    strength = 'STRONG';
  } else if (score < -0.3) {
    signal = 'BEARISH';
    strength = 'MODERATE';
  } else if (score < -0.1) {
    signal = 'BEARISH';
    strength = 'WEAK';
  } else {
    signal = 'NEUTRAL';
    strength = 'MODERATE';
  }

  // Calculate confidence based on strength of signal
  const confidence = Math.abs(score) * 0.8 + 0.2;

  const reasoning =
    signal === 'BULLISH'
      ? `${strength} bullish signal (score: ${score.toFixed(2)})`
      : signal === 'BEARISH'
      ? `${strength} bearish signal (score: ${score.toFixed(2)})`
      : `Neutral signal (score: ${score.toFixed(2)})`;

  return {
    signal,
    strength,
    score,
    confidence,
    reasoning,
  };
}

/**
 * Convert weighted score to Recommendation
 */
function scoreToRecommendation(score: number): Recommendation {
  if (score >= 0.6) return 'STRONG_BUY';
  if (score >= 0.3) return 'BUY';
  if (score <= -0.6) return 'STRONG_SELL';
  if (score <= -0.3) return 'SELL';
  return 'HOLD';
}

/**
 * Generate deterministic hash of inputs for audit trail
 */
function generateInputHash(data: SharedTradingData, timeframe: TradingTimeframe): string {
  const inputString = JSON.stringify({
    symbol: data.symbol,
    timestamp: data.timestamp,
    price: data.quote.price,
    rsi: data.technical.rsi,
    macd: data.technical.macd.histogram,
    trend: data.trend.direction,
    timeframe,
  });

  // Simple hash (for production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < inputString.length; i++) {
    const char = inputString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Convert input hash to numeric seed for LLM reproducibility
 *
 * OpenAI supports seed parameter (best effort determinism):
 * "If specified, our system will make a best effort to sample deterministically,
 * such that repeated requests with the same seed and parameters should return
 * the same result."
 *
 * @param inputHash - The hex hash string from generateInputHash
 * @returns A positive integer seed value
 */
export function hashToSeed(inputHash: string): number {
  // Convert hex hash to integer, ensure positive and within safe integer range
  const seed = parseInt(inputHash, 16);
  return Math.abs(seed) % Number.MAX_SAFE_INTEGER;
}

/**
 * Generate a seed directly from trading inputs
 * Use this when you need a seed but don't have a TradingScore yet
 */
export function generateTradingSeed(symbol: string, timeframe: TradingTimeframe, date: string): number {
  const inputString = `${symbol}-${timeframe}-${date}`;
  let hash = 0;
  for (let i = 0; i < inputString.length; i++) {
    const char = inputString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % Number.MAX_SAFE_INTEGER;
}

/**
 * Format trading score for display
 */
export function formatTradingScoreForPrompt(score: TradingScore): string {
  const emoji =
    score.recommendation === 'STRONG_BUY' ? '🟢🟢' :
    score.recommendation === 'BUY' ? '🟢' :
    score.recommendation === 'STRONG_SELL' ? '🔴🔴' :
    score.recommendation === 'SELL' ? '🔴' : '🟡';

  return `
📊 DETERMINISTIC TRADING SCORE FOR ${score.symbol}:

${emoji} RECOMMENDATION: ${score.recommendation}
Weighted Score: ${score.weightedScore.toFixed(2)} | Confidence: ${(score.confidence * 100).toFixed(0)}%

CATEGORY BREAKDOWN:
- Technical: ${score.technical.score.signal} (${score.technical.score.score.toFixed(2)})
- Fundamental: ${score.fundamental.score.signal} (${score.fundamental.score.score.toFixed(2)})
- Trend: ${score.trend.score.signal} (${score.trend.score.score.toFixed(2)})
- Sentiment: ${score.sentiment.score.signal} (${score.sentiment.score.score.toFixed(2)})

BULLISH FACTORS:
${score.bullishFactors.map(f => `✅ ${f}`).join('\n') || '(None)'}

BEARISH FACTORS:
${score.bearishFactors.map(f => `⚠️ ${f}`).join('\n') || '(None)'}

RISK MANAGEMENT:
- Suggested Stop-Loss: $${score.suggestedStopLoss.toFixed(2)}
- Suggested Take-Profit: $${score.suggestedTakeProfit.toFixed(2)}
- Risk:Reward Ratio: ${score.riskRewardRatio}

Input Hash: ${score.inputHash} (for reproducibility audit)
`;
}
