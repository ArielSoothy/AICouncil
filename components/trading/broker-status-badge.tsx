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
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Check if running in production
const isProduction =
  typeof window !== 'undefined' && !window.location.hostname.includes('localhost')

// =============================================================================
// BrokerStatusBadge - Shows current broker status
// =============================================================================

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
  size = 'md',
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
        portfolioValue: data.account?.portfolio_value,
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
    lg: 'px-4 py-3 text-base gap-3',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  if (loading) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-lg border bg-muted/50 animate-pulse',
          sizeClasses[size],
          className
        )}
      >
        <RefreshCw className={cn(iconSizes[size], 'animate-spin text-muted-foreground')} />
        <span className="text-muted-foreground">Connecting to broker...</span>
      </div>
    )
  }

  if (error || !brokerInfo) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800',
          sizeClasses[size],
          className
        )}
      >
        <WifiOff className={cn(iconSizes[size], 'text-red-600')} />
        <span className="text-red-700 dark:text-red-300 font-medium">Broker Disconnected</span>
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
    <div
      className={cn(
        'inline-flex items-center rounded-lg border',
        isLive
          ? 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700'
          : 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700',
        sizeClasses[size],
        className
      )}
    >
      {isIBKR ? (
        <Building2
          className={cn(iconSizes[size], isLive ? 'text-orange-600' : 'text-green-600')}
        />
      ) : (
        <TestTube className={cn(iconSizes[size], 'text-green-600')} />
      )}

      <span
        className={cn(
          'font-semibold',
          isLive ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'
        )}
      >
        {brokerInfo.name}
      </span>

      <span
        className={cn(
          'px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide',
          isLive
            ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
            : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'
        )}
      >
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

      <Wifi className={cn(iconSizes[size], 'text-green-500')} />

      {showBalance && brokerInfo.portfolioValue !== undefined && (
        <span
          className={cn(
            'font-mono font-medium border-l pl-2 ml-1',
            isLive
              ? 'text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
              : 'text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
          )}
        >
          <DollarSign className={cn(iconSizes[size], 'inline -mt-0.5')} />
          {brokerInfo.portfolioValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      )}
    </div>
  )
}

export function BrokerStatusCompact({ className }: { className?: string }) {
  return <BrokerStatusBadge className={className} showBalance={false} size="sm" />
}

// =============================================================================
// IBKRAuthButton - Simple IBKR authentication (local development only)
// Original simple pattern restored - just check status and show login button
// =============================================================================

interface IBKRAuthStatus {
  configured: boolean
  authenticated: boolean
  gatewayRunning: boolean
  connected?: boolean
  competing?: boolean
  message: string
  loginUrl: string
}

interface IBKRAuthButtonProps {
  className?: string
  onAuthChange?: (authenticated: boolean) => void
}

/**
 * Simple IBKR authentication button for local development.
 * - Polls /api/trading/ibkr-auth every 10 minutes
 * - Shows Gateway status + login button
 * - Hidden on production
 */
export function IBKRAuthButton({ className, onAuthChange }: IBKRAuthButtonProps) {
  const [status, setStatus] = useState<IBKRAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [prevAuth, setPrevAuth] = useState<boolean | null>(null)

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/trading/ibkr-auth?t=${Date.now()}`)
      const data: IBKRAuthStatus = await response.json()
      setStatus(data)

      // Notify parent if auth state changed
      if (prevAuth !== null && data.authenticated !== prevAuth) {
        onAuthChange?.(data.authenticated)
      }
      setPrevAuth(data.authenticated)
    } catch {
      setStatus({
        configured: false,
        authenticated: false,
        gatewayRunning: false,
        message: 'Failed to check IBKR status',
        loginUrl: 'https://localhost:5050',
      })
    } finally {
      setLoading(false)
    }
  }, [prevAuth, onAuthChange])

  // Poll on mount and every 10 minutes
  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 600000) // 10 minutes = 600000ms
    return () => clearInterval(interval)
  }, [checkStatus])

  // Open Gateway login page
  const openLogin = () => {
    if (status?.loginUrl) {
      window.open(status.loginUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // Hide on production
  if (isProduction) {
    return null
  }

  // Loading state
  if (loading && !status) {
    return (
      <div className={cn('flex items-center gap-2 p-4 rounded-lg border bg-muted/50', className)}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Checking IBKR Gateway...</span>
      </div>
    )
  }

  // Not configured
  if (!status?.configured) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-lg border border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700',
          className
        )}
      >
        <Building2 className="w-6 h-6 text-gray-500" />
        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">IBKR Not Configured</p>
          <p className="text-xs text-gray-500">Set IBKR_GATEWAY_URL in .env.local</p>
        </div>
      </div>
    )
  }

  const isAuth = status.authenticated
  const gatewayUp = status.gatewayRunning

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 rounded-lg border',
        isAuth
          ? 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700'
          : 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className={cn('w-6 h-6', isAuth ? 'text-green-600' : 'text-orange-600')} />
          <div>
            <p
              className={cn(
                'font-semibold',
                isAuth
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-orange-800 dark:text-orange-200'
              )}
            >
              Interactive Brokers
            </p>
            <div className="flex items-center gap-2 text-xs">
              {gatewayUp ? (
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
              {isAuth ? (
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

        {/* Badge */}
        <div
          className={cn(
            'px-2 py-1 rounded-full text-xs font-bold',
            isAuth
              ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'
              : 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
          )}
        >
          {isAuth ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        {!isAuth && (
          <button
            onClick={openLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Login to Gateway
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Check Status
        </button>
      </div>

      {/* Help text */}
      {!gatewayUp && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 dark:text-red-300">
            <p className="font-semibold">Gateway Not Running</p>
            <code className="block mt-1 p-1 bg-red-200 dark:bg-red-800 rounded">
              cd ~/clientportal.gw && bin/run.sh root/conf.yaml
            </code>
          </div>
        </div>
      )}

      {gatewayUp && !isAuth && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700">
          <LogIn className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold">Authentication Required</p>
            <p>1. Click &quot;Login to Gateway&quot;</p>
            <p>2. Complete login + phone 2FA</p>
            <p>3. Click &quot;Check Status&quot; to verify</p>
          </div>
        </div>
      )}

      {isAuth && (
        <p className="text-xs text-green-700 dark:text-green-300">
          ✅ Connected to IBKR. Portfolio data loads from your real account.
        </p>
      )}
    </div>
  )
}
