'use client'

// Decision Help Page
// Main entry point for domain-specific decision frameworks

import { useState } from 'react'
import { Header } from '@/components/ui/header'
import { PROJECT_NAME } from '@/lib/config/branding'
import { DomainType } from '@/lib/intake/types'
import { getDomainDisplayName, getDomainIcon } from '@/lib/intake/domain-classifier'
import { IntakeAgent } from '@/components/intake/IntakeAgent'
import { UniversalIntake } from '@/components/intake/UniversalIntake'
import { ResearchDepth } from '@/lib/intake/types'

export default function DecisionPage() {
  const [selectedDomain, setSelectedDomain] = useState<DomainType | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const [showIntake, setShowIntake] = useState(false)

  const handleDomainSelect = (domain: DomainType, userContext?: string) => {
    setSelectedDomain(domain)
    if (userContext) {
      setUserQuery(userContext)
    }
    setShowIntake(true)
  }

  const handleIntakeComplete = (answers: any, domain: DomainType, depth: ResearchDepth) => {
    console.log('Intake complete:', { answers, domain, depth })

    // Navigate to results page with answers
    const answersJson = encodeURIComponent(JSON.stringify(answers))
    const queryEncoded = encodeURIComponent(userQuery || `Help me make a ${domain} decision`)

    window.location.href = `/decision/results?domain=${domain}&answers=${answersJson}&query=${queryEncoded}`
  }

  const handleBack = () => {
    setShowIntake(false)
    setSelectedDomain(null)
  }

  if (showIntake && selectedDomain) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <IntakeAgent
            userQuery={userQuery || `Help me make a ${selectedDomain} decision`}
            onComplete={handleIntakeComplete}
            onCancel={handleBack}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Decision Framework Assistant
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
              Get research-backed recommendations using proven decision frameworks
            </p>
            <p className="text-gray-500 dark:text-gray-500 max-w-2xl mx-auto">
              Each framework is tailored to specific decision types, combining quantitative scoring
              with multi-model AI analysis for balanced recommendations.
            </p>
          </div>

          {/* Universal Conversational Intake */}
          <UniversalIntake onDomainSelect={handleDomainSelect} />

          {/* How It Works */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Step number={1} title="Answer Questions" description="5-20 questions based on depth" />
              <Step number={2} title="Get Score" description="Quantitative framework analysis" />
              <Step number={3} title="AI Debate" description="Multi-model discussion" />
              <Step number={4} title="Final Recommendation" description="Balanced, actionable advice" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Domain Card Component
 */
interface DomainCardProps {
  domain: DomainType
  title: string
  description: string
  features: string[]
  onClick: () => void
  comingSoon?: boolean
}

function DomainCard({ domain, title, description, features, onClick, comingSoon }: DomainCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={comingSoon}
      className={`text-left p-6 rounded-lg border-2 transition-all ${
        comingSoon
          ? 'border-gray-300 dark:border-gray-700 opacity-50 cursor-not-allowed'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg'
      } bg-white dark:bg-gray-800`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-4xl">{getDomainIcon(domain)}</span>
        {comingSoon && (
          <span className="px-2 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
            Coming Soon
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <ul className="space-y-1">
        {features.map((feature, idx) => (
          <li key={idx} className="text-sm text-gray-500 dark:text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </button>
  )
}

/**
 * Step Component
 */
interface StepProps {
  number: number
  title: string
  description: string
}

function Step({ number, title, description }: StepProps) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-bold mb-2">
        {number}
      </div>
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}
