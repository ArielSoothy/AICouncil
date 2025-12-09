// AI Question Generator - Uses fast free models to generate relevant questions
// Perfect for self-testing the consensus system and inspiring users

import { QUESTION_TEMPLATES, TEMPLATE_VARIABLES, PRIORITY_QUESTIONS, QUESTION_CATEGORIES } from './question-categories'
import { MemoryCache } from '@/lib/cache/response-cache'

export interface GeneratedQuestion {
  question: string
  category: string
  complexity: 'quick' | 'analysis' | 'strategic'
  priority: 'high' | 'medium' | 'low'
  source: 'template' | 'ai-generated' | 'priority'
  cacheKey?: string
}

export interface QuestionGeneratorOptions {
  category?: string
  complexity?: 'quick' | 'analysis' | 'strategic'
  priority?: 'high' | 'medium' | 'low'
  useAI?: boolean
  avoidRecent?: boolean
}

export class QuestionGenerator {
  private static readonly CACHE_PREFIX = 'question_gen_'
  private static readonly RECENT_QUESTIONS_KEY = 'recent_questions'
  private static readonly RECENT_QUESTIONS_TTL = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Generate a question based on options
   */
  static async generate(options: QuestionGeneratorOptions = {}): Promise<GeneratedQuestion> {
    const {
      category,
      complexity,
      priority = 'high',
      useAI = false,
      avoidRecent = true
    } = options

    // Try priority questions first (most relevant to our product)
    if (priority === 'high' && !category) {
      const priorityQuestion = this.getRandomPriorityQuestion(avoidRecent)
      if (priorityQuestion) {
        if (avoidRecent) {
          this.addToRecentQuestions(priorityQuestion.question)
        }
        return priorityQuestion
      }
    }

    // Use AI generation if requested and high priority
    if (useAI && priority === 'high') {
      try {
        const aiQuestion = await this.generateWithAI(category, complexity)
        if (aiQuestion && (!avoidRecent || !this.isRecentQuestion(aiQuestion.question))) {
          if (avoidRecent) {
            this.addToRecentQuestions(aiQuestion.question)
          }
          return aiQuestion
        }
      } catch (error) {
        console.warn('AI question generation failed, falling back to templates:', error)
      }
    }

    // Fall back to template-based generation
    const templateQuestion = this.generateFromTemplate(category, complexity, priority, avoidRecent)
    if (avoidRecent) {
      this.addToRecentQuestions(templateQuestion.question)
    }
    return templateQuestion
  }

  /**
   * Get a random priority question (most relevant to our product)
   */
  private static getRandomPriorityQuestion(avoidRecent: boolean): GeneratedQuestion | null {
    let availableQuestions = PRIORITY_QUESTIONS

    if (avoidRecent) {
      const recentQuestions = this.getRecentQuestions()
      availableQuestions = PRIORITY_QUESTIONS.filter(q => !recentQuestions.includes(q.toLowerCase()))
    }

    if (availableQuestions.length === 0) {
      return null
    }

    const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]

