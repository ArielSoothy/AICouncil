'use client'

// Itinerary View Component
// Phase 4: Day-by-day trip plan visualization

import { ItineraryDay, Activity } from '@/lib/domains/trip/types'

interface ItineraryViewProps {
  itinerary: ItineraryDay[]
  showCosts?: boolean
}

export function ItineraryView({ itinerary, showCosts = true }: ItineraryViewProps) {
  const totalCost = itinerary.reduce((sum, day) => sum + day.estimatedCost, 0)
  const totalActivities = itinerary.reduce(
    (sum, day) => sum + day.morning.length + day.afternoon.length + day.evening.length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Trip Itinerary
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {itinerary.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Days</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {totalActivities}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Activities</div>
          </div>
          {showCosts && (
            <div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                ${totalCost}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
            </div>
          )}
        </div>
      </div>

      {/* Day by Day */}
      <div className="space-y-4">
        {itinerary.map((day) => (
          <DayCard key={day.day} day={day} showCosts={showCosts} />
        ))}
      </div>
    </div>
  )
}

/**
 * Day Card Component
 */
interface DayCardProps {
  day: ItineraryDay
  showCosts: boolean
}

function DayCard({ day, showCosts }: DayCardProps) {
  const allActivities = [...day.morning, ...day.afternoon, ...day.evening]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
      {/* Day Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Day {day.day}
          </h4>
          {day.date && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{day.date}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {allActivities.length} activities
          </div>
          {showCosts && (
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ${day.estimatedCost}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {/* Morning */}
        {day.morning.length > 0 && (
          <TimeBlock title="Morning" activities={day.morning} showCosts={showCosts} />
        )}

        {/* Afternoon */}
        {day.afternoon.length > 0 && (
          <TimeBlock title="Afternoon" activities={day.afternoon} showCosts={showCosts} />
        )}

        {/* Evening */}
        {day.evening.length > 0 && (
          <TimeBlock title="Evening" activities={day.evening} showCosts={showCosts} />
        )}
      </div>

      {/* Day Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            Travel Time: <span className="font-semibold">{day.travelTime} min</span>
          </div>
          <div>
            Activity Time: <span className="font-semibold">{day.activityTime} min</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Time Block Component (Morning/Afternoon/Evening)
 */
interface TimeBlockProps {
  title: string
  activities: Activity[]
  showCosts: boolean
}

function TimeBlock({ title, activities, showCosts }: TimeBlockProps) {
  return (
    <div>
      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
        {title}
      </h5>
      <div className="space-y-2">
        {activities.map((activity, idx) => (
          <ActivityCard key={idx} activity={activity} showCost={showCosts} />
        ))}
      </div>
    </div>
  )
}

/**
 * Activity Card Component
 */
interface ActivityCardProps {
  activity: Activity
  showCost: boolean
}

function ActivityCard({ activity, showCost }: ActivityCardProps) {
  const getTypeIcon = (type: Activity['type']) => {
    switch (type) {
      case 'attraction':
        return '🏛️'
      case 'restaurant':
        return '🍽️'
      case 'activity':
        return '🎭'
      case 'transportation':
        return '🚗'
      case 'rest':
        return '😴'
      default:
        return '📍'
    }
  }

  const getPriorityColor = (priority: Activity['priority']) => {
    switch (priority) {
      case 'must-see':
        return 'text-red-600 dark:text-red-400'
      case 'recommended':
        return 'text-blue-600 dark:text-blue-400'
      case 'optional':
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <span className="text-2xl">{getTypeIcon(activity.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h6 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {activity.name}
            </h6>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {activity.description}
            </p>
          </div>
          {showCost && activity.cost > 0 && (
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              ${activity.cost}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{activity.duration} min</span>
          <span className={`font-medium ${getPriorityColor(activity.priority)}`}>
            {activity.priority}
          </span>
        </div>
      </div>
    </div>
  )
}
