// MAUT Scoring System for Apartment Decisions
// Phase 3: Multi-Attribute Utility Theory Implementation
//
// DESIGN PHILOSOPHY: API-Optional, Rule-of-Thumb First
// =====================================================
// This scoring system works WITHOUT any external APIs by using:
// 1. User-provided data (rent, income, bedrooms, etc.)
// 2. General rules of thumb (30% affordability rule, commute estimates)
// 3. Reasonable defaults (assume safe neighborhood, moderate walkability)
// 4. AI research capabilities (web search for neighborhood info)
//
// APIs are OPTIONAL enhancements that improve accuracy but are NOT required.
// The system provides meaningful scores even with zero API calls.

import {
  ApartmentScore,
  ApartmentInput,
  FinancialScore,
  LocationScore,
  PropertyScore,
  LifestyleScore,
  ExternalApartmentData,
  RECOMMENDATION_THRESHOLDS,
  DEFAULT_WEIGHTS,
  AFFORDABILITY_THRESHOLD
} from './types'
import { Answers } from '@/lib/intake/types'

/**
 * Main scoring function
 * Calculates MAUT score for an apartment
 */
export function calculateApartmentScore(input: ApartmentInput): ApartmentScore {
  const { answers, externalData } = input

  // Calculate category scores
  const financial = calculateFinancialScore(answers, externalData)
  const location = calculateLocationScore(answers, externalData)
  const property = calculatePropertyScore(answers, externalData)
  const lifestyle = calculateLifestyleScore(answers, externalData)

  // Calculate total score (weighted sum)
  const totalScore =
    financial.categoryScore * DEFAULT_WEIGHTS.financial +
    location.categoryScore * DEFAULT_WEIGHTS.location +
    property.categoryScore * DEFAULT_WEIGHTS.property +
    lifestyle.categoryScore * DEFAULT_WEIGHTS.lifestyle

  // Generate recommendation
  const recommendation = determineRecommendation(totalScore)

  // Generate reasoning
  const reasoning = generateReasoning(totalScore, financial, location, property, lifestyle)

  // Generate warnings
  const warnings = generateWarnings(answers, financial, location, externalData)

  return {
    financial,
    location,
    property,
    lifestyle,
    totalScore: Math.round(totalScore * 10) / 10, // Round to 1 decimal
    recommendation,
    reasoning,
    warnings
  }
}

/**
 * Financial Score (40% weight)
 * Affordability, market value, hidden costs
 */
function calculateFinancialScore(
  answers: Answers,
  externalData?: Partial<ExternalApartmentData>
): FinancialScore {
  // Affordability: rent % of income (30% rule)
  const rent = answers.apt_rent as number
  const income = answers.apt_income as number
  const rentRatio = rent / income
  const affordability = calculateAffordabilityScore(rentRatio)

  // Market Value: compare to median rent
  const marketValue = calculateMarketValueScore(rent, externalData?.marketRent)

  // Hidden Costs: utilities, deposits, parking
  const hiddenCosts = calculateHiddenCostsScore(answers)

  // Category score (equal weight to each sub-component)
  const categoryScore = (affordability + marketValue + hiddenCosts) / 3

  return {
    affordability,
    marketValue,
    hiddenCosts,
    categoryScore,
    weight: 0.4
  }
}

/**
 * Affordability Score
 * 100 = rent ≤ 25% of income (very affordable)
 * 80 = rent ≤ 30% of income (affordable, meets rule)
 * 60 = rent ≤ 35% of income (stretch, but manageable)
 * 40 = rent ≤ 40% of income (risky)
 * 0 = rent > 40% of income (unaffordable)
 */
function calculateAffordabilityScore(rentRatio: number): number {
  if (rentRatio <= 0.25) return 100
  if (rentRatio <= 0.30) return 80
  if (rentRatio <= 0.35) return 60
  if (rentRatio <= 0.40) return 40
  return Math.max(0, 40 - (rentRatio - 0.40) * 200) // Steep decline after 40%
}

/**
 * Market Value Score
 * Compare asking rent to market median
 * FALLBACK: Use rule-of-thumb estimates based on bedrooms/location
 */
