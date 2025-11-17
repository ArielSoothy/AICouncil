// Trip Domain Types
// Phase 4: Pareto Optimization Framework
//
// DESIGN PHILOSOPHY: API-Optional, Rule-of-Thumb First
// =====================================================
// Trip planning works WITHOUT external APIs by using:
// 1. General travel cost rules (40% flights, 30% hotels, 20% activities, 10% food)
// 2. Historical averages (flight costs per mile, hotel costs per night)
// 3. Destination knowledge (popular attractions, typical costs)
// 4. AI research (web search for current prices, recommendations)
//
// APIs (Skyscanner, Booking.com) are OPTIONAL enhancements.

import { Answers } from '@/lib/intake/types'

/**
 * Trip Score (Pareto Optimization)
 * Multi-objective optimization: minimize cost, maximize experiences
 */
export interface TripScore {
  budget: BudgetScore
  experiences: ExperienceScore
  feasibility: FeasibilityScore
  paretoRank: number // 1 = Pareto optimal, higher = dominated by other options
  overallScore: number // 0-100
  recommendation: 'BOOK' | 'MODIFY' | 'RECONSIDER'
  reasoning: string
  warnings: string[]
}

/**
 * Budget Score (33% weight)
 * How well does trip fit budget?
 */
export interface BudgetScore {
  totalCost: number // Estimated total trip cost
  budgetFit: number // 0-100 (how well does cost fit user's budget)
  breakdown: {
    flights: number
    hotels: number
    activities: number
    food: number
    transportation: number
    buffer: number // 10% emergency buffer
  }
  categoryScore: number
  weight: 0.33
}

/**
 * Experience Score (33% weight)
 * Quality and variety of experiences
 */
export interface ExperienceScore {
  interestMatch: number // 0-100 (matches user's interests)
  mustSeesCovered: number // 0-100 (% of must-sees included)
  varietyScore: number // 0-100 (diverse activities)
  uniquenessScore: number // 0-100 (unique vs touristy)
  categoryScore: number
  weight: 0.33
}

/**
 * Feasibility Score (33% weight)
 * Is this trip actually doable?
 */
export interface FeasibilityScore {
  timeManagement: number // 0-100 (is itinerary realistic)
  paceScore: number // 0-100 (matches user's desired pace)
  logisticsScore: number // 0-100 (transportation between activities)
  seasonalScore: number // 0-100 (good time to visit)
  categoryScore: number
  weight: 0.34
}

/**
 * Itinerary Day
 */
export interface ItineraryDay {
  day: number
  date?: string
  morning: Activity[]
  afternoon: Activity[]
  evening: Activity[]
  estimatedCost: number
  travelTime: number // Minutes spent traveling
  activityTime: number // Minutes in activities
}

/**
 * Activity
 */
export interface Activity {
  name: string
  type: 'attraction' | 'restaurant' | 'activity' | 'transportation' | 'rest'
  duration: number // Minutes
  cost: number // Dollars
  priority: 'must-see' | 'recommended' | 'optional'
  description: string
}

/**
 * Trip Budget Allocation (Rule of Thumb)
 * Based on typical travel spending patterns
 */
export const BUDGET_ALLOCATION = {
  flights: 0.4, // 40% of budget
  hotels: 0.3, // 30% of budget
  activities: 0.2, // 20% of budget
  food: 0.1 // 10% of budget
} as const

/**
 * Cost Estimation Rules (USD per person)
 * These are averages, AI can research specific destinations
 */
export const COST_RULES = {
  // Flight costs (per mile, roundtrip)
  flightCostPerMile: {
    domestic: 0.12, // $0.12/mile ($600 for 2500 miles NYC-LA)
    international: 0.10 // $0.10/mile ($1000 for 5000 miles)
  },

  // Hotel costs (per night)
  hotelCostPerNight: {
    budget: 50, // Hostel or budget hotel
    midRange: 120, // 3-star hotel
    luxury: 250 // 4-star+ hotel
  },

  // Food costs (per day)
  foodCostPerDay: {
    budget: 30, // Street food, cheap restaurants
    midRange: 60, // Mid-range restaurants
    luxury: 120 // Fine dining
  },

  // Activity costs (per activity)
  activityCost: {
    free: 0, // Parks, walking tours, beaches
    budget: 15, // Museums, local attractions
    midRange: 50, // Guided tours, experiences
    luxury: 150 // Special experiences, shows
  },

  // Transportation (per day)
  localTransportPerDay: {
    budget: 10, // Public transit
    midRange: 30, // Mix of transit and taxis
    luxury: 80 // Private drivers, convenience
  }
} as const

/**
 * Recommended Days by Distance
 * Helps determine appropriate trip length
 */
export const TRIP_LENGTH_RULES = {
  weekend: { minDays: 2, maxDays: 3, maxMiles: 500 }, // Short distance
  week: { minDays: 5, maxDays: 7, maxMiles: 3000 }, // Domestic
  extended: { minDays: 8, maxDays: 14, maxMiles: 10000 } // International
} as const

/**
 * Activities per Day by Pace
 * Based on user's desired pace (1-10 scale)
 */
export const PACE_RULES = {
  relaxed: { activitiesPerDay: 2, downtime: 0.4 }, // Pace 1-3
  balanced: { activitiesPerDay: 3, downtime: 0.3 }, // Pace 4-7
  fastPaced: { activitiesPerDay: 5, downtime: 0.1 } // Pace 8-10
} as const

/**
 * Pareto Optimization Thresholds
 */
export const RECOMMENDATION_THRESHOLDS = {
  BOOK: 80, // Score >= 80: Highly recommended
  MODIFY: 60, // Score 60-79: Good with some changes
  RECONSIDER: 0 // Score < 60: Significant issues
} as const

/**
 * Trip Input Data
 */
export interface TripInput {
  answers: Answers
  itinerary?: ItineraryDay[]
}
