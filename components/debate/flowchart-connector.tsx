'use client'

/**
 * FlowchartConnector - SVG arrow connector between flowchart nodes
 *
 * Features:
 * - Animated flow line
 * - Status-based coloring (active = animated, complete = solid green)
 * - Configurable direction
 */

import { cn } from '@/lib/utils'
import { NodeStatus } from './flowchart-node'

export interface FlowchartConnectorProps {
  /** Status of the preceding node */
  fromStatus: NodeStatus
  /** Status of the following node */
  toStatus: NodeStatus
  /** Width of the connector in pixels */
  width?: number
  /** Whether to show animated flow */
  animated?: boolean
}

export function FlowchartConnector({
  fromStatus,
  toStatus,
  width = 40,
  animated = true
}: FlowchartConnectorProps) {
  // Determine connector state
  const isActive = fromStatus === 'complete' && toStatus === 'active'
  const isComplete = fromStatus === 'complete' && toStatus === 'complete'
  const isPending = fromStatus === 'pending' || toStatus === 'pending'

  const strokeColor = isComplete
    ? '#22c55e' // green-500
    : isActive
    ? '#3b82f6' // blue-500
    : '#6b7280' // gray-500

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: `${width}px`, height: '40px' }}
    >
      <svg
        width={width}
        height="20"
        viewBox={`0 0 ${width} 20`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* Background line */}
        <line
          x1="0"
          y1="10"
          x2={width - 8}
          y2="10"
          stroke={isPending ? '#374151' : strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          className={cn(
            'transition-all duration-300',
            isPending && 'opacity-30'
          )}
        />

        {/* Animated flow particles (when active) */}
        {isActive && animated && (
          <>
            <circle r="3" fill={strokeColor} opacity="0.8">
              <animate
                attributeName="cx"
                values={`0;${width - 8}`}
                dur="1s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.8;0.3;0.8"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="2" fill={strokeColor} opacity="0.5">
              <animate
                attributeName="cx"
                values={`0;${width - 8}`}
                dur="1s"
                begin="0.3s"
                repeatCount="indefinite"
              />
            </circle>
          </>
        )}

        {/* Arrow head */}
        <polygon
          points={`${width - 8},5 ${width},10 ${width - 8},15`}
          fill={isPending ? '#374151' : strokeColor}
          className={cn(
            'transition-all duration-300',
            isPending && 'opacity-30'
          )}
        />
      </svg>
    </div>
  )
}
