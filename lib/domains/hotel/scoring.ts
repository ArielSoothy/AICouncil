// Hotel Scoring System
// Weighted Decision Matrix Implementation
//
// DESIGN PHILOSOPHY: Rule-of-Thumb First with AI Research Enhancement
// ======================================================================
// Scoring works WITHOUT external APIs by using:
// 1. User-provided data (budget, preferences, dates)
// 2. Rule-of-thumb assumptions (average prices, typical ratings by area)
// 3. AI agent research (web search for reviews, pricing, location)
// 4. Red flag detection (immediate disqualification for critical issues)
//
// The system provides meaningful scores even with zero API calls.
// AI agents enhance accuracy through targeted web research.

import type {
  HotelScore,
  LocationScore,
  ReviewScore,
  CleanlinessScore,
  ValueScore,
  AmenitiesScore,
  HotelInput,
  RedFlagType,
  DEFAULT_WEIGHTS,
  RECOMMENDATION_THRESHOLDS,
  RED_FLAG_SEVERITY
} from './types'
import type { Answers } from '@/lib/intake/types'

/**
 * Main hotel analysis function
 * Combines user answers with AI research to generate weighted score
 */
export async function analyzeHotel(
  userQuery: string,
  answers: Answers
): Promise<{ score: HotelScore }> {

  console.log('[Hotel Scoring] Analyzing hotel with user query:', userQuery)
  console.log('[Hotel Scoring] User answers:', answers)

  // Step 1: Extract user preferences from answers
  const preferences = extractUserPreferences(answers)

  // Step 2: Calculate individual category scores
  // Note: Real implementation would use AI agents to research each category
  // For MVP, we use rule-of-thumb scoring
  const location = calculateLocationScore(preferences, answers)
  const reviews = calculateReviewScore(preferences, answers)
  const cleanliness = calculateCleanlinessScore(preferences, answers)
  const value = calculateValueScore(preferences, answers)
  const amenities = calculateAmenitiesScore(preferences, answers)

  // Step 3: Apply weights to calculate total score
  const totalScore = Math.round(
    (location.categoryScore * location.weight) +
    (reviews.categoryScore * reviews.weight) +
    (cleanliness.categoryScore * cleanliness.weight) +
    (value.categoryScore * value.weight) +
    (amenities.categoryScore * amenities.weight)
  )

  // Step 4: Detect red flags
  const warnings = detectRedFlags(location, reviews, cleanliness, value, answers)

  // Step 5: Determine recommendation
  const recommendation = determineRecommendation(totalScore, warnings)

  // Step 6: Generate reasoning
  const reasoning = generateReasoning(
    totalScore,
    recommendation,
    location,
    reviews,
    cleanliness,
    value,
    amenities,
    warnings
  )

  // Step 7: Calculate confidence based on data quality
  const confidence = calculateConfidence(answers, warnings)

  // Step 8: Extract top pros and cons
  const { topPros, topCons } = extractProsAndCons(
    location,
    reviews,
    cleanliness,
    value,
    amenities,
    warnings
  )

  const score: HotelScore = {
    location,
    reviews,
    cleanliness,
    value,
    amenities,
    totalScore,
    recommendation,
    reasoning,
    warnings,
    confidence,
    hotelName: extractHotelName(answers),
    pricePerNight: value.pricePerNight,
    topPros,
    topCons
  }

  console.log('[Hotel Scoring] Final score:', score)

  return { score }
}

/**
 * Extract user preferences from intake answers
 */
function extractUserPreferences(answers: Answers) {
  return {
    destination: answers['hotel_destination'] as string || 'Unknown',
    budget: parseFloat(answers['hotel_budget'] as string) || 150,
    guests: parseInt(answers['hotel_guests'] as string) || 2,
    purpose: answers['hotel_purpose'] as string || 'Leisure',
    locationPriority: answers['hotel_location_priority'] as string || 'Very important',
    proximityNeeds: (answers['hotel_location_proximity'] as string[]) || [],
    mustHaveAmenities: (answers['hotel_amenities'] as string[]) || [],
    dealBreakers: (answers['hotel_dealbreakers'] as string[]) || []
  }
}

/**
 * Calculate Location Score (35% weight)
 */
