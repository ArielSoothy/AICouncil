/**
 * Backend Logger - Captures API activity for debugging
 *
 * Usage in API routes:
 *   import { backendLogger } from '@/lib/dev/backend-logger'
 *   backendLogger.log('research', 'Starting technical analysis', { symbol: 'TSLA' })
 */

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'
export type LogCategory =
  | 'api'
  | 'research'
  | 'model'
  | 'cache'
  | 'broker'
  | 'tool'
  | 'debate'
  | 'consensus'

export interface BackendLogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  data?: Record<string, unknown>
  duration?: number
  source?: string
}

// In-memory log store (circular buffer)
const MAX_LOGS = 500
const logs: BackendLogEntry[] = []
let logIdCounter = 0

// Subscribers for real-time updates
type LogSubscriber = (entry: BackendLogEntry) => void
const subscribers: Set<LogSubscriber> = new Set()

function generateId(): string {
  return `log_${Date.now()}_${++logIdCounter}`
}

export const backendLogger = {
  /**
   * Add a log entry
   */
  log(
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    level: LogLevel = 'info',
    source?: string
  ): BackendLogEntry {
    const entry: BackendLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      source
    }

    // Add to circular buffer
    logs.push(entry)
    if (logs.length > MAX_LOGS) {
      logs.shift()
    }

    // Notify subscribers
    subscribers.forEach(sub => {
      try {
        sub(entry)
      } catch (e) {
        // Ignore subscriber errors
      }
    })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const icon = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        debug: '🔍'
      }[level]
      console.log(`[${icon} ${category.toUpperCase()}] ${message}`, data || '')
    }

    return entry
  },

  // Convenience methods
  info: (category: LogCategory, message: string, data?: Record<string, unknown>, source?: string) =>
    backendLogger.log(category, message, data, 'info', source),

  success: (category: LogCategory, message: string, data?: Record<string, unknown>, source?: string) =>
    backendLogger.log(category, message, data, 'success', source),

  warning: (category: LogCategory, message: string, data?: Record<string, unknown>, source?: string) =>
    backendLogger.log(category, message, data, 'warning', source),

  error: (category: LogCategory, message: string, data?: Record<string, unknown>, source?: string) =>
    backendLogger.log(category, message, data, 'error', source),

  debug: (category: LogCategory, message: string, data?: Record<string, unknown>, source?: string) =>
    backendLogger.log(category, message, data, 'debug', source),

  /**
   * Log API request start
   */
  apiStart(route: string, method: string, body?: Record<string, unknown>): string {
    const entry = backendLogger.log('api', `${method} ${route}`, { body }, 'info', route)
    return entry.id
  },

  /**
   * Log API request end
   */
  apiEnd(route: string, status: number, duration: number, result?: Record<string, unknown>): void {
    const level = status >= 400 ? 'error' : 'success'
    backendLogger.log('api', `${route} completed`, { status, duration: `${duration}ms`, result }, level, route)
  },

  /**
   * Log research agent activity
   */
  researchAgent(agent: string, action: string, data?: Record<string, unknown>): void {
    backendLogger.log('research', `[${agent}] ${action}`, data, 'info', agent)
  },

  /**
   * Log tool call
   */
  toolCall(toolName: string, args?: Record<string, unknown>, result?: unknown): void {
    backendLogger.log('tool', `Called ${toolName}`, { args, resultPreview: String(result).slice(0, 200) }, 'debug', toolName)
  },

  /**
   * Log model query
   */
  modelQuery(model: string, provider: string, action: string, data?: Record<string, unknown>): void {
    backendLogger.log('model', `[${provider}/${model}] ${action}`, data, 'info', model)
  },

  /**
   * Log cache activity
   */
  cacheHit(key: string, age?: number): void {
    backendLogger.log('cache', `Cache HIT: ${key}`, { age: age ? `${age}min` : undefined }, 'success', 'cache')
  },

  cacheMiss(key: string): void {
    backendLogger.log('cache', `Cache MISS: ${key}`, undefined, 'warning', 'cache')
  },

  cacheSet(key: string, ttl?: number): void {
    backendLogger.log('cache', `Cache SET: ${key}`, { ttl: ttl ? `${ttl}min` : undefined }, 'info', 'cache')
  },

  /**
   * Get recent logs
   */
  getLogs(options?: {
    limit?: number
    category?: LogCategory
    level?: LogLevel
    since?: string
  }): BackendLogEntry[] {
    let result = [...logs]

    if (options?.category) {
      result = result.filter(l => l.category === options.category)
    }

    if (options?.level) {
      result = result.filter(l => l.level === options.level)
    }

    if (options?.since) {
      const since = options.since
      result = result.filter(l => l.timestamp > since)
    }

    if (options?.limit) {
      result = result.slice(-options.limit)
    }

    return result
  },

  /**
   * Clear all logs
   */
  clear(): void {
    logs.length = 0
  },

  /**
   * Subscribe to new log entries
   */
  subscribe(callback: LogSubscriber): () => void {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  },

  /**
   * Get log stats
   */
  getStats(): {
    total: number
    byCategory: Record<string, number>
    byLevel: Record<string, number>
  } {
    const byCategory: Record<string, number> = {}
    const byLevel: Record<string, number> = {}

    logs.forEach(log => {
      byCategory[log.category] = (byCategory[log.category] || 0) + 1
      byLevel[log.level] = (byLevel[log.level] || 0) + 1
    })

    return { total: logs.length, byCategory, byLevel }
  }
}

export default backendLogger
