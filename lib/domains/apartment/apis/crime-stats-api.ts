// Crime Statistics API Integration
// Phase 3: Neighborhood Safety Data

import { CrimeStatsData, APIError } from './types'

/**
 * Get crime statistics for a location
 *
 * @param address - Full street address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Crime statistics and safety score
 *
 * TODO: Add real crime data API
 * Options:
 * - FBI Crime Data Explorer API (free, national data)
 * - SpotCrime API (free tier, real-time alerts)
 * - CrimeReports API (paid, detailed data)
 * - Local police department APIs
 */
export async function getCrimeStats(
  address: string,
  lat: number,
  lng: number
): Promise<CrimeStatsData | APIError> {
  try {
    // TODO: Replace with real API call
    // Option 1: FBI Crime Data Explorer
    // const response = await fetch(
    //   `https://api.usa.gov/crime/fbi/cde/estimate/national?from=2020&to=2023&API_KEY=${process.env.FBI_API_KEY}`
    // )

    // Option 2: SpotCrime API
    // const response = await fetch(
    //   `https://api.spotcrime.com/crimes.json?lat=${lat}&lon=${lng}&radius=0.5&key=${process.env.SPOTCRIME_API_KEY}`
    // )

    // MOCK DATA (for development)
    return generateMockCrimeData(address, lat, lng)
  } catch (error) {
    return {
      service: 'Crime Statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}

/**
 * Generate mock crime data
 * Based on typical US urban crime rates
 */
function generateMockCrimeData(address: string, lat: number, lng: number): CrimeStatsData {
  // Generate semi-realistic crime rate (lower = safer)
  const crimeRate = 10 + Math.random() * 40 // 10-50 crimes per 1000 residents

  // Convert to percentile (0-100, higher = safer)
  const percentile = Math.round(100 - (crimeRate / 50) * 100)

  // Generate trend
  const trends: Array<'increasing' | 'stable' | 'decreasing'> = [
    'decreasing',
    'stable',
    'stable',
    'increasing'
  ]
  const trend = trends[Math.floor(Math.random() * trends.length)]

  return {
    address,
    lat,
    lng,
    crimeRate: Math.round(crimeRate * 10) / 10,
    percentile: Math.max(0, Math.min(100, percentile)),
    trend,
    lastYear: {
      total: Math.round(crimeRate * 10 + Math.random() * 50),
      violent: Math.round(crimeRate * 2 + Math.random() * 10),
      property: Math.round(crimeRate * 8 + Math.random() * 40)
    },
    comparison: {
      cityAverage: 25 + Math.random() * 15,
      nationalAverage: 22.7 // US national average (2023)
    }
  }
}

/**
 * Get crime heat map data
 * Returns crime density for area visualization
 *
 * TODO: Add crime heat map API
 */
export async function getCrimeHeatMap(
  lat: number,
  lng: number,
  radiusMiles: number = 1
): Promise<
  | {
      center: { lat: number; lng: number }
      radius: number
      points: Array<{ lat: number; lng: number; intensity: number; type: string }>
    }
  | APIError
> {
  try {
    // MOCK DATA
    const points = []
    for (let i = 0; i < 20; i++) {
      points.push({
        lat: lat + (Math.random() - 0.5) * 0.01,
        lng: lng + (Math.random() - 0.5) * 0.01,
        intensity: Math.random(),
        type: ['theft', 'burglary', 'vandalism', 'assault'][Math.floor(Math.random() * 4)]
      })
    }

    return {
      center: { lat, lng },
      radius: radiusMiles,
      points
    }
  } catch (error) {
    return {
      service: 'Crime Statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}

/**
 * Get recent crime incidents
 * Shows specific crimes in the past 30 days
 *
 * TODO: Add incident data API
 */
export async function getRecentIncidents(
  lat: number,
  lng: number,
  radiusMiles: number = 0.5,
  daysBack: number = 30
): Promise<
  | Array<{
      date: string
      type: string
      description: string
      distance: number
      address: string
    }>
  | APIError
> {
  try {
    // MOCK DATA
    const incidents = []
    const crimeTypes = [
      'Vehicle Theft',
      'Burglary',
      'Theft',
      'Vandalism',
      'Assault',
      'Robbery'
    ]

    for (let i = 0; i < 10; i++) {
      const daysAgo = Math.floor(Math.random() * daysBack)
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)

      incidents.push({
        date: date.toISOString().split('T')[0],
        type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
        description: 'Crime incident report',
        distance: Math.round(Math.random() * radiusMiles * 100) / 100,
        address: `${Math.floor(Math.random() * 9999)} Sample St`
      })
    }

    return incidents.sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    return {
      service: 'Crime Statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    }
  }
}
