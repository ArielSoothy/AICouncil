'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import PreMarketScreening from '@/components/trading/PreMarketScreening'

export default function ScreeningPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <div className="container mx-auto px-4 py-8">
          <PreMarketScreening />
        </div>
      </Suspense>
    </ErrorBoundary>
  )
}
