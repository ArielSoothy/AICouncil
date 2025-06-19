'use client'

import { ConsensusResult } from '@/types/consensus'
import { formatResponseTime, formatTokenCount } from '@/lib/utils'
import { Clock, Zap, Target, CheckCircle } from 'lucide-react'

interface PerformanceMetricsProps {
  performance: ConsensusResult['performance']
}

export function PerformanceMetrics({ performance }: PerformanceMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-3 bg-muted/50 rounded-lg">
        <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
        <div className="text-sm font-medium">Avg Response Time</div>
        <div className="text-lg font-bold">{formatResponseTime(performance.avgResponseTime)}</div>
      </div>

      <div className="text-center p-3 bg-muted/50 rounded-lg">
        <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
        <div className="text-sm font-medium">Success Rate</div>
        <div className="text-lg font-bold">{Math.round(performance.successRate * 100)}%</div>
      </div>

      <div className="text-center p-3 bg-muted/50 rounded-lg">
        <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
        <div className="text-sm font-medium">Total Tokens</div>
        <div className="text-lg font-bold">{formatTokenCount(performance.totalTokens)}</div>
      </div>

      <div className="text-center p-3 bg-muted/50 rounded-lg">
        <Target className="h-6 w-6 mx-auto mb-2 text-blue-600" />
        <div className="text-sm font-medium">Efficiency</div>
        <div className="text-lg font-bold">
          {Math.round((performance.successRate * 100) / (performance.avgResponseTime / 1000))}
        </div>
      </div>
    </div>
  )
}
