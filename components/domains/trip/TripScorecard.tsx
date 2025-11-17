'use client'

// Trip Scorecard Component
// Phase 4: Pareto Score Visualization

import { TripScore } from '@/lib/domains/trip/types'

interface TripScorecardProps {
  score: TripScore
  showBreakdown?: boolean
}

export function TripScorecard({ score, showBreakdown = true }: TripScorecardProps) {
  const { overallScore, recommendation, budget, experiences, feasibility, paretoRank, reasoning, warnings } = score

  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600 dark:text-green-400'
    if (value >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getRecommendationStyle = (rec: string) => {
    if (rec === 'BOOK') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    if (rec === 'MODIFY') return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Trip Score
            </h3>
            {paretoRank === 1 && (
              <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                ⭐ Pareto Optimal
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </span>
            <span className="text-2xl text-gray-400">/100</span>
          </div>
        </div>

        {/* Recommendation Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Recommendation:</span>
          <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getRecommendationStyle(recommendation)}`}>
            {recommendation}
          </span>
        </div>

        {/* Budget Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Estimated Total Cost
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${budget.totalCost.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-blue-700 dark:text-blue-300">
            <div>Flights: ${budget.breakdown.flights}</div>
            <div>Hotels: ${budget.breakdown.hotels}</div>
            <div>Activities: ${budget.breakdown.activities}</div>
          </div>
        </div>

        {/* Reasoning */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {reasoning}
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Important Considerations
          </h4>
          <ul className="space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pareto Score Breakdown */}
      {showBreakdown && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Pareto Optimization Breakdown
          </h3>

          <div className="space-y-4">
            {/* Budget (33%) */}
            <ParetoObjective
              name="Budget"
              weight={33}
              score={budget.categoryScore}
              details={[
                { label: 'Budget Fit', value: budget.budgetFit },
                { label: 'Total Cost', value: `$${budget.totalCost}`, isText: true }
              ]}
            />

            {/* Experiences (33%) */}
            <ParetoObjective
              name="Experiences"
              weight={33}
              score={experiences.categoryScore}
              details={[
                { label: 'Interest Match', value: experiences.interestMatch },
                { label: 'Must-Sees Covered', value: experiences.mustSeesCovered },
                { label: 'Variety', value: experiences.varietyScore },
                { label: 'Uniqueness', value: experiences.uniquenessScore }
              ]}
            />

            {/* Feasibility (34%) */}
            <ParetoObjective
              name="Feasibility"
              weight={34}
              score={feasibility.categoryScore}
              details={[
                { label: 'Time Management', value: feasibility.timeManagement },
                { label: 'Pace Match', value: feasibility.paceScore },
                { label: 'Logistics', value: feasibility.logisticsScore },
                { label: 'Seasonal Timing', value: feasibility.seasonalScore }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Pareto Objective Component
 */
interface ParetoObjectiveProps {
  name: string
  weight: number
  score: number
  details: Array<{ label: string; value: number | string; isText?: boolean }>
}

function ParetoObjective({ name, weight, score, details }: ParetoObjectiveProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'bg-green-500'
    if (value >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="border-l-4 border-blue-500 pl-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{name}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            ({weight}% weight)
          </span>
        </div>
        <span className="font-bold text-gray-900 dark:text-gray-100">
          {Math.round(score)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Sub-scores */}
      <div className="space-y-1">
        {details.map((detail, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{detail.label}</span>
            <span className="text-gray-900 dark:text-gray-100">
              {detail.isText ? detail.value : Math.round(detail.value as number)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
