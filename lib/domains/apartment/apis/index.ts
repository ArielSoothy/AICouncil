// External APIs Index
// Phase 3: Centralized API exports

export * from './types'
export * from './zillow-api'
export * from './google-maps-api'
export * from './walk-score-api'
export * from './crime-stats-api'

/**
 * Fetch all external data for an apartment
 * Orchestrates multiple API calls in parallel
 */
import { getMarketRent } from './zillow-api'
import { calculateCommute, geocodeAddress } from './google-maps-api'
import { getWalkScore } from './walk-score-api'
import { getCrimeStats } from './crime-stats-api'
import { ExternalApartmentData } from '../types'
import { Answers } from '@/lib/intake/types'

export async function fetchAllApartmentData(
  answers: Answers
): Promise<Partial<ExternalApartmentData>> {
  const externalData: Partial<ExternalApartmentData> = {}

  try {
    // Extract data from answers
    const address = answers.apt_address as string
    const zipCode = answers.apt_zip as string
    const bedrooms = answers.apt_bedrooms as number
    const workAddress = answers.apt_work_address as string

    // Geocode address for lat/lng (needed for other APIs)
    const geoResult = await geocodeAddress(address)
    let lat: number | undefined
    let lng: number | undefined

    if ('lat' in geoResult) {
      lat = geoResult.lat
      lng = geoResult.lng
    }

    // Fetch all data in parallel
    const [marketRentResult, commuteResult, walkScoreResult, crimeResult] = await Promise.all([
      // Market rent
      zipCode && bedrooms ? getMarketRent(zipCode, bedrooms) : Promise.resolve(null),

      // Commute
      address && workAddress
        ? calculateCommute(address, workAddress, 'driving')
        : Promise.resolve(null),

      // Walk Score
      address && lat && lng ? getWalkScore(address, lat, lng) : Promise.resolve(null),

      // Crime stats
      address && lat && lng ? getCrimeStats(address, lat, lng) : Promise.resolve(null)
    ])

    // Process market rent
    if (marketRentResult && 'median' in marketRentResult) {
      externalData.marketRent = {
        median: marketRentResult.median,
        low: marketRentResult.low,
        high: marketRentResult.high,
        source: 'zillow'
      }
    }

    // Process commute
    if (commuteResult && 'timeMinutes' in commuteResult) {
      externalData.commute = {
        timeMinutes: commuteResult.timeMinutes,
        distanceMiles: commuteResult.distanceMiles,
        monthlyCost: commuteResult.monthlyCost,
        method: commuteResult.method === 'driving' ? 'car' : 'transit'
      }
    }

    // Process Walk Score
    if (walkScoreResult && 'walkscore' in walkScoreResult) {
      externalData.walkScore = {
        score: walkScoreResult.walkscore,
        description: walkScoreResult.description,
        transitScore: walkScoreResult.transit?.score,
        bikeScore: walkScoreResult.bike?.score
      }
    }

    // Process crime stats
    if (crimeResult && 'crimeRate' in crimeResult) {
      externalData.crime = {
        percentile: crimeResult.percentile,
        rate: crimeResult.crimeRate,
        trend: crimeResult.trend
      }
    }

    return externalData
  } catch (error) {
    console.error('Error fetching apartment data:', error)
    return externalData
  }
}
