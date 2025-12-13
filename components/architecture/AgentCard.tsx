'use client'

import { Wrench, FileText, Clock } from 'lucide-react'

interface AgentCardProps {
  name: string
  role: string
  toolCount?: number
  toolNames?: string[]
  findingsLength?: number
  duration?: number
  onClick?: () => void
  variant?: 'technical' | 'fundamental' | 'sentiment' | 'risk'
}

const VARIANT_COLORS = {
  technical: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950',
  fundamental: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950',
  sentiment: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950',
  risk: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'
}

const VARIANT_ICONS = {
  technical: '📊',
  fundamental: '📈',
  sentiment: '🎯',
  risk: '🛡️'
}

export function AgentCard({
  name,
  role,
  toolCount = 0,
  toolNames = [],
  findingsLength = 0,
  duration,
  onClick,
  variant = 'technical'
}: AgentCardProps) {
  const colorClass = VARIANT_COLORS[variant]
  const icon = VARIANT_ICONS[variant]

  return (
    <div
      className={`rounded-lg border p-3 ${colorClass} cursor-pointer hover:shadow-md transition-all`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div>
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {name}
          </h4>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1 text-xs">
        {/* Tools */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wrench className="w-3 h-3" />
          <span>{toolCount} tools</span>
          {toolNames.length > 0 && (
            <span className="text-gray-400 truncate">
              ({toolNames.slice(0, 3).join(', ')}{toolNames.length > 3 ? '...' : ''})
            </span>
          )}
        </div>

        {/* Findings */}
        {findingsLength > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>{findingsLength.toLocaleString()} chars</span>
          </div>
        )}

        {/* Duration */}
        {duration && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{(duration / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>
    </div>
  )
}
