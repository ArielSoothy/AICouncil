// Trip Planning Scoring System
// Phase 4: Pareto Optimization Implementation
//
// DESIGN PHILOSOPHY: API-Optional, Rule-of-Thumb First
// =====================================================
// Scoring works WITHOUT APIs using:
// 1. Historical travel cost averages ($0.12/mile flights, $120/night hotels)
// 2. Budget allocation rules (40% flights, 30% hotels, 20% activities, 10% food)
// 3. Destination knowledge (AI can research popular attractions)
// 4. Feasibility heuristics (realistic itinerary pacing)
//
// External data (flight/hotel prices) is OPTIONAL and improves accuracy.

import {
  TripScore,
  TripInput,
  BudgetScore,
  ExperienceScore,
  FeasibilityScore,
  ItineraryDay,
  Activity,
  BUDGET_ALLOCATION,
  COST_RULES,
  TRIP_LENGTH_RULES,
  PACE_RULES,
  RECOMMENDATION_THRESHOLDS
} from './types'
import { Answers } from '@/lib/intake/types'

/**
 * Main scoring function
 * Calculates Pareto score for a trip plan
 */
export function calculateTripScore(input: TripInput): TripScore {
  const { answers, itinerary } = input

  // Calculate category scores
  const budget = calculateBudgetScore(answers, itinerary)
  const experiences = calculateExperienceScore(answers, itinerary)
  const feasibility = calculateFeasibilityScore(answers, itinerary)

  // Calculate overall score (equal weights for Pareto optimization)
  const overallScore =
    budget.categoryScore * budget.weight +
    experiences.categoryScore * experiences.weight +
    feasibility.categoryScore * feasibility.weight

  // Pareto rank (1 = optimal, no trip dominates this one)
  const paretoRank = calculateParetoRank(budget, experiences, feasibility)

  // Recommendation
  const recommendation = determineRecommendation(overallScore, paretoRank)

  // Reasoning
  const reasoning = generateReasoning(overallScore, budget, experiences, feasibility)

  // Warnings
  const warnings = generateWarnings(answers, budget, feasibility)

  return {
    budget,
    experiences,
    feasibility,
    paretoRank,
    overallScore: Math.round(overallScore * 10) / 10,
    recommendation,
    reasoning,
    warnings
  }
}

/**
 * Budget Score (33% weight)
 * How well does trip fit user's budget?
 */
function calculateBudgetScore(answers: Answers, itinerary?: ItineraryDay[]): BudgetScore {
  const userBudget = (answers.trip_budget as number) || 0
  const days = (answers.trip_days as number) || 7
  const destination = (answers.trip_destination as string) || ''
  const style = (answers.trip_style as string) || 'mid-range'

  // Estimate costs using rules of thumb
  const estimatedCosts = estimateTripCosts(destination, days, style)

  // Budget fit score
  const budgetFit = calculateBudgetFitScore(userBudget, estimatedCosts.total)

  // Category score
  const categoryScore = budgetFit

  return {
    totalCost: estimatedCosts.total,
    budgetFit,
    breakdown: estimatedCosts.breakdown,
    categoryScore,
    weight: 0.33
  }
}

/**
 * Estimate trip costs using rule-of-thumb formulas
 * NO API REQUIRED - uses historical averages
 */
function estimateTripCosts(
  destination: string,
  days: number,
  style: string
): {
  total: number
  breakdown: BudgetScore['breakdown']
} {
  // Determine travel tier (budget/mid-range/luxury)
  const tier = style.includes('budget')
    ? 'budget'
    : style.includes('luxury')
      ? 'luxury'
      : 'midRange'

  // Estimate flight cost (rule: $0.12/mile domestic, $0.10/mile international)
  // AI can research typical distance to destination
  const isInternational = destination.toLowerCase().includes('europe') ||
    destination.toLowerCase().includes('asia') ||
    destination.toLowerCase().includes('africa') ||
    destination.toLowerCase().includes('australia')

  const estimatedMiles = isInternational ? 5000 : 1500 // Rough estimates
  const flightCostPerMile = isInternational
    ? COST_RULES.flightCostPerMile.international
    : COST_RULES.flightCostPerMile.domestic

  const flights = estimatedMiles * flightCostPerMile

  // Estimate hotel cost (rule: budget $50, mid $120, luxury $250 per night)
  const hotelCost = COST_RULES.hotelCostPerNight[tier]
  const hotels = hotelCost * days

  // Estimate food cost (rule: budget $30, mid $60, luxury $120 per day)
  const foodCost = COST_RULES.foodCostPerDay[tier]
  const food = foodCost * days

  // Estimate activity cost (rule: 2-5 activities per day depending on pace)
  const activitiesPerDay = 3 // Average
  const activityCost = COST_RULES.activityCost[tier === 'budget' ? 'budget' : tier === 'luxury' ? 'luxury' : 'midRange']
  const activities = activityCost * activitiesPerDay * days

  // Estimate local transportation (rule: budget $10, mid $30, luxury $80 per day)
  const transportCost = COST_RULES.localTransportPerDay[tier]
  const transportation = transportCost * days

  // Emergency buffer (10% of total)
  const subtotal = flights + hotels + food + activities + transportation
  const buffer = subtotal * 0.1

  const total = Math.round(subtotal + buffer)

  return {
    total,
    breakdown: {
      flights: Math.round(flights),
      hotels: Math.round(hotels),
      activities: Math.round(activities),
      food: Math.round(food),
      transportation: Math.round(transportation),
      buffer: Math.round(buffer)
    }
  }
}

