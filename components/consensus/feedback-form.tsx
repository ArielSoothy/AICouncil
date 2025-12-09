'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface FeedbackFormProps {
  conversationId?: string
  onSuccess?: () => void
  isGuestMode?: boolean
}

export function FeedbackForm({ conversationId, onSuccess, isGuestMode = false }: FeedbackFormProps) {
  const { user, refreshUserProfile } = useAuth()
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return
    if (!isGuestMode && !user) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId || 'general',
          user_rating: rating,
          comments: comments.trim() || null,
          isGuestMode: isGuestMode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      const result = await response.json()
      
      setIsSubmitted(true)

      // Refresh user profile to update premium credits (only for authenticated users)
      if (!isGuestMode && user) {
        await refreshUserProfile()
      }

      onSuccess?.()

      // Show success message based on credits earned
      if (result.creditsEarned > 0) {
        setTimeout(() => {
          alert(`🎉 Thanks for your feedback! You earned ${result.creditsEarned} premium credits!`)
        }, 500)
      } else if (isGuestMode) {
        setTimeout(() => {
          alert(`🎉 Thanks for your feedback! Sign up to earn premium credits for future feedback.`)
        }, 500)
      }
      
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user && !isGuestMode) {
    return null // Don't show feedback form for non-authenticated users (unless guest mode)
  }

  if (isSubmitted) {
    return (
      <div className="p-4 bg-green-950/20 border border-green-800/30 rounded-lg text-center">
        <div className="text-green-400 mb-2">✅ Thank you for your feedback!</div>
        <div className="text-sm text-green-300/80">
          {isGuestMode
            ? "Sign up to earn premium credits for future feedback!"
            : "You earned +2 premium credits for helping us improve!"
          }
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 feedback-dark rounded-lg">
      <div className="mb-4">
        <h3 className="font-medium mb-2">Help us improve Consensus AI</h3>
        <p className="text-sm mb-3">
          Rate this response and earn +2 premium credits to try ALL models!
        </p>
        
        {/* Star Rating */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-blue-300">
            {rating > 0 && (
              <>
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </>
            )}
          </span>
        </div>

        {/* Optional Comments */}
        <div className="mb-4">
          <label className="text-xs text-blue-300 mb-1 block">
            Comments (optional - but helps us improve!)
          </label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="What did you think of this consensus analysis? Any suggestions?"
            rows={3}
            className="text-sm"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-blue-300">
            {isGuestMode
              ? "💰 Sign up to earn credits!"
              : "💰 Earn +2 premium credits per feedback"
            }
          </div>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            size="sm"
            className="ai-button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit & Earn Credits'}
          </Button>
        </div>
      </div>
    </div>
  )
}