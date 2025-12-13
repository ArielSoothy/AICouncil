/**
 * Research Taxonomy Configuration
 *
 * Complete mapping of research agents, tools, data points, and data sources
 * used in the trading analysis pipeline.
 *
 * Purpose: Visualize exactly what each researcher searches for
 * to enable continuous improvement of the research system.
 */

export interface DataPoint {
  name: string
  tool: string
  source: string
  metric: string
  description?: string
}

export interface ResearchAgent {
  id: string
  name: string
  emoji: string
  color: 'blue' | 'green' | 'purple' | 'orange'
  bgColor: string
  borderColor: string
  expectedTools: string
  description: string
  dataPoints: DataPoint[]
}

export interface DataSource {
  id: string
  name: string
  status: 'free' | 'api-key' | 'authenticated' | 'calculated'
  statusColor: string
  description: string
  requiresKey?: boolean
  rateLimit?: string
}

export const RESEARCH_AGENTS: ResearchAgent[] = [
  {
    id: 'technical',
    name: 'Technical Analyst',
    emoji: '📊',
    color: 'blue',
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-700',
    expectedTools: '5-8',
    description: 'Analyzes price action, momentum indicators, volume, and key price levels',
    dataPoints: [
      {
        name: 'Price Action',
        tool: 'get_stock_quote',
        source: 'Yahoo Finance',
        metric: 'price, bid, ask, volume',
        description: 'Real-time quote data including current price, bid/ask spread, and trading volume'
      },
      {
        name: 'Historical Bars',
        tool: 'get_price_bars',
        source: 'IBKR → Alpaca',
        metric: 'OHLCV candlesticks',
        description: 'Historical OHLCV data with configurable timeframes (1Min to 1Day)'
      },
      {
        name: 'RSI',
        tool: 'calculate_rsi',
        source: 'Calculated',
        metric: '14-period momentum',
        description: 'Relative Strength Index: >70 overbought, <30 oversold'
      },
      {
        name: 'MACD',
        tool: 'calculate_macd',
        source: 'Calculated',
        metric: 'EMA(12,26,9)',
        description: 'Moving Average Convergence Divergence: MACD line, signal line, histogram'
      },
      {
        name: 'Volume Profile',
        tool: 'get_volume_profile',
        source: 'Bar data',
        metric: 'current vs avg volume',
        description: 'Volume ratio analysis to identify unusual trading activity'
      },
      {
        name: 'Support/Resistance',
        tool: 'get_support_resistance',
        source: 'Price extrema',
        metric: 'key price levels',
        description: 'Support and resistance levels from recent highs/lows (10-90 days)'
      },
      {
        name: 'News',
        tool: 'get_stock_news',
        source: 'Alpaca News',
        metric: 'recent headlines',
        description: 'Latest news articles that may impact price action'
      },
      {
        name: 'Earnings Date',
        tool: 'check_earnings_date',
        source: 'Alpaca',
        metric: 'upcoming catalyst',
        description: 'Earnings announcement dates (volatility catalyst)'
      },
    ]
  },
  {
    id: 'fundamental',
    name: 'Fundamental Analyst',
    emoji: '💰',
    color: 'green',
    bgColor: 'bg-green-900/30',
    borderColor: 'border-green-700',
    expectedTools: '4-6',
    description: 'Analyzes financial statements, SEC filings, and company fundamentals',
    dataPoints: [
      {
        name: 'Financials (10-K)',
        tool: 'get_10k_data',
        source: 'SEC EDGAR',
        metric: 'revenue, income, assets',
        description: 'Income statement, balance sheet, and key ratios from SEC filings'
      },
      {
        name: 'Company Filings',
        tool: 'get_company_filings',
        source: 'SEC EDGAR',
        metric: '10-K, 10-Q, 8-K',
        description: 'Recent SEC filings with links to full documents'
      },
      {
        name: 'R&D Spending',
        tool: 'get_rnd_spending',
        source: 'SEC EDGAR',
        metric: 'R&D %, cash runway',
        description: 'Research & development analysis (biotech/pharma focus)'
      },
      {
        name: 'News',
        tool: 'get_stock_news',
        source: 'Alpaca News',
        metric: 'earnings catalysts',
        description: 'News articles related to earnings and fundamental catalysts'
      },
    ]
  },
  {
    id: 'sentiment',
    name: 'Sentiment Analyst',
    emoji: '📰',
    color: 'purple',
    bgColor: 'bg-purple-900/30',
    borderColor: 'border-purple-700',
    expectedTools: '3-5',
    description: 'Analyzes news sentiment, market psychology, and volume confirmation',
    dataPoints: [
      {
        name: 'News Headlines',
        tool: 'get_stock_news',
        source: 'Alpaca News',
        metric: 'headlines, summaries',
        description: 'Recent news articles with sentiment context'
      },
      {
        name: 'Volume Confirmation',
        tool: 'get_volume_profile',
        source: 'Bar data',
        metric: 'volume spikes',
        description: 'Volume correlation with price movements and news'
      },
      {
        name: 'Price Action',
        tool: 'get_price_bars',
        source: 'IBKR → Alpaca',
        metric: 'market reaction',
        description: 'Price behavior during news events'
      },
    ]
  },
  {
    id: 'risk',
    name: 'Risk Manager',
    emoji: '🛡️',
    color: 'orange',
    bgColor: 'bg-orange-900/30',
    borderColor: 'border-orange-700',
    expectedTools: '6-10',
    description: 'Assesses position sizing, risk metrics, and stop-loss placement',
    dataPoints: [
      {
        name: 'Support/Resistance',
        tool: 'get_support_resistance',
        source: 'Price levels',
        metric: 'stop-loss placement',
        description: 'Key price levels for risk management and stop-loss orders'
      },
      {
        name: 'RSI (Volatility)',
        tool: 'calculate_rsi',
        source: 'Calculated',
        metric: 'entry/exit timing',
        description: 'RSI for identifying optimal entry and exit points'
      },
      {
        name: 'MACD (Momentum)',
        tool: 'calculate_macd',
        source: 'Calculated',
        metric: 'trend confirmation',
        description: 'MACD for trend direction and momentum assessment'
      },
      {
        name: 'Fundamentals',
        tool: 'get_10k_data',
        source: 'SEC EDGAR',
        metric: 'debt risk',
        description: 'Debt ratios and financial health assessment'
      },
      {
        name: 'Earnings Risk',
        tool: 'check_earnings_date',
        source: 'Alpaca',
        metric: 'volatility catalyst',
        description: 'Upcoming earnings events that increase volatility risk'
      },
      {
        name: 'Volume Risk',
        tool: 'get_volume_profile',
        source: 'Bar data',
        metric: 'liquidity',
        description: 'Volume analysis for position sizing and liquidity risk'
      },
    ]
  },
]

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'yahoo',
    name: 'Yahoo Finance',
    status: 'free',
    statusColor: 'text-emerald-400',
    description: 'Real-time stock quotes (free, no API key)',
    requiresKey: false,
  },
  {
    id: 'ibkr',
    name: 'IBKR API',
    status: 'authenticated',
    statusColor: 'text-blue-400',
    description: 'Primary market data source (requires broker connection)',
    requiresKey: true,
  },
  {
    id: 'alpaca',
    name: 'Alpaca API',
    status: 'api-key',
    statusColor: 'text-amber-400',
    description: 'Quotes, news, historical bars (requires API key)',
    requiresKey: true,
    rateLimit: '200 req/min',
  },
  {
    id: 'sec',
    name: 'SEC EDGAR',
    status: 'free',
    statusColor: 'text-emerald-400',
    description: 'Company financials and filings (free, no key)',
    requiresKey: false,
    rateLimit: '10 req/sec',
  },
  {
    id: 'calculated',
    name: 'Calculated Indicators',
    status: 'calculated',
    statusColor: 'text-sky-400',
    description: 'RSI, MACD computed from price bar data',
    requiresKey: false,
  },
]

