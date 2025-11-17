// External API Types for Apartment Domain
// Phase 3: API Integration Layer

/**
 * Zillow API Response
 * Market rent data for comparison
 */
export interface ZillowMarketData {
  zipCode: string
  bedrooms: number
  median: number
  low: number
  high: number
  sampleSize: number
  lastUpdated: string
}

/**
 * Google Maps API Response
 * Commute calculation
 */
export interface GoogleMapsCommute {
  origin: string
  destination: string
  timeMinutes: number
  distanceMiles: number
  method: 'driving' | 'transit' | 'bicycling' | 'walking'
  monthlyCost: number // Estimated monthly cost
  alternativeRoutes?: {
    method: string
    timeMinutes: number
    cost: number
  }[]
}

/**
 * Walk Score API Response
 * Walkability, transit, bike scores
 */
export interface WalkScoreData {
  address: string
  walkscore: number // 0-100
  description: string // "Walker's Paradise", etc.
  transit?: {
    score: number
    description: string
  }
  bike?: {
    score: number
    description: string
  }
}

/**
 * Crime Statistics API Response
 * Neighborhood safety data
 */
export interface CrimeStatsData {
  address: string
  lat: number
  lng: number
  crimeRate: number // Crimes per 1000 residents
  percentile: number // 0-100 (100 = safest)
  trend: 'increasing' | 'stable' | 'decreasing'
  lastYear: {
    total: number
    violent: number
    property: number
  }
  comparison: {
    cityAverage: number
    nationalAverage: number
  }
}

/**
 * Census API Response
 * Neighborhood demographics
 */
export interface CensusData {
  zipCode: string
  population: number
  medianIncome: number
  medianAge: number
  demographics: {
    white: number
    black: number
    asian: number
    hispanic: number
    other: number
  }
  education: {
    highSchool: number
    bachelors: number
    graduate: number
  }
  employment: {
    employed: number
    unemployed: number
    laborForce: number
  }
}

/**
 * API Error Response
 * Standardized error format
 */
export interface APIError {
  service: string
  error: string
  statusCode?: number
  retryable: boolean
}

/**
 * API Request Options
 */
export interface APIRequestOptions {
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
}
