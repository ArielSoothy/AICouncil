'use client'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  questionGroups?: {
    critical: number
    important: number
    moderate: number
    optional: number
  }
  estimatedTime?: number
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  questionGroups,
  estimatedTime
}: ProgressIndicatorProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress: {currentStep} / {totalSteps} questions
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Breakdown */}
      {questionGroups && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {questionGroups.critical > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {questionGroups.critical} Critical
              </span>
            </div>
          )}
          {questionGroups.important > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {questionGroups.important} Important
              </span>
            </div>
          )}
          {questionGroups.moderate > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {questionGroups.moderate} Moderate
              </span>
            </div>
          )}
          {questionGroups.optional > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {questionGroups.optional} Optional
              </span>
            </div>
          )}
        </div>
      )}

      {/* Estimated Time */}
      {estimatedTime && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Estimated time remaining: ~{estimatedTime} min</span>
          </div>
        </div>
      )}
    </div>
  )
}
