// Apartment Domain Types
// Phase 3: MAUT Framework Implementation

import { Answers } from '@/lib/intake/types'

/**
 * MAUT Score Structure
 * Multi-Attribute Utility Theory with weighted categories
 */
export interface ApartmentScore {
  financial: FinancialScore
  location: LocationScore
  property: PropertyScore
  lifestyle: LifestyleScore
  totalScore: number // 0-100
  recommendation: 'RENT' | 'PASS' | 'NEGOTIATE'
  reasoning: string
  warnings: string[]
}

/**
 * Financial Category (40% weight)
 * Most important for long-term sustainability
 */
export interface FinancialScore {
  affordability: number // 0-100 (rent % of income)
  marketValue: number // 0-100 (vs market median)
  hiddenCosts: number // 0-100 (utilities, deposits, parking)
  categoryScore: number // Weighted average
  weight: 0.4
}

/**
 * Location Category (30% weight)
 * Time, convenience, and safety
 */
export interface LocationScore {
  commuteScore: number // 0-100 (time & cost)
  neighborhoodSafety: number // 0-100 (crime percentile)
  walkability: number // 0-100 (Walk Score)
  transitAccess: number // 0-100 (distance to transit)
  categoryScore: number // Weighted average
  weight: 0.3
}

/**
 * Property Category (20% weight)
 * Physical space and amenities
 */
export interface PropertyScore {
  spaceAdequacy: number // 0-100 (beds, baths, sqft)
  amenitiesScore: number // 0-100 (has desired amenities)
  buildingQuality: number // 0-100 (age, condition, reviews)
  categoryScore: number // Weighted average
  weight: 0.2
}

/**
 * Lifestyle Category (10% weight)
 * Personal preferences and fit
 */
export interface LifestyleScore {
  neighborhoodVibe: number // 0-100 (quiet vs lively match)
  petFriendliness: number // 0-100 (if has pets)
  wfhSuitability: number // 0-100 (if works from home)
  categoryScore: number // Weighted average
  weight: 0.1
}

/**
 * External Data Structure
 * Data fetched from APIs
 */
export interface ExternalApartmentData {
  marketRent: {
    median: number
    low: number
    high: number
    source: 'zillow' | 'rentometer' | 'estimated'
  }
  commute: {
    timeMinutes: number
    distanceMiles: number
    monthlyCost: number // Gas or transit
    method: 'car' | 'transit' | 'bike' | 'walk'
  }
  walkScore: {
    score: number // 0-100
    description: string
    transitScore?: number
    bikeScore?: number
  }
  crime: {
    percentile: number // 0-100 (100 = safest)
    rate: number // Crimes per 1000 residents
    trend: 'increasing' | 'stable' | 'decreasing'
  }
  neighborhood: {
    population: number
    medianIncome: number
    demographics: Record<string, number>
  }
}

/**
 * Apartment Input Data
 * Combined intake answers + external data
 */
export interface ApartmentInput {
  answers: Answers
  externalData?: Partial<ExternalApartmentData>
}

/**
 * Recommendation Thresholds
 */
export const RECOMMENDATION_THRESHOLDS = {
  RENT: 75, // Score >= 75: Strong recommendation
  NEGOTIATE: 60, // Score 60-74: Negotiate or consider
  PASS: 0 // Score < 60: Pass
} as const

/**
 * Weight Configuration
 * Can be customized based on user priorities
 */
export const DEFAULT_WEIGHTS = {
  financial: 0.4,
  location: 0.3,
  property: 0.2,
  lifestyle: 0.1
} as const

/**
 * Affordability Rule (30% rule)
 * Rent should be ≤ 30% of gross monthly income
 */
export const AFFORDABILITY_THRESHOLD = 0.3
