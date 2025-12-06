'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  Shield,
  Wifi,
  WifiOff,
  Building2,
  TestTube,
  DollarSign,
  RefreshCw,
  LogIn,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolio } from '@/contexts/portfolio-context'

interface IBKRAuthStatus {
  configured: boolean
  authenticated: boolean
  connected?: boolean
  gatewayRunning?: boolean
  message: string
  loginUrl?: string
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
  const { portfolio, loading, error, refresh } = usePortfolio()

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

  if (loading && !portfolio.broker) {
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

  if (error || !portfolio.broker) {
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
          onClick={refresh}
          className="ml-2 text-red-600 hover:text-red-800 underline text-xs"
        >
          Retry
        </button>
      </div>
    )
  }

  const isLive = portfolio.broker.environment === 'live'
  const isIBKR = portfolio.broker.id === 'ibkr'
  const portfolioValue = portfolio.account?.portfolio_value

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
        {portfolio.broker.name}
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
      {showBalance && portfolioValue !== undefined && (
        <span className={cn(
          'font-mono font-medium border-l pl-2 ml-1',
          isLive
            ? 'text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
            : 'text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
        )}>
          <DollarSign className={cn(iconSizes[size], 'inline -mt-0.5')} />
          {portfolioValue.toLocaleString('en-US', {
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
  const { portfolio } = usePortfolio()
  const isLive = portfolio.broker?.environment === 'live'

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

      {!isLive && portfolio.broker && (
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

// IBKR Authentication Button Component
export function IBKRAuthButton({ className }: { className?: string }) {
  const [authStatus, setAuthStatus] = useState<IBKRAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [reauthenticating, setReauthenticating] = useState(false)
  const { refresh: refreshPortfolio } = usePortfolio()

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trading/ibkr-auth?t=${Date.now()}`)
      const data = await response.json()
      setAuthStatus(data)
    } catch {
      setAuthStatus({
        configured: false,
        authenticated: false,
        message: 'Failed to check auth status',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuthStatus()
    // Poll every 30 seconds to check auth status
    const interval = setInterval(checkAuthStatus, 30000)
    return () => clearInterval(interval)
  }, [checkAuthStatus])

  const handleReauthenticate = async () => {
    try {
      setReauthenticating(true)
      await fetch('/api/trading/ibkr-auth', { method: 'POST' })
      // Wait a bit then recheck status and refresh portfolio
      setTimeout(() => {
        checkAuthStatus()
        refreshPortfolio()
      }, 2000)
    } catch (error) {
      console.error('Reauthentication failed:', error)
    } finally {
      setReauthenticating(false)
    }
  }

  const openGatewayLogin = () => {
    if (authStatus?.loginUrl) {
      window.open(authStatus.loginUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-4 rounded-lg border bg-muted/50',
        className
      )}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Checking IBKR connection...</span>
      </div>
    )
  }

  if (!authStatus?.configured) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700',
        className
      )}>
        <Building2 className="w-6 h-6 text-gray-500" />
        <div className="flex-1">
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            IBKR Not Configured
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Set IBKR_GATEWAY_URL in environment variables
          </p>
        </div>
      </div>
    )
  }

  const isAuthenticated = authStatus.authenticated
  const gatewayRunning = authStatus.gatewayRunning

  return (
    <div className={cn(
      'flex flex-col gap-3 p-4 rounded-lg border',
      isAuthenticated
        ? 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700'
        : 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700',
      className
    )}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className={cn(
            'w-6 h-6',
            isAuthenticated ? 'text-green-600' : 'text-orange-600'
          )} />
          <div>
            <p className={cn(
              'font-semibold',
              isAuthenticated
                ? 'text-green-800 dark:text-green-200'
                : 'text-orange-800 dark:text-orange-200'
            )}>
              Interactive Brokers
            </p>
            <div className="flex items-center gap-2 text-xs">
              {gatewayRunning ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Gateway Running
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="w-3 h-3" />
                  Gateway Offline
                </span>
              )}
              <span className="text-muted-foreground">•</span>
              {isAuthenticated ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Authenticated
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-600">
                  <XCircle className="w-3 h-3" />
                  Not Authenticated
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={cn(
          'px-2 py-1 rounded-full text-xs font-bold',
          isAuthenticated
            ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'
            : 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
        )}>
          {isAuthenticated ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!isAuthenticated && (
          <button
            onClick={openGatewayLogin}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-blue-600 text-white hover:bg-blue-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
          >
            <LogIn className="w-4 h-4" />
            Login to IBKR Gateway
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {isAuthenticated && (
          <button
            onClick={handleReauthenticate}
            disabled={reauthenticating || !gatewayRunning}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
              'border border-gray-300 dark:border-gray-600',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
            )}
          >
            {reauthenticating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {reauthenticating ? 'Refreshing...' : 'Refresh Session'}
          </button>
        )}
      </div>

      {/* Tip text */}
      {isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          Use the Portfolio Overview &quot;Refresh&quot; button to update data. Use &quot;Refresh Session&quot; only if connection issues occur.
        </p>
      )}

      {/* Help Text */}
      {!gatewayRunning && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 dark:text-red-300">
            <p className="font-semibold">Client Portal Gateway Not Running</p>
            <p>Start the IBKR Client Portal Gateway on your machine:</p>
            <code className="block mt-1 p-1 bg-red-200 dark:bg-red-800 rounded text-xs">
              cd ~/clientportal.gw && bin/run.sh root/conf.yaml
            </code>
          </div>
        </div>
      )}

      {gatewayRunning && !isAuthenticated && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700">
          <LogIn className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold">Authentication Required</p>
            <p>Click &quot;Login to IBKR Gateway&quot; to open the Client Portal login page in a new tab.</p>
            <p className="mt-1">After logging in, click &quot;Check Status&quot; to verify connection.</p>
          </div>
        </div>
      )}
    </div>
  )
}
