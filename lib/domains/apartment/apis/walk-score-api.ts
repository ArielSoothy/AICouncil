// Walk Score API Integration
// Phase 3: Walkability, Transit, Bike Scores

import { WalkScoreData, APIError } from './types'

/**
 * Get Walk Score for an address
 *
 * @param address - Full street address
 * @param lat - Latitude (optional, improves accuracy)
 * @param lng - Longitude (optional, improves accuracy)
 * @returns Walk Score data (0-100 scale)
 *
 * TODO: Add real Walk Score API
 * - Sign up: https://www.walkscore.com/professional/api.php
 * - API Key: Add to .env.local as WALKSCORE_API_KEY
 * - Free tier: 5,000 requests/day
 * - Pricing: $0.001 per request after free tier
 */
export async function getWalkScore(
  address: string,
  lat?: number,
  lng?: number
): Promise<WalkScoreData | APIError> {
  try {
    // TODO: Replace with real API call
    // const apiKey = process.env.WALKSCORE_API_KEY
    // if (!apiKey) throw new Error('WALKSCORE_API_KEY not configured')

    // const params = new URLSearchParams({
    //   address,
    //   lat: lat?.toString() || '',
    //   lon: lng?.toString() || '',
    //   wsapikey: apiKey,
    //   format: 'json'
    // })

    // const response = await fetch(
    //   `https://api.walkscore.com/score?${params.toString()}`
    // )
    // const data = await response.json()

    // MOCK DATA (for development)
    return generateMockWalkScore(address, lat, lng)
  } catch (error) {
    return {
      service: 'Walk Score',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}

/**
 * Generate mock Walk Score data
 * Based on typical urban/suburban distributions
 */
function generateMockWalkScore(
  address: string,
  lat?: number,
  lng?: number
): WalkScoreData {
  // Generate semi-realistic scores
  const walkScore = Math.round(40 + Math.random() * 60) // 40-100
  const transitScore = Math.round(Math.max(0, walkScore - 10 + Math.random() * 20))
  const bikeScore = Math.round(Math.max(0, walkScore - 15 + Math.random() * 25))

  return {
    address,
    walkscore: walkScore,
    description: getWalkScoreDescription(walkScore),
    transit: {
      score: transitScore,
      description: getTransitDescription(transitScore)
    },
    bike: {
      score: bikeScore,
      description: getBikeDescription(bikeScore)
    }
  }
}

/**
 * Get Walk Score description
 * Official Walk Score categories
 */
function getWalkScoreDescription(score: number): string {
  if (score >= 90) return "Walker's Paradise - Daily errands do not require a car"
  if (score >= 70) return 'Very Walkable - Most errands can be accomplished on foot'
  if (score >= 50) return 'Somewhat Walkable - Some errands can be accomplished on foot'
  if (score >= 25) return 'Car-Dependent - Most errands require a car'
  return 'Car-Dependent - Almost all errands require a car'
}

/**
 * Get Transit Score description
 */
function getTransitDescription(score: number): string {
  if (score >= 90) return "Rider's Paradise - World-class public transportation"
  if (score >= 70) return 'Excellent Transit - Convenient for most trips'
  if (score >= 50) return 'Good Transit - Many nearby public transportation options'
  if (score >= 25) return 'Some Transit - A few public transportation options'
  return 'Minimal Transit - Few public transportation options'
}

/**
 * Get Bike Score description
 */
function getBikeDescription(score: number): string {
  if (score >= 90) return "Biker's Paradise - Daily errands can be accomplished on a bike"
  if (score >= 70) return 'Very Bikeable - Biking is convenient for most trips'
  if (score >= 50) return 'Bikeable - Some bike infrastructure'
  if (score >= 25) return 'Somewhat Bikeable - Minimal bike infrastructure'
  return 'Not Bikeable - Limited bike infrastructure'
}

/**
 * Get nearby amenities count
 * Shows how many restaurants, shops, etc. are within walking distance
 *
 * TODO: Add Walk Score amenities endpoint
 */
export async function getNearbyAmenities(
  address: string,
  lat?: number,
  lng?: number
): Promise<
  | {
      restaurants: number
      coffee: number
      groceries: number
      parks: number
      gyms: number
      bars: number
      schools: number
    }
  | APIError
> {
  try {
    // MOCK DATA
    return {
      restaurants: Math.round(10 + Math.random() * 40),
      coffee: Math.round(3 + Math.random() * 15),
      groceries: Math.round(2 + Math.random() * 8),
      parks: Math.round(1 + Math.random() * 5),
      gyms: Math.round(1 + Math.random() * 8),
      bars: Math.round(5 + Math.random() * 20),
      schools: Math.round(2 + Math.random() * 10)
    }
  } catch (error) {
    return {
      service: 'Walk Score',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}
