'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface BrokerInfo {
  id: string
  name: string
  environment: 'live' | 'paper'
}

interface Position {
  symbol: string
  qty: number
  side: string
  market_value: number
  cost_basis: number
  unrealized_pl: number
  unrealized_plpc: number
  current_price: number
  avg_entry_price: number
}

interface PortfolioData {
  broker: BrokerInfo | null
  account: {
    portfolio_value: number
    cash: number
    buying_power: number
    equity: number
    last_equity: number
  } | null
  positions: Position[]
  performance: {
    daily_pl: number
    daily_pl_percent: number
    total_pl: number
    total_pl_percent: number
  } | null
}

interface PortfolioContextType {
  portfolio: PortfolioData
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

const defaultPortfolio: PortfolioData = {
  broker: null,
  account: null,
  positions: [],
  performance: null,
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<PortfolioData>(defaultPortfolio)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Add timestamp to prevent any caching
      const response = await fetch(`/api/trading/portfolio?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio')
      }

      const data = await response.json()

      setPortfolio({
        broker: data.broker ? {
          id: data.broker.id,
          name: data.broker.name,
          environment: data.broker.environment,
        } : null,
        account: data.account ? {
          portfolio_value: data.account.portfolio_value,
          cash: data.account.cash,
          buying_power: data.account.buying_power,
          equity: data.account.equity,
          last_equity: data.account.last_equity,
        } : null,
        positions: data.positions || [],
        performance: data.performance || null,
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Portfolio fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  const value: PortfolioContextType = {
    portfolio,
    loading,
    error,
    lastUpdated,
    refresh: fetchPortfolio,
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }
  return context
}