/**
 * Budget Fit Score
 * How well does estimated cost fit user's budget?
 */
function calculateBudgetFitScore(userBudget: number, estimatedCost: number): number {
  if (userBudget === 0) return 50 // No budget provided, neutral

  const ratio = estimatedCost / userBudget

  if (ratio <= 0.85) return 100 // Under budget (15%+ savings)
  if (ratio <= 0.95) return 90 // Slightly under budget
  if (ratio <= 1.05) return 80 // Right on budget
  if (ratio <= 1.15) return 60 // 15% over budget (manageable)
  if (ratio <= 1.30) return 40 // 30% over budget (stretch)
  return 20 // 30%+ over budget (not feasible)
}

/**
 * Experience Score (33% weight)
 * Quality and variety of experiences
 */
function calculateExperienceScore(answers: Answers, itinerary?: ItineraryDay[]): ExperienceScore {
  const interests = (answers.trip_interests as string[]) || []
  const mustSees = (answers.trip_must_see as string) || ''
  const destination = (answers.trip_destination as string) || ''

  // Interest match (AI can research if destination has activities for these interests)
  const interestMatch = 80 // Assume good match, AI can refine

  // Must-sees covered (check if must-see attractions are in itinerary)
  const mustSeesCovered = mustSees ? 75 : 100 // Assume covered, AI can verify

  // Variety score (diverse activities: culture, food, nature, etc.)
  const varietyScore = calculateVarietyScore(interests)

  // Uniqueness (how unique/memorable vs generic tourist spots)
  const uniquenessScore = 70 // Neutral, AI can research

  const categoryScore = (interestMatch + mustSeesCovered + varietyScore + uniquenessScore) / 4

  return {
    interestMatch,
    mustSeesCovered,
    varietyScore,
    uniquenessScore,
    categoryScore,
    weight: 0.33
  }
}

/**
 * Variety Score
 * Based on diversity of interests
 */
function calculateVarietyScore(interests: string[]): number {
  if (interests.length === 0) return 50 // No interests specified

  // More interests = more variety
  if (interests.length >= 4) return 90
  if (interests.length >= 3) return 80
  if (interests.length >= 2) return 70
  return 60 // Single interest (narrow focus)
}

/**
 * Feasibility Score (34% weight)
 * Is this trip actually doable?
 */
function calculateFeasibilityScore(answers: Answers, itinerary?: ItineraryDay[]): FeasibilityScore {
  const days = (answers.trip_days as number) || 7
  const pace = (answers.trip_pace as number) || 5 // 1-10 scale
  const layovers = (answers.trip_layovers as string) || 'Either'

  // Time management (are days appropriately allocated?)
  const timeManagement = calculateTimeManagementScore(days)

  // Pace score (does itinerary match desired pace?)
  const paceScore = calculatePaceScore(pace, days)

  // Logistics score (is travel between activities realistic?)
  const logisticsScore = 80 // Assume good logistics, AI can research

  // Seasonal score (is it a good time to visit?)
  const seasonalScore = 85 // Assume good season, AI can research

  const categoryScore = (timeManagement + paceScore + logisticsScore + seasonalScore) / 4

  return {
    timeManagement,
    paceScore,
    logisticsScore,
    seasonalScore,
    categoryScore,
    weight: 0.34
  }
}

/**
 * Time Management Score
 * Is trip duration appropriate?
 */
