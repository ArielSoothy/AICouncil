// Question Sequencer - Smart Question Ordering & Filtering
// Phase 2: Intake Agent Foundation
// Sequences questions by importance and filters based on research depth & dependencies

import { Question, DomainType, ResearchDepth, QuestionWeight, Answers } from './types'
import { getQuestionsByDomain } from './question-bank'

/**
 * Question Sequencer Class
 * Handles question ordering, filtering by depth, and conditional logic
 */
export class QuestionSequencer {
  private domain: DomainType
  private depth: ResearchDepth
  private allQuestions: Question[]

  constructor(domain: DomainType, depth: ResearchDepth = ResearchDepth.BALANCED) {
    this.domain = domain
    this.depth = depth
    this.allQuestions = getQuestionsByDomain(domain)
  }

  /**
   * Get questions filtered by research depth
   * - QUICK: Critical only (weight 10)
   * - BALANCED: Critical + Important (weight 10, 7)
   * - THOROUGH: All questions (weight 10, 7, 5, 3, 1)
   */
  getQuestionsByDepth(): Question[] {
    const weightFilters: Record<ResearchDepth, QuestionWeight[]> = {
      [ResearchDepth.QUICK]: [10],
      [ResearchDepth.BALANCED]: [10, 7],
      [ResearchDepth.THOROUGH]: [10, 7, 5, 3, 1]
    }

    const allowedWeights = weightFilters[this.depth]
    return this.allQuestions.filter(q => allowedWeights.includes(q.weight))
  }

  /**
   * Get questions in recommended order
   * Order: Critical → Important → Moderate → Nice-to-have
   * Within each tier: Required before optional
   */
  getOrderedQuestions(): Question[] {
    const filteredQuestions = this.getQuestionsByDepth()

    return filteredQuestions.sort((a, b) => {
      // Sort by weight (descending)
      if (a.weight !== b.weight) {
        return b.weight - a.weight
      }

      // Within same weight, required before optional
      if (a.required !== b.required) {
        return a.required ? -1 : 1
      }

      // Maintain original order for ties
      return 0
    })
  }

  /**
   * Filter out questions that depend on unanswered/invalid conditions
   */
  filterConditionalQuestions(questions: Question[], answers: Answers): Question[] {
    return questions.filter(question => {
      // No dependency = always show
      if (!question.dependsOn) {
        return true
      }

      // Check if dependency is answered
      const dependencyAnswer = answers[question.dependsOn]
      if (dependencyAnswer === undefined) {
        return false // Dependency not answered yet
      }

      // Check if dependency value matches required value
      if (question.dependsOnValue !== undefined) {
        return dependencyAnswer === question.dependsOnValue
      }

      // Dependency exists and is answered (no specific value required)
      return true
    })
  }

  /**
   * Get next question to ask based on current answers
   */
  getNextQuestion(answers: Answers): Question | null {
    const orderedQuestions = this.getOrderedQuestions()
    const availableQuestions = this.filterConditionalQuestions(orderedQuestions, answers)

    // Find first unanswered question
    for (const question of availableQuestions) {
      if (answers[question.id] === undefined) {
        return question
      }
    }

    // All questions answered
    return null
  }

  /**
   * Get all remaining questions (unanswered)
   */
  getRemainingQuestions(answers: Answers): Question[] {
    const orderedQuestions = this.getOrderedQuestions()
    const availableQuestions = this.filterConditionalQuestions(orderedQuestions, answers)

    return availableQuestions.filter(q => answers[q.id] === undefined)
  }

  /**
   * Get progress (0-1 scale)
   */
  getProgress(answers: Answers): number {
    const totalQuestions = this.getOrderedQuestions().length
    if (totalQuestions === 0) return 1

    const answeredCount = Object.keys(answers).filter(answerId =>
      this.getOrderedQuestions().some(q => q.id === answerId)
    ).length

    return answeredCount / totalQuestions
  }

  /**
   * Check if all required questions are answered
   */
  areRequiredQuestionsAnswered(answers: Answers): boolean {
    const orderedQuestions = this.getOrderedQuestions()
    const availableQuestions = this.filterConditionalQuestions(orderedQuestions, answers)
    const requiredQuestions = availableQuestions.filter(q => q.required)

    return requiredQuestions.every(q => answers[q.id] !== undefined)
  }

