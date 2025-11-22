'use client'

/**
 * DebateFlowchart - Visual flowchart showing debate progression
 *
 * Features:
 * - Horizontal flowchart layout
 * - Collapsible panel
 * - Real-time progress updates
 * - Works during loading and in results view
 * - Modular and scalable design
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronUp,
  Globe,
  BarChart3,
  Shield,
  Scale,
  Sparkles,
  CheckCircle2
} from 'lucide-react'
import { FlowchartNode, NodeStatus } from './flowchart-node'
import { FlowchartConnector } from './flowchart-connector'

export interface DebateStepProgress {
  /** Unique step identifier */
  id: string
  /** Display label */
  label: string
  /** Current status */
  status: NodeStatus
  /** Model being used */
  model?: string
  /** Provider */
  provider?: string
  /** Duration in seconds */
  duration?: number
  /** Response preview (first 150 chars) */
  preview?: string
}

export interface DebateFlowchartProps {
  /** Array of step progress data */
  steps: DebateStepProgress[]
  /** Whether the flowchart is initially expanded */
  defaultExpanded?: boolean
  /** Current round number */
  round?: number
  /** Whether debate is complete */
  isComplete?: boolean
  /** Total duration of debate */
  totalDuration?: number
  /** Custom class name */
  className?: string
}

// Default debate steps with icons
const STEP_ICONS: Record<string, typeof Globe> = {
  research: Globe,
  analyst: BarChart3,
  critic: Shield,
  judge: Scale,
  synthesizer: Sparkles,
  synthesis: CheckCircle2
}

// Step colors for active state
const STEP_COLORS: Record<string, string> = {
  research: '#10b981', // emerald
  analyst: '#3b82f6', // blue
  critic: '#ef4444', // red
  judge: '#a855f7', // purple
  synthesizer: '#f59e0b', // amber
  synthesis: '#22c55e' // green
}

export function DebateFlowchart({
  steps,
  defaultExpanded = true,
  round = 1,
  isComplete = false,
  totalDuration,
  className
}: DebateFlowchartProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Calculate progress percentage
  const completedSteps = steps.filter(s => s.status === 'complete').length
  const progressPercent = Math.round((completedSteps / steps.length) * 100)

  return (
    <Card className={cn('overflow-hidden transition-all duration-300', className)}>
      {/* Header - Always visible */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 cursor-pointer',
          'bg-muted/30 hover:bg-muted/50 transition-colors'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            Round {round} Progress
          </span>

          {/* Progress bar mini */}
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                isComplete ? 'bg-green-500' : 'bg-primary'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-xs text-muted-foreground">
            {completedSteps}/{steps.length} steps
          </span>

          {isComplete && totalDuration !== undefined && (
            <span className="text-xs text-green-500 font-mono">
              {totalDuration.toFixed(1)}s total
            </span>
          )}
        </div>

        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Flowchart - Collapsible */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4 overflow-x-auto">
          <div className="flex items-center justify-center min-w-max gap-0">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Node */}
                <FlowchartNode
                  label={step.label}
                  status={step.status}
                  icon={STEP_ICONS[step.id] || BarChart3}
                  model={step.model}
                  provider={step.provider}
                  duration={step.duration}
                  preview={step.preview}
                  isFirst={index === 0}
                  isLast={index === steps.length - 1}
                  activeColor={STEP_COLORS[step.id]}
                />

                {/* Connector (except after last node) */}
                {index < steps.length - 1 && (
                  <FlowchartConnector
                    fromStatus={step.status}
                    toStatus={steps[index + 1].status}
                    width={30}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Helper function to create initial steps array for a debate
 */
export function createDebateSteps(
  includeResearch: boolean = false,
  agents: { id: string; label: string; model?: string; provider?: string }[] = []
): DebateStepProgress[] {
  const defaultSteps: DebateStepProgress[] = []

  if (includeResearch) {
    defaultSteps.push({
      id: 'research',
      label: 'Research',
      status: 'pending'
    })
  }

  // Default agent roles if none provided
  const defaultAgents = [
    { id: 'analyst', label: 'Analyst' },
    { id: 'critic', label: 'Critic' },
    { id: 'judge', label: 'Judge' },
    { id: 'synthesizer', label: 'Synthesizer' }
  ]

  const agentList = agents.length > 0 ? agents : defaultAgents

  agentList.forEach(agent => {
    const agentWithOptionals = agent as { id: string; label: string; model?: string; provider?: string }
    defaultSteps.push({
      id: agentWithOptionals.id,
      label: agentWithOptionals.label,
      status: 'pending',
      model: agentWithOptionals.model,
      provider: agentWithOptionals.provider
    })
  })

  // Add synthesis step
  defaultSteps.push({
    id: 'synthesis',
    label: 'Synthesis',
    status: 'pending'
  })

  return defaultSteps
}

/**
 * Helper to update a specific step's status
 */
export function updateStepStatus(
  steps: DebateStepProgress[],
  stepId: string,
  updates: Partial<DebateStepProgress>
): DebateStepProgress[] {
  return steps.map(step =>
    step.id === stepId ? { ...step, ...updates } : step
  )
}