function calculateMarketValueScore(
  rent: number,
  marketData?: ExternalApartmentData['marketRent']
): number {
  if (!marketData) {
    // RULE OF THUMB: Estimate market rent based on typical US rental prices
    // This is a fallback when API data is unavailable
    // Average rent per bedroom: $800-$1200 depending on location
    // User can provide city/neighborhood as context for better estimates
    return 75 // Neutral-positive score when no data (assume fair market value)
  }

  const { median, low, high } = marketData
  const ratio = rent / median

  if (ratio <= 0.85) return 100 // 15%+ below market (excellent deal)
  if (ratio <= 0.95) return 90 // 5-15% below market (good deal)
  if (ratio <= 1.05) return 75 // Within 5% of market (fair)
  if (ratio <= 1.15) return 60 // 5-15% above market (acceptable)
  if (ratio <= 1.25) return 40 // 15-25% above market (expensive)
  return 20 // 25%+ above market (overpriced)
}

/**
 * Hidden Costs Score
 * Utilities, deposits, parking, pet fees
 */
function calculateHiddenCostsScore(answers: Answers): number {
  let score = 100
  let monthlyCosts = 0

  // Utilities not included
  if (answers.apt_utilities === 'Tenant pays all') {
    monthlyCosts += 150 // Estimate $150/month
    score -= 20
  } else if (answers.apt_utilities === 'Tenant pays some') {
    monthlyCosts += 75 // Estimate $75/month
    score -= 10
  }

  // Parking cost
  if (answers.apt_parking && answers.apt_parking !== 'Free parking') {
    monthlyCosts += 100 // Estimate $100/month
    score -= 15
  }

  // Pet deposit/rent (if has pets)
  if (answers.apt_pets && answers.apt_pets !== 'No pets') {
    score -= 10 // One-time deposit, monthly pet rent
  }

  return Math.max(0, score)
}

/**
 * Location Score (30% weight)
 * Commute, safety, walkability, transit access
 */
function calculateLocationScore(
  answers: Answers,
  externalData?: Partial<ExternalApartmentData>
): LocationScore {
  const commuteScore = calculateCommuteScore(answers, externalData?.commute)
  const neighborhoodSafety = calculateSafetyScore(externalData?.crime)
  const walkability = calculateWalkabilityScore(externalData?.walkScore)
  const transitAccess = calculateTransitScore(answers, externalData?.walkScore)

  const categoryScore = (commuteScore + neighborhoodSafety + walkability + transitAccess) / 4

  return {
    commuteScore,
    neighborhoodSafety,
    walkability,
    transitAccess,
    categoryScore,
    weight: 0.3
  }
}

/**
 * Commute Score
 * <15min = 100, <30min = 80, <45min = 60, <60min = 40, >60min = 20
 * FALLBACK: Estimate based on distance if user provides it
 */
function calculateCommuteScore(
  answers: Answers,
  commuteData?: ExternalApartmentData['commute']
): number {
  // If WFH full-time, commute doesn't matter
  if (answers.apt_wfh === 'Yes, full-time') {
    return 100
  }

  if (!commuteData) {
    // RULE OF THUMB: If user provided commute time estimate, use it
    const estimatedCommute = answers.apt_commute_estimate as number | undefined
    if (estimatedCommute) {
      if (estimatedCommute < 15) return 100
      if (estimatedCommute < 30) return 80
      if (estimatedCommute < 45) return 60
      if (estimatedCommute < 60) return 40
      return 20
    }
    // No data at all - ask AI to research typical commute for the area
    return 75 // Assume reasonable commute (neutral-positive)
  }

  const minutes = commuteData.timeMinutes

  if (minutes < 15) return 100
  if (minutes < 30) return 80
  if (minutes < 45) return 60
  if (minutes < 60) return 40
  return 20
}

/**
 * Safety Score
 * Based on crime percentile (higher = safer)
 * FALLBACK: User's perception or neighborhood reputation
 */
function calculateSafetyScore(crimeData?: ExternalApartmentData['crime']): number {
  if (!crimeData) {
    // RULE OF THUMB: Safety can be inferred from:
    // - Neighborhood name/reputation (AI can research)
    // - User's comfort level
    // - General city safety ratings
    // Default to neutral, let AI research the neighborhood
    return 75 // Assume safe unless evidence otherwise
  }

  // Percentile is already 0-100 (100 = safest)
  return crimeData.percentile
}

/**
 * Walkability Score
 * Use Walk Score API (already 0-100)
 * FALLBACK: Estimate based on neighborhood type
 */
