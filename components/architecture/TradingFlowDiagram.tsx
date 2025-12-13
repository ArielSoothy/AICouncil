'use client'

import { ArchitectureStep } from './ArchitectureStep'
import { AgentCard } from './AgentCard'
import { DataFlowArrow } from './DataFlowArrow'
import { ModelDecisionGrid } from './ModelDecisionGrid'
import { CacheStatusBadge } from './CacheStatusBadge'
import {
  Target,
  Wallet,
  Calculator,
  Search,
  Brain,
  Scale,
  CheckCircle,
  Users,
  MessageSquare
} from 'lucide-react'

type TradingMode = 'consensus' | 'debate' | 'individual'

interface TradingData {
  symbol?: string
  timeframe?: string
  models?: string[]
  decisions?: Array<{
    model: string
    modelId: string
    action: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
    reasoning?: string
  }>
  consensus?: {
    action: 'BUY' | 'SELL' | 'HOLD'
    agreement: number
    votes: { BUY: number; SELL: number; HOLD: number }
  }
  research?: {
    totalToolCalls: number
    researchDuration: number
    technical?: { findings: string; toolCallCount: number }
    fundamental?: { findings: string; toolCallCount: number }
    sentiment?: { findings: string; toolCallCount: number }
    risk?: { findings: string; toolCallCount: number }
    cached?: boolean
    cacheAge?: number
  }
  deterministicScore?: {
    recommendation: 'BUY' | 'SELL' | 'HOLD'
    weightedScore: number
    confidence: number
    bullishFactors: string[]
    bearishFactors: string[]
  }
}

interface PortfolioData {
  balance?: number
  buyingPower?: number
  positions?: Array<{ symbol: string; qty: number }>
  broker?: string
  environment?: string
}

interface InspectedComponent {
  name: string
  filePath: string
  keyFunctions: string[]
  description: string
}

interface TradingFlowDiagramProps {
  mode: TradingMode
  tradingData: TradingData | null
  portfolioData: PortfolioData | null
  onComponentClick: (component: InspectedComponent) => void
}

// Component metadata for the inspector
const COMPONENT_INFO: Record<string, InspectedComponent> = {
  userInput: {
    name: 'User Input',
    filePath: 'components/trading/consensus-mode.tsx',
    keyFunctions: ['handleAnalyze()', 'setSymbol()', 'setTimeframe()'],
    description: 'Captures user input: stock symbol, timeframe, and model selection'
  },
  brokerData: {
    name: 'Broker Integration',
    filePath: 'lib/brokers/broker-factory.ts',
    keyFunctions: ['getActiveBroker()', 'getAccount()', 'getPositions()'],
    description: 'Fetches portfolio data from Alpaca (paper) or IBKR (live) broker'
  },
  deterministicScore: {
    name: 'Deterministic Score',
    filePath: 'lib/trading/scoring-engine.ts',
    keyFunctions: ['calculateTradingScore()', 'fetchSharedTradingData()'],
    description: 'Reproducible ML signal using weighted technical/fundamental/sentiment analysis'
  },
  researchPipeline: {
    name: 'Research Pipeline',
    filePath: 'lib/agents/research-agents.ts',
    keyFunctions: ['runResearchAgents()', 'technicalAgent()', 'fundamentalAgent()'],
    description: '4 specialized agents run in parallel: Technical, Fundamental, Sentiment, Risk'
  },
  researchCache: {
    name: 'Research Cache',
    filePath: 'lib/trading/research-cache.ts',
    keyFunctions: ['ResearchCache.get()', 'ResearchCache.set()', 'getCacheKey()'],
    description: 'Supabase-backed cache with smart TTL (15min-24hr based on timeframe)'
  },
  decisionModels: {
    name: 'Decision Models',
    filePath: 'lib/ai-providers/',
    keyFunctions: ['provider.query()', 'parseTradeDecision()'],
    description: '8+ AI models analyze research findings (NO tools - just analysis)'
  },
  consensusVoting: {
    name: 'Consensus Voting',
    filePath: 'app/api/trading/consensus/route.ts',
    keyFunctions: ['calculateConsensus()', 'runJudgeSynthesis()'],
    description: 'Majority voting with Llama 3.3 70B judge for synthesis'
  },
  debateRounds: {
    name: 'Debate Rounds',
    filePath: 'app/api/trading/debate/route.ts',
    keyFunctions: ['runDebateRound()', 'AnalystAgent()', 'CriticAgent()'],
    description: '2-round debate: Analyst → Critic → Synthesizer per round'
  },
  individualOutput: {
    name: 'Individual Output',
    filePath: 'components/trading/individual-mode.tsx',
    keyFunctions: ['renderDecisions()', 'TradeCard'],
    description: 'Returns all model decisions separately without aggregation'
  },
  technicalAgent: {
    name: 'Technical Agent',
    filePath: 'lib/agents/research-agents.ts:technicalAgent',
    keyFunctions: ['calculate_rsi()', 'calculate_macd()', 'get_support_resistance()'],
    description: 'Analyzes price action, patterns, and technical indicators'
  },
  fundamentalAgent: {
    name: 'Fundamental Agent',
    filePath: 'lib/agents/research-agents.ts:fundamentalAgent',
    keyFunctions: ['get_company_financials()', 'sec_edgar_10k()', 'get_earnings()'],
    description: 'Company health, earnings, SEC filings, fundamental ratios'
  },
  sentimentAgent: {
    name: 'Sentiment Agent',
    filePath: 'lib/agents/research-agents.ts:sentimentAgent',
    keyFunctions: ['get_stock_news()', 'analyze_sentiment()', 'get_analyst_ratings()'],
    description: 'Market sentiment, news analysis, social signals'
  },
  riskAgent: {
    name: 'Risk Manager',
    filePath: 'lib/agents/research-agents.ts:riskAgent',
    keyFunctions: ['calculate_position_size()', 'set_stop_loss()', 'assess_risk()'],
    description: 'Position sizing, stop-loss levels, risk assessment'
  }
}

