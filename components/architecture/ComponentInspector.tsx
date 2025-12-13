'use client'

import { X, Copy, Check, FileCode, Code } from 'lucide-react'
import { useState } from 'react'

interface InspectedComponent {
  name: string
  filePath: string
  keyFunctions: string[]
  description: string
}

interface ComponentInspectorProps {
  component: InspectedComponent
  onClose: () => void
}

export function ComponentInspector({
  component,
  onClose
}: ComponentInspectorProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(component.filePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-lg sticky top-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {component.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            Description
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {component.description}
          </p>
        </div>

        {/* File Path */}
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
            File Path
          </h4>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono break-all">
              {component.filePath}
            </code>
            <button
              onClick={handleCopyPath}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0"
              title="Copy path"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Key Functions */}
        {component.keyFunctions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Key Functions
            </h4>
            <div className="space-y-1">
              {component.keyFunctions.map((fn, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Code className="w-3 h-3 text-gray-400" />
                  <code className="font-mono text-xs">{fn}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 rounded-b-lg">
        <p className="text-xs text-muted-foreground">
          Click other components in the diagram to inspect them
        </p>
      </div>
    </div>
  )
}