function calculateWalkabilityScore(walkScore?: ExternalApartmentData['walkScore']): number {
  if (!walkScore) {
    // RULE OF THUMB: Urban = walkable, Suburban = car-needed
    // AI can research neighborhood type from address
    // Downtown/city center = high walkability
    // Suburbs/residential = low walkability
    return 60 // Assume moderate walkability (can walk to some places)
  }

  return walkScore.score
}

/**
 * Transit Access Score
 * Based on Walk Score's transit score
 */
function calculateTransitScore(
  answers: Answers,
  walkScore?: ExternalApartmentData['walkScore']
): number {
  // If has car, transit less important
  if (answers.apt_transportation === 'Car (own or share)') {
    return 75 // Not critical but still nice to have
  }

  if (!walkScore?.transitScore) {
    return 50 // No data
  }

  return walkScore.transitScore
}

/**
 * Property Score (20% weight)
 * Space adequacy, amenities, building quality
 */
function calculatePropertyScore(
  answers: Answers,
  externalData?: Partial<ExternalApartmentData>
): PropertyScore {
  const spaceAdequacy = calculateSpaceScore(answers)
  const amenitiesScore = calculateAmenitiesScore(answers)
  const buildingQuality = calculateBuildingQualityScore(answers)

  const categoryScore = (spaceAdequacy + amenitiesScore + buildingQuality) / 3

  return {
    spaceAdequacy,
    amenitiesScore,
    buildingQuality,
    categoryScore,
    weight: 0.2
  }
}

/**
 * Space Adequacy Score
 * Does the space meet needs?
 */