function calculateTimeManagementScore(days: number): number {
  if (days < 2) return 30 // Too short (not enough time)
  if (days <= 4) return 70 // Short trip (weekend)
  if (days <= 7) return 90 // Ideal week-long trip
  if (days <= 14) return 85 // Extended trip (2 weeks)
  return 70 // Very long trip (potential burnout)
}

/**
 * Pace Score
 * Does itinerary match user's desired pace?
 */
function calculatePaceScore(pace: number, days: number): number {
  // Pace 1-3 = relaxed (2 activities/day)
  // Pace 4-7 = balanced (3 activities/day)
  // Pace 8-10 = fast-paced (5 activities/day)

  // Check if trip length matches pace
  if (pace <= 3 && days >= 5) return 90 // Relaxed pace with enough time
  if (pace >= 4 && pace <= 7 && days >= 5) return 95 // Balanced pace
  if (pace >= 8 && days <= 7) return 85 // Fast-paced trip (doable but intense)

  return 75 // Pace and days don't perfectly align but workable
}

/**
 * Calculate Pareto Rank
 * 1 = Pareto optimal (no other trip dominates on all objectives)
 * Higher = dominated by other options
 */
function calculateParetoRank(
  budget: BudgetScore,
  experiences: ExperienceScore,
  feasibility: FeasibilityScore
): number {
  // For single trip, assume Pareto rank 1 (optimal)
  // In comparison mode, this would check if any trip dominates this one
  return 1
}

/**
 * Determine Recommendation
 */
function determineRecommendation(
  overallScore: number,
  paretoRank: number
): 'BOOK' | 'MODIFY' | 'RECONSIDER' {
  if (overallScore >= RECOMMENDATION_THRESHOLDS.BOOK && paretoRank === 1) {
    return 'BOOK'
  } else if (overallScore >= RECOMMENDATION_THRESHOLDS.MODIFY) {
    return 'MODIFY'
  } else {
    return 'RECONSIDER'
  }
}

/**
 * Generate Reasoning
 */
function generateReasoning(
  overallScore: number,
  budget: BudgetScore,
  experiences: ExperienceScore,
  feasibility: FeasibilityScore
): string {
  const parts: string[] = []

  if (overallScore >= 80) {
    parts.push('This trip plan is highly recommended.')
  } else if (overallScore >= 60) {
    parts.push('This trip plan is good with some adjustments.')
  } else {
    parts.push('This trip plan has significant issues to address.')
  }

  // Budget
  if (budget.categoryScore >= 80) {
    parts.push(`Budget fits well ($${budget.totalCost} estimated).`)
  } else if (budget.categoryScore < 60) {
    parts.push(`Budget concerns: Estimated $${budget.totalCost} may exceed your budget.`)
  }

  // Experiences
  if (experiences.categoryScore >= 80) {
    parts.push('Excellent match for your interests.')
  } else if (experiences.categoryScore < 60) {
    parts.push('May not fully satisfy your interests.')
  }

  // Feasibility
  if (feasibility.categoryScore >= 80) {
    parts.push('Trip timing and logistics are realistic.')
  } else if (feasibility.categoryScore < 60) {
    parts.push('Feasibility concerns: pacing or logistics may be challenging.')
  }

  return parts.join(' ')
}

/**
 * Generate Warnings
 */
function generateWarnings(
  answers: Answers,
  budget: BudgetScore,
  feasibility: FeasibilityScore
): string[] {
  const warnings: string[] = []

  const userBudget = (answers.trip_budget as number) || 0

  // Budget warning
  if (userBudget > 0 && budget.totalCost > userBudget * 1.15) {
    const overage = budget.totalCost - userBudget
    warnings.push(
      `⚠️ Estimated cost ($${budget.totalCost}) exceeds budget by $${overage}. Consider adjusting accommodations or activities.`
    )
  }

  // Trip length warning
  const days = (answers.trip_days as number) || 7
  if (days < 3) {
    warnings.push(
      `⚠️ Trip is very short (${days} days). Consider extending to fully experience the destination.`
    )
  }

  if (days > 14) {
    warnings.push(
      `⚠️ Trip is quite long (${days} days). Ensure you have sufficient budget and time off.`
    )
  }

  // Pace warning
  const pace = (answers.trip_pace as number) || 5
  if (pace >= 9) {
    warnings.push(
      `⚠️ Very fast-paced itinerary may lead to burnout. Consider building in rest days.`
    )
  }

  return warnings
}

/**
 * Validate trip input
 */
export function validateTripInput(input: TripInput): {
  valid: boolean
  missingFields: string[]
} {
  const { answers } = input
  const required = ['trip_destination', 'trip_days', 'trip_budget']
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
