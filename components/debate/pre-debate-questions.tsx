'use client'

/**
 * PreDebateQuestions - Show clarifying questions before debate starts
 *
 * Features:
 * - AI-generated clarifying questions based on query
 * - Optional answers (can skip)
 * - Loading state while generating questions
 * - Similar UI to follow-up questions
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  HelpCircle,
  ArrowRight,
  Loader2,
  SkipForward,
  Lightbulb,
  X
} from 'lucide-react'

interface Question {
  question: string
  hint?: string
}

interface PreDebateQuestionsProps {
  query: string
  onSubmit: (answers: Record<number, string>) => void
  onSkip: () => void
  onCancel: () => void
}

export function PreDebateQuestions({
  query,
  onSubmit,
  onSkip,
  onCancel
}: PreDebateQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate questions when component mounts
  useEffect(() => {
    const generateQuestions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/agents/pre-debate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        })

        const data = await response.json()

        if (data.success && data.questions?.length > 0) {
          setQuestions(data.questions)
        } else {
          // If no questions generated, skip directly
          onSkip()
        }
      } catch (err) {
        console.error('Failed to generate questions:', err)
        setError('Failed to generate questions. Starting debate...')
        // Auto-skip on error after a brief delay
        setTimeout(onSkip, 1500)
      } finally {
        setIsLoading(false)
      }
    }

    generateQuestions()
  }, [query, onSkip])

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [index]: value
    }))
  }

  const handleSubmit = () => {
    // Filter out empty answers
    const filledAnswers = Object.fromEntries(
      Object.entries(answers).filter(([, value]) => value.trim().length > 0)
    )
    onSubmit(filledAnswers as Record<number, string>)
  }

  const hasAnyAnswer = Object.values(answers).some(a => a.trim().length > 0)

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-sm text-muted-foreground">
            Analyzing your query to generate clarifying questions...
          </span>
        </div>
      </Card>
    )
  }

  // Error state (brief display before auto-skip)
  if (error) {
    return (
      <Card className="p-6 border-orange-500/30 bg-orange-500/5">
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-orange-500">{error}</span>
        </div>
      </Card>
    )
  }

  // No questions (shouldn't happen as we auto-skip)
  if (questions.length === 0) {
    return null
  }

  return (
    <Card className="p-6 border-blue-500/30 bg-blue-500/5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Help us understand your needs better</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Answer these optional questions to help the AI agents provide more relevant insights.
          You can skip if you prefer.
        </p>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={idx} className="space-y-2">
              <Label className="text-sm font-medium flex items-start gap-2">
                <HelpCircle className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                <span>{q.question}</span>
              </Label>
              {q.hint && (
                <p className="text-xs text-muted-foreground ml-6">
                  {q.hint}
                </p>
              )}
              <Textarea
                placeholder="Your answer (optional)..."
                value={answers[idx] || ''}
                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                className="min-h-[60px] text-sm ml-0"
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="gap-1 text-muted-foreground"
          >
            <SkipForward className="w-4 h-4" />
            Skip & Start Debate
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!hasAnyAnswer}
            className="gap-1"
          >
            <ArrowRight className="w-4 h-4" />
            Start Debate with Context
          </Button>
        </div>
      </div>
    </Card>
  )
}
