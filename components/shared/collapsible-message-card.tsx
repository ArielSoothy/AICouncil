'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FormattingService } from '@/lib/services'

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
  
  const isLong = FormattingService.isLongMessage(content)
  const displayContent = isLong && !isExpanded 
    ? FormattingService.truncateAtSentence(content, maxLength)
    : content

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
                  Show more ({FormattingService.estimateLineCount(content.substring(maxLength))}) more lines)
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