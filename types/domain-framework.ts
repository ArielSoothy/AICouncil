/**
 * Domain Framework Plugin Interface
 *
 * All domain-specific features (vacation, apartment, career, trading)
 * implement this interface to connect to the Unified Debate Engine.
 *
 * The key insight: Frameworks differ only in:
 * 1. Intake questions (what to ask user)
 * 2. Research prompts (what to search for)
 * 3. Output format (how to present results)
 *
 * But ALL frameworks use the SAME debate engine underneath.
 *
 * @see docs/architecture/UNIFIED_DEBATE_ENGINE.md
 */

import { ResearchMode } from '@/lib/debate/research-modes'

// ============================================================================
// CORE FRAMEWORK INTERFACE
// ============================================================================

export interface DomainFramework {
  /**
   * Unique identifier for the framework
   * @example 'vacation', 'apartment', 'trading', 'career'
   */
  id: string

  /**
   * Display name for the framework
   * @example 'Trip Planning', 'Apartment Search'
   */
  name: string

  /**
   * User-facing description
   * @example 'Plan your perfect vacation with AI-powered research'
   */
  description: string

  /**
   * Icon for UI display (emoji or icon class)
   */
  icon: string

  /**
   * Color theme for UI consistency
   */
  color: string

  // ===== INTAKE CONFIGURATION =====

  /**
   * Questions to ask user during intake
   * If empty, framework accepts free-form query
   */
  questions: IntakeQuestion[]

  /**
   * Whether intake is required or optional
   * If false, user can skip to direct query
   */
  intakeRequired: boolean

  /**
   * Function to extract structured context from conversation
   * Used for conversational intake flow
   */
  contextExtractor?: (conversation: string) => Promise<StructuredContext>

  // ===== RESEARCH CONFIGURATION =====

  /**
   * Generate research prompt based on extracted context
   * @param context - Structured data from intake
   * @returns Prompt for research engine
   */
  researchPromptGenerator: (context: StructuredContext) => string

  /**
   * Preferred sources for this domain
   * Research engine will prioritize these
   * @example ['booking.com', 'tripadvisor.com'] for vacation
   */
  preferredSources?: string[]

  /**
   * Default research mode for this framework
   * Can be overridden by user
   */
  defaultResearchMode?: ResearchMode

  /**
   * Additional search queries specific to this domain
   * Added to main query during research
   */
  additionalSearchQueries?: (context: StructuredContext) => string[]

  // ===== OUTPUT CONFIGURATION =====

  /**
   * How to format the final output
   */
  outputFormat: OutputFormat

  /**
   * Custom synthesis prompt for this domain
   * Guides the Synthesizer agent
   */
  synthesisPrompt?: string

  /**
   * Custom scoring criteria (for MAUT frameworks)
   */
  scoringCriteria?: ScoringCriterion[]

  /**
   * Comparison fields (for comparison table output)
   */
  comparisonFields?: ComparisonField[]

  // ===== VALIDATION =====

  /**
   * Validate user input before processing
   */
  validateInput?: (context: StructuredContext) => ValidationResult
}

// ============================================================================
// INTAKE TYPES
// ============================================================================

export interface IntakeQuestion {
  /**
   * Unique identifier for the question
   */
  id: string

  /**
   * Question text to display
   */
  question: string

  /**
   * Type of input expected
   */
  type: QuestionType

  /**
   * Whether answer is required
   */
  required: boolean

  /**
   * Placeholder text for input
   */
  placeholder?: string

  /**
   * Help text / description
   */
  helpText?: string

  /**
   * Options for select/multiselect types
   */
  options?: QuestionOption[]

  /**
   * Validation rules
   */
  validation?: QuestionValidation

  /**
   * Conditional display based on other answers
   */
  showIf?: ConditionalLogic

  /**
   * Default value
   */
  defaultValue?: any
}

export type QuestionType =
  | 'text'           // Free text input
  | 'textarea'       // Long text input
  | 'number'         // Numeric input
  | 'date'           // Date picker
  | 'daterange'      // Date range picker
  | 'select'         // Single select dropdown
  | 'multiselect'    // Multiple select
  | 'slider'         // Numeric slider
  | 'currency'       // Currency input
  | 'location'       // Location picker
  | 'rating'         // 1-5 star rating

export interface QuestionOption {
  value: string
  label: string
  description?: string
  icon?: string
}

export interface QuestionValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  custom?: (value: any) => boolean | string
}

export interface ConditionalLogic {
  questionId: string
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan'
  value: any
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Structured data extracted from user input
 * Generic base - each framework extends this
 */
export interface StructuredContext {
  /**
   * Original user query (if any)
   */
  originalQuery?: string

  /**
   * Domain detected
   */
  domain: string

  /**
   * Confidence in domain detection
   */
  domainConfidence: number

  /**
   * Extracted answers from intake
   */
  answers: Record<string, any>

  /**
   * Additional context from conversation
   */
  conversationContext?: string

  /**
   * User preferences (from memory system)
   */
  userPreferences?: Record<string, any>

