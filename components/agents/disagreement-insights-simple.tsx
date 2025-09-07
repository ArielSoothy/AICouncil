'use client'

import React from 'react'
import { DisagreementAnalysis } from '@/lib/agents/disagreement-analyzer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Network } from 'lucide-react'

interface DisagreementInsightsProps {
  analysis: DisagreementAnalysis
  className?: string
}

export function DisagreementInsights({ analysis, className }: DisagreementInsightsProps) {
  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'destructive'
    if (severity === 'medium') return 'default'
    return 'secondary'
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Disagreement Analysis
        </CardTitle>
        <CardDescription>
          Chain-of-debate tracking showing WHY models disagree
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Score and Severity */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Disagreement Score</span>
              <Badge variant={getSeverityColor(analysis.severity)}>
                {analysis.severity.toUpperCase()}
              </Badge>
            </div>
            <Progress value={analysis.score * 100} className="w-48" />
            <span className="text-xs text-muted-foreground">
              {(analysis.score * 100).toFixed(1)}% disagreement detected
            </span>
          </div>
        </div>
        
        {/* Summary */}
        <div className="rounded-lg border p-3 bg-muted/30">
          <div className="text-sm">
            <strong>Summary:</strong> Found {analysis.reasons.length} disagreement reason(s) and {analysis.patterns.length} pattern(s).
            {analysis.chainOfDisagreement.length > 0 && (
              <span> Tracked {analysis.chainOfDisagreement.length} debate positions across rounds.</span>
            )}
          </div>
        </div>
        
        {/* Disagreement Reasons */}
        {analysis.reasons.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Why Models Disagree:</h4>
            <div className="space-y-2">
              {analysis.reasons.map((reason, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline">
                      {reason.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(reason.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  
                  <p className="text-sm mb-2">{reason.description}</p>
                  
                  <div className="text-xs text-muted-foreground">
                    <div className="mb-1">
                      <strong>Agents involved:</strong> {reason.agentsInvolved.join(', ')}
                    </div>
                    {reason.evidence.length > 0 && (
                      <div>
                        <strong>Evidence:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          {reason.evidence.map((evidence, i) => (
                            <li key={i}>{evidence}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Patterns */}
        {analysis.patterns.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Disagreement Patterns:</h4>
            <div className="space-y-2">
              {analysis.patterns.map((pattern, index) => (
                <div key={index} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline">
                      {pattern.pattern.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(pattern.strength * 100).toFixed(0)}% strength
                    </span>
                  </div>
                  <p className="text-sm">{pattern.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}