    return {
      question: randomQuestion,
      category: 'Mixed',
      complexity: 'strategic',
      priority: 'high',
      source: 'priority'
    }
  }

  /**
   * Generate question using AI (llama-3.1-8b-instant)
   */
  private static async generateWithAI(
    category?: string,
    complexity?: 'quick' | 'analysis' | 'strategic'
  ): Promise<GeneratedQuestion | null> {
    const cacheKey = `ai_question_${category || 'any'}_${complexity || 'any'}`

    // Check cache first
    const cached = MemoryCache.get(this.CACHE_PREFIX + cacheKey)
    if (cached) {
      return {
        ...cached,
        source: 'ai-generated',
        cacheKey
      }
    }

    const categoryContext = category ? `in the ${category} category` : 'related to AI decision-making tools and MVP development'
    const complexityContext = complexity === 'quick' ? 'that can be answered quickly'
      : complexity === 'analysis' ? 'that requires analytical thinking'
      : 'that involves strategic decision-making'

    const prompt = `Generate a single, specific question ${categoryContext} ${complexityContext}.

The question should be:
- Relevant for testing an AI consensus platform
- Useful for MVP/product development decisions
- Practical and actionable
- Something that would benefit from multiple AI perspectives

Examples of good questions:
- "Should I use 3 or 5 AI models for better accuracy vs cost?"
- "Claude vs GPT-4 vs Gemini for consensus synthesis?"
- "Freemium vs subscription-only for AI SaaS pricing?"

Generate just the question, no explanation:`

    try {
      const response = await fetch('/api/ai-providers/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          prompt,
          max_tokens: 100,
          temperature: 0.8
        })
      })

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.status}`)
      }

      const data = await response.json()
      const question = data.response?.trim()

      if (!question || question.length < 10) {
        throw new Error('Generated question too short or empty')
      }

      const generatedQuestion: GeneratedQuestion = {
        question,
        category: category || 'AI Generated',
        complexity: complexity || 'analysis',
        priority: 'high',
        source: 'ai-generated',
        cacheKey
      }

      // Cache for 6 hours
      MemoryCache.set(this.CACHE_PREFIX + cacheKey, generatedQuestion, 6 * 60 * 60 * 1000)

      return generatedQuestion
    } catch (error) {
      console.error('AI question generation error:', error)
      return null
    }
  }

  /**
   * Generate question from templates
   */
  private static generateFromTemplate(
    category?: string,
    complexity?: 'quick' | 'analysis' | 'strategic',
    priority?: 'high' | 'medium' | 'low',
    avoidRecent: boolean = true
  ): GeneratedQuestion {
    // Filter templates based on criteria
    let availableTemplates = QUESTION_TEMPLATES.filter(template => {
      if (category && template.category !== category) return false
      if (complexity && template.complexity !== complexity) return false
      if (priority && template.priority !== priority) return false
      return true
    })

    // If no matches, broaden the search
    if (availableTemplates.length === 0) {
      availableTemplates = QUESTION_TEMPLATES.filter(template => {
        if (category && template.category !== category) return false
        return true
      })
    }

    // Still no matches? Use all templates
    if (availableTemplates.length === 0) {
      availableTemplates = QUESTION_TEMPLATES
    }

    // Generate questions and filter out recent ones
    const maxAttempts = 10
    let attempts = 0

    while (attempts < maxAttempts) {
      const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)]
      const question = this.fillTemplate(template.template)

      if (!avoidRecent || !this.isRecentQuestion(question)) {
        return {
          question,
          category: template.category,
          complexity: template.complexity,
          priority: template.priority,
          source: 'template'
        }
      }

      attempts++
    }

    // If we can't avoid recent questions, just return a random one
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)]
    return {
      question: this.fillTemplate(template.template),
      category: template.category,
      complexity: template.complexity,
      priority: template.priority,
      source: 'template'
    }
  }

  /**
   * Fill template with random variables
   */
  private static fillTemplate(template: string): string {
    let filledTemplate = template

    // Find all variables in the template
    const variables = template.match(/\{([^}]+)\}/g) || []

    for (const variable of variables) {
      const variableName = variable.slice(1, -1) // Remove { and }
      const options = TEMPLATE_VARIABLES[variableName as keyof typeof TEMPLATE_VARIABLES]

      if (options && options.length > 0) {
        const randomOption = options[Math.floor(Math.random() * options.length)]
        filledTemplate = filledTemplate.replace(variable, randomOption)
      }
    }

    return filledTemplate
  }

  /**
   * Check if question was asked recently
   */
  private static isRecentQuestion(question: string): boolean {
    const recentQuestions = this.getRecentQuestions()
    return recentQuestions.includes(question.toLowerCase())
  }

  /**
   * Add question to recent questions list
   */
  private static addToRecentQuestions(question: string): void {
    const recentQuestions = this.getRecentQuestions()
    const normalizedQuestion = question.toLowerCase()

    // Add to beginning of array
    recentQuestions.unshift(normalizedQuestion)

    // Keep only last 20 questions
    const trimmedQuestions = recentQuestions.slice(0, 20)

    // Store in cache
    MemoryCache.set(
      this.CACHE_PREFIX + this.RECENT_QUESTIONS_KEY,
      trimmedQuestions,
      this.RECENT_QUESTIONS_TTL
    )
  }

  /**
   * Get list of recent questions
   */
  private static getRecentQuestions(): string[] {
    const cached = MemoryCache.get(this.CACHE_PREFIX + this.RECENT_QUESTIONS_KEY)
    return cached || []
  }

  /**
   * Get available categories
   */
  static getCategories(): string[] {
    return Object.values(QUESTION_CATEGORIES)
  }

  /**
   * Clear recent questions cache
   */
  static clearRecentQuestions(): void {
    MemoryCache.set(this.CACHE_PREFIX + this.RECENT_QUESTIONS_KEY, [], this.RECENT_QUESTIONS_TTL)
  }

  /**
   * Get statistics about question generation
   */
  static getStats() {
    const recentQuestions = this.getRecentQuestions()
    return {
      recentQuestionsCount: recentQuestions.length,
      totalTemplates: QUESTION_TEMPLATES.length,
      priorityQuestions: PRIORITY_QUESTIONS.length,
      categories: this.getCategories().length
    }
  }
}