'use client'

import { Database, Clock, Zap } from 'lucide-react'

interface CacheStatusBadgeProps {
  cached: boolean
  cacheAge?: number // in minutes
  cacheTTL?: number // in minutes
  savedApiCalls?: number
}

export function CacheStatusBadge({
  cached,
  cacheAge,
  cacheTTL,
  savedApiCalls
}: CacheStatusBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
        cached
          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
      }`}
    >
      <Database className="w-4 h-4" />

      {cached ? (
        <>
          <span className="font-medium">CACHE HIT</span>
          {cacheAge !== undefined && (
            <span className="flex items-center gap-1 text-xs opacity-75">
              <Clock className="w-3 h-3" />
              {cacheAge}min old
            </span>
          )}
          {cacheTTL !== undefined && (
            <span className="text-xs opacity-75">
              (TTL: {cacheTTL}min)
            </span>
          )}
          {savedApiCalls !== undefined && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Zap className="w-3 h-3" />
              Saved {savedApiCalls} calls
            </span>
          )}
        </>
      ) : (
        <span className="font-medium">CACHE MISS</span>
      )}
    </div>
  )
}
