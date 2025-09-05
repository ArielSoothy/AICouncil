'use client'

// Main container that orchestrates the debate feature
// Uses error boundaries and proper separation of concerns

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Settings, MessageSquare, RotateCcw, AlertTriangle } from 'lucide-react'
import { DebateSetup } from './DebateSetup'
import { DebateDisplay } from './DebateDisplay'
import { useDebate } from '../hooks/useDebate'
import { DebateConfig } from '../types'

interface DebateContainerProps {
  userTier?: 'guest' | 'free' | 'pro' | 'enterprise'
}

export function DebateContainer({ userTier = 'free' }: DebateContainerProps) {
  const [activeTab, setActiveTab] = useState<'setup' | 'debate'>('setup')
  const [lastConfig, setLastConfig] = useState<DebateConfig | null>(null)
  
  const {
    status,
    session,
    error,
    streamEvents,
    startDebate,
    resetDebate,
    retryDebate,
    isLoading
  } = useDebate()

  const handleSubmit = async (config: DebateConfig) => {
    setLastConfig(config)
    setActiveTab('debate')
    
    try {
      await startDebate(config)
    } catch (err) {
      // Error is already handled in the hook
      console.error('Debate failed:', err)
    }
  }

  const handleRetry = () => {
    if (lastConfig) {
      retryDebate(lastConfig)
    }
  }

  const handleReset = () => {
    resetDebate()
    setActiveTab('setup')
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'setup' | 'debate')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="debate" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Debate
            {session && !isLoading && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/20 rounded">
                Complete
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6">
          <DebateSetup
            onSubmit={handleSubmit}
            isLoading={isLoading}
            userTier={userTier}
          />
        </TabsContent>

        <TabsContent value="debate" className="mt-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={!lastConfig}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DebateDisplay
            session={session}
            streamEvents={streamEvents}
            isLoading={isLoading}
          />

          {session && !isLoading && (
            <div className="mt-6 flex justify-center">
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                Start New Debate
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Error Boundary Component
export class DebateErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Debate feature error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Something went wrong with the debate feature.</p>
            <p className="text-sm mt-2">{this.state.error?.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}