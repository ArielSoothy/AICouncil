'use client'

import { useState, Suspense } from 'react'
import { Header } from '@/components/ui/header'
import { AgentDebateInterface } from '@/components/agents/debate-interface'
import { useAuth } from '@/contexts/auth-context'
import { useSearchParams } from 'next/navigation'
import { Brain, Users, MessageSquare } from 'lucide-react'

function AgentsPageContent() {
  const { user, userTier } = useAuth()
  const searchParams = useSearchParams()
  const isGuestMode = searchParams.get('mode') === 'guest'
  
  const effectiveUserTier = isGuestMode ? 'guest' : userTier

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <Users className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">
                AI Agent Debate
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground mb-2">
              Multi-Agent Discussion & Analysis System
            </p>
            
            <p className="text-muted-foreground max-w-3xl mx-auto mb-4">
              Watch AI agents with different perspectives debate your query. 
              Based on research showing that agent discussion reduces errors by up to 40% 
              through cross-validation and iterative refinement.
            </p>
            
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Brain className="w-4 h-4" />
                <span>3 Specialized Agents</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>2 Debate Rounds</span>
              </div>
            </div>
            
            {effectiveUserTier === 'guest' && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg inline-block">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Guest Mode: Using free models only. 
                  <a href="/auth?mode=signup" className="underline ml-1">
                    Sign up for access to premium models
                  </a>
                </p>
              </div>
            )}
          </div>
          
          <AgentDebateInterface userTier={effectiveUserTier} />
        </div>
      </main>
    </div>
  )
}

export default function AgentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AgentsPageContent />
    </Suspense>
  )
}