export function TradingFlowDiagram({
  mode,
  tradingData,
  portfolioData,
  onComponentClick
}: TradingFlowDiagramProps) {
  const handleClick = (key: string) => {
    if (COMPONENT_INFO[key]) {
      onComponentClick(COMPONENT_INFO[key])
    }
  }

  return (
    <div className="space-y-2">
      {/* Step 1: User Input */}
      <ArchitectureStep
        stepNumber={1}
        title="User Input"
        subtitle={tradingData?.symbol ? `${tradingData.symbol} / ${tradingData.timeframe}` : 'Symbol + Timeframe + Models'}
        filePath="components/trading/consensus-mode.tsx"
        onClick={() => handleClick('userInput')}
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <div className="font-mono text-sm font-bold">
              {tradingData?.symbol || 'TSLA'}
            </div>
            <div className="text-xs text-muted-foreground">Symbol</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-center">
            <Calculator className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <div className="font-mono text-sm font-bold">
              {tradingData?.timeframe || 'swing'}
            </div>
            <div className="text-xs text-muted-foreground">Timeframe</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-center">
            <Brain className="w-5 h-5 mx-auto mb-1 text-purple-600" />
            <div className="font-mono text-sm font-bold">
              {tradingData?.models?.length || tradingData?.decisions?.length || 8}
            </div>
            <div className="text-xs text-muted-foreground">Models</div>
          </div>
        </div>
      </ArchitectureStep>

      <DataFlowArrow apiRoute={`POST /api/trading/${mode}`} />

      {/* Step 2: Broker Data */}
      <ArchitectureStep
        stepNumber={2}
        title="Broker Data"
        subtitle={portfolioData?.broker ? `${portfolioData.broker} (${portfolioData.environment})` : 'Portfolio Context'}
        filePath="lib/brokers/broker-factory.ts"
        onClick={() => handleClick('brokerData')}
      >
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Wallet className="w-6 h-6 text-green-600" />
            <div>
              <div className="font-semibold">Portfolio Context</div>
              <div className="text-xs text-muted-foreground">
                {portfolioData?.broker || 'Alpaca'} ({portfolioData?.environment || 'paper'})
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Balance:</span>
              <span className="ml-2 font-mono">
                ${portfolioData?.balance?.toLocaleString() || '100,000'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Buying Power:</span>
              <span className="ml-2 font-mono">
                ${portfolioData?.buyingPower?.toLocaleString() || '50,000'}
              </span>
            </div>
            {portfolioData?.positions && portfolioData.positions.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Positions:</span>
                <span className="ml-2 font-mono">
                  {portfolioData.positions.map(p => `${p.symbol}(${p.qty})`).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </ArchitectureStep>

      <DataFlowArrow />

      {/* Step 3: Deterministic Score */}
      <ArchitectureStep
        stepNumber={3}
        title="Deterministic Score"
        subtitle="Reproducible ML Signal"
        filePath="lib/trading/scoring-engine.ts"
        onClick={() => handleClick('deterministicScore')}
      >
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">
                {tradingData?.deterministicScore?.recommendation || 'BUY'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Confidence: {Math.round((tradingData?.deterministicScore?.confidence || 0.72) * 100)}%
            </div>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${(tradingData?.deterministicScore?.weightedScore || 0.72) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-green-600 font-medium">Bullish:</span>
              <ul className="mt-1 text-muted-foreground">
                {(tradingData?.deterministicScore?.bullishFactors || ['RSI oversold', 'Golden cross']).slice(0, 2).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-red-600 font-medium">Bearish:</span>
              <ul className="mt-1 text-muted-foreground">
                {(tradingData?.deterministicScore?.bearishFactors || ['High P/E', 'Sector weakness']).slice(0, 2).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ArchitectureStep>

      <DataFlowArrow />

      {/* Step 4: Research Pipeline */}
      <ArchitectureStep
        stepNumber={4}
        title="Research Pipeline"
        subtitle={`4 Agents in Parallel${tradingData?.research?.cached ? ' (CACHED)' : ''}`}
        filePath="lib/agents/research-agents.ts"
        onClick={() => handleClick('researchPipeline')}
        variant="highlight"
      >
        <div className="space-y-4">
          {/* Agent Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AgentCard
              name="Technical"
              role="Price & Patterns"
              variant="technical"
              toolCount={tradingData?.research?.technical?.toolCallCount || 8}
              toolNames={['RSI', 'MACD', 'Bollinger']}
              findingsLength={tradingData?.research?.technical?.findings?.length || 6233}
              onClick={() => handleClick('technicalAgent')}
            />
            <AgentCard
              name="Fundamental"
              role="Company Health"
              variant="fundamental"
              toolCount={tradingData?.research?.fundamental?.toolCallCount || 6}
              toolNames={['SEC Edgar', 'Earnings', 'Financials']}
              findingsLength={tradingData?.research?.fundamental?.findings?.length || 8686}
              onClick={() => handleClick('fundamentalAgent')}
            />
            <AgentCard
              name="Sentiment"
              role="Market Psychology"
              variant="sentiment"
              toolCount={tradingData?.research?.sentiment?.toolCallCount || 5}
              toolNames={['News', 'Social', 'Ratings']}
              findingsLength={tradingData?.research?.sentiment?.findings?.length || 3200}
              onClick={() => handleClick('sentimentAgent')}
            />
            <AgentCard
              name="Risk Manager"
              role="Position & Stop-loss"
              variant="risk"
              toolCount={tradingData?.research?.risk?.toolCallCount || 10}
              toolNames={['VaR', 'Kelly', 'Volatility']}
              findingsLength={tradingData?.research?.risk?.findings?.length || 4100}
              onClick={() => handleClick('riskAgent')}
            />
          </div>

          {/* Cache Status */}
          <div className="flex items-center justify-between">
            <CacheStatusBadge
              cached={tradingData?.research?.cached || false}
              cacheAge={tradingData?.research?.cacheAge}
              cacheTTL={60}
              savedApiCalls={tradingData?.research?.cached ? tradingData?.research?.totalToolCalls : undefined}
            />
            <div className="text-sm text-muted-foreground">
              {tradingData?.research?.totalToolCalls || 29} tools |{' '}
              {((tradingData?.research?.researchDuration || 8200) / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
      </ArchitectureStep>

      <DataFlowArrow label="Research findings passed to all models" />

      {/* Step 5: Decision Models */}
      <ArchitectureStep
        stepNumber={5}
        title="Decision Models"
        subtitle="Analyze Research - NO Tools"
        filePath="lib/ai-providers/"
        onClick={() => handleClick('decisionModels')}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Brain className="w-4 h-4" />
            <span>Parallel model calls (no tool access - analysis only)</span>
          </div>
          <ModelDecisionGrid
            decisions={tradingData?.decisions || [
              { model: 'Claude 4.5', modelId: 'claude-4.5', action: 'BUY', confidence: 0.80 },
              { model: 'GPT-4o', modelId: 'gpt-4o', action: 'BUY', confidence: 0.75 },
              { model: 'Gemini 2.5', modelId: 'gemini-2.5', action: 'BUY', confidence: 0.70 },
              { model: 'Llama 3.3', modelId: 'llama-3.3', action: 'HOLD', confidence: 0.60 },
              { model: 'Grok 4', modelId: 'grok-4', action: 'BUY', confidence: 0.72 },
              { model: 'Mistral', modelId: 'mistral', action: 'BUY', confidence: 0.68 },
              { model: 'Sonar Pro', modelId: 'sonar', action: 'SELL', confidence: 0.55 },
              { model: 'Command R+', modelId: 'command', action: 'BUY', confidence: 0.65 }
            ]}
          />
        </div>
      </ArchitectureStep>

      <DataFlowArrow />

      {/* Step 6: Mode-Specific Processing */}
      <ArchitectureStep
        stepNumber={6}
        title="Mode-Specific Processing"
        subtitle={mode.charAt(0).toUpperCase() + mode.slice(1) + ' Mode'}
        filePath={`app/api/trading/${mode}/route.ts`}
        onClick={() => handleClick(mode === 'consensus' ? 'consensusVoting' : mode === 'debate' ? 'debateRounds' : 'individualOutput')}
        variant={mode === 'consensus' ? 'highlight' : 'default'}
      >
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border ${mode === 'individual' ? 'bg-blue-50 dark:bg-blue-950 border-blue-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Users className="w-6 h-6 mb-2 text-blue-600" />
            <div className="font-semibold text-sm">Individual</div>
            <div className="text-xs text-muted-foreground mt-1">
              Return all decisions separately
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${mode === 'consensus' ? 'bg-green-50 dark:bg-green-950 border-green-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Scale className="w-6 h-6 mb-2 text-green-600" />
            <div className="font-semibold text-sm">Consensus</div>
            <div className="text-xs text-muted-foreground mt-1">
              Vote + Judge synthesis
            </div>
            {mode === 'consensus' && tradingData?.consensus && (
              <div className="mt-2 text-xs">
                {tradingData.consensus.votes.BUY} BUY / {tradingData.consensus.votes.SELL} SELL / {tradingData.consensus.votes.HOLD} HOLD
              </div>
            )}
          </div>
          <div className={`p-4 rounded-lg border ${mode === 'debate' ? 'bg-purple-50 dark:bg-purple-950 border-purple-300' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <MessageSquare className="w-6 h-6 mb-2 text-purple-600" />
            <div className="font-semibold text-sm">Debate</div>
            <div className="text-xs text-muted-foreground mt-1">
              2-Round Analyst/Critic/Synth
            </div>
          </div>
        </div>
      </ArchitectureStep>

      <DataFlowArrow />

      {/* Step 7: Final Output */}
      <ArchitectureStep
        stepNumber={7}
        title="Final Output"
        subtitle={tradingData?.consensus?.action || tradingData?.decisions?.[0]?.action || 'Trading Decision'}
        filePath={`components/trading/${mode}-mode.tsx`}
        variant="highlight"
      >
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">
                {tradingData?.consensus?.action || tradingData?.decisions?.[0]?.action || 'BUY'} {tradingData?.symbol || 'TSLA'}
              </div>
              {mode === 'consensus' && tradingData?.consensus && (
                <div className="text-sm text-muted-foreground">
                  Agreement: {Math.round(tradingData.consensus.agreement * 100)}% ({Object.values(tradingData.consensus.votes).reduce((a, b) => a + b, 0)} models)
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {mode === 'consensus' && 'Strong consensus supported by research findings. Judge synthesis provides unified reasoning.'}
            {mode === 'debate' && 'Decision refined through 2 rounds of Analyst-Critic-Synthesizer debate.'}
            {mode === 'individual' && 'Each model\'s decision returned separately for comparison.'}
          </p>
        </div>
      </ArchitectureStep>
    </div>
  )
}
