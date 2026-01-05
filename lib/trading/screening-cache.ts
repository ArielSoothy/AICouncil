/**
 * Screening Cache Service
 *
 * Hybrid caching: localStorage (instant) + Supabase (historical)
 *
 * - localStorage: Last scan persists across page refresh
 * - Supabase: All scans saved for historical analysis
 */

import { createClient } from '@supabase/supabase-js'

const LOCALSTORAGE_KEY = 'screening_last_scan'

export interface ScreeningScanResult {
  id?: string
  scanned_at: string
  scanner_type: string
  filters: {
    min_volume: number
    min_price: number
    max_price: number
    max_results: number
  }
  stocks: Array<{
    symbol: string
    rank: number
    gap_percent: number
    gap_direction: 'up' | 'down'
    pre_market_price: number
    previous_close: number
    pre_market_volume: number
    score: number
  }>
  stocks_count: number
  execution_time_seconds: number
  notes?: string
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Save scan to localStorage (instant refresh persistence)
 */
export function saveToLocalStorage(scan: ScreeningScanResult): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(scan))
    console.log('[ScreeningCache] Saved to localStorage')
  } catch (e) {
    console.error('[ScreeningCache] localStorage save failed:', e)
  }
}

/**
 * Load last scan from localStorage
 */
export function loadFromLocalStorage(): ScreeningScanResult | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(LOCALSTORAGE_KEY)
    if (data) {
      const scan = JSON.parse(data) as ScreeningScanResult
      console.log('[ScreeningCache] Loaded from localStorage:', scan.stocks_count, 'stocks from', scan.scanned_at)
      return scan
    }
  } catch (e) {
    console.error('[ScreeningCache] localStorage load failed:', e)
  }

  return null
}

/**
 * Save scan to Supabase (historical persistence)
 */
export async function saveToSupabase(scan: ScreeningScanResult): Promise<string | null> {
  if (!supabase) {
    console.warn('[ScreeningCache] Supabase not configured, skipping save')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('screening_scans')
      .insert({
        scanned_at: scan.scanned_at,
        scanner_type: scan.scanner_type,
        filters: scan.filters,
        stocks: scan.stocks,
        stocks_count: scan.stocks_count,
        execution_time_seconds: scan.execution_time_seconds,
        notes: scan.notes || null
      })
      .select('id')
      .single()

    if (error) {
      // Table might not exist yet - don't crash
      if (error.code === '42P01') {
        console.warn('[ScreeningCache] Table screening_scans does not exist. Run the SQL script first.')
      } else {
        console.error('[ScreeningCache] Supabase save error:', error.message)
      }
      return null
    }

    console.log('[ScreeningCache] Saved to Supabase, id:', data.id)
    return data.id
  } catch (e) {
    console.error('[ScreeningCache] Supabase save failed:', e)
    return null
  }
}

/**
 * Load scan history from Supabase
 */
export async function loadHistory(limit: number = 20): Promise<ScreeningScanResult[]> {
  if (!supabase) {
    console.warn('[ScreeningCache] Supabase not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('screening_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (error.code === '42P01') {
        console.warn('[ScreeningCache] Table screening_scans does not exist')
      } else {
        console.error('[ScreeningCache] Supabase load error:', error.message)
      }
      return []
    }

    console.log('[ScreeningCache] Loaded', data.length, 'scans from history')
    return data as ScreeningScanResult[]
  } catch (e) {
    console.error('[ScreeningCache] Supabase load failed:', e)
    return []
  }
}

/**
 * Delete a scan from history
 */
export async function deleteScan(id: string): Promise<boolean> {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('screening_scans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[ScreeningCache] Delete failed:', error.message)
      return false
    }

    console.log('[ScreeningCache] Deleted scan:', id)
    return true
  } catch (e) {
    console.error('[ScreeningCache] Delete failed:', e)
    return false
  }
}

/**
 * Combined save: localStorage + Supabase
 */
export async function saveScan(scan: ScreeningScanResult): Promise<void> {
  // Always save to localStorage (instant)
  saveToLocalStorage(scan)

  // Save to Supabase (async, don't block)
  saveToSupabase(scan).catch(() => {
    // Silently fail - localStorage is the fallback
  })
}
