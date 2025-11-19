'use client'

import { useState, useEffect } from 'react'
import { DomainType, ResearchDepth, Answers, Question } from '@/lib/intake/types'
import { classifyQuery, getDomainDisplayName, getDomainIcon } from '@/lib/intake/domain-classifier'
import { QuestionSequencer } from '@/lib/intake/question-sequencer'
import { QuestionCard } from './QuestionCard'
import { ProgressIndicator } from './ProgressIndicator'
import { DepthSelector } from './DepthSelector'
import {
  extractContext,
  isQuestionAnsweredByContext,
  getPrefilledAnswers,
  type ExtractedContext,
} from '@/lib/intake/context-extractor'

interface IntakeAgentProps {
  userQuery: string
  onComplete: (answers: Answers, domain: DomainType, depth: ResearchDepth) => void
  onCancel?: () => void
}

type IntakeStep = 'classify' | 'depth' | 'extracting' | 'questions' | 'review'

export function IntakeAgent({ userQuery, onComplete, onCancel }: IntakeAgentProps) {
  const [step, setStep] = useState<IntakeStep>('classify')
  const [domain, setDomain] = useState<DomainType>('generic')
  const [depth, setDepth] = useState<ResearchDepth>(ResearchDepth.BALANCED)
  const [answers, setAnswers] = useState<Answers>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [sequencer, setSequencer] = useState<QuestionSequencer | null>(null)
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([])
  const [showValidation, setShowValidation] = useState(false)
  const [extractedContext, setExtractedContext] = useState<ExtractedContext | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

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

  // Step 2: Extract context from user query (Phase 2)
  useEffect(() => {
    if (userQuery && userQuery.length > 50 && step === 'depth' && !extractedContext) {
      // Only extract if message is detailed enough (>50 chars)
      setIsExtracting(true)

      extractContext(userQuery)
        .then((context) => {
          setExtractedContext(context)
          console.log('✅ Context extracted:', context)

          // Pre-fill answers from extracted context
          const prefilledAnswers = getPrefilledAnswers(context)
          if (Object.keys(prefilledAnswers).length > 0) {
            setAnswers(prefilledAnswers)
            console.log(`📝 Pre-filled ${Object.keys(prefilledAnswers).length} answers from context`)
          }
        })
        .catch((error) => {
          console.error('Context extraction failed:', error)
        })
        .finally(() => {
          setIsExtracting(false)
        })
    }
  }, [userQuery, step, extractedContext])

  // Step 3: Initialize sequencer when domain/depth changes
  useEffect(() => {
    if (domain !== 'generic') {
      const newSequencer = new QuestionSequencer(domain, depth)
      setSequencer(newSequencer)

      // Get all questions
      let questions = newSequencer.getOrderedQuestions()

      // Phase 2: Filter out questions already answered by context
      if (extractedContext) {
        const originalCount = questions.length
        questions = questions.filter(
          (q) => !isQuestionAnsweredByContext(q.id, extractedContext)
        )
        const skippedCount = originalCount - questions.length
        if (skippedCount > 0) {
          console.log(
            `⚡ Skipped ${skippedCount} questions already answered in your message (${originalCount} → ${questions.length})`
          )
        }
      }

      setOrderedQuestions(questions)
    }
  }, [domain, depth, extractedContext])

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
            {(['apartment', 'hotel', 'budget', 'product'] as DomainType[]).map((d) => (
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
          {/* Context Extraction Status (Phase 2) */}
          {isExtracting && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Analyzing your message...
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Extracting context to skip questions you've already answered
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Context Extraction Complete (Phase 2) */}
          {extractedContext && Object.keys(answers).length > 0 && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-green-500 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ⚡ Smart context extraction complete!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Pre-filled {Object.keys(answers).length} answers from your message. You'll
                    only be asked about what we couldn't extract.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              disabled={isExtracting}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isExtracting ? 'Analyzing...' : 'Start Questions →'}
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
