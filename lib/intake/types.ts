// Domain-Specific Decision Framework Types
// Phase 2: Intake Agent Foundation

/**
 * Supported decision domains
 */
export type DomainType = 'apartment' | 'hotel' | 'budget' | 'product' | 'generic'

/**
 * Question data types
 */
export type QuestionDataType =
  | 'text'           // Free text input
  | 'number'         // Numeric input
  | 'boolean'        // Yes/No
  | 'enum'           // Single selection from options
  | 'multi-select'   // Multiple selections from options
  | 'scale'          // 1-10 scale
  | 'date'           // Date picker
  | 'date-range'     // Date range picker

/**
 * Question importance weight
 */
export type QuestionWeight = 1 | 3 | 5 | 7 | 10

/**
 * Research depth level
 */
export enum ResearchDepth {
  QUICK = 'quick',       // Critical questions only (weight 10)
  BALANCED = 'balanced', // Critical + Important (weight 10, 7)
  THOROUGH = 'thorough'  // All questions (weight 10, 7, 5, 3, 1)
}

/**
 * Question definition
 */
export interface Question {
  id: string
  domain: DomainType
  text: string
  type: QuestionDataType
  options?: string[]        // For enum/multi-select types
  weight: QuestionWeight    // Importance (10 = critical, 1 = nice-to-have)
  required: boolean
  dependsOn?: string        // Question ID (conditional questions)
  dependsOnValue?: any      // Required value for dependsOn
  validation?: (answer: any) => boolean
  placeholder?: string
  helpText?: string
}

/**
 * Answer to a question
 */
export interface Answer {
  questionId: string
  value: any
  timestamp: Date
}

/**
 * Collection of answers
 */
export type Answers = Record<string, any>

/**
 * Structured query for multi-model analysis
 */
export interface StructuredQuery {
  // Domain & Framework
  domain: DomainType
  framework: string          // "MAUT", "Pareto", "50/30/20", "Pugh Matrix"

  // Core Context
  userQuery: string          // Original query
  clarifyingAnswers: Answers // All intake answers

  // Decision Parameters
  hardConstraints: string[]  // Must-haves, deal-breakers
  priorities: string[]       // Ranked priorities
  tradeoffs: string[]        // Acceptable compromises

  // External Data Needs
  requiredAPIs: string[]     // Zillow, Google Maps, etc.
  researchQueries: string[]  // What to search for

  // Analysis Instructions
  analysisMethod: string     // Specific framework to apply
  outputFormat: string       // Matrix, narrative, pros/cons

  // Multi-Model Directive
  agentInstructions: {
    analyst: string          // What data to gather
    critic: string           // What risks to evaluate
    synthesizer: string      // How to balance factors
  }
}

/**
 * Research depth configuration
 */
export interface DepthConfig {
  depth: ResearchDepth
  questionCount: number
  estimatedTime: number      // minutes
  estimatedCost: number      // dollars
  apiCalls: number           // external API calls
}

/**
 * Domain classification result
 */
export interface DomainClassification {
  domain: DomainType
  confidence: number         // 0-1 scale
  reasoning: string          // Why this domain was selected
  alternativeDomains?: DomainType[] // Other possible domains
}

/**
 * Intake session state
 */
export interface IntakeSession {
  id: string
  userId?: string
  userQuery: string
  domain: DomainType | null
  domainClassification?: DomainClassification
  researchDepth: ResearchDepth
  questions: Question[]
  answers: Answers
  currentQuestionIndex: number
  startedAt: Date
  completedAt?: Date
  structuredQuery?: StructuredQuery
}
