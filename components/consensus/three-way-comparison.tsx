'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign, 
  Clock, 
  Target,
  Users,
  Brain,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface ModelResponse {
  model: string
  response: string
  tokensUsed: number
  responseTime: number
  cost: number
  confidence: number
}

interface ConsensusResponse {
  response: string
  models: string[]
  confidence: number
  tokensUsed: number
  responseTime: number
  cost: number
  judgeAnswer?: string
  judgeAnalysis?: {
    confidence?: number
    consensusScore?: number
    bestAnswer?: string
    [key: string]: any
  }
}

interface AgentDebateResponse {
  response: string
  agents: string[]
  confidence: number
  tokensUsed: number
  responseTime: number
  cost: number
  rounds: number
}

interface ThreeWayComparisonProps {
  singleModel: ModelResponse
  consensus: ConsensusResponse
  agentDebate: AgentDebateResponse
}

export function ThreeWayComparison({ 
  singleModel, 
  consensus, 
  agentDebate 
}: ThreeWayComparisonProps) {
  // Calculate improvements - normalize confidence values to 0-100 range if needed
  const singleConfidence = singleModel.confidence > 1 ? singleModel.confidence : singleModel.confidence * 100
  const consensusConfidence = consensus.confidence > 1 ? consensus.confidence : consensus.confidence * 100
  const debateConfidence = agentDebate.confidence > 1 ? agentDebate.confidence : agentDebate.confidence * 100
  
  const consensusImprovement = consensusConfidence - singleConfidence
  const debateImprovement = debateConfidence - singleConfidence
  const debateVsConsensus = debateConfidence - consensusConfidence
  
  const consensusCostIncrease = ((consensus.cost - singleModel.cost) / singleModel.cost) * 100
  const debateCostIncrease = ((agentDebate.cost - singleModel.cost) / singleModel.cost) * 100
  
  const consensusTimeIncrease = consensus.responseTime - singleModel.responseTime
  const debateTimeIncrease = agentDebate.responseTime - singleModel.responseTime

  const formatConfidenceChange = (change: number) => {
    if (change > 0) return `+${change}%`
    if (change < 0) return `${change}%`
    return '0%'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500'
    if (confidence >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getImprovementIcon = (improvement: number) => {
    if (improvement > 10) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (improvement < -10) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  const getRecommendation = () => {
    // If agent debate has significantly higher confidence
    if (debateImprovement > 30 && debateVsConsensus > 15) {
      return {
        type: 'agent-debate',
        title: 'Agent Debate Recommended',
        reason: 'Significant confidence improvement justifies the additional cost and time for critical decisions.',
        icon: <Brain className="w-5 h-5 text-purple-500" />
      }
    }
    
    // If consensus is good enough and cheaper than debate
    if (consensusImprovement > 20 && debateVsConsensus < 10) {
      return {
        type: 'consensus',
        title: 'Normal Consensus Recommended',
        reason: 'Good confidence improvement at lower cost than full agent debate.',
        icon: <Users className="w-5 h-5 text-blue-500" />
      }
    }
    
    // If single model is sufficient
    if (consensusImprovement < 10 && debateImprovement < 15) {
      return {
        type: 'single',
        title: 'Single Model Sufficient',
        reason: 'Minimal improvement from multi-model approaches. Save cost with single model.',
        icon: <Target className="w-5 h-5 text-green-500" />
      }
    }
    
    // Default to consensus for balance
    return {
      type: 'consensus',
      title: 'Normal Consensus Recommended',
      reason: 'Balanced approach with good confidence improvement and reasonable cost.',
      icon: <Users className="w-5 h-5 text-blue-500" />
    }
  }

  const recommendation = getRecommendation()

  return (
    <div className="space-y-4">
      {/* Header with Recommendation */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="flex items-start gap-4">
          {recommendation.icon}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{recommendation.title}</h3>
            <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
          </div>
        </div>
      </Card>

      {/* Three-Way Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Single Model Card */}
        <Card className={`p-4 ${recommendation.type === 'single' ? 'ring-2 ring-green-500' : ''}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-500" />
                <h4 className="font-semibold">Single Model</h4>
              </div>
              {recommendation.type === 'single' && (
                <Badge variant="default" className="text-xs">Recommended</Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Model</p>
                <p className="text-sm font-medium">{singleModel.model}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Response Preview</p>
                <div className="text-sm max-h-[100px] overflow-y-auto pr-1 whitespace-pre-wrap">{singleModel.response}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className={`text-lg font-bold ${getConfidenceColor(singleConfidence)}`}>
                    {singleConfidence.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-lg font-bold">${singleModel.cost.toFixed(4)}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(singleModel.responseTime / 1000).toFixed(1)}s
                  </span>
                  <span>{singleModel.tokensUsed} tokens</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Normal Consensus Card */}
        <Card className={`p-4 ${recommendation.type === 'consensus' ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold">Normal Consensus</h4>
              </div>
              {recommendation.type === 'consensus' && (
                <Badge variant="default" className="text-xs">Recommended</Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Models ({consensus.models.length})</p>
                <p className="text-sm font-medium line-clamp-2">{consensus.models.join(', ')}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Judge&apos;s Consensus Answer</p>
                <div className="text-sm max-h-[100px] overflow-y-auto pr-1 whitespace-pre-wrap">
                  {consensus.judgeAnswer || consensus.response}
                </div>
              </div>
              
              {consensus.judgeAnalysis && (
                <div className="p-2 bg-muted/50 rounded text-xs">
                  <p className="font-medium mb-1">Judge Analysis:</p>
                  {consensus.judgeAnalysis.confidence && (
                    <p>Confidence: {Math.round(consensus.judgeAnalysis.confidence)}%</p>
                  )}
                  {consensus.judgeAnalysis.consensusScore && (
                    <p>Consensus Score: {consensus.judgeAnalysis.consensusScore}%</p>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <div className="flex items-center gap-1">
                    <p className={`text-lg font-bold ${getConfidenceColor(consensusConfidence)}`}>
                      {consensusConfidence.toFixed(0)}%
                    </p>
                    {getImprovementIcon(consensusImprovement)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatConfidenceChange(consensusImprovement)} vs single
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-lg font-bold">${consensus.cost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">
                    +{consensusCostIncrease.toFixed(0)}% vs single
                  </p>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(consensus.responseTime / 1000).toFixed(1)}s
                    <span className="text-muted-foreground">
                      (+{(consensusTimeIncrease / 1000).toFixed(1)}s)
                    </span>
                  </span>
                  <span>{consensus.tokensUsed} tokens</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Agent Debate Card */}
        <Card className={`p-4 ${recommendation.type === 'agent-debate' ? 'ring-2 ring-purple-500' : ''}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold">Agent Debate</h4>
              </div>
              {recommendation.type === 'agent-debate' && (
                <Badge variant="default" className="text-xs">Recommended</Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Agents ({agentDebate.agents.length})</p>
                <p className="text-sm font-medium line-clamp-2">{agentDebate.agents.join(', ')}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Response Preview</p>
                <div className="text-sm max-h-[100px] overflow-y-auto pr-1 whitespace-pre-wrap">{agentDebate.response}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <div className="flex items-center gap-1">
                    <p className={`text-lg font-bold ${getConfidenceColor(debateConfidence)}`}>
                      {debateConfidence.toFixed(0)}%
                    </p>
                    {getImprovementIcon(debateImprovement)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatConfidenceChange(debateImprovement)} vs single
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatConfidenceChange(debateVsConsensus)} vs consensus
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-lg font-bold">${agentDebate.cost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">
                    +{debateCostIncrease.toFixed(0)}% vs single
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{agentDebate.rounds} rounds</Badge>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(agentDebate.responseTime / 1000).toFixed(1)}s
                    <span className="text-muted-foreground">
                      (+{(debateTimeIncrease / 1000).toFixed(1)}s)
                    </span>
                  </span>
                  <span>{agentDebate.tokensUsed} tokens</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">Detailed Comparison</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Metric</th>
                <th className="text-center py-2">Single Model</th>
                <th className="text-center py-2">Normal Consensus</th>
                <th className="text-center py-2">Agent Debate</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Confidence</td>
                <td className={`text-center py-2 ${getConfidenceColor(singleConfidence)}`}>
                  {singleConfidence.toFixed(0)}%
                </td>
                <td className={`text-center py-2 ${getConfidenceColor(consensusConfidence)}`}>
                  {consensusConfidence.toFixed(0)}% 
                  <span className="text-xs text-muted-foreground ml-1">
                    ({formatConfidenceChange(consensusImprovement)})
                  </span>
                </td>
                <td className={`text-center py-2 ${getConfidenceColor(debateConfidence)}`}>
                  {debateConfidence.toFixed(0)}%
                  <span className="text-xs text-muted-foreground ml-1">
                    ({formatConfidenceChange(debateImprovement)})
                  </span>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Cost</td>
                <td className="text-center py-2">${singleModel.cost.toFixed(4)}</td>
                <td className="text-center py-2">
                  ${consensus.cost.toFixed(4)}
                  <span className="text-xs text-muted-foreground ml-1">
                    (+{consensusCostIncrease.toFixed(0)}%)
                  </span>
                </td>
                <td className="text-center py-2">
                  ${agentDebate.cost.toFixed(4)}
                  <span className="text-xs text-muted-foreground ml-1">
                    (+{debateCostIncrease.toFixed(0)}%)
                  </span>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Response Time</td>
                <td className="text-center py-2">{(singleModel.responseTime / 1000).toFixed(1)}s</td>
                <td className="text-center py-2">
                  {(consensus.responseTime / 1000).toFixed(1)}s
                  <span className="text-xs text-muted-foreground ml-1">
                    (+{(consensusTimeIncrease / 1000).toFixed(1)}s)
                  </span>
                </td>
                <td className="text-center py-2">
                  {(agentDebate.responseTime / 1000).toFixed(1)}s
                  <span className="text-xs text-muted-foreground ml-1">
                    (+{(debateTimeIncrease / 1000).toFixed(1)}s)
                  </span>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Tokens Used</td>
                <td className="text-center py-2">{singleModel.tokensUsed}</td>
                <td className="text-center py-2">{consensus.tokensUsed}</td>
                <td className="text-center py-2">{agentDebate.tokensUsed}</td>
              </tr>
              <tr>
                <td className="py-2">Model Count</td>
                <td className="text-center py-2">1</td>
                <td className="text-center py-2">{consensus.models.length}</td>
                <td className="text-center py-2">{agentDebate.agents.length} agents × {agentDebate.rounds} rounds</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Value Analysis */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Value Analysis
        </h4>
        <div className="space-y-2">
          {debateImprovement > 30 && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <p className="text-sm">
                <strong>High confidence gain from debate:</strong> {debateImprovement}% improvement suggests complex query benefiting from multiple perspectives.
              </p>
            </div>
          )}
          
          {consensusImprovement > 20 && debateVsConsensus < 10 && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
              <p className="text-sm">
                <strong>Consensus provides good balance:</strong> {consensusImprovement}% improvement at lower cost than full debate.
              </p>
            </div>
          )}
          
          {consensusImprovement < 10 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
              <p className="text-sm">
                <strong>Limited multi-model benefit:</strong> Query may be straightforward enough for single model.
              </p>
            </div>
          )}
          
          {debateCostIncrease > 500 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
              <p className="text-sm">
                <strong>Significant cost increase:</strong> Agent debate is {debateCostIncrease.toFixed(0)}% more expensive - ensure query value justifies cost.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}