  /**
   * Timestamp
   */
  timestamp: Date
}

// ============================================================================
// DOMAIN-SPECIFIC CONTEXT TYPES
// ============================================================================

export interface VacationContext extends StructuredContext {
  domain: 'vacation'
  answers: {
    destination?: string
    startDate?: string
    endDate?: string
    travelers?: number
    travelerTypes?: string[]  // 'adults', 'children', 'seniors'
    budget?: number
    budgetCurrency?: string
    accommodationType?: string[]  // 'hotel', 'airbnb', 'resort'
    activities?: string[]
    travelStyle?: string  // 'luxury', 'budget', 'adventure', 'relaxation'
    specialRequirements?: string
  }
}

export interface ApartmentContext extends StructuredContext {
  domain: 'apartment'
  answers: {
    location?: string
    maxRent?: number
    minBedrooms?: number
    maxBedrooms?: number
    petFriendly?: boolean
    parking?: boolean
    amenities?: string[]
    moveInDate?: string
    leaseTerm?: string
    commuteTo?: string
    maxCommuteTime?: number
  }
}

export interface TradingContext extends StructuredContext {
  domain: 'trading'
  answers: {
    symbol?: string
    timeframe?: 'day' | 'swing' | 'position' | 'longterm'
    riskTolerance?: 'low' | 'medium' | 'high'
    investmentAmount?: number
    currentPosition?: 'none' | 'long' | 'short'
    analysisType?: string[]  // 'technical', 'fundamental', 'sentiment'
  }
}

export interface CareerContext extends StructuredContext {
  domain: 'career'
  answers: {
    currentRole?: string
    yearsExperience?: number
    desiredRole?: string
    industry?: string
    skills?: string[]
    salaryExpectation?: number
    locationPreference?: string
    remotePreference?: string
    decisionType?: 'job-offer' | 'career-change' | 'startup' | 'promotion'
  }
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type OutputFormat =
  | 'recommendation'    // Single best option with reasoning
  | 'ranking'           // Ordered list of options
  | 'comparison'        // Side-by-side comparison table
  | 'scorecard'         // MAUT-style weighted scoring
  | 'bullbear'          // Trading-style bull/bear analysis
  | 'timeline'          // Itinerary or action timeline

export interface ScoringCriterion {
  id: string
  name: string
  weight: number  // 0-100, total should = 100
  description: string
  scoringGuide?: string  // How to score this criterion
}

export interface ComparisonField {
  id: string
  name: string
  type: 'text' | 'number' | 'boolean' | 'rating' | 'currency'
  higherIsBetter?: boolean  // For sorting/highlighting
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
}

// ============================================================================
// FRAMEWORK REGISTRY
// ============================================================================

/**
 * Registry of all available frameworks
 * Frameworks register themselves here
 */
export const FRAMEWORK_REGISTRY: Record<string, DomainFramework> = {}

/**
 * Register a new framework
 */
export function registerFramework(framework: DomainFramework): void {
  FRAMEWORK_REGISTRY[framework.id] = framework
}

/**
 * Get framework by ID
 */
export function getFramework(id: string): DomainFramework | undefined {
  return FRAMEWORK_REGISTRY[id]
}

/**
 * Get all registered frameworks
 */
export function getAllFrameworks(): DomainFramework[] {
  return Object.values(FRAMEWORK_REGISTRY)
}

/**
 * Detect framework from query
 * Returns the most likely framework based on keywords
 */
export function detectFramework(query: string): {
  framework: DomainFramework | null
  confidence: number
} {
  const queryLower = query.toLowerCase()

  // Keyword matching for each domain
  const domainKeywords: Record<string, string[]> = {
    vacation: ['trip', 'vacation', 'travel', 'hotel', 'flight', 'destination', 'itinerary', 'tourism'],
    apartment: ['apartment', 'rent', 'lease', 'housing', 'flat', 'bedroom', 'landlord', 'tenant'],
    trading: ['stock', 'trade', 'buy', 'sell', 'invest', 'market', 'portfolio', 'ticker', '$'],
    career: ['job', 'career', 'salary', 'interview', 'resume', 'promotion', 'work', 'employer']
  }

  let bestMatch: string | null = null
  let bestScore = 0

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    const matchCount = keywords.filter(k => queryLower.includes(k)).length
    const score = matchCount / keywords.length

    if (score > bestScore && matchCount > 0) {
      bestScore = score
      bestMatch = domain
    }
  }

  if (bestMatch && bestScore >= 0.1) {
    return {
      framework: FRAMEWORK_REGISTRY[bestMatch] || null,
      confidence: Math.min(bestScore * 2, 1)  // Scale to 0-1
    }
  }

  return { framework: null, confidence: 0 }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate default research prompt for a framework
 */
export function generateDefaultResearchPrompt(
  framework: DomainFramework,
  context: StructuredContext
): string {
  const basePrompt = `Research for ${framework.name}:\n\n`

  // Add answers as context
  const answersContext = Object.entries(context.answers)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
    .join('\n')

  // Add preferred sources instruction
  const sourcesInstruction = framework.preferredSources?.length
    ? `\n\nPreferred sources: ${framework.preferredSources.join(', ')}`
    : ''

  return basePrompt + answersContext + sourcesInstruction
}

/**
 * Check if framework has required intake
 */
export function requiresIntake(framework: DomainFramework): boolean {
  return framework.intakeRequired && framework.questions.length > 0
}

export default FRAMEWORK_REGISTRY
