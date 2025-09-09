'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleMessageCardProps {
  content: string
  children?: React.ReactNode
  className?: string
  maxLength?: number
}

export function CollapsibleMessageCard({ 
  content, 
  children,
  className = '',
  maxLength = 600
}: CollapsibleMessageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const isLong = content.length > 800 || content.split('\n').length > 12
  
  // For long messages, show more content before truncating
  // Always respect sentence boundaries to avoid cutting mid-sentence
  const getDisplayContent = () => {
    if (!isLong || isExpanded) return content
    
    // Split into sentences using proper sentence endings
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
    let truncated = ''
    
    // Take complete sentences up to maxLength characters
    for (const sentence of sentences) {
      const nextLength = (truncated + sentence).length
      // Only add if it fits comfortably or if we haven't added any sentences yet
      if (nextLength <= maxLength || truncated.length === 0) {
        truncated += (truncated ? ' ' : '') + sentence
      } else {
        break
      }
    }
    
    // If no sentences fit, take first maxLength chars and find last complete word
    if (truncated.length === 0) {
      const firstChunk = content.substring(0, maxLength)
      const lastSpace = firstChunk.lastIndexOf(' ')
      truncated = lastSpace > 0 ? firstChunk.substring(0, lastSpace) : firstChunk
    }
    
    return truncated + (truncated.length < content.length ? '...' : '')
  }
  
  const displayContent = getDisplayContent()

  return (
    <Card className={`p-4 space-y-3 ${className}`}>
      <div className="w-full">
        <div className="whitespace-pre-wrap break-words border border-border/30 rounded p-3 bg-card/50 text-sm leading-relaxed">
          {displayContent}
        </div>
        
        {isLong && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-3 text-xs font-medium border-dashed hover:border-solid transition-colors bg-background/80 hover:bg-background"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show more ({Math.ceil((content.length - maxLength) / 100)} more lines)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      
      {children && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </Card>
  )
}