'use client'

import { PROVIDER_COLORS } from '@/lib/brand-colors'
import {
  getModelInfo,
  getModelGrade,
  getModelCostTier,
  getModelTokenCost,
  Provider,
  PROVIDER_NAMES,
  ModelCostTier,
  ModelGrade
} from '@/lib/models/model-registry'
import { X, ChevronDown, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// COST TIER STYLING
// ============================================================================

const COST_TIER_STYLES: Record<ModelCostTier, { bg: string; text: string }> = {
  'FREE': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  '$': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  '$$': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  '$$$': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' }
}

const GRADE_STYLES: Record<ModelGrade, { text: string }> = {
  'A+': { text: 'text-emerald-600 dark:text-emerald-400' },
  'A': { text: 'text-green-600 dark:text-green-400' },
  'B+': { text: 'text-blue-600 dark:text-blue-400' },
  'B': { text: 'text-sky-600 dark:text-sky-400' },
  'C+': { text: 'text-amber-600 dark:text-amber-400' },
  'C': { text: 'text-orange-600 dark:text-orange-400' }
}

// ============================================================================
// MODEL BADGE COMPONENT
// ============================================================================

export interface ModelBadgeProps {
  modelId: string
  showPower?: boolean
  showCost?: boolean
  showTokenCost?: boolean  // When true, show exact token costs (In: $X Out: $X)
  showInternet?: boolean
  showRemove?: boolean
  showDropdown?: boolean
  isSubscriptionMode?: boolean  // When true, show SUB badge instead of cost tier
  onClick?: () => void
  onRemove?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact'
}

/**
 * Unified model badge component with power grade and cost tier
 * Used across all model selectors for consistent display
 */
export function ModelBadge({
  modelId,
  showPower = true,
  showCost = true,
  showTokenCost = false,
  showInternet = false,
  showRemove = false,
  showDropdown = false,
  isSubscriptionMode = false,
  onClick,
  onRemove,
  className,
  size = 'md',
  variant = 'default'
}: ModelBadgeProps) {
  const model = getModelInfo(modelId)
  if (!model) return null

  const { grade, weight, display: gradeDisplay } = getModelGrade(modelId)
  const costTier = getModelCostTier(modelId)
  const tokenCost = getModelTokenCost(modelId)
  const provider = model.provider
  const colorClass = PROVIDER_COLORS[provider] || PROVIDER_COLORS.openai
  const costStyle = COST_TIER_STYLES[costTier]
  const gradeStyle = GRADE_STYLES[grade]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  }

  const isCompact = variant === 'compact'
  const displayName = isCompact ? model.name.split(' ')[0] : model.name

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          colorClass,
          'transition-all cursor-pointer rounded-full flex items-center font-medium',
          'outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
          'hover:opacity-90',
          sizeClasses[size],
          className
        )}
      >
        {/* Model Name */}
        <span>{displayName}</span>

        {/* Power Grade */}
        {showPower && (
          <span className={cn('font-semibold', gradeStyle.text)}>
            {isCompact ? grade : gradeDisplay}
          </span>
        )}

        {/* Cost Tier or SUB badge */}
        {showCost && (
          isSubscriptionMode ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-sm">
              SUB
            </span>
          ) : (
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              costStyle.bg,
              costStyle.text
            )}>
              {costTier}
            </span>
          )
        )}

        {/* Exact Token Costs (per 1K) */}
        {showTokenCost && !isSubscriptionMode && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {tokenCost.isFree ? (
              <span className="text-emerald-600 dark:text-emerald-400">FREE</span>
            ) : (
              <>In:{tokenCost.inputDisplay} Out:{tokenCost.outputDisplay}</>
            )}
          </span>
        )}

        {/* Internet Access Indicator */}
        {showInternet && model.hasInternet && (
          <Globe className="h-3 w-3 text-blue-500" />
        )}

        {/* Dropdown Arrow */}
        {showDropdown && <ChevronDown className="h-3 w-3 opacity-70" />}
      </button>

      {/* Remove Button */}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-full hover:bg-destructive/10"
          title="Remove model"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// MODEL DROPDOWN ITEM COMPONENT
// ============================================================================

export interface ModelDropdownItemProps {
  modelId: string
  selected?: boolean
  showPower?: boolean
  showCost?: boolean
  showTokenCost?: boolean  // When true, show exact token costs (In: $X Out: $X)
  isSubscriptionMode?: boolean  // When true, show SUB badge instead of cost tier
  onClick?: () => void
  className?: string
}

/**
 * Model item for dropdown menus with power/cost display
 */
export function ModelDropdownItem({
  modelId,
  selected = false,
  showPower = true,
  showCost = true,
  showTokenCost = true,  // Default true for dropdown items (more space)
  isSubscriptionMode = false,
  onClick,
  className
}: ModelDropdownItemProps) {
  const model = getModelInfo(modelId)
  if (!model) return null

  const { grade, weight } = getModelGrade(modelId)
  const costTier = getModelCostTier(modelId)
  const tokenCost = getModelTokenCost(modelId)
  const costStyle = COST_TIER_STYLES[costTier]
  const gradeStyle = GRADE_STYLES[grade]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 text-sm',
        'hover:bg-accent rounded-md transition-colors',
        selected && 'bg-accent',
        className
      )}
    >
      <span className="flex items-center gap-2">
        <span>{model.name}</span>
        {selected && <span className="text-primary">✓</span>}
      </span>

      <span className="flex items-center gap-2">
        {/* Power Grade */}
        {showPower && (
          <span className={cn('text-xs font-semibold', gradeStyle.text)}>
            {grade}({weight.toFixed(2)})
          </span>
        )}

        {/* Cost Tier or SUB badge */}
        {showCost && (
          isSubscriptionMode ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-sm">
              SUB
            </span>
          ) : (
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
              costStyle.bg,
              costStyle.text
            )}>
              {costTier}
            </span>
          )
        )}

        {/* Exact Token Costs (per 1K) */}
        {showTokenCost && !isSubscriptionMode && (
          <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
            {tokenCost.isFree ? (
              <span className="text-emerald-600 dark:text-emerald-400">FREE</span>
            ) : (
              <>In:{tokenCost.inputDisplay} Out:{tokenCost.outputDisplay}</>
            )}
          </span>
        )}
      </span>
    </button>
  )
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

export { PROVIDER_COLORS } from '@/lib/brand-colors'
export { PROVIDER_NAMES } from '@/lib/models/model-registry'
