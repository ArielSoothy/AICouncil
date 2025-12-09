'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { HelpCircle, Plus, ArrowRight } from 'lucide-react'

interface FollowUpQuestionsCardProps {
  questions: string[]
  onSubmit: (answers: Record<string, string>) => void
  className?: string
}

export function FollowUpQuestionsCard({ questions, onSubmit, className = '' }: FollowUpQuestionsCardProps) {
  const [showInput, setShowInput] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [customQuestion, setCustomQuestion] = useState('')

  const handleAnswerChange = (idx: number, value: string) => {
    setAnswers(prev => ({ ...prev, [idx]: value }))
  }

  const handleCustomQuestionChange = (value: string) => {
    setCustomQuestion(value)
  }

  const handleSubmit = () => {
    const finalAnswers = { ...answers }
    if (customQuestion.trim()) {
      finalAnswers['custom'] = customQuestion
    }
    onSubmit(finalAnswers)
    // Reset state
    setShowInput(false)
    setAnswers({})
    setCustomQuestion('')
  }

  const handleCancel = () => {
    setShowInput(false)
    setAnswers({})
    setCustomQuestion('')
  }

  const hasAnswers = Object.keys(answers).length > 0 || customQuestion.trim().length > 0

  return (
    <div className={`mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          Follow-up questions to improve the answer
        </h4>
        {!showInput && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInput(true)}
            className="text-xs gap-1 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
          >
            <ArrowRight className="w-3 h-3" />
            Answer & Refine
          </Button>
        )}
      </div>

      {showInput ? (
        <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <div className="space-y-3">
            {questions.map((question, idx) => (
              <div key={idx} className="space-y-2">
                <Label className="text-sm font-medium flex items-start gap-2">
                  <HelpCircle className="w-3 h-3 mt-0.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  {question}
                </Label>
                <Textarea
                  placeholder="Your answer..."
                  value={answers[idx] || ''}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              </div>
            ))}

            {/* Custom question input */}
            <div className="space-y-2 pt-3 border-t border-yellow-200 dark:border-yellow-700">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Plus className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                Add your own question or context (optional)
              </Label>
              <Textarea
                placeholder="Ask a specific question or provide additional context..."
                value={customQuestion}
                onChange={(e) => handleCustomQuestionChange(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!hasAnswers}
              className="gap-1 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
            >
              <ArrowRight className="w-3 h-3" />
              Refine Answer with Context
            </Button>
          </div>
        </div>
      ) : (
        <ul className="list-disc pl-5 text-sm space-y-1 text-yellow-900 dark:text-yellow-100">
          {questions.map((q, idx) => (
            <li key={idx}>{q}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
