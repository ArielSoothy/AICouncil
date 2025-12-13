'use client'

import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { useState, ReactNode } from 'react'

interface ArchitectureStepProps {
  stepNumber: number
  title: string
  subtitle?: string
  children: ReactNode
  filePath?: string
  keyFunctions?: string[]
  description?: string
  onClick?: () => void
  defaultExpanded?: boolean
  variant?: 'default' | 'highlight' | 'muted'
}

export function ArchitectureStep({
  stepNumber,
  title,
  subtitle,
  children,
  filePath,
  onClick,
  defaultExpanded = true,
  variant = 'default'
}: ArchitectureStepProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (filePath) {
      await navigator.clipboard.writeText(filePath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const bgColor = {
    default: 'bg-white dark:bg-gray-800',
    highlight: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    muted: 'bg-gray-50 dark:bg-gray-900'
  }[variant]

  return (
    <div
      className={`rounded-lg border shadow-sm ${bgColor} transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
      >
        {/* Step Number Badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
          {stepNumber}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* File Path Copy Button */}
        {filePath && (
          <button
            onClick={handleCopyPath}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={`Copy path: ${filePath}`}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}

        {/* Expand/Collapse */}
        <div className="text-gray-400">
          {expanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="pl-11">{children}</div>
        </div>
      )}
    </div>
  )
}