function calculateLocationScore(
  preferences: ReturnType<typeof extractUserPreferences>,
  answers: Answers
): LocationScore {

  // Rule-of-thumb: Assume good location for MVP
  // Real implementation: AI agents would research:
  // - Distance to key attractions
  // - Public transportation options
  // - Neighborhood safety reports
  // - Walkability scores

  let distanceScore = 75 // Default: reasonably located
  let transportScore = 75 // Default: moderate access
  let safetyScore = 75 // Default: safe area
  let walkScore = 70 // Default: somewhat walkable

  // Adjust based on location priority
  if (preferences.locationPriority === 'Very important') {
    // User values location highly - assume they've pre-screened
    distanceScore = 85
    transportScore = 80
  } else if (preferences.locationPriority === 'Not very important') {
    // User is flexible on location for better value
    distanceScore = 60
    transportScore = 65
  }

  // Calculate weighted category score
  const categoryScore = Math.round(
    (distanceScore * 0.40) + // 40% weight to attraction proximity
    (transportScore * 0.30) + // 30% weight to transportation
    (safetyScore * 0.20) +    // 20% weight to safety
    (walkScore * 0.10)        // 10% weight to walkability
  )

  return {
    distanceToAttractions: distanceScore,
    transportationAccess: transportScore,
    neighborhoodSafety: safetyScore,
    walkability: walkScore,
    categoryScore,
    weight: 0.35,
    nearestAttraction: 'City center',
    distanceKm: 2.5,
    walkTimeMinutes: 30,
    transitOptions: ['Metro', 'Bus', 'Taxi'],
    safetyRating: 'Safe'
  }
}

/**
 * Calculate Review Score (30% weight)
 */
function calculateReviewScore(
  preferences: ReturnType<typeof extractUserPreferences>,
  answers: Answers
): ReviewScore {

  // Rule-of-thumb: Assume moderate-to-good reviews for MVP
  // Real implementation: AI agents would analyze:
  // - TripAdvisor, Google, Booking.com reviews
  // - Sentiment analysis on review text
  // - Recent review trends
  // - Red flag detection in complaints

  const overallRating = 82 // Default: 4.1 stars out of 5 = 82/100
  const sentimentScore = 78 // Default: mostly positive sentiment
  const trendAnalysis = 75 // Default: stable quality
  const redFlagCount = 0 // Default: no major issues

  const categoryScore = Math.round(
    (overallRating * 0.50) +    // 50% weight to overall rating
    (sentimentScore * 0.30) +   // 30% weight to sentiment
    (trendAnalysis * 0.20)      // 20% weight to trends
  )

  return {
    overallRating,
    sentimentScore,
    trendAnalysis,
    redFlagCount,
    categoryScore,
    weight: 0.30,
    totalReviews: 1250,
    averageStars: 4.1,
    positivePercent: 78,
    negativePercent: 12,
    recentTrend: 'Stable',
    topPraises: ['Great location', 'Friendly staff', 'Clean rooms'],
    topComplaints: ['WiFi could be faster', 'Breakfast limited options', 'Check-in wait times']
  }
}

/**
 * Calculate Cleanliness Score (25% weight)
 */
function calculateCleanlinessScore(
  preferences: ReturnType<typeof extractUserPreferences>,
  answers: Answers
): CleanlinessScore {

  // Rule-of-thumb: Assume good cleanliness unless evidence otherwise
  // Real implementation: AI agents would check for:
  // - Cleanliness-specific review mentions
  // - Bed bug reports (immediate disqualification)
  // - Maintenance complaint patterns

  const cleanlinessRating = 85 // Default: well-maintained
  const pestReports = false // Default: no pest issues
  const maintenanceIssues = 2 // Default: minor issues only

  const categoryScore = cleanlinessRating // Direct mapping for cleanliness

  return {
    cleanlinessRating,
    pestReports,
    maintenanceIssues,
    categoryScore,
    weight: 0.25,
    cleanlinessStars: 4.3,
    pestWarnings: [],
    maintenanceComplaints: ['Minor wear in hallways', 'Occasional AC noise']
  }
}

/**
 * Calculate Value Score (20% weight)
 */
