'use client'

import { useState, useEffect } from 'react'
import { Brain, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

export interface ReasoningStep {
  id: string
  type: 'thinking' | 'analysis' | 'decision' | 'warning'
  content: string
  timestamp: number
}

interface ReasoningStreamProps {
  steps: ReasoningStep[]
  isStreaming: boolean
  title?: string
  modelName?: string
}

export function ReasoningStream({
  steps,
  isStreaming,
  title = 'AI Reasoning Process',
  modelName
}: ReasoningStreamProps) {
  const [visibleSteps, setVisibleSteps] = useState<ReasoningStep[]>([])

  useEffect(() => {
    // Animate steps appearing one by one
    if (steps.length > visibleSteps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(steps.slice(0, visibleSteps.length + 1))
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setVisibleSteps(steps)
    }
  }, [steps, visibleSteps.length])

  if (steps.length === 0 && !isStreaming) {
    return null
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">{title}</h3>
        {modelName && (
          <span className="text-sm text-muted-foreground">({modelName})</span>
        )}
        {isStreaming && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Thinking...</span>
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {visibleSteps.map((step, index) => (
          <ReasoningStepItem
            key={step.id}
            step={step}
            index={index}
            isLatest={index === visibleSteps.length - 1 && isStreaming}
          />
        ))}
      </div>
    </div>
  )
}

function ReasoningStepItem({
  step,
  index,
  isLatest
}: {
  step: ReasoningStep
  index: number
  isLatest: boolean
}) {
  const config = {
    thinking: {
      icon: Brain,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-900'
    },
    analysis: {
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-900'
    },
    decision: {
      icon: CheckCircle,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-900'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      border: 'border-yellow-200 dark:border-yellow-900'
    }
  }

  const { icon: Icon, color, bg, border } = config[step.type]

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border ${bg} ${border} ${
        isLatest ? 'animate-pulse-subtle' : ''
      }`}
    >
      <div className={`flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step {index + 1}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(step.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{step.content}</p>
      </div>
    </div>
  )
}

// Utility function to create reasoning steps
export function createReasoningStep(
  type: ReasoningStep['type'],
  content: string
): ReasoningStep {
  return {
    id: `${Date.now()}-${Math.random()}`,
    type,
    content,
    timestamp: Date.now()
  }
}
