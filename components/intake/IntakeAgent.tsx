'use client'

import { useState, useEffect } from 'react'
import { DomainType, ResearchDepth, Answers, Question } from '@/lib/intake/types'
import { classifyQuery, getDomainDisplayName, getDomainIcon } from '@/lib/intake/domain-classifier'
import { QuestionSequencer } from '@/lib/intake/question-sequencer'
import { QuestionCard } from './QuestionCard'
import { ProgressIndicator } from './ProgressIndicator'
import { DepthSelector } from './DepthSelector'

interface IntakeAgentProps {
  userQuery: string
  onComplete: (answers: Answers, domain: DomainType, depth: ResearchDepth) => void
  onCancel?: () => void
}

type IntakeStep = 'classify' | 'depth' | 'questions' | 'review'

export function IntakeAgent({ userQuery, onComplete, onCancel }: IntakeAgentProps) {
  const [step, setStep] = useState<IntakeStep>('classify')
  const [domain, setDomain] = useState<DomainType>('generic')
  const [depth, setDepth] = useState<ResearchDepth>(ResearchDepth.BALANCED)
  const [answers, setAnswers] = useState<Answers>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [sequencer, setSequencer] = useState<QuestionSequencer | null>(null)
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([])
  const [showValidation, setShowValidation] = useState(false)

  // Step 1: Classify domain on mount
  useEffect(() => {
    if (userQuery) {
      const classification = classifyQuery(userQuery)
      setDomain(classification.domain)

      // If generic or low confidence, let user choose
      if (classification.domain === 'generic' || classification.confidence < 0.7) {
        // Stay on classify step for manual selection
      } else {
        // Auto-proceed to depth selection
        setTimeout(() => setStep('depth'), 500)
      }
    }
  }, [userQuery])

  // Step 2: Initialize sequencer when domain/depth changes
  useEffect(() => {
    if (domain !== 'generic') {
      const newSequencer = new QuestionSequencer(domain, depth)
      setSequencer(newSequencer)
      setOrderedQuestions(newSequencer.getOrderedQuestions())
    }
  }, [domain, depth])

  const handleDomainSelect = (selectedDomain: DomainType) => {
    setDomain(selectedDomain)
    setStep('depth')
  }

  const handleDepthSelect = (selectedDepth: ResearchDepth) => {
    setDepth(selectedDepth)
    setStep('questions')
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    setShowValidation(true)

    // Validate current question
    const currentQuestion = orderedQuestions[currentQuestionIndex]
    if (currentQuestion && sequencer) {
      const validation = sequencer.validateAnswer(currentQuestion.id, answers[currentQuestion.id])
      if (!validation.valid) {
        return // Stay on current question if invalid
      }
    }

    // Move to next question or review
    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setShowValidation(false)
    } else {
      setStep('review')
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
      setShowValidation(false)
    } else {
      setStep('depth')
    }
  }

  const handleSubmit = () => {
    onComplete(answers, domain, depth)
  }

  const currentQuestion = orderedQuestions[currentQuestionIndex]
  const progress = sequencer?.getProgress(answers) || 0
  const questionGroups = sequencer?.getQuestionCountByWeight()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Let&apos;s understand your decision
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Answer a few questions to get the best recommendation
        </p>
      </div>

      {/* Step 1: Domain Classification */}
      {step === 'classify' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            What type of decision are you making?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['apartment', 'trip', 'budget', 'product'] as DomainType[]).map((d) => (
              <button
                key={d}
                onClick={() => handleDomainSelect(d)}
                className={`p-6 rounded-lg border-2 transition-all text-left hover:border-blue-400 ${
                  d === domain
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="text-3xl mb-2">{getDomainIcon(d)}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {getDomainDisplayName(d)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Depth Selection */}
      {step === 'depth' && (
        <div>
          <DepthSelector
            domain={domain}
            selectedDepth={depth}
            onSelect={handleDepthSelect}
          />
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep('classify')}
              className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Change Domain
            </button>
            <button
              onClick={() => setStep('questions')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Start Questions →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Questions */}
      {step === 'questions' && currentQuestion && sequencer && (
        <div>
          {/* Progress */}
          <ProgressIndicator
            currentStep={currentQuestionIndex + 1}
            totalSteps={orderedQuestions.length}
            questionGroups={
              questionGroups
                ? {
                    critical: questionGroups[10] || 0,
                    important: questionGroups[7] || 0,
                    moderate: questionGroups[5] || 0,
                    optional: (questionGroups[3] || 0) + (questionGroups[1] || 0)
                  }
                : undefined
            }
            estimatedTime={Math.ceil(
              ((orderedQuestions.length - currentQuestionIndex) * 0.5)
            )}
          />

          {/* Question */}
          <div className="mt-6">
            <QuestionCard
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              showValidation={showValidation}
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Back
            </button>
            <div className="flex gap-4">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                {currentQuestionIndex === orderedQuestions.length - 1
                  ? 'Review Answers →'
                  : 'Next Question →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 'review' && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Review Your Answers
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {orderedQuestions.map((q) => {
                const answer = answers[q.id]
                if (answer === undefined) return null

                return (
                  <div
                    key={q.id}
                    className="border-b border-gray-200 dark:border-gray-700 pb-4"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {q.text}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {Array.isArray(answer) ? answer.join(', ') : String(answer)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => {
                setStep('questions')
                setCurrentQuestionIndex(orderedQuestions.length - 1)
              }}
              className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              ← Edit Answers
            </button>
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium text-lg"
            >
              Get Recommendation →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
