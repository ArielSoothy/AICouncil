'use client'

// Apartment Comparison Table
// Phase 3: Side-by-side comparison UI

import { ApartmentScore } from '@/lib/domains/apartment/types'
import { Answers } from '@/lib/intake/types'

interface ComparisonTableProps {
  apartments: Array<{
    name: string
    answers: Answers
    score: ApartmentScore
  }>
}

export function ComparisonTable({ apartments }: ComparisonTableProps) {
  if (apartments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No apartments to compare
      </div>
    )
  }

  const getScoreColor = (value: number) => {
    if (value >= 75) return 'text-green-600 dark:text-green-400 font-bold'
    if (value >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getBestInCategory = (category: 'total' | 'financial' | 'location' | 'property' | 'lifestyle') => {
    let maxScore = 0
    let maxIndex = 0

    apartments.forEach((apt, idx) => {
      const score = category === 'total'
        ? apt.score.totalScore
        : apt.score[category].categoryScore

      if (score > maxScore) {
        maxScore = score
        maxIndex = idx
      }
    })

    return maxIndex
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </th>
            {apartments.map((apt, idx) => (
              <th
                key={idx}
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {apt.name || `Apartment ${idx + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Basic Info */}
          <tr className="bg-gray-50 dark:bg-gray-900">
            <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">
              Basic Info
            </td>
            {apartments.map((apt, idx) => (
              <td key={idx} className="px-6 py-3 text-center"></td>
            ))}
          </tr>

          <tr>
            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 pl-12">
              Rent
            </td>
            {apartments.map((apt, idx) => (
              <td key={idx} className="px-6 py-3 text-center text-sm text-gray-900 dark:text-gray-100">
                ${apt.answers.apt_rent}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 pl-12">
              Bedrooms
            </td>
            {apartments.map((apt, idx) => (
              <td key={idx} className="px-6 py-3 text-center text-sm text-gray-900 dark:text-gray-100">
                {apt.answers.apt_bedrooms}
              </td>
            ))}
          </tr>

          <tr>
            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 pl-12">
              Address
            </td>
            {apartments.map((apt, idx) => (
              <td key={idx} className="px-6 py-3 text-center text-sm text-gray-900 dark:text-gray-100">
                {apt.answers.apt_address as string}
              </td>
            ))}
          </tr>

          {/* Total Score */}
          <tr className="bg-gray-50 dark:bg-gray-900">
            <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
              Overall Score
            </td>
            {apartments.map((apt, idx) => {
              const isBest = idx === getBestInCategory('total')
              return (
                <td key={idx} className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-2xl ${getScoreColor(apt.score.totalScore)} ${isBest ? 'animate-pulse' : ''}`}>
                      {Math.round(apt.score.totalScore)}
                    </span>
                    {isBest && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                        👑 Best
                      </span>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>

          <tr>
            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 pl-12">
              Recommendation
            </td>
            {apartments.map((apt, idx) => (
              <td key={idx} className="px-6 py-3 text-center">
                <span className={`text-sm font-semibold ${apt.score.recommendation === 'RENT' ? 'text-green-600 dark:text-green-400' : apt.score.recommendation === 'NEGOTIATE' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                  {apt.score.recommendation}
                </span>
              </td>
            ))}
          </tr>

          {/* Financial */}
          <tr className="bg-gray-50 dark:bg-gray-900">
            <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">
              Financial (40%)
            </td>
            {apartments.map((apt, idx) => {
              const isBest = idx === getBestInCategory('financial')
              return (
                <td key={idx} className={`px-6 py-3 text-center ${isBest ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <span className={getScoreColor(apt.score.financial.categoryScore)}>
                    {Math.round(apt.score.financial.categoryScore)}
                  </span>
                </td>
              )
            })}
          </tr>

          {/* Location */}
          <tr className="bg-gray-50 dark:bg-gray-900">
            <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">
              Location (30%)
            </td>
            {apartments.map((apt, idx) => {
              const isBest = idx === getBestInCategory('location')
              return (
                <td key={idx} className={`px-6 py-3 text-center ${isBest ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <span className={getScoreColor(apt.score.location.categoryScore)}>
                    {Math.round(apt.score.location.categoryScore)}
                  </span>
                </td>
              )
            })}
          </tr>

          {/* Property */}
          <tr className="bg-gray-50 dark:bg-gray-900">
            <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">
              Property (20%)
            </td>
            {apartments.map((apt, idx) => {
              const isBest = idx === getBestInCategory('property')
              return (
                <td key={idx} className={`px-6 py-3 text-center ${isBest ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <span className={getScoreColor(apt.score.property.categoryScore)}>
                    {Math.round(apt.score.property.categoryScore)}
                  </span>
                </td>
              )
            })}
          </tr>

          {/* Lifestyle */}
          <tr className="bg-gray-50 dark:bg-gray-900">
            <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">
              Lifestyle (10%)
            </td>
            {apartments.map((apt, idx) => {
              const isBest = idx === getBestInCategory('lifestyle')
              return (
                <td key={idx} className={`px-6 py-3 text-center ${isBest ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <span className={getScoreColor(apt.score.lifestyle.categoryScore)}>
                    {Math.round(apt.score.lifestyle.categoryScore)}
                  </span>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>

      {/* Legend */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Excellent (75-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Good (60-74)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Poor (&lt;60)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
