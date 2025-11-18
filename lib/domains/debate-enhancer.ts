// Debate Query Enhancer
// Enhances user query with domain-specific score context for AI debate

import type { ApartmentScore } from './apartment/types'
import type { HotelScore } from './hotel/types'
import type { DomainType } from '@/lib/intake/types'

/**
 * Enhances a user query with quantitative scoring context
 * for multi-model AI debate
 */
export function enhanceQueryWithScore(
  userQuery: string,
  domain: DomainType,
  score: ApartmentScore | HotelScore
): string {
  if (domain === 'apartment') {
    const apartmentScore = score as ApartmentScore
    return `${userQuery}

QUANTITATIVE ANALYSIS (MAUT Framework):
- Overall Score: ${apartmentScore.totalScore}/100 (${apartmentScore.recommendation})
- Financial: ${apartmentScore.financial.categoryScore}/100 (Affordability: ${apartmentScore.financial.affordability}/100, Market: ${apartmentScore.financial.marketValue}/100, Hidden Costs: ${apartmentScore.financial.hiddenCosts}/100)
- Location: ${apartmentScore.location.categoryScore}/100 (Commute: ${apartmentScore.location.commuteScore}/100, Safety: ${apartmentScore.location.neighborhoodSafety}/100, Walkability: ${apartmentScore.location.walkability}/100)
- Property: ${apartmentScore.property.categoryScore}/100 (Space: ${apartmentScore.property.spaceAdequacy}/100, Amenities: ${apartmentScore.property.amenitiesScore}/100, Quality: ${apartmentScore.property.buildingQuality}/100)
- Lifestyle: ${apartmentScore.lifestyle.categoryScore}/100 (Vibe: ${apartmentScore.lifestyle.neighborhoodVibe}/100, Pets: ${apartmentScore.lifestyle.petFriendliness}/100, WFH: ${apartmentScore.lifestyle.wfhSuitability}/100)

${apartmentScore.warnings.length > 0 ? `WARNINGS:\n${apartmentScore.warnings.map(w => `- ${w}`).join('\n')}` : ''}

Please analyze this apartment decision considering the MAUT scores above. Discuss whether the user should rent, negotiate, or pass on this apartment.`
  } else if (domain === 'hotel') {
    const hotelScore = score as HotelScore
    return `${userQuery}

QUANTITATIVE ANALYSIS (Weighted Decision Matrix):
- Location: ${hotelScore.location.categoryScore}/100 (Attractions: ${hotelScore.location.distanceToAttractions}/100, Transport: ${hotelScore.location.transportationAccess}/100, Safety: ${hotelScore.location.neighborhoodSafety}/100, Walkability: ${hotelScore.location.walkability}/100)
- Reviews: ${hotelScore.reviews.categoryScore}/100 (Overall: ${hotelScore.reviews.overallRating}/100, Sentiment: ${hotelScore.reviews.sentimentScore}/100, Trend: ${hotelScore.reviews.trendAnalysis}/100)
- Cleanliness: ${hotelScore.cleanliness.categoryScore}/100 (Rating: ${hotelScore.cleanliness.cleanlinessRating}/100, Pests: ${hotelScore.cleanliness.pestReports ? 'REPORTED' : 'None'}, Maintenance Issues: ${hotelScore.cleanliness.maintenanceIssues})
- Value: ${hotelScore.value.categoryScore}/100 (Price: $${hotelScore.value.pricePerNight}/night, Market Comparison: ${hotelScore.value.marketComparison}/100, Hidden Fees: $${hotelScore.value.hiddenFees})
- Amenities: ${hotelScore.amenities.categoryScore}/100 (Must-Have Match: ${hotelScore.amenities.mustHaveMatch}/100, Service: ${hotelScore.amenities.serviceQuality}/100)
- Total Score: ${hotelScore.totalScore}/100 (Recommendation: ${hotelScore.recommendation})

TOP PROS:
${hotelScore.topPros.map((pro, i) => `${i + 1}. ${pro}`).join('\n')}

TOP CONS:
${hotelScore.topCons.map((con, i) => `${i + 1}. ${con}`).join('\n')}

${hotelScore.warnings.length > 0 ? `RED FLAGS:\n${hotelScore.warnings.map(w => `- ⚠️ ${w}`).join('\n')}` : ''}

Please analyze this hotel decision considering the Weighted Decision Matrix scores above. Discuss whether the user should BOOK, CONSIDER, or PASS on this hotel. Pay special attention to red flags.`
  }

  return userQuery
}
