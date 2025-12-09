'use client'

/**
 * FlowchartNode - Individual step node for debate flowchart
 *
 * Features:
 * - Status-based styling (pending, active, complete, error)
 * - Smooth animations and transitions
 * - Model info display
 * - Duration tracking
 * - Response preview on hover
 */

import { cn } from '@/lib/utils'
import { LucideIcon, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type NodeStatus = 'pending' | 'active' | 'complete' | 'error'

export interface FlowchartNodeProps {
  /** Display label for the node */
  label: string
  /** Current status of this step */
  status: NodeStatus
  /** Icon to display */
  icon: LucideIcon
  /** Model being used (optional) */
  model?: string
  /** Provider name (optional) */
  provider?: string
  /** Duration in seconds (shown when complete) */
  duration?: number
  /** Preview of response (shown in tooltip) */
  preview?: string
  /** Whether this is the first node (no left connector) */
  isFirst?: boolean
  /** Whether this is the last node (no right connector) */
  isLast?: boolean
  /** Custom color for the node border when active */
  activeColor?: string
}

const statusConfig = {
  pending: {
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted-foreground/20',
    textColor: 'text-muted-foreground',
    icon: Clock,
    iconColor: 'text-muted-foreground/50'
  },
  active: {
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary',
    textColor: 'text-foreground',
    icon: Loader2,
    iconColor: 'text-primary'
  },
  complete: {
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    textColor: 'text-foreground',
    icon: CheckCircle,
    iconColor: 'text-green-500'
  },
  error: {
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive',
    textColor: 'text-destructive',
    icon: AlertCircle,
    iconColor: 'text-destructive'
  }
}

export function FlowchartNode({
  label,
  status,
  icon: Icon,
  model,
  provider,
  duration,
  preview,
  isFirst = false,
  isLast = false,
  activeColor
}: FlowchartNodeProps) {
  const config = statusConfig[status]
  const StatusIcon = status === 'active' ? Loader2 : config.icon

  const nodeContent = (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all duration-300 min-w-[100px]',
        config.bgColor,
        config.borderColor,
        status === 'active' && 'shadow-lg shadow-primary/20',
        status === 'complete' && 'shadow-md shadow-green-500/10'
      )}
      style={activeColor && status === 'active' ? { borderColor: activeColor } : undefined}
    >
      {/* Status indicator */}
      <div className={cn('absolute -top-2 -right-2', config.iconColor)}>
        <StatusIcon className={cn('w-4 h-4', status === 'active' && 'animate-spin')} />
      </div>

      {/* Main icon */}
      <Icon className={cn('w-6 h-6', config.textColor)} />

      {/* Label */}
      <span className={cn('text-xs font-medium text-center', config.textColor)}>
        {label}
      </span>

      {/* Model info */}
      {model && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">
          {provider && `${provider}/`}{model.split('-').slice(-2).join('-')}
        </span>
      )}

      {/* Duration */}
      {status === 'complete' && duration !== undefined && (
        <span className="text-[10px] text-green-600 font-mono">
          {duration.toFixed(1)}s
        </span>
      )}
    </div>
  )

  // Wrap in tooltip if preview available
  if (preview) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {nodeContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            <p className="text-xs">{preview}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return nodeContent
}
