'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  TestTube,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type BrokerId = 'alpaca' | 'ibkr'

interface BrokerOption {
  id: BrokerId
  name: string
  environment: 'paper' | 'live'
  icon: React.ReactNode
  description: string
  requiresGateway?: boolean
  gatewayUrl?: string
}

// Check if running in production (Vercel) or local development
const isProduction = process.env.NODE_ENV === 'production' ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))

const DEFAULT_GATEWAY_URL = 'https://localhost:5050'

const BROKER_OPTIONS: BrokerOption[] = [
  {
    id: 'alpaca',
    name: 'Alpaca Markets',
    environment: 'paper',
    icon: <TestTube className="w-4 h-4 text-green-600" />,
    description: 'Paper trading with simulated $100k account',
  },
  // IBKR only available in local development (requires local Gateway)
  ...(!isProduction ? [{
    id: 'ibkr' as BrokerId,
    name: 'Interactive Brokers',
    environment: 'live' as const,
    icon: <Building2 className="w-4 h-4 text-orange-600" />,
    description: 'Live trading with real IBKR account (local only)',
    requiresGateway: true,
    gatewayUrl: DEFAULT_GATEWAY_URL,
  }] : []),
]

interface BrokerAuthButtonProps {
  className?: string
  onBrokerChange?: (brokerId: BrokerId) => void
}

export function BrokerAuthButton({ className, onBrokerChange }: BrokerAuthButtonProps) {
  const [activeBroker, setActiveBroker] = useState<BrokerId>('alpaca')
  const [brokerStatus, setBrokerStatus] = useState<{
    connected: boolean
    authenticated: boolean
    loading: boolean
    error?: string
  }>({
    connected: false,
    authenticated: false,
    loading: true,
  })
  const [checkingIBKR, setCheckingIBKR] = useState(false)
  // Gateway URL from localStorage or default
  const [gatewayUrl, setGatewayUrl] = useState<string>(DEFAULT_GATEWAY_URL)

  // Load saved Gateway URL from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('ibkr_gateway_url')
    if (savedUrl) setGatewayUrl(savedUrl)
  }, [])

  // Check current broker status on mount and when activeBroker changes
  const checkBrokerStatus = useCallback(async () => {
    setBrokerStatus(prev => ({ ...prev, loading: true, error: undefined }))

    try {
      const response = await fetch('/api/trading/portfolio')

      if (response.ok) {
        const data = await response.json()
        const currentBroker = data.broker?.id || 'alpaca'
        setActiveBroker(currentBroker)
        setBrokerStatus({
          connected: true,
          authenticated: true,
          loading: false,
        })
        // Notify parent of broker change
        onBrokerChange?.(currentBroker)
      } else {
        setBrokerStatus({
          connected: false,
          authenticated: false,
          loading: false,
          error: 'Failed to connect to broker',
        })
      }
    } catch (error) {
      setBrokerStatus({
        connected: false,
        authenticated: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      })
    }
  }, [onBrokerChange])

  useEffect(() => {
    checkBrokerStatus()
  }, [checkBrokerStatus])

  // Actually perform the broker switch via API
  const performBrokerSwitch = async (brokerId: BrokerId): Promise<boolean> => {
    try {
      const response = await fetch('/api/trading/broker/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId }),
      })

      if (response.ok) {
        setActiveBroker(brokerId)
        onBrokerChange?.(brokerId)
        await checkBrokerStatus()
        return true
      } else {
        const data = await response.json()
        setBrokerStatus(prev => ({
          ...prev,
          error: data.error || 'Failed to switch broker',
        }))
        return false
      }
    } catch (error) {
      console.error('Failed to switch broker:', error)
      setBrokerStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to switch broker',
      }))
      return false
    }
  }

  // Check IBKR Gateway and switch if authenticated
  const checkAndSwitchToIBKR = async () => {
    setCheckingIBKR(true)
    setBrokerStatus(prev => ({ ...prev, error: undefined }))

    try {
      // Save Gateway URL to localStorage
      localStorage.setItem('ibkr_gateway_url', gatewayUrl)

      // Call our API to check IBKR status
      const params = new URLSearchParams({ gatewayUrl })
      const response = await fetch(`/api/trading/broker/ibkr-status?${params}`)

      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          // IBKR is authenticated, switch to it
          const switched = await performBrokerSwitch('ibkr')
          if (switched) {
            setBrokerStatus({
              connected: true,
              authenticated: true,
              loading: false,
            })
          }
        } else {
          // Not authenticated - open Gateway for login
          setBrokerStatus(prev => ({
            ...prev,
            error: 'IBKR Gateway not authenticated. Opening login page...',
          }))
          window.open(gatewayUrl, '_blank')
        }
      } else {
        // Gateway not reachable - open it anyway
        setBrokerStatus(prev => ({
          ...prev,
          error: 'IBKR Gateway not reachable. Opening Gateway URL...',
        }))
        window.open(gatewayUrl, '_blank')
      }
    } catch {
      // On any error, try opening the Gateway
      setBrokerStatus(prev => ({
        ...prev,
        error: 'Could not connect to IBKR Gateway. Opening Gateway URL...',
      }))
      window.open(gatewayUrl, '_blank')
    } finally {
      setCheckingIBKR(false)
    }
  }

  const handleBrokerSelect = async (brokerId: BrokerId) => {
    if (brokerId === 'ibkr') {
      // For IBKR: Check auth status first, open Gateway if needed
      await checkAndSwitchToIBKR()
    } else {
      // For Alpaca: Just switch directly
      await performBrokerSwitch(brokerId)
    }
  }

  const currentBroker = BROKER_OPTIONS.find(b => b.id === activeBroker) || BROKER_OPTIONS[0]
  const isLive = currentBroker.environment === 'live'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'gap-2',
            isLive
              ? 'border-orange-300 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:border-orange-700'
              : 'border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:border-green-700',
            className
          )}
        >
          {brokerStatus.loading || checkingIBKR ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : brokerStatus.connected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          {currentBroker.icon}
          <span className="font-medium">{currentBroker.name}</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded font-bold uppercase',
            isLive
              ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
              : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100'
          )}>
            {currentBroker.environment}
          </span>
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Select Broker</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {BROKER_OPTIONS.map((broker) => (
          <DropdownMenuItem
            key={broker.id}
            onClick={() => handleBrokerSelect(broker.id)}
            className={cn(
              'flex items-start gap-3 p-3 cursor-pointer',
              activeBroker === broker.id && 'bg-accent'
            )}
          >
            <div className="mt-0.5">{broker.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{broker.name}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded font-bold uppercase',
                  broker.environment === 'live'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                )}>
                  {broker.environment}
                </span>
                {activeBroker === broker.id && (
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {broker.description}
              </p>
              {broker.requiresGateway && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Requires Client Portal Gateway
                </p>
              )}
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* If IBKR is active, show option to open Gateway */}
        {activeBroker === 'ibkr' && (
          <>
            <DropdownMenuItem
              onClick={() => window.open(gatewayUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open IBKR Gateway
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={checkBrokerStatus} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Connection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
