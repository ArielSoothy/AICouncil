'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

// Check if running in production (Vercel) or local development
const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')

const DEFAULT_GATEWAY_URL = 'https://localhost:5050'

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

// =============================================================================
// IBKRAuthButton - Simple IBKR authentication button (local development only)
// =============================================================================

interface IBKRAuthStatus {
  connected: boolean
  authenticated: boolean
  competing?: boolean
  message?: string
  error?: string
}

interface IBKRAuthButtonProps {
  className?: string
  onAuthChange?: (authenticated: boolean) => void
}

/**
 * Simple IBKR authentication button for local development.
 * Shows Gateway status and provides login button.
 * Auto-polls to detect authentication changes.
 *
 * Hidden on production (IBKR Gateway only works locally).
 */
export function IBKRAuthButton({ className, onAuthChange }: IBKRAuthButtonProps) {
  const [authStatus, setAuthStatus] = useState<IBKRAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_GATEWAY_URL)
  const [activeBroker, setActiveBroker] = useState<'ibkr' | 'alpaca' | null>(null)
  const [switching, setSwitching] = useState(false)

  // Use ref to track active broker without causing re-renders
  const activeBrokerRef = useRef<'ibkr' | 'alpaca' | null>(null)

  // Load saved Gateway URL from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('ibkr_gateway_url')
      if (savedUrl) setGatewayUrl(savedUrl)
    }
  }, [])

  // Check current active broker on mount (once only)
  useEffect(() => {
    let mounted = true
    fetch('/api/trading/portfolio')
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          const broker = data.broker?.id || 'alpaca'
          setActiveBroker(broker)
          activeBrokerRef.current = broker
        }
      })
      .catch(() => {
        if (mounted) {
          setActiveBroker('alpaca')
          activeBrokerRef.current = 'alpaca'
        }
      })
    return () => { mounted = false }
  }, [])

  // Switch broker helper (doesn't depend on activeBroker state)
  const switchBroker = useCallback(async (brokerId: 'ibkr' | 'alpaca') => {
    setSwitching(true)
    try {
      const response = await fetch('/api/trading/broker/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId }),
      })
      if (response.ok) {
        setActiveBroker(brokerId)
        activeBrokerRef.current = brokerId
        onAuthChange?.(brokerId === 'ibkr')
        return true
      }
    } catch (err) {
      console.error('Failed to switch broker:', err)
    } finally {
      setSwitching(false)
    }
    return false
  }, [onAuthChange])

  // Check auth status - uses ref to avoid dependency loop
  const checkAuthStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams({ gatewayUrl })
      const response = await fetch(`/api/trading/broker/ibkr-status?${params}`)
      const data = await response.json()

      setAuthStatus({
        connected: data.connected || false,
        authenticated: data.authenticated || false,
        competing: data.competing || false,
        message: data.message,
        error: data.error,
      })

      // Auto-switch to IBKR when authenticated (only if we know current broker)
      // Skip auto-switch if activeBroker hasn't been loaded yet (null) to avoid race condition
      if (data.authenticated && activeBrokerRef.current !== null && activeBrokerRef.current !== 'ibkr') {
        await switchBroker('ibkr')
      } else {
        // Just notify parent of current auth state
        onAuthChange?.(data.authenticated || false)
      }
    } catch {
      setAuthStatus({
        connected: false,
        authenticated: false,
        error: 'Failed to check IBKR status',
      })
      onAuthChange?.(false)
    } finally {
      setLoading(false)
    }
  }, [gatewayUrl, onAuthChange, switchBroker])

  // Check status on mount and poll every 15 seconds
  useEffect(() => {
    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 15000)
    return () => clearInterval(interval)
  }, [checkAuthStatus])

  const openGatewayLogin = () => {
    // Save URL to localStorage
    localStorage.setItem('ibkr_gateway_url', gatewayUrl)
    window.open(gatewayUrl, '_blank', 'noopener,noreferrer')
  }

  // Hide on production - IBKR Gateway only works locally
  if (isProduction) {
    return null
  }

  if (loading) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-4 rounded-lg border bg-muted/50',
        className
      )}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Checking IBKR Gateway...</span>
      </div>
    )
  }

  const isAuthenticated = authStatus?.authenticated
  const isConnected = authStatus?.connected

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
              {isConnected ? (
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

      {/* Active Broker Indicator */}
      {activeBroker && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Active:</span>
          <span className={cn(
            'px-2 py-0.5 rounded font-semibold',
            activeBroker === 'ibkr'
              ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
              : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'
          )}>
            {activeBroker === 'ibkr' ? 'IBKR (Live)' : 'Alpaca (Paper)'}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
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

        <button
          onClick={checkAuthStatus}
          disabled={switching}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
            'border border-gray-300 dark:border-gray-600',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
            'disabled:opacity-50'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', switching && 'animate-spin')} />
          {switching ? 'Switching...' : 'Check Status'}
        </button>

        {/* Broker Toggle Button */}
        {isAuthenticated && activeBroker === 'ibkr' && (
          <button
            onClick={() => switchBroker('alpaca')}
            disabled={switching}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
              'bg-green-100 text-green-800 hover:bg-green-200',
              'dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800',
              'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
              'disabled:opacity-50'
            )}
          >
            <TestTube className="w-4 h-4" />
            Use Alpaca Paper
          </button>
        )}

        {activeBroker === 'alpaca' && (
          <button
            onClick={() => isAuthenticated ? switchBroker('ibkr') : openGatewayLogin()}
            disabled={switching}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
              'bg-orange-100 text-orange-800 hover:bg-orange-200',
              'dark:bg-orange-900 dark:text-orange-100 dark:hover:bg-orange-800',
              'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
              'disabled:opacity-50'
            )}
          >
            <Building2 className="w-4 h-4" />
            {isAuthenticated ? 'Use IBKR Live' : 'Connect IBKR'}
          </button>
        )}
      </div>

      {/* Help Text */}
      {!isConnected && (
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

      {isConnected && !isAuthenticated && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700">
          <LogIn className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold">Authentication Required</p>
            <p>Click &quot;Login to IBKR Gateway&quot; to open the login page.</p>
            <p className="mt-1">After logging in, click &quot;Check Status&quot; or wait for auto-refresh.</p>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <p className="text-xs text-muted-foreground">
          ✅ IBKR Gateway connected. Portfolio data will load from your real account.
        </p>
      )}
    </div>
  )
}