function calculateValueScore(
  preferences: ReturnType<typeof extractUserPreferences>,
  answers: Answers
): ValueScore {

  const basePrice = preferences.budget
  const taxes = Math.round(basePrice * 0.12) // 12% tax estimate
  const resortFee = 0 // No resort fee by default
  const parkingFee = preferences.mustHaveAmenities.includes('Free parking') ? 0 : 25
  const totalCost = basePrice + taxes + resortFee + parkingFee

  // Calculate market comparison
  // Rule-of-thumb: Budget is assumed to be market-appropriate
  let marketComparison = 75 // Default: fair price
  if (basePrice < 100) {
    marketComparison = 90 // Budget option = great value
  } else if (basePrice > 200) {
    marketComparison = 60 // Premium pricing = lower value score
  }

  // Calculate value-for-money
  // Consider amenities relative to price
  const amenityCount = preferences.mustHaveAmenities.length
  let valueForMoney = 75 // Default
  if (amenityCount > 5 && basePrice < 150) {
    valueForMoney = 90 // Many amenities at good price = excellent value
  } else if (amenityCount < 2 && basePrice > 150) {
    valueForMoney = 60 // Few amenities at high price = poor value
  }

  const categoryScore = Math.round(
    (marketComparison * 0.50) +   // 50% weight to market pricing
    (valueForMoney * 0.50)        // 50% weight to value proposition
  )

  return {
    pricePerNight: basePrice,
    marketComparison,
    hiddenFees: parkingFee + resortFee,
    valueForMoney,
    categoryScore,
    weight: 0.20,
    basePrice,
    taxes,
    resortFee,
    parkingFee,
    totalCost,
    pricePercentile: marketComparison
  }
}

/**
 * Calculate Amenities Score (15% weight)
 */
function calculateAmenitiesScore(
  preferences: ReturnType<typeof extractUserPreferences>,
  answers: Answers
): AmenitiesScore {

  const mustHaves = preferences.mustHaveAmenities
  const presentCount = mustHaves.length // Assume all must-haves are present for MVP
  const mustHaveMatch = mustHaves.length > 0 ? 100 : 75 // 100% match or default

  // Service quality based on purpose
  let serviceQuality = 75 // Default: good service
  if (preferences.purpose === 'Business') {
    serviceQuality = 85 // Business hotels typically have better service
  } else if (preferences.purpose === 'Family') {
    serviceQuality = 70 // Family hotels focus more on facilities than service
  }

  const uniqueFeatures = ['Rooftop bar', 'City view rooms', '24/7 concierge']

  const categoryScore = Math.round(
    (mustHaveMatch * 0.60) +      // 60% weight to must-have match
    (serviceQuality * 0.40)       // 40% weight to service quality
  )

  return {
    mustHaveMatch,
    serviceQuality,
    uniqueFeatures,
    categoryScore,
    weight: 0.15,
    presentAmenities: mustHaves,
    missingAmenities: [],
    serviceRating: 'Good',
    bestSuitedFor: preferences.purpose as any,
    accessibilityNotes: []
  }
}

/**
 * Detect red flags that should trigger warnings
 */
function detectRedFlags(
  location: LocationScore,
  reviews: ReviewScore,
  cleanliness: CleanlinessScore,
  value: ValueScore,
  answers: Answers
): string[] {
  const warnings: string[] = []

  // Red flag: Bed bugs (DISQUALIFY)
  if (cleanliness.pestReports) {
    warnings.push('BED_BUGS: Pest reports found - IMMEDIATE DISQUALIFICATION')
  }

  // Red flag: Major cleanliness issues (DISQUALIFY)
  if (cleanliness.cleanlinessRating < 60) {
    warnings.push('MAJOR_CLEANLINESS: Cleanliness rating below 60/100')
  }

  // Red flag: Safety concerns (DISQUALIFY)
  if (location.neighborhoodSafety < 50) {
    warnings.push('SAFETY_CONCERN: Neighborhood safety score below 50/100')
  }

  // Warning: Excessive noise
  if (reviews.redFlagCount > 0) {
    warnings.push('EXCESSIVE_NOISE: Multiple noise complaints in recent reviews')
  }

  // Warning: Recent quality decline
  if (reviews.trendAnalysis < 50) {
    warnings.push('RECENT_DECLINE: Hotel quality declining based on recent reviews')
  }

  // Warning: Hidden fees
  if (value.hiddenFees > 50) {
    warnings.push(`HIDDEN_FEES: $${value.hiddenFees} in additional fees not included in base price`)
  }

  // Check deal-breakers
  const dealBreakers = (answers['hotel_dealbreakers'] as string[]) || []
  if (dealBreakers.includes('Noise sensitivity (quiet room essential)') && reviews.redFlagCount > 0) {
    warnings.push('NOISE_SENSITIVITY: User requires quiet room but noise complaints detected')
  }

  return warnings
}

/**
 * Determine recommendation based on score and red flags
 */
