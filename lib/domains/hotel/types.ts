// Hotel Domain Types
// Hotel Finder with Weighted Decision Matrix
//
// DESIGN PHILOSOPHY: API-Optional, Research-Backed Decision Framework
// ====================================================================
// Hotel selection works WITHOUT external APIs by using:
// 1. Research-backed weighted criteria (academic hospitality studies)
// 2. Rule-of-thumb scoring for each category
// 3. Multi-agent AI analysis (web search for reviews, pricing, location)
// 4. Red flag detection system (bed bugs, cleanliness, noise)
//
// APIs (TripAdvisor, Google Places) are OPTIONAL enhancements.
//
// Based on academic research:
// - 84% of guests rate cleanliness as "very important"
// - 65% of negative reviews mention noise disturbances
// - Location is #1 priority for most travelers
// - Recent reviews (3-6 months) more important than overall rating

import { Answers } from '@/lib/intake/types'

/**
 * Hotel Score (Weighted Decision Matrix)
 * Research-backed multi-criteria evaluation
 */
export interface HotelScore {
  location: LocationScore          // 35% weight (highest priority)
  reviews: ReviewScore             // 30% weight (guest satisfaction)
  cleanliness: CleanlinessScore    // 25% weight (84% rate as critical)
  value: ValueScore                // 20% weight (price vs features)
  amenities: AmenitiesScore        // 15% weight (user preference match)

  totalScore: number               // 0-100 (weighted average)
  recommendation: 'BOOK' | 'CONSIDER' | 'PASS'
  reasoning: string
  warnings: string[]               // Red flags detected
  confidence: number               // 0-1 (based on data quality)

  // For multi-hotel comparison
  hotelName?: string
  pricePerNight?: number
  topPros: string[]                // Top 3 advantages
  topCons: string[]                // Top 3 concerns
}

/**
 * Location Score (35% weight)
 * Geographic convenience and safety
 * Highest weighted category based on research
 */
export interface LocationScore {
  distanceToAttractions: number   // 0-100 (proximity to user's key destinations)
  transportationAccess: number    // 0-100 (metro, bus, taxi availability)
  neighborhoodSafety: number      // 0-100 (crime data, safety reports)
  walkability: number             // 0-100 (Walk Score or equivalent)
  categoryScore: number           // Weighted average
  weight: 0.35

  // Details for display
  nearestAttraction?: string
  distanceKm?: number
  walkTimeMinutes?: number
  transitOptions?: string[]
  safetyRating?: 'Safe' | 'Moderate' | 'Caution'
}

/**
 * Review Score (30% weight)
 * Guest satisfaction and sentiment analysis
 */
export interface ReviewScore {
  overallRating: number           // 0-100 (converted from 5-star scale)
  sentimentScore: number          // 0-100 (NLP analysis of review text)
  trendAnalysis: number           // 0-100 (improving=100, declining=0)
  redFlagCount: number            // Count of serious issues mentioned
  categoryScore: number           // Weighted average
  weight: 0.30

  // Details for display
  totalReviews?: number
  averageStars?: number           // 0-5
  positivePercent?: number        // % of positive reviews
  negativePercent?: number        // % of negative reviews
  recentTrend?: 'Improving' | 'Stable' | 'Declining'
  topPraises?: string[]           // Top 3 praised features
  topComplaints?: string[]        // Top 3 complaints
}

/**
 * Cleanliness Score (25% weight)
 * Hygiene and maintenance (84% rate as "very important")
 */
export interface CleanlinessScore {
  cleanlinessRating: number       // 0-100 (from guest reviews)
  pestReports: boolean            // Any bed bug/pest mentions?
  maintenanceIssues: number       // Count of maintenance complaints
  categoryScore: number           // Weighted average
  weight: 0.25

  // Details for display
  cleanlinessStars?: number       // 0-5
  pestWarnings?: string[]         // Specific pest issues if any
  maintenanceComplaints?: string[]
}

/**
 * Value Score (20% weight)
 * Price vs. features analysis
 */
