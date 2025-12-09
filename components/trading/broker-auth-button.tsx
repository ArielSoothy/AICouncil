'use client'

import { useState, useEffect } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2,
  TestTube,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
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

const BROKER_OPTIONS: BrokerOption[] = [
  {
    id: 'alpaca',
    name: 'Alpaca Markets',
    environment: 'paper',
    icon: <TestTube className="w-4 h-4 text-green-600" />,
    description: 'Paper trading with simulated $100k account',
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    environment: 'live',
    icon: <Building2 className="w-4 h-4 text-orange-600" />,
    description: 'Live trading with real IBKR account',
    requiresGateway: true,
    gatewayUrl: 'https://localhost:5050',
  },
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
  const [showIBKRDialog, setShowIBKRDialog] = useState(false)
  const [checkingIBKR, setCheckingIBKR] = useState(false)

  // Check current broker status on mount
  useEffect(() => {
    checkBrokerStatus()
  }, [activeBroker])

  const checkBrokerStatus = async () => {
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
  }

  const checkIBKRGateway = async () => {
    setCheckingIBKR(true)

    try {
      // Call our API to check IBKR status
      const response = await fetch('/api/trading/broker/ibkr-status')

      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          // IBKR is authenticated, we can switch
          await switchToBroker('ibkr')
          setShowIBKRDialog(false)
        } else {
          // Not authenticated - keep dialog open
          setBrokerStatus(prev => ({
            ...prev,
            error: 'IBKR Gateway not authenticated. Please login via the Gateway web interface.',
          }))
        }
      } else {
        setBrokerStatus(prev => ({
          ...prev,
          error: 'IBKR Gateway not reachable. Ensure it is running.',
        }))
      }
    } catch {
      setBrokerStatus(prev => ({
        ...prev,
        error: 'Could not connect to IBKR Gateway',
      }))
    } finally {
      setCheckingIBKR(false)
    }
  }

  const switchToBroker = async (brokerId: BrokerId) => {
    if (brokerId === 'ibkr') {
      // Show IBKR auth dialog
      setShowIBKRDialog(true)
      return
    }

    // For Alpaca, just switch directly
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
      }
    } catch (error) {
      console.error('Failed to switch broker:', error)
    }
  }

  const currentBroker = BROKER_OPTIONS.find(b => b.id === activeBroker) || BROKER_OPTIONS[0]
  const isLive = currentBroker.environment === 'live'

  return (
    <>
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
            {brokerStatus.loading ? (
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
              onClick={() => switchToBroker(broker.id)}
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

          <DropdownMenuItem onClick={checkBrokerStatus} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Connection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* IBKR Authentication Dialog */}
      <Dialog open={showIBKRDialog} onOpenChange={setShowIBKRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              Connect to Interactive Brokers
            </DialogTitle>
            <DialogDescription>
              IBKR requires authentication through the Client Portal Gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status indicator */}
            <div className={cn(
              'p-3 rounded-lg border flex items-start gap-3',
              brokerStatus.error
                ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
            )}>
              {brokerStatus.error ? (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                {brokerStatus.error || 'To use IBKR, you need to authenticate through the Gateway web interface first.'}
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Setup Steps:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <span>Ensure Client Portal Gateway is running on your machine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <span>Open the Gateway login page and authenticate with your IBKR credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <span>Click "Check Connection" below to verify authentication</span>
                </li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('https://localhost:5050', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Gateway Login
            </Button>
            <Button
              onClick={checkIBKRGateway}
              disabled={checkingIBKR}
              className="gap-2"
            >
              {checkingIBKR ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Check Connection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
