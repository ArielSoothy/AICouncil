// Google Maps API Integration
// Phase 3: Commute Calculation

import { GoogleMapsCommute, APIError } from './types'

/**
 * Calculate commute time and cost between two addresses
 *
 * @param homeAddress - Apartment address
 * @param workAddress - Work address
 * @param method - Transportation method
 * @returns Commute data with time, distance, cost
 *
 * TODO: Add real Google Maps Distance Matrix API
 * - Enable API: https://console.cloud.google.com/apis/library/distance-matrix.googleapis.com
 * - API Key: Add to .env.local as GOOGLE_MAPS_API_KEY
 * - Pricing: $5 per 1000 requests (first $200/month free)
 */
export async function calculateCommute(
  homeAddress: string,
  workAddress: string,
  method: 'driving' | 'transit' | 'bicycling' | 'walking' = 'driving'
): Promise<GoogleMapsCommute | APIError> {
  try {
    // TODO: Replace with real API call
    // const apiKey = process.env.GOOGLE_MAPS_API_KEY
    // if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured')

    // const response = await fetch(
    //   `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    //   `origins=${encodeURIComponent(homeAddress)}&` +
    //   `destinations=${encodeURIComponent(workAddress)}&` +
    //   `mode=${method}&key=${apiKey}`
    // )
    // const data = await response.json()

    // MOCK DATA (for development)
    return generateMockCommuteData(homeAddress, workAddress, method)
  } catch (error) {
    return {
      service: 'Google Maps',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}

/**
 * Generate mock commute data
 * Realistic estimates based on transportation method
 */
function generateMockCommuteData(
  homeAddress: string,
  workAddress: string,
  method: 'driving' | 'transit' | 'bicycling' | 'walking'
): GoogleMapsCommute {
  // Generate semi-realistic distance (5-25 miles)
  const distanceMiles = 5 + Math.random() * 20

  // Calculate time based on method
  let timeMinutes: number
  let monthlyCost: number

  switch (method) {
    case 'driving':
      timeMinutes = distanceMiles * 2 + 10 // ~30mph avg in city
      monthlyCost = calculateDrivingCost(distanceMiles)
      break
    case 'transit':
      timeMinutes = distanceMiles * 3 + 15 // Slower with stops
      monthlyCost = calculateTransitCost()
      break
    case 'bicycling':
      timeMinutes = distanceMiles * 4 + 5 // ~15mph avg
      monthlyCost = 0 // Free!
      break
    case 'walking':
      timeMinutes = distanceMiles * 15 + 10 // ~4mph
      monthlyCost = 0
      break
  }

  return {
    origin: homeAddress,
    destination: workAddress,
    timeMinutes: Math.round(timeMinutes),
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    method,
    monthlyCost: Math.round(monthlyCost),
    alternativeRoutes: generateAlternativeRoutes(distanceMiles)
  }
}

/**
 * Calculate monthly driving cost
 * Gas + parking + depreciation
 */
function calculateDrivingCost(distanceMiles: number): number {
  const workDaysPerMonth = 22
  const roundTripMiles = distanceMiles * 2
  const monthlyMiles = roundTripMiles * workDaysPerMonth

  // IRS mileage rate (2024): $0.67/mile
  // Includes gas, depreciation, maintenance
  const costPerMile = 0.67
  const drivingCost = monthlyMiles * costPerMile

  // Add parking cost (average downtown parking)
  const parkingCost = 150 // $150/month avg

  return drivingCost + parkingCost
}

/**
 * Calculate monthly transit cost
 * Based on average US city transit passes
 */
function calculateTransitCost(): number {
  // Average monthly transit pass: $70-120
  return 90
}

/**
 * Generate alternative route options
 */
function generateAlternativeRoutes(distanceMiles: number): GoogleMapsCommute['alternativeRoutes'] {
  return [
    {
      method: 'transit',
      timeMinutes: Math.round(distanceMiles * 3 + 15),
      cost: 90
    },
    {
      method: 'bicycling',
      timeMinutes: Math.round(distanceMiles * 4 + 5),
      cost: 0
    }
  ]
}

/**
 * Get traffic-adjusted commute time
 * Shows commute time during typical rush hour
 *
 * TODO: Add Google Maps Traffic API
 */
export async function getCommuteWithTraffic(
  homeAddress: string,
  workAddress: string,
  departureTime: 'morning' | 'evening' = 'morning'
): Promise<{ normal: number; withTraffic: number; difference: number } | APIError> {
  try {
    // MOCK DATA
    const baseTime = 25 + Math.random() * 20
    const trafficMultiplier = 1.3 + Math.random() * 0.4 // 1.3x - 1.7x
    const withTraffic = baseTime * trafficMultiplier

    return {
      normal: Math.round(baseTime),
      withTraffic: Math.round(withTraffic),
      difference: Math.round(withTraffic - baseTime)
    }
  } catch (error) {
    return {
      service: 'Google Maps',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}

/**
 * Geocode an address to lat/lng
 * Needed for other APIs (crime stats, etc.)
 *
 * TODO: Add Google Maps Geocoding API
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | APIError> {
  try {
    // TODO: Real geocoding API call

    // MOCK DATA (San Francisco coordinates with variance)
    return {
      lat: 37.7749 + (Math.random() - 0.5) * 0.1,
      lng: -122.4194 + (Math.random() - 0.5) * 0.1
    }
  } catch (error) {
    return {
      service: 'Google Maps',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}
