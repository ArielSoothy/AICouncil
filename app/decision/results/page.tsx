'use client'

// Decision Results Page
// Shows MAUT/Pareto score + Multi-model AI debate

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/ui/header'
import { DomainType, Answers, ResearchDepth } from '@/lib/intake/types'
import { ApartmentScorecard } from '@/components/domains/apartment'
// import { HotelScorecard } from '@/components/domains/hotel' // TODO: Create component
import { DecisionDebate } from '@/components/domains/DecisionDebate'
import { analyzeApartment } from '@/lib/domains/apartment'
import { analyzeHotel } from '@/lib/domains/hotel'
import { enhanceQueryWithScore } from '@/lib/domains/debate-enhancer'
import type { ApartmentScore } from '@/lib/domains/apartment/types'
import type { HotelScore } from '@/lib/domains/hotel/types'

function ResultsContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scoring state
  const [apartmentScore, setApartmentScore] = useState<ApartmentScore | null>(null)
  const [hotelScore, setHotelScore] = useState<HotelScore | null>(null)

  // Domain and answers from URL params
  const domain = searchParams.get('domain') as DomainType | null
  const answersParam = searchParams.get('answers')
  const queryParam = searchParams.get('query')

  useEffect(() => {
    async function processDecision() {
      if (!domain || !answersParam) {
        setError('Missing required parameters')
        setLoading(false)
        return
      }

      try {
        const answers: Answers = JSON.parse(decodeURIComponent(answersParam))
        const userQuery = queryParam ? decodeURIComponent(queryParam) : `Help me make a ${domain} decision`

        console.log('Processing decision:', { domain, userQuery, answers })

        if (domain === 'apartment') {
          // Calculate apartment score
          const result = await analyzeApartment(userQuery, answers)
          console.log('Apartment analysis:', result)
          setApartmentScore(result.score)
        } else if (domain === 'hotel') {
          // Calculate hotel score
          const result = await analyzeHotel(userQuery, answers)
          console.log('Hotel analysis:', result)
          setHotelScore(result.score)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error processing decision:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    processDecision()
  }, [domain, answersParam, queryParam])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Analyzing your decision...
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Calculating scores and preparing AI debate
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Error Processing Decision
              </h2>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Decision Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Quantitative scoring + Multi-model AI recommendations
            </p>
          </div>

          {/* Apartment Results */}
          {domain === 'apartment' && apartmentScore && (
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  MAUT Framework Analysis
                </h2>
                <ApartmentScorecard score={apartmentScore} showBreakdown={true} />
              </section>

              {/* AI Debate Section */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Multi-Model AI Analysis
                </h2>
                <DecisionDebate
                  query={enhanceQueryWithScore(
                    queryParam ? decodeURIComponent(queryParam) : `Help me make a ${domain} decision`,
                    domain,
                    apartmentScore
                  )}
                />
              </section>
            </div>
          )}

          {/* Hotel Results */}
          {domain === 'hotel' && hotelScore && (
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Weighted Decision Matrix
                </h2>
                {/* TODO: Create HotelScorecard component */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <p className="text-gray-600 dark:text-gray-400">Hotel scorecard coming soon...</p>
                  <pre className="mt-4 text-sm">{JSON.stringify(hotelScore, null, 2)}</pre>
                </div>
              </section>

              {/* AI Debate Section */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Multi-Model AI Analysis
                </h2>
                <DecisionDebate
                  query={enhanceQueryWithScore(
                    queryParam ? decodeURIComponent(queryParam) : `Help me make a ${domain} decision`,
                    domain,
                    hotelScore
                  )}
                />
              </section>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
            >
              ← Back to Questions
            </button>
            <button
              onClick={() => window.location.href = '/decision'}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              New Decision
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