function calculateSpaceScore(answers: Answers): number {
  let score = 50 // Base score

  // Bedroom count (critical)
  const bedroomsNeeded = answers.apt_bedrooms as number
  const bedroomsAvailable = answers.apt_bedrooms as number
  if (bedroomsAvailable >= bedroomsNeeded) {
    score += 30
  } else {
    score -= 30 // Major penalty for insufficient bedrooms
  }

  // Bathroom count
  const bathroomsNeeded = answers.apt_bathrooms as number
  if (bathroomsNeeded && bathroomsNeeded >= 1) {
    score += 10
  }

  // Square footage (if WFH, need more space)
  if (answers.apt_wfh && answers.apt_wfh !== 'No') {
    score += 10 // Bonus if working from home (assumes adequate space)
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Amenities Score
 * How many desired amenities does it have?
 */
function calculateAmenitiesScore(answers: Answers): number {
  const desired = (answers.apt_amenities as string[]) || []
  if (desired.length === 0) {
    return 75 // No specific amenities desired
  }

  // Assume we'll check which amenities are available
  // For now, return neutral score
  return 50
}

/**
 * Building Quality Score
 * Based on age, condition, reviews
 */
function calculateBuildingQualityScore(answers: Answers): number {
  let score = 50

  // Building age
  const age = answers.apt_building_age as string
  if (age === 'New (< 5 years)') {
    score += 20
  } else if (age === 'Modern (5-15 years)') {
    score += 10
  } else if (age === 'Older (> 30 years)') {
    score -= 10
  }

  // Elevator (if not ground floor)
  const floor = answers.apt_floor as number
  const hasElevator = answers.apt_elevator as boolean
  if (floor > 2 && !hasElevator) {
    score -= 15 // Penalty for high floor without elevator
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Lifestyle Score (10% weight)
 * Neighborhood vibe, pet friendliness, WFH suitability
 */
function calculateLifestyleScore(
  answers: Answers,
  externalData?: Partial<ExternalApartmentData>
): LifestyleScore {
  const neighborhoodVibe = calculateNeighborhoodVibeScore(answers)
  const petFriendliness = calculatePetFriendlinessScore(answers)
  const wfhSuitability = calculateWFHScore(answers)

  const categoryScore = (neighborhoodVibe + petFriendliness + wfhSuitability) / 3

  return {
    neighborhoodVibe,
    petFriendliness,
    wfhSuitability,
    categoryScore,
    weight: 0.1
  }
}

/**
 * Neighborhood Vibe Score
 * Match user's desired vibe
 */
function calculateNeighborhoodVibeScore(answers: Answers): number {
  // This would require neighborhood data (young professionals, families, etc.)
  // For now, return neutral
  return 50
}

/**
 * Pet Friendliness Score
 */
function calculatePetFriendlinessScore(answers: Answers): number {
  const hasPets = answers.apt_pets && answers.apt_pets !== 'No pets'

  if (!hasPets) {
    return 100 // Not relevant
  }

  // Check if building allows pets
  const allowsPets = answers.apt_pet_policy !== 'No pets allowed'
  return allowsPets ? 75 : 0
}

/**
 * WFH Suitability Score
 */
function calculateWFHScore(answers: Answers): number {
  const wfh = answers.apt_wfh

  if (!wfh || wfh === 'No') {
    return 100 // Not relevant
  }

  // Full-time WFH needs good space
  if (wfh === 'Yes, full-time') {
    // Would need to check if there's dedicated office space
    // For now, assume adequate if 1+ bedroom
    const bedrooms = answers.apt_bedrooms as number
    return bedrooms >= 1 ? 75 : 50
  }

  // Hybrid WFH
  return 75
}

/**
 * Determine Recommendation
 * Based on total score thresholds
 */
function determineRecommendation(totalScore: number): 'RENT' | 'PASS' | 'NEGOTIATE' {
  if (totalScore >= RECOMMENDATION_THRESHOLDS.RENT) {
    return 'RENT'
  } else if (totalScore >= RECOMMENDATION_THRESHOLDS.NEGOTIATE) {
    return 'NEGOTIATE'
  } else {
    return 'PASS'
  }
}

/**
 * Generate Reasoning
 * Explain the recommendation
 */
function generateReasoning(
  totalScore: number,
  financial: FinancialScore,
  location: LocationScore,
  property: PropertyScore,
  lifestyle: LifestyleScore
): string {
  const parts: string[] = []

  // Overall assessment
  if (totalScore >= 75) {
    parts.push('This apartment is a strong match for your needs.')
  } else if (totalScore >= 60) {
    parts.push('This apartment is acceptable but has some concerns.')
  } else {
    parts.push('This apartment has significant issues that make it a poor fit.')
  }

  // Financial
  if (financial.categoryScore >= 75) {
    parts.push('Financially sound with good affordability and market value.')
  } else if (financial.categoryScore < 60) {
    parts.push('Financial concerns: affordability or market value issues.')
  }

  // Location
  if (location.categoryScore >= 75) {
    parts.push('Excellent location with good commute and safety.')
  } else if (location.categoryScore < 60) {
    parts.push('Location concerns: commute time, safety, or walkability.')
  }

  // Property
  if (property.categoryScore >= 75) {
    parts.push('Property meets space and amenity needs.')
  } else if (property.categoryScore < 60) {
    parts.push('Property concerns: inadequate space or missing amenities.')
  }

  return parts.join(' ')
}

/**
 * Generate Warnings
 * Critical issues to flag
 */
function generateWarnings(
  answers: Answers,
  financial: FinancialScore,
  location: LocationScore,
  externalData?: Partial<ExternalApartmentData>
): string[] {
  const warnings: string[] = []

  // Affordability warning (30% rule)
  const rent = answers.apt_rent as number
  const income = answers.apt_income as number
  const rentRatio = rent / income

  if (rentRatio > AFFORDABILITY_THRESHOLD) {
    const percentage = (rentRatio * 100).toFixed(1)
    warnings.push(
      `⚠️ Rent is ${percentage}% of income (exceeds 30% affordability rule). Long-term sustainability risk.`
    )
  }

  // Overpriced warning
  if (financial.marketValue < 40) {
    warnings.push(
      `⚠️ Rent is significantly above market median. Consider negotiating or looking at comparable units.`
    )
  }

  // Long commute warning
  if (externalData?.commute && externalData.commute.timeMinutes > 45) {
    warnings.push(
      `⚠️ Commute time exceeds 45 minutes. This adds significant time and cost to your daily routine.`
    )
  }

  // Safety warning
  if (externalData?.crime && externalData.crime.percentile < 40) {
    warnings.push(
      `⚠️ Neighborhood crime rate is above city average. Research the specific area carefully.`
    )
  }

  // Deal-breakers
  const dealbreakers = answers.apt_dealbreakers as string
  if (dealbreakers) {
    warnings.push(`🚫 Ensure apartment doesn't violate your deal-breakers: ${dealbreakers}`)
  }

  return warnings
}

/**
 * Validate that all required data is present
 */
export function validateApartmentInput(input: ApartmentInput): {
  valid: boolean
  missingFields: string[]
} {
  const { answers } = input
  const required = ['apt_rent', 'apt_income', 'apt_bedrooms', 'apt_address']
  const missingFields: string[] = []

  for (const field of required) {
    if (!answers[field]) {
      missingFields.push(field)
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields
  }
}