  /**
   * Get count of questions by weight
   */
  getQuestionCountByWeight(): Record<QuestionWeight, number> {
    const questions = this.getQuestionsByDepth()
    const counts: Record<QuestionWeight, number> = {
      10: 0,
      7: 0,
      5: 0,
      3: 0,
      1: 0
    }

    for (const question of questions) {
      counts[question.weight]++
    }

    return counts
  }

  /**
   * Get estimated time to complete (in minutes)
   * Assumes 30 seconds per question on average
   */
  getEstimatedTime(): number {
    const questionCount = this.getQuestionsByDepth().length
    return Math.ceil(questionCount * 0.5) // 30 seconds per question
  }

  /**
   * Validate answer for a question
   */
  validateAnswer(questionId: string, answer: any): { valid: boolean; error?: string } {
    const question = this.allQuestions.find(q => q.id === questionId)
    if (!question) {
      return { valid: false, error: 'Question not found' }
    }

    // Check required
    if (question.required && (answer === undefined || answer === null || answer === '')) {
      return { valid: false, error: 'This question is required' }
    }

    // Type-specific validation
    switch (question.type) {
      case 'number':
        if (isNaN(Number(answer))) {
          return { valid: false, error: 'Please enter a valid number' }
        }
        if (Number(answer) < 0) {
          return { valid: false, error: 'Please enter a positive number' }
        }
        break

      case 'enum':
        if (question.options && !question.options.includes(answer)) {
          return { valid: false, error: 'Please select a valid option' }
        }
        break

      case 'multi-select':
        if (!Array.isArray(answer)) {
          return { valid: false, error: 'Please select at least one option' }
        }
        if (question.options) {
          const invalidOptions = answer.filter(a => !question.options!.includes(a))
          if (invalidOptions.length > 0) {
            return { valid: false, error: 'Some selected options are invalid' }
          }
        }
        break

      case 'scale':
        const num = Number(answer)
        if (isNaN(num) || num < 1 || num > 10) {
          return { valid: false, error: 'Please enter a number between 1 and 10' }
        }
        break

      case 'boolean':
        if (typeof answer !== 'boolean') {
          return { valid: false, error: 'Please select Yes or No' }
        }
        break
    }

    // Custom validation function
    if (question.validation && !question.validation(answer)) {
      return { valid: false, error: 'Invalid answer format' }
    }

    return { valid: true }
  }

  /**
   * Get question groups by weight (for UI rendering)
   */
  getQuestionGroups(): {
    critical: Question[]
    important: Question[]
    moderate: Question[]
    optional: Question[]
  } {
    const questions = this.getQuestionsByDepth()

    return {
      critical: questions.filter(q => q.weight === 10),
      important: questions.filter(q => q.weight === 7),
      moderate: questions.filter(q => q.weight === 5),
      optional: questions.filter(q => q.weight === 3 || q.weight === 1)
    }
  }
}

/**
 * Get estimated completion time by depth
 */
export function getEstimatedTimeByDepth(domain: DomainType, depth: ResearchDepth): number {
  const sequencer = new QuestionSequencer(domain, depth)
  return sequencer.getEstimatedTime()
}

/**
 * Get question count by depth
 */
export function getQuestionCountByDepth(domain: DomainType, depth: ResearchDepth): number {
  const sequencer = new QuestionSequencer(domain, depth)
  return sequencer.getQuestionsByDepth().length
}

/**
 * Create depth configuration for UI display
 */
export function createDepthConfig(domain: DomainType, depth: ResearchDepth): {
  depth: ResearchDepth
  questionCount: number
  estimatedTime: number
  label: string
  description: string
} {
  const questionCount = getQuestionCountByDepth(domain, depth)
  const estimatedTime = getEstimatedTimeByDepth(domain, depth)

  const configs = {
    [ResearchDepth.QUICK]: {
      label: 'Quick Decision',
      description: 'Critical questions only - fastest path to recommendation'
    },
    [ResearchDepth.BALANCED]: {
      label: 'Balanced Analysis',
      description: 'Important questions included - good balance of speed and depth'
    },
    [ResearchDepth.THOROUGH]: {
      label: 'Comprehensive Research',
      description: 'All questions - maximum confidence and precision'
    }
  }

  return {
    depth,
    questionCount,
    estimatedTime,
    ...configs[depth]
  }
}
