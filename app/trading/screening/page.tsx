'use client'

import { Suspense } from 'react'
import { Header } from '@/components/ui/header'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { ScreeningAuth } from '@/components/trading/screening/screening-auth'
import PreMarketScreening from '@/components/trading/PreMarketScreening'

export default function ScreeningPage() {
  return (
    <ErrorBoundary>
      <Header />
      <Suspense fallback={<PageSkeleton />}>
        <ScreeningAuth>
          <div className="container mx-auto px-4 py-8">
            <PreMarketScreening />
          </div>
        </ScreeningAuth>
      </Suspense>
    </ErrorBoundary>
  )
}
