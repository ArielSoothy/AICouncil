'use client';

import { QueryInterface } from '@/components/consensus/query-interface'
import { Header } from '@/components/ui/header'
import { BRANDING } from '@/lib/config/branding'
import { Suspense } from 'react'
import { MessageSquare, Users, CheckCircle2 } from 'lucide-react'

function HomePageContent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold tracking-tight mb-4 consensus-gradient bg-clip-text text-transparent">
              {BRANDING.PROJECT_NAME}
            </h1>
            <p className="text-2xl font-semibold text-foreground mb-3">
              {BRANDING.TAGLINE_PRIMARY}
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {BRANDING.TAGLINE_SECONDARY}
            </p>

            {/* 3-Step Value Proposition */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
              {BRANDING.VALUE_STEPS.map((step) => (
                <div key={step.step} className="flex flex-col items-center p-6 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                    {step.step === 1 && <MessageSquare className="h-6 w-6" />}
                    {step.step === 2 && <Users className="h-6 w-6" />}
                    {step.step === 3 && <CheckCircle2 className="h-6 w-6" />}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.step}. {step.title}</h3>
                  <p className="text-sm text-muted-foreground text-center">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Query Interface (CTA) */}
          <QueryInterface />
        </div>
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}