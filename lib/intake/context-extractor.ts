/**
 * Context Extractor - Phase 2 of Hybrid Architecture
 *
 * Uses LLM to parse user's initial message and extract decision-making context.
 * This allows us to skip questions the user has already answered in their message.
 *
 * Example:
 * User: "I need a hotel in Dubai for 5 nights, budget $300/night, traveling with baby and elderly"
 * Extracted: { domain: 'hotel', location: 'Dubai, UAE', budget: 300, nights: 5, party: '...' }
 * Result: Skip location, budget, nights, party questions → only ask 6 remaining questions
 */

// Context extraction is done via API route to keep API keys server-side

/**
 * Extracted context from user's initial message
 */
export interface ExtractedContext {
  // Domain classification
  domain: 'hotel' | 'apartment' | 'budget' | 'product' | 'generic'
  confidence: number // 0-1, how confident we are in domain classification

  // Common fields across domains
  location?: string
  budget?: number
  timeframe?: string

  // Hotel-specific
  hotelContext?: {
    checkInDate?: string
    nights?: number
    purpose?: string
    partyComposition?: string
    amenities?: string[]
    locationPriority?: number
    specificHotels?: string[]
    specialRequirements?: string
    additionalContext?: string
  }

  // Apartment-specific
  apartmentContext?: {
    moveInDate?: string
    leaseTerm?: string
    bedrooms?: number
    income?: number
    commute?: string
    petFriendly?: boolean
    parking?: boolean
    amenities?: string[]
    priorityFactors?: string
  }

  // Budget-specific
  budgetContext?: {
    income?: number
    expenses?: Record<string, number>
    savingsGoal?: number
    debtAmount?: number
    financialGoals?: string[]
  }

  // Product-specific
  productContext?: {
    category?: string
    specificProducts?: string[]
    features?: string[]
    priceRange?: { min: number; max: number }
    useCase?: string
  }

  // Raw user message for reference
  originalMessage: string
}

/**
 * Extract decision-making context from user's message via API route
 */
export async function extractContext(userMessage: string): Promise<ExtractedContext> {
  try {
    const response = await fetch('/api/intake/extract-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userMessage }),
    })

    if (!response.ok) {
      throw new Error(`Context extraction API failed: ${response.statusText}`)
    }

    const extractedContext: ExtractedContext = await response.json()
    return extractedContext
  } catch (error) {
    console.error('Context extraction failed:', error)

    // Fallback: minimal context with generic domain
    return {
      domain: 'generic',
      confidence: 0.3,
      originalMessage: userMessage,
    }
  }
}

/**
 * Check if a specific question is already answered by extracted context
 */
export function isQuestionAnsweredByContext(
  questionId: string,
  context: ExtractedContext
): boolean {
  // Generic checks
  if (questionId.includes('location') && context.location) return true
  if (questionId.includes('budget') && context.budget) return true

  // Domain-specific checks
  const { domain } = context

  if (domain === 'hotel' && context.hotelContext) {
    const h = context.hotelContext
    if (questionId === 'hotel_location' && context.location) return true
    if (questionId === 'hotel_budget' && context.budget) return true
    if (questionId === 'hotel_nights' && h.nights) return true
    if (questionId === 'hotel_purpose' && h.purpose) return true
    if (questionId === 'hotel_checkin' && h.checkInDate) return true
    if (questionId === 'hotel_party_composition' && h.partyComposition) return true
    if (questionId === 'hotel_amenities' && h.amenities && h.amenities.length > 0) return true
    if (questionId === 'hotel_location_priority' && h.locationPriority) return true
    if (questionId === 'hotel_special_requirements' && h.specialRequirements) return true
    if (questionId === 'hotel_specific_names' && h.specificHotels && h.specificHotels.length > 0)
      return true
    if (questionId === 'hotel_additional_context' && h.additionalContext) return true
  }

  if (domain === 'apartment' && context.apartmentContext) {
    const a = context.apartmentContext
    if (questionId === 'apartment_location' && context.location) return true
    if (questionId === 'apartment_budget' && context.budget) return true
    if (questionId === 'apartment_move_in' && a.moveInDate) return true
    if (questionId === 'apartment_lease_term' && a.leaseTerm) return true
    if (questionId === 'apartment_bedrooms' && a.bedrooms) return true
    if (questionId === 'apartment_income' && a.income) return true
    if (questionId === 'apartment_commute' && a.commute) return true
    if (questionId === 'apartment_pets' && a.petFriendly !== undefined) return true
    if (questionId === 'apartment_parking' && a.parking !== undefined) return true
    if (questionId === 'apartment_amenities' && a.amenities && a.amenities.length > 0) return true
  }

  return false
}

/**
 * Get pre-filled answers from extracted context
 */
export function getPrefilledAnswers(context: ExtractedContext): Record<string, any> {
  const answers: Record<string, any> = {}

  // Generic pre-fills
  if (context.location) {
    if (context.domain === 'hotel') answers['hotel_location'] = context.location
    if (context.domain === 'apartment') answers['apartment_location'] = context.location
  }
  if (context.budget) {
    if (context.domain === 'hotel') answers['hotel_budget'] = context.budget
    if (context.domain === 'apartment') answers['apartment_budget'] = context.budget
  }

  // Hotel pre-fills
  if (context.domain === 'hotel' && context.hotelContext) {
    const h = context.hotelContext
    if (h.nights) answers['hotel_nights'] = h.nights
    if (h.purpose) answers['hotel_purpose'] = h.purpose
    if (h.checkInDate) answers['hotel_checkin'] = h.checkInDate
    if (h.partyComposition) answers['hotel_party_composition'] = h.partyComposition
    if (h.amenities && h.amenities.length > 0) answers['hotel_amenities'] = h.amenities
    if (h.locationPriority) answers['hotel_location_priority'] = h.locationPriority
    if (h.specialRequirements) answers['hotel_special_requirements'] = h.specialRequirements
    if (h.specificHotels && h.specificHotels.length > 0)
      answers['hotel_specific_names'] = h.specificHotels.join(', ')
    if (h.additionalContext) answers['hotel_additional_context'] = h.additionalContext
  }

  // Apartment pre-fills
  if (context.domain === 'apartment' && context.apartmentContext) {
    const a = context.apartmentContext
    if (a.moveInDate) answers['apartment_move_in'] = a.moveInDate
    if (a.leaseTerm) answers['apartment_lease_term'] = a.leaseTerm
    if (a.bedrooms) answers['apartment_bedrooms'] = a.bedrooms
    if (a.income) answers['apartment_income'] = a.income
    if (a.commute) answers['apartment_commute'] = a.commute
    if (a.petFriendly !== undefined) answers['apartment_pets'] = a.petFriendly ? 'Yes' : 'No'
    if (a.parking !== undefined) answers['apartment_parking'] = a.parking ? 'Yes' : 'No'
    if (a.amenities && a.amenities.length > 0) answers['apartment_amenities'] = a.amenities
  }

  return answers
}
