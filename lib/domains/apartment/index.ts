// Apartment Domain - Main Entry Point
// Phase 3: MAUT Framework Implementation

export * from './types'
export * from './scoring'
export * from './apis'

import { Answers } from '@/lib/intake/types'
import { ApartmentScore, ApartmentInput } from './types'
import { calculateApartmentScore, validateApartmentInput } from './scoring'
import { fetchAllApartmentData } from './apis'
import { reformulateQuery } from '@/lib/intake/query-reformulator'

/**
 * Complete apartment decision flow
 * Integrates MAUT scoring + external data + agent debate
 *
 * @param userQuery - Original user query
 * @param answers - Intake answers
 * @returns Complete apartment analysis
 */
export async function analyzeApartment(
  userQuery: string,
  answers: Answers
): Promise<{
  score: ApartmentScore
  structuredQuery: any
  readyForDebate: boolean
  errors?: string[]
}> {
  // Step 1: Validate input
  const validation = validateApartmentInput({ answers })
  if (!validation.valid) {
    return {
      score: null as any,
      structuredQuery: null,
      readyForDebate: false,
      errors: [`Missing required fields: ${validation.missingFields.join(', ')}`]
    }
  }

  try {
    // Step 2: Fetch external data (APIs)
    const externalData = await fetchAllApartmentData(answers)

    // Step 3: Calculate MAUT score
    const input: ApartmentInput = { answers, externalData }
    const score = calculateApartmentScore(input)

    // Step 4: Reformulate query for multi-model debate
    const structuredQuery = reformulateQuery(userQuery, 'apartment', answers)

    // Step 5: Enhance query with MAUT insights
    const enhancedQuery = enhanceQueryWithScore(structuredQuery, score, externalData)

    return {
      score,
      structuredQuery: enhancedQuery,
      readyForDebate: true
    }
  } catch (error) {
    return {
      score: null as any,
      structuredQuery: null,
      readyForDebate: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Enhance structured query with MAUT score insights
 * Gives AI agents additional context for debate
 */
function enhanceQueryWithScore(
  structuredQuery: any,
  score: ApartmentScore,
  externalData: any
): any {
  return {
    ...structuredQuery,

    // Add MAUT score breakdown
    mautScore: {
      total: score.totalScore,
      recommendation: score.recommendation,
      breakdown: {
        financial: {
          score: score.financial.categoryScore,
          affordability: score.financial.affordability,
          marketValue: score.financial.marketValue,
          hiddenCosts: score.financial.hiddenCosts
        },
        location: {
          score: score.location.categoryScore,
          commute: score.location.commuteScore,
          safety: score.location.neighborhoodSafety,
          walkability: score.location.walkability
        },
        property: {
          score: score.property.categoryScore,
          space: score.property.spaceAdequacy,
          amenities: score.property.amenitiesScore,
          quality: score.property.buildingQuality
        },
        lifestyle: {
          score: score.lifestyle.categoryScore,
          vibe: score.lifestyle.neighborhoodVibe,
          pets: score.lifestyle.petFriendliness,
          wfh: score.lifestyle.wfhSuitability
        }
      }
    },

    // Add warnings to hard constraints
    hardConstraints: [...structuredQuery.hardConstraints, ...score.warnings],

    // Add external data context
    externalDataSummary: {
      marketRent: externalData.marketRent
        ? `Median rent: $${externalData.marketRent.median} (range: $${externalData.marketRent.low}-$${externalData.marketRent.high})`
        : 'No market data available',
      commute: externalData.commute
        ? `${externalData.commute.timeMinutes} min commute (${externalData.commute.distanceMiles} miles), $${externalData.commute.monthlyCost}/month`
        : 'No commute data available',
      walkScore: externalData.walkScore
        ? `Walk Score: ${externalData.walkScore.score}/100 (${externalData.walkScore.description})`
        : 'No walkability data available',
      crime: externalData.crime
        ? `Safety: ${externalData.crime.percentile}th percentile (${externalData.crime.rate} crimes/1000 residents, trend: ${externalData.crime.trend})`
        : 'No crime data available'
    },

    // Enhanced agent instructions
    agentInstructions: {
      analyst: `${structuredQuery.agentInstructions.analyst}\n\nMAUT Score: ${score.totalScore}/100 (${score.recommendation}). Key factors: Financial=${score.financial.categoryScore}, Location=${score.location.categoryScore}, Property=${score.property.categoryScore}, Lifestyle=${score.lifestyle.categoryScore}. Analyze whether this quantitative assessment aligns with qualitative factors.`,

      critic: `${structuredQuery.agentInstructions.critic}\n\nChallenge the MAUT score: Does ${score.totalScore}/100 accurately reflect real-world livability? Warnings: ${score.warnings.join('; ')}. What risks or downsides might be understated?`,

      synthesizer: `${structuredQuery.agentInstructions.synthesizer}\n\nIntegrate MAUT score (${score.totalScore}/100, ${score.recommendation}) with Analyst/Critic insights. Provide final recommendation with confidence level and key deciding factors.`
    }
  }
}

/**
 * Quick apartment comparison
 * Compare multiple apartments side-by-side
 */
export async function compareApartments(
  userQuery: string,
  apartmentsAnswers: Answers[]
): Promise<{
  scores: ApartmentScore[]
  winner: number // Index of best apartment
  comparison: any
}> {
  const scores: ApartmentScore[] = []

  // Score each apartment
  for (const answers of apartmentsAnswers) {
    const result = await analyzeApartment(userQuery, answers)
    if (result.score) {
      scores.push(result.score)
    }
  }

  // Find winner (highest score)
  const winner = scores.reduce(
    (bestIdx, score, idx) => (score.totalScore > scores[bestIdx].totalScore ? idx : bestIdx),
    0
  )

  // Generate comparison matrix
  const comparison = {
    winner,
    scores: scores.map((s, idx) => ({
      apartment: idx + 1,
      totalScore: s.totalScore,
      recommendation: s.recommendation,
      financial: s.financial.categoryScore,
      location: s.location.categoryScore,
      property: s.property.categoryScore,
      lifestyle: s.lifestyle.categoryScore
    }))
  }

  return { scores, winner, comparison }
}
