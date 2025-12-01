'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Shield,
  Wifi,
  WifiOff,
  Building2,
  TestTube,
  DollarSign,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrokerInfo {
  id: string
  name: string
  environment: 'live' | 'paper'
  connected: boolean
  portfolioValue?: number
}

interface BrokerStatusBadgeProps {
  className?: string
  showBalance?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function BrokerStatusBadge({
  className,
  showBalance = true,
  size = 'md'
}: BrokerStatusBadgeProps) {
  const [brokerInfo, setBrokerInfo] = useState<BrokerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrokerInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/trading/portfolio')

      if (!response.ok) {
        throw new Error('Failed to connect to broker')
      }

      const data = await response.json()
      setBrokerInfo({
        id: data.broker?.id || 'unknown',
        name: data.broker?.name || 'Unknown Broker',
        environment: data.broker?.environment || 'paper',
        connected: true,
        portfolioValue: data.account?.portfolio_value
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setBrokerInfo(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrokerInfo()
  }, [])

  const isLive = brokerInfo?.environment === 'live'
  const isIBKR = brokerInfo?.id === 'ibkr'

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1.5',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-3 text-base gap-3'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  if (loading) {
    return (
      <div className={cn(
        'inline-flex items-center rounded-lg border bg-muted/50 animate-pulse',
        sizeClasses[size],
        className
      )}>
        <RefreshCw className={cn(iconSizes[size], 'animate-spin text-muted-foreground')} />
        <span className="text-muted-foreground">Connecting to broker...</span>
      </div>
    )
  }

  if (error || !brokerInfo) {
    return (
      <div className={cn(
        'inline-flex items-center rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800',
        sizeClasses[size],
        className
      )}>
        <WifiOff className={cn(iconSizes[size], 'text-red-600')} />
        <span className="text-red-700 dark:text-red-300 font-medium">
          Broker Disconnected
        </span>
        <button
          onClick={fetchBrokerInfo}
          className="ml-2 text-red-600 hover:text-red-800 underline text-xs"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      'inline-flex items-center rounded-lg border',
      isLive
        ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700'
        : 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700',
      sizeClasses[size],
      className
    )}>
      {/* Broker Icon */}
      {isIBKR ? (
        <Building2 className={cn(
          iconSizes[size],
          isLive ? 'text-orange-600' : 'text-green-600'
        )} />
      ) : (
        <TestTube className={cn(
          iconSizes[size],
          'text-green-600'
        )} />
      )}

      {/* Broker Name */}
      <span className={cn(
        'font-semibold',
        isLive ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'
      )}>
        {brokerInfo.name}
      </span>

      {/* Environment Badge */}
      <span className={cn(
        'px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide',
        isLive
          ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
          : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'
      )}>
        {isLive ? (
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            LIVE
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            PAPER
          </span>
        )}
      </span>

      {/* Connection Status */}
      <Wifi className={cn(iconSizes[size], 'text-green-500')} />

      {/* Portfolio Value */}
      {showBalance && brokerInfo.portfolioValue !== undefined && (
        <span className={cn(
          'font-mono font-medium border-l pl-2 ml-1',
          isLive
            ? 'text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
            : 'text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
        )}>
          <DollarSign className={cn(iconSizes[size], 'inline -mt-0.5')} />
          {brokerInfo.portfolioValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </span>
      )}
    </div>
  )
}

// Compact version for headers
export function BrokerStatusCompact({ className }: { className?: string }) {
  return <BrokerStatusBadge className={className} showBalance={false} size="sm" />
}

// Full version with warning for live trading
export function BrokerStatusFull({ className }: { className?: string }) {
  const [brokerInfo, setBrokerInfo] = useState<BrokerInfo | null>(null)

  useEffect(() => {
    fetch('/api/trading/portfolio')
      .then(res => res.json())
      .then(data => {
        setBrokerInfo({
          id: data.broker?.id || 'unknown',
          name: data.broker?.name || 'Unknown Broker',
          environment: data.broker?.environment || 'paper',
          connected: true,
          portfolioValue: data.account?.portfolio_value
        })
      })
      .catch(() => setBrokerInfo(null))
  }, [])

  const isLive = brokerInfo?.environment === 'live'

  return (
    <div className={cn('space-y-2', className)}>
      <BrokerStatusBadge size="lg" />

      {isLive && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-100 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800 dark:text-orange-200 text-sm">
              Live Trading Mode
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Connected to your real brokerage account. AI recommendations are for analysis only.
              No automatic trade execution.
            </p>
          </div>
        </div>
      )}

      {!isLive && brokerInfo && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200 text-sm">
              Paper Trading Mode
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Using simulated paper money. Safe for testing strategies without real financial risk.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