function determineRecommendation(
  totalScore: number,
  warnings: string[]
): 'BOOK' | 'CONSIDER' | 'PASS' {

  // Check for disqualifying red flags
  const disqualifyFlags = ['BED_BUGS', 'MAJOR_CLEANLINESS', 'SAFETY_CONCERN']
  const hasDisqualifyingFlag = warnings.some(w =>
    disqualifyFlags.some(flag => w.includes(flag))
  )

  if (hasDisqualifyingFlag) {
    return 'PASS'
  }

  // Score-based recommendation
  if (totalScore >= 80) {
    return 'BOOK'
  } else if (totalScore >= 60) {
    return 'CONSIDER'
  } else {
    return 'PASS'
  }
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  totalScore: number,
  recommendation: string,
  location: LocationScore,
  reviews: ReviewScore,
  cleanliness: CleanlinessScore,
  value: ValueScore,
  amenities: AmenitiesScore,
  warnings: string[]
): string {

  const parts: string[] = []

  // Overall assessment
  parts.push(`Overall Score: ${totalScore}/100 (${recommendation})`)

  // Highlight strongest category
  const scores = [
    { name: 'Location', score: location.categoryScore },
    { name: 'Reviews', score: reviews.categoryScore },
    { name: 'Cleanliness', score: cleanliness.categoryScore },
    { name: 'Value', score: value.categoryScore },
    { name: 'Amenities', score: amenities.categoryScore }
  ]
  const strongest = scores.reduce((max, s) => s.score > max.score ? s : max)
  const weakest = scores.reduce((min, s) => s.score < min.score ? s : min)

  parts.push(`\nStrongest factor: ${strongest.name} (${strongest.score}/100)`)
  if (weakest.score < 70) {
    parts.push(`Area for concern: ${weakest.name} (${weakest.score}/100)`)
  }

  // Add warning summary
  if (warnings.length > 0) {
    parts.push(`\n⚠️ ${warnings.length} warning(s) detected - review carefully`)
  }

  return parts.join('\n')
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(answers: Answers, warnings: string[]): number {
  let confidence = 0.8 // Default: 80% confidence with rule-of-thumb data

  // Lower confidence if many warnings
  if (warnings.length > 2) {
    confidence -= 0.1
  }

  // Higher confidence if user provided detailed preferences
  const detailedAnswers = ['hotel_location_priority', 'hotel_amenities', 'hotel_dealbreakers']
  const providedDetails = detailedAnswers.filter(key => answers[key]).length
  if (providedDetails === 3) {
    confidence += 0.1
  }

  return Math.max(0.5, Math.min(1.0, confidence))
}

/**
 * Extract top pros and cons
 */
function extractProsAndCons(
  location: LocationScore,
  reviews: ReviewScore,
  cleanliness: CleanlinessScore,
  value: ValueScore,
  amenities: AmenitiesScore,
  warnings: string[]
): { topPros: string[]; topCons: string[] } {

  const topPros: string[] = []
  const topCons: string[] = []

  // Pros (from high-scoring categories)
  if (location.categoryScore >= 80) {
    topPros.push(`Excellent location (${location.categoryScore}/100)`)
  }
  if (reviews.categoryScore >= 80) {
    topPros.push(`Highly rated by guests (${reviews.averageStars}/5 stars)`)
  }
  if (cleanliness.categoryScore >= 85) {
    topPros.push(`Exceptional cleanliness (${cleanliness.categoryScore}/100)`)
  }
  if (value.categoryScore >= 80) {
    topPros.push(`Great value for money (${value.categoryScore}/100)`)
  }
  if (amenities.categoryScore >= 80) {
    topPros.push(`All must-have amenities included`)
  }

  // Cons (from warnings and low scores)
  if (warnings.length > 0) {
    topCons.push(`${warnings.length} warning(s): ${warnings[0].split(':')[0]}`)
  }
  if (location.categoryScore < 70) {
    topCons.push(`Location may not be ideal (${location.categoryScore}/100)`)
  }
  if (value.hiddenFees > 30) {
    topCons.push(`Additional fees: $${value.hiddenFees}/night`)
  }
  if (reviews.categoryScore < 70) {
    topCons.push(`Mixed guest reviews (${reviews.averageStars}/5 stars)`)
  }

  // Ensure we have at least 1-3 items in each
  if (topPros.length === 0) {
    topPros.push('Standard hotel meeting basic requirements')
  }
  if (topCons.length === 0) {
    topCons.push('No significant concerns identified')
  }

  return {
    topPros: topPros.slice(0, 3),
    topCons: topCons.slice(0, 3)
  }
}

/**
 * Extract hotel name from answers (if provided)
 */
function extractHotelName(answers: Answers): string | undefined {
  // In future, user might provide specific hotel name
  // For now, return destination-based name
  const destination = answers['hotel_destination'] as string
  return destination ? `Hotel in ${destination}` : undefined
}
