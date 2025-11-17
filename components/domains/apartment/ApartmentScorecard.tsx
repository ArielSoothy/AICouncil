'use client'

// Apartment Scorecard Component
// Phase 3: MAUT Score Visualization

import { ApartmentScore } from '@/lib/domains/apartment/types'

interface ApartmentScorecardProps {
  score: ApartmentScore
  showBreakdown?: boolean
}

export function ApartmentScorecard({ score, showBreakdown = true }: ApartmentScorecardProps) {
  const { totalScore, recommendation, financial, location, property, lifestyle, reasoning, warnings } = score

  // Determine color based on score
  const getScoreColor = (value: number) => {
    if (value >= 75) return 'text-green-600 dark:text-green-400'
    if (value >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getRecommendationStyle = (rec: string) => {
    if (rec === 'RENT') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    if (rec === 'NEGOTIATE') return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Overall Score
          </h3>
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-bold ${getScoreColor(totalScore)}`}>
              {totalScore}
            </span>
            <span className="text-2xl text-gray-400">/100</span>
          </div>
        </div>

        {/* Recommendation Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Recommendation:</span>
          <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getRecommendationStyle(recommendation)}`}>
            {recommendation}
          </span>
        </div>

        {/* Reasoning */}
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
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

      {/* Score Breakdown */}
      {showBreakdown && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Score Breakdown
          </h3>

          <div className="space-y-4">
            {/* Financial (40%) */}
            <CategoryScore
              name="Financial"
              weight={40}
              score={financial.categoryScore}
              details={[
                { label: 'Affordability', value: financial.affordability },
                { label: 'Market Value', value: financial.marketValue },
                { label: 'Hidden Costs', value: financial.hiddenCosts }
              ]}
            />

            {/* Location (30%) */}
            <CategoryScore
              name="Location"
              weight={30}
              score={location.categoryScore}
              details={[
                { label: 'Commute', value: location.commuteScore },
                { label: 'Safety', value: location.neighborhoodSafety },
                { label: 'Walkability', value: location.walkability },
                { label: 'Transit Access', value: location.transitAccess }
              ]}
            />

            {/* Property (20%) */}
            <CategoryScore
              name="Property"
              weight={20}
              score={property.categoryScore}
              details={[
                { label: 'Space Adequacy', value: property.spaceAdequacy },
                { label: 'Amenities', value: property.amenitiesScore },
                { label: 'Building Quality', value: property.buildingQuality }
              ]}
            />

            {/* Lifestyle (10%) */}
            <CategoryScore
              name="Lifestyle"
              weight={10}
              score={lifestyle.categoryScore}
              details={[
                { label: 'Neighborhood Vibe', value: lifestyle.neighborhoodVibe },
                { label: 'Pet Friendliness', value: lifestyle.petFriendliness },
                { label: 'WFH Suitability', value: lifestyle.wfhSuitability }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Category Score Component
 * Shows individual category with breakdown
 */
interface CategoryScoreProps {
  name: string
  weight: number
  score: number
  details: Array<{ label: string; value: number }>
}

function CategoryScore({ name, weight, score, details }: CategoryScoreProps) {
  const getScoreColor = (value: number) => {
    if (value >= 75) return 'bg-green-500'
    if (value >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-4">
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
            <span className="text-gray-900 dark:text-gray-100">{Math.round(detail.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
