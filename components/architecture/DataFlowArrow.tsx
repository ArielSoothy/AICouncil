'use client'

import { ArrowDown } from 'lucide-react'

interface DataFlowArrowProps {
  label?: string
  apiRoute?: string
  animated?: boolean
}

export function DataFlowArrow({
  label,
  apiRoute,
  animated = false
}: DataFlowArrowProps) {
  return (
    <div className="flex flex-col items-center py-2">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 ${
          animated ? 'animate-pulse' : ''
        }`}
      >
        <ArrowDown className="w-5 h-5 text-gray-500" />
      </div>
      {(label || apiRoute) && (
        <div className="mt-1 text-center">
          {label && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
          {apiRoute && (
            <code className="block text-xs text-blue-600 dark:text-blue-400 font-mono">
              {apiRoute}
            </code>
          )}
        </div>
      )}
    </div>
  )
}
