// Response caching system to avoid re-prompting identical queries
// Uses memory-based cache for server-side and localStorage for client-side

import crypto from 'crypto'

export interface CachedResponse {
  data: any
  timestamp: number
  ttl: number // Time to live in milliseconds
  queryHash: string
}

// Memory cache for server-side (cleared on restart)
const memoryCache = new Map<string, CachedResponse>()

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours for consensus responses
  AGENT_DEBATE_TTL: 6 * 60 * 60 * 1000, // 6 hours for agent debates
  COMPARISON_TTL: 12 * 60 * 60 * 1000, // 12 hours for comparison responses
  MAX_CACHE_SIZE: 1000, // Maximum number of cached items
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour cleanup interval
}

/**
 * Generate a cache key from query parameters
 */
export function generateCacheKey(
  prompt: string,
  models: Array<{ provider: string; model: string }>,
  responseMode: string = 'normal',
  additionalParams: Record<string, any> = {}
): string {
  const normalizedPrompt = prompt.trim().toLowerCase()
  const modelKey = models
    .map(m => `${m.provider}:${m.model}`)
    .sort()
    .join('|')
  
  const paramsKey = Object.keys(additionalParams)
    .sort()
    .map(key => `${key}:${additionalParams[key]}`)
    .join('|')
  
  const dataToHash = `${normalizedPrompt}::${modelKey}::${responseMode}::${paramsKey}`
  return crypto.createHash('sha256').update(dataToHash).digest('hex').substring(0, 16)
}

/**
 * Server-side memory cache operations
 */
export class MemoryCache {
  /**
   * Get cached response from memory
   */
  static get(cacheKey: string): any | null {
    const cached = memoryCache.get(cacheKey)
    
    if (!cached) {
      return null
    }
    
    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      memoryCache.delete(cacheKey)
      return null
    }
    
    return cached.data
  }
  
  /**
   * Store response in memory cache
   */
  static set(cacheKey: string, data: any, ttl: number = CACHE_CONFIG.DEFAULT_TTL): void {
    // Cleanup if cache is getting too large
    if (memoryCache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.cleanup()
    }
    
    const cached: CachedResponse = {
      data,
      timestamp: Date.now(),
      ttl,
      queryHash: cacheKey
    }
    
    memoryCache.set(cacheKey, cached)
  }
  
  /**
   * Clear expired entries
   */
  static cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, cached] of memoryCache) {
      if (now > cached.timestamp + cached.ttl) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => memoryCache.delete(key))
    
    // If still too large, remove oldest entries
    if (memoryCache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      const entries = Array.from(memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(CACHE_CONFIG.MAX_CACHE_SIZE * 0.2)) // Remove oldest 20%
      
      entries.forEach(([key]) => memoryCache.delete(key))
    }
  }
  
  /**
   * Get cache statistics
   */
  static getStats() {
    const now = Date.now()
    let expired = 0
    let valid = 0
    
    for (const cached of memoryCache.values()) {
      if (now > cached.timestamp + cached.ttl) {
        expired++
      } else {
        valid++
      }
    }
    
    return {
      totalEntries: memoryCache.size,
      validEntries: valid,
      expiredEntries: expired,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE
    }
  }
  
  /**
   * Clear all cache entries
   */
  static clear(): void {
    memoryCache.clear()
  }
}

/**
 * Client-side localStorage cache operations
 */
export class LocalStorageCache {
  private static readonly CACHE_PREFIX = 'ai_council_cache_'
  private static readonly STATS_KEY = 'ai_council_cache_stats'
  
  /**
   * Check if localStorage is available
   */
  private static isAvailable(): boolean {
    try {
      if (typeof window === 'undefined') return false
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Get cached response from localStorage
   */
  static get(cacheKey: string): any | null {
    if (!this.isAvailable()) return null
    
    try {
      const item = localStorage.getItem(this.CACHE_PREFIX + cacheKey)
      if (!item) return null
      
      const cached: CachedResponse = JSON.parse(item)
      
      // Check if expired
      if (Date.now() > cached.timestamp + cached.ttl) {
        localStorage.removeItem(this.CACHE_PREFIX + cacheKey)
        return null
      }
      
      return cached.data
    } catch (error) {
      console.warn('Cache read error:', error)
      return null
    }
  }
  
  /**
   * Store response in localStorage
   */
  static set(cacheKey: string, data: any, ttl: number = CACHE_CONFIG.DEFAULT_TTL): void {
    if (!this.isAvailable()) return
    
    try {
      const cached: CachedResponse = {
        data,
        timestamp: Date.now(),
        ttl,
        queryHash: cacheKey
      }
      
      localStorage.setItem(this.CACHE_PREFIX + cacheKey, JSON.stringify(cached))
      this.updateStats()
    } catch (error) {
      // Handle localStorage quota exceeded
      console.warn('Cache write error, clearing old entries:', error)
      this.cleanup()
      
      try {
        const cached: CachedResponse = {
          data,
          timestamp: Date.now(),
          ttl,
          queryHash: cacheKey
        }
        localStorage.setItem(this.CACHE_PREFIX + cacheKey, JSON.stringify(cached))
      } catch {
        console.warn('Failed to cache response after cleanup')
      }
    }
  }
  
  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    if (!this.isAvailable()) return
    
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.CACHE_PREFIX)) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const cached: CachedResponse = JSON.parse(item)
            if (now > cached.timestamp + cached.ttl) {
              keysToDelete.push(key)
            }
          }
        } catch {
          // Corrupted data, delete it
          keysToDelete.push(key)
        }
      }
    }
    
    keysToDelete.forEach(key => localStorage.removeItem(key))
  }
  
  /**
   * Update cache statistics
   */
  private static updateStats(): void {
    if (!this.isAvailable()) return
    
    try {
      const stats = {
        lastUpdated: Date.now(),
        totalCached: Array.from(new Array(localStorage.length))
          .map((_, i) => localStorage.key(i))
          .filter(key => key?.startsWith(this.CACHE_PREFIX)).length
      }
      localStorage.setItem(this.STATS_KEY, JSON.stringify(stats))
    } catch {
      // Ignore stats update errors
    }
  }
  
  /**
   * Get cache statistics
   */
  static getStats() {
    if (!this.isAvailable()) return { totalCached: 0, available: false }
    
    try {
      const statsItem = localStorage.getItem(this.STATS_KEY)
      const stats = statsItem ? JSON.parse(statsItem) : { totalCached: 0 }
      return { ...stats, available: true }
    } catch {
      return { totalCached: 0, available: true }
    }
  }
  
  /**
   * Clear all cache entries
   */
  static clear(): void {
    if (!this.isAvailable()) return
    
    const keysToDelete: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.CACHE_PREFIX) || key === this.STATS_KEY) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => localStorage.removeItem(key))
  }
}

// Auto cleanup for memory cache
if (typeof window === 'undefined') {
  // Server-side cleanup interval
  setInterval(() => {
    MemoryCache.cleanup()
  }, CACHE_CONFIG.CLEANUP_INTERVAL)
}

// Client-side cleanup on page load
if (typeof window !== 'undefined') {
  // Cleanup expired entries when page loads
  LocalStorageCache.cleanup()
  
  // Cleanup on page unload/visibility change
  const cleanupOnExit = () => {
    LocalStorageCache.cleanup()
  }
  
  window.addEventListener('beforeunload', cleanupOnExit)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      cleanupOnExit()
    }
  })
}

export { CACHE_CONFIG }