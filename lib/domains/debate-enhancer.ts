// Debate Query Enhancer
// Enhances user query with MAUT/Pareto score context for AI debate

import type { ApartmentScore } from './apartment/types'
import type { TripScore } from './trip/types'
import type { DomainType } from '@/lib/intake/types'

/**
 * Enhances a user query with quantitative scoring context
 * for multi-model AI debate
 */
export function enhanceQueryWithScore(
  userQuery: string,
  domain: DomainType,
  score: ApartmentScore | TripScore
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
  } else if (domain === 'trip') {
    const tripScore = score as TripScore
    return `${userQuery}

QUANTITATIVE ANALYSIS (Pareto Optimization):
- Budget Efficiency: ${tripScore.budget.categoryScore}/100 ($${tripScore.budget.totalCost.toFixed(0)} total, Budget Fit: ${tripScore.budget.budgetFit}/100)
- Experience Quality: ${tripScore.experiences.categoryScore}/100 (Interest Match: ${tripScore.experiences.interestMatch}/100, Must-Sees: ${tripScore.experiences.mustSeesCovered}/100)
- Feasibility: ${tripScore.feasibility.categoryScore}/100 (Time Mgmt: ${tripScore.feasibility.timeManagement}/100, Pace: ${tripScore.feasibility.paceScore}/100)
- Overall Score: ${tripScore.overallScore}/100
${tripScore.paretoRank === 1 ? '- ✅ PARETO OPTIMAL: No objective can improve without hurting another' : `- ⚠️ PARETO RANK: ${tripScore.paretoRank} (some improvements possible)`}

BUDGET BREAKDOWN:
- Flights: $${tripScore.budget.breakdown.flights.toFixed(0)} (${((tripScore.budget.breakdown.flights / tripScore.budget.totalCost) * 100).toFixed(0)}%)
- Hotels: $${tripScore.budget.breakdown.hotels.toFixed(0)} (${((tripScore.budget.breakdown.hotels / tripScore.budget.totalCost) * 100).toFixed(0)}%)
- Activities: $${tripScore.budget.breakdown.activities.toFixed(0)} (${((tripScore.budget.breakdown.activities / tripScore.budget.totalCost) * 100).toFixed(0)}%)
- Food: $${tripScore.budget.breakdown.food.toFixed(0)} (${((tripScore.budget.breakdown.food / tripScore.budget.totalCost) * 100).toFixed(0)}%)

${tripScore.warnings.length > 0 ? `WARNINGS:\n${tripScore.warnings.map(w => `- ${w}`).join('\n')}` : ''}

Please analyze this trip plan considering the Pareto optimization scores above. Discuss budget tradeoffs, experience quality, and whether the itinerary is feasible.`
  }

  return userQuery
}