export interface ValueScore {
  pricePerNight: number           // Actual nightly rate (USD)
  marketComparison: number        // 0-100 (vs similar hotels in area)
  hiddenFees: number              // Total extra charges (USD)
  valueForMoney: number           // 0-100 (features justifying price)
  categoryScore: number           // Weighted average
  weight: 0.20

  // Details for display
  basePrice?: number              // Before fees
  taxes?: number
  resortFee?: number
  parkingFee?: number
  totalCost?: number              // All-in per night
  pricePercentile?: number        // e.g., 75th percentile = pricey
}

/**
 * Amenities Score (15% weight)
 * Features and services matching user needs
 */
export interface AmenitiesScore {
  mustHaveMatch: number           // 0-100 (% of must-haves present)
  serviceQuality: number          // 0-100 (staff, responsiveness)
  uniqueFeatures: string[]        // Special offerings
  categoryScore: number           // Weighted average
  weight: 0.15

  // Details for display
  presentAmenities?: string[]     // Amenities available
  missingAmenities?: string[]     // Must-haves not available
  serviceRating?: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  bestSuitedFor?: 'Business' | 'Leisure' | 'Family' | 'Romantic'
  accessibilityNotes?: string[]
}

/**
 * Red Flag Types (Automatic Warnings)
 */
export type RedFlagType =
  | 'BED_BUGS'              // Immediate disqualification
  | 'MAJOR_CLEANLINESS'     // Serious hygiene violations
  | 'EXCESSIVE_NOISE'       // >30% of reviews mention noise
  | 'SAFETY_CONCERN'        // Neighborhood safety issues
  | 'HIDDEN_FEES'           // Undisclosed charges
  | 'FAKE_REVIEWS'          // Suspicious review patterns
  | 'RECENT_DECLINE'        // Rating dropped >0.5 stars recently
  | 'INACCURATE_PHOTOS'     // Photos don't match reality

/**
 * Recommendation Thresholds
 */
export const RECOMMENDATION_THRESHOLDS = {
  BOOK: 80,      // Score >= 80: Strong recommendation
  CONSIDER: 60,  // Score 60-79: Worth considering with caveats
  PASS: 0        // Score < 60: Not recommended
} as const

/**
 * Category Weights Configuration
 * Can be customized based on user priorities
 */
export const DEFAULT_WEIGHTS = {
  location: 0.35,    // 35% (highest priority per research)
  reviews: 0.30,     // 30% (guest satisfaction)
  cleanliness: 0.25, // 25% (critical factor)
  value: 0.20,       // 20% (price sensitivity)
  amenities: 0.15    // 15% (nice-to-haves)
} as const

/**
 * Red Flag Severity Levels
 * Determines if hotel should be automatically disqualified
 */
export const RED_FLAG_SEVERITY = {
  DISQUALIFY: ['BED_BUGS', 'MAJOR_CLEANLINESS', 'SAFETY_CONCERN'],
  WARNING: ['EXCESSIVE_NOISE', 'RECENT_DECLINE', 'HIDDEN_FEES'],
  INFO: ['INACCURATE_PHOTOS', 'FAKE_REVIEWS']
} as const

/**
 * Hotel Input Data
 * Combined intake answers + optional external data
 */
export interface HotelInput {
  answers: Answers

  // Optional: Pre-fetched hotel data (if available)
  externalData?: {
    hotelName?: string
    address?: string
    starRating?: number
    reviews?: {
      source: 'TripAdvisor' | 'Google' | 'Booking.com'
      rating: number
      count: number
      recentReviews: Array<{
        text: string
        rating: number
        date: Date
      }>
    }
    pricing?: {
      baseRate: number
      fees: { [key: string]: number }
      totalRate: number
    }
    location?: {
      coordinates: { lat: number; lng: number }
      distanceToAttractions?: { [attraction: string]: number }
    }
    amenities?: string[]
  }
}

/**
 * Hotel Comparison (for showing top 3 recommendations)
 */
export interface HotelComparison {
  hotels: HotelScore[]
  topChoice: HotelScore
  bestValue: HotelScore
  bestLocation: HotelScore
  bestReviews: HotelScore
}