// Tool definitions for detailed view
export const TOOL_DEFINITIONS: Record<string, {
  name: string
  category: 'alpaca' | 'sec' | 'calculated'
  inputs: string[]
  outputs: string[]
  file: string
}> = {
  'get_stock_quote': {
    name: 'Get Stock Quote',
    category: 'alpaca',
    inputs: ['symbol'],
    outputs: ['price', 'bid', 'ask', 'volume', 'exchange', 'lastUpdated'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'get_price_bars': {
    name: 'Get Price Bars',
    category: 'alpaca',
    inputs: ['symbol', 'timeframe (1Min-1Day)', 'limit'],
    outputs: ['OHLCV array', 'timestamps'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'get_stock_news': {
    name: 'Get Stock News',
    category: 'alpaca',
    inputs: ['symbol', 'limit (max 10)'],
    outputs: ['headline', 'summary', 'author', 'date', 'URL'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'calculate_rsi': {
    name: 'Calculate RSI',
    category: 'calculated',
    inputs: ['symbol', 'period (5-50, default 14)'],
    outputs: ['RSI value', 'interpretation'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'calculate_macd': {
    name: 'Calculate MACD',
    category: 'calculated',
    inputs: ['symbol'],
    outputs: ['MACD line', 'signal line', 'histogram', 'interpretation'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'get_volume_profile': {
    name: 'Get Volume Profile',
    category: 'alpaca',
    inputs: ['symbol', 'days (5-30)'],
    outputs: ['currentVolume', 'avgVolume', 'volumeRatio', 'interpretation'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'get_support_resistance': {
    name: 'Get Support/Resistance',
    category: 'alpaca',
    inputs: ['symbol', 'days (10-90)'],
    outputs: ['support', 'resistance', 'distance %', 'interpretation'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'check_earnings_date': {
    name: 'Check Earnings Date',
    category: 'alpaca',
    inputs: ['symbol'],
    outputs: ['earnings date', 'note'],
    file: 'lib/alpaca/market-data-tools.ts'
  },
  'get_10k_data': {
    name: 'Get 10-K Data',
    category: 'sec',
    inputs: ['symbol'],
    outputs: ['Revenue', 'Net Income', 'Assets', 'Liabilities', 'Equity', 'Cash', 'Debt', 'EPS', 'Ratios'],
    file: 'lib/alpaca/sec-edgar-tools.ts'
  },
  'get_company_filings': {
    name: 'Get Company Filings',
    category: 'sec',
    inputs: ['symbol', 'limit (1-20)'],
    outputs: ['Filing type', 'date', 'URL'],
    file: 'lib/alpaca/sec-edgar-tools.ts'
  },
  'get_rnd_spending': {
    name: 'Get R&D Spending',
    category: 'sec',
    inputs: ['symbol'],
    outputs: ['R&D spending', 'R&D % revenue', 'cash runway', 'interpretation'],
    file: 'lib/alpaca/sec-edgar-tools.ts'
  },
}

// Summary stats for display
export const RESEARCH_STATS = {
  totalAgents: RESEARCH_AGENTS.length,
  totalTools: Object.keys(TOOL_DEFINITIONS).length,
  totalDataPoints: RESEARCH_AGENTS.reduce((sum, agent) => sum + agent.dataPoints.length, 0),
  expectedToolCalls: '30-40',
  expectedDuration: '8-12 seconds',
  parallelExecution: true,
}
