'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  GitCompare, 
  Clock, 
  DollarSign, 
  Brain, 
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ComparisonDisplayProps {
  singleModel: {
    model: string
    response: string
    tokensUsed: number
    responseTime: number
    cost: number
    confidence: number
  }
  consensus: {
    unifiedAnswer: string
    confidence: number
    agreements: string[]
    disagreements: string[]
    responseTime: number
    cost: number
    modelCount: number
  }
}

export function ComparisonDisplay({ singleModel, consensus }: ComparisonDisplayProps) {
  // Calculate improvements (handle edge cases and extreme values)
  // Normalize confidence to 0-100 range if needed
  const singleConfidence = singleModel.confidence > 1 ? singleModel.confidence : singleModel.confidence * 100
  const consensusConfidence = consensus.confidence > 1 ? consensus.confidence : consensus.confidence * 100
  
  const confidenceImprovement = singleConfidence > 0 
    ? Math.min(((consensusConfidence - singleConfidence) / singleConfidence * 100), 999).toFixed(0)
    : consensusConfidence.toFixed(0)
  
  const costIncrease = singleModel.cost > 0.0001
    ? Math.min(((consensus.cost - singleModel.cost) / singleModel.cost * 100), 999).toFixed(0)
    : '0'
    
  const timeIncrease = singleModel.responseTime > 0.01
    ? Math.min(((consensus.responseTime - singleModel.responseTime) / singleModel.responseTime * 100), 999).toFixed(0)
    : '0'
  
  // Determine if consensus added value
  const hasAdditionalInsights = (consensus.agreements?.length || 0) > 0 || (consensus.disagreements?.length || 0) > 0
  const hasHigherConfidence = consensusConfidence > singleConfidence
  
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Single Model vs Consensus Comparison</h3>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Single Model Card */}
        <Card className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Single Model
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {singleModel.model}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Response */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Response:</p>
              <div className="text-sm max-h-[150px] overflow-y-auto pr-2 whitespace-pre-wrap">{singleModel.response}</div>
            </div>
            
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Brain className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{singleModel.confidence ? (singleModel.confidence < 1 ? singleModel.confidence * 100 : singleModel.confidence).toFixed(0) : '70'}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{singleModel.responseTime ? (singleModel.responseTime / 1000).toFixed(1) : '0.0'}s</span>
                </div>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">${singleModel.cost ? singleModel.cost.toFixed(4) : '0.0010'}</span>
                </div>
                <p className="text-xs text-muted-foreground">Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consensus Card */}
        <Card className="relative border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                AI Consensus
              </CardTitle>
              <Badge variant="default" className="text-xs">
                {consensus.modelCount} Models
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Response */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Unified Answer:</p>
              <div className="text-sm max-h-[150px] overflow-y-auto pr-2 whitespace-pre-wrap">{consensus.unifiedAnswer}</div>
            </div>
            
            {/* Metrics with improvements */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Brain className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{(consensus.confidence < 1 ? consensus.confidence * 100 : consensus.confidence).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                {hasHigherConfidence && (
                  <p className="text-xs text-green-500 font-medium">+{confidenceImprovement}%</p>
                )}
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{(consensus.responseTime / 1000).toFixed(1)}s</span>
                </div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-xs text-yellow-500 font-medium">+{timeIncrease}%</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">${consensus.cost.toFixed(4)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-xs text-yellow-500 font-medium">+{costIncrease}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Analysis */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Value Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Benefits */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Consensus Benefits
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {hasHigherConfidence && (
                  <li>• {confidenceImprovement}% higher confidence</li>
                )}
                {hasAdditionalInsights && (
                  <li>• {consensus.agreements.length + consensus.disagreements.length} additional insights</li>
                )}
                <li>• Cross-validated by {consensus.modelCount} models</li>
                <li>• Reduced bias from single model</li>
              </ul>
            </div>
            
            {/* Trade-offs */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Trade-offs
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• {timeIncrease}% longer response time</li>
                <li>• {costIncrease}% higher cost</li>
                <li>• More complex processing</li>
              </ul>
            </div>
          </div>
          
          {/* Summary */}
          <Separator className="my-3" />
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-xs">
              <p className="font-medium mb-1">Recommendation:</p>
              <p className="text-muted-foreground">
                {hasHigherConfidence && Number(confidenceImprovement) > 10
                  ? "Consensus provides significantly higher confidence and validation. Recommended for important decisions."
                  : Number(costIncrease) > 200
                  ? "Single model may be sufficient for this query. Consensus adds cost without proportional value."
                  : "Consensus offers moderate improvements. Use based on decision importance."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}