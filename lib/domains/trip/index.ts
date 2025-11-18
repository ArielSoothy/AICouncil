// Trip Domain - Main Entry Point
// Phase 4: Pareto Optimization Framework

export * from './types'
export * from './scoring'

import { Answers } from '@/lib/intake/types'
import { TripScore, TripInput, ItineraryDay, Activity, PACE_RULES } from './types'
import { calculateTripScore, validateTripInput } from './scoring'
import { reformulateQuery } from '@/lib/intake/query-reformulator'

/**
 * Complete trip planning flow
 * Generates itinerary + Pareto score + structured query for AI debate
 */
export async function planTrip(
  userQuery: string,
  answers: Answers
): Promise<{
  score: TripScore
  itinerary: ItineraryDay[]
  structuredQuery: any
  readyForDebate: boolean
  errors?: string[]
}> {
  // Step 1: Validate input
  const validation = validateTripInput({ answers })
  if (!validation.valid) {
    return {
      score: null as any,
      itinerary: [],
      structuredQuery: null,
      readyForDebate: false,
      errors: [`Missing required fields: ${validation.missingFields.join(', ')}`]
    }
  }

  try {
    // Step 2: Generate itinerary (AI can enhance this)
    const itinerary = generateItinerary(answers)

    // Step 3: Calculate Pareto score
    const input: TripInput = { answers, itinerary }
    const score = calculateTripScore(input)

    // Step 4: Reformulate query for multi-model debate
    // NOTE: This file is deprecated - use hotel domain instead
    const structuredQuery = reformulateQuery(userQuery, 'hotel', answers)

    // Step 5: Enhance query with Pareto insights
    const enhancedQuery = enhanceQueryWithScore(structuredQuery, score, itinerary)

    return {
      score,
      itinerary,
      structuredQuery: enhancedQuery,
      readyForDebate: true
    }
  } catch (error) {
    return {
      score: null as any,
      itinerary: [],
      structuredQuery: null,
      readyForDebate: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Generate sample itinerary
 * AI can enhance with specific destination knowledge
 */
function generateItinerary(answers: Answers): ItineraryDay[] {
  const days = (answers.trip_days as number) || 7
  const destination = (answers.trip_destination as string) || 'Unknown'
  const pace = (answers.trip_pace as number) || 5
  const interests = (answers.trip_interests as string[]) || []

  // Determine activities per day based on pace
  const paceType = pace <= 3 ? 'relaxed' : pace >= 8 ? 'fastPaced' : 'balanced'
  const activitiesPerDay = PACE_RULES[paceType].activitiesPerDay

  const itinerary: ItineraryDay[] = []

  for (let day = 1; day <= days; day++) {
    const activities = generateDayActivities(destination, activitiesPerDay, interests, day)

    itinerary.push({
      day,
      morning: activities.slice(0, Math.ceil(activitiesPerDay / 3)),
      afternoon: activities.slice(Math.ceil(activitiesPerDay / 3), Math.ceil((2 * activitiesPerDay) / 3)),
      evening: activities.slice(Math.ceil((2 * activitiesPerDay) / 3)),
      estimatedCost: activities.reduce((sum, a) => sum + a.cost, 0),
      travelTime: 60, // Assume 60 min travel per day
      activityTime: activities.reduce((sum, a) => sum + a.duration, 0)
    })
  }

  return itinerary
}

/**
 * Generate activities for a day
 * AI can research specific attractions for destination
 */
function generateDayActivities(
  destination: string,
  count: number,
  interests: string[],
  dayNumber: number
): Activity[] {
  const activities: Activity[] = []

  // Sample activities (AI should replace with real destination research)
  const activityTypes = [
    { name: 'Visit Museum', type: 'attraction' as const, duration: 180, cost: 25, priority: 'recommended' as const },
    { name: 'Walking Food Tour', type: 'activity' as const, duration: 120, cost: 60, priority: 'recommended' as const },
    { name: 'Historic Landmark', type: 'attraction' as const, duration: 90, cost: 15, priority: 'must-see' as const },
    { name: 'Local Market', type: 'attraction' as const, duration: 120, cost: 0, priority: 'optional' as const },
    { name: 'Lunch at Local Restaurant', type: 'restaurant' as const, duration: 90, cost: 25, priority: 'recommended' as const },
    { name: 'Scenic Viewpoint', type: 'attraction' as const, duration: 60, cost: 0, priority: 'optional' as const },
    { name: 'Evening Show/Entertainment', type: 'activity' as const, duration: 120, cost: 75, priority: 'optional' as const }
  ]

  // Pick activities based on count
  for (let i = 0; i < Math.min(count, activityTypes.length); i++) {
    const activity = activityTypes[i]
    activities.push({
      ...activity,
      name: `${destination} - ${activity.name}`,
      description: `Explore ${destination}'s ${activity.name.toLowerCase()}`
    })
  }

  return activities
}

/**
 * Enhance structured query with Pareto score
 */
function enhanceQueryWithScore(
  structuredQuery: any,
  score: TripScore,
  itinerary: ItineraryDay[]
): any {
  return {
    ...structuredQuery,

    // Add Pareto score
    paretoScore: {
      overall: score.overallScore,
      recommendation: score.recommendation,
      paretoRank: score.paretoRank,
      breakdown: {
        budget: {
          score: score.budget.categoryScore,
          totalCost: score.budget.totalCost,
          budgetFit: score.budget.budgetFit,
          breakdown: score.budget.breakdown
        },
        experiences: {
          score: score.experiences.categoryScore,
          interestMatch: score.experiences.interestMatch,
          mustSeesCovered: score.experiences.mustSeesCovered,
          variety: score.experiences.varietyScore
        },
        feasibility: {
          score: score.feasibility.categoryScore,
          timeManagement: score.feasibility.timeManagement,
          pace: score.feasibility.paceScore,
          logistics: score.feasibility.logisticsScore
        }
      }
    },

    // Add itinerary summary
    itinerarySummary: {
      days: itinerary.length,
      totalActivities: itinerary.reduce((sum, day) => sum + day.morning.length + day.afternoon.length + day.evening.length, 0),
      totalCost: itinerary.reduce((sum, day) => sum + day.estimatedCost, 0),
      dailyBreakdown: itinerary.map(day => ({
        day: day.day,
        activities: day.morning.length + day.afternoon.length + day.evening.length,
        cost: day.estimatedCost
      }))
    },

    // Add warnings to hard constraints
    hardConstraints: [...structuredQuery.hardConstraints, ...score.warnings],

    // Enhanced agent instructions
    agentInstructions: {
      analyst: `${structuredQuery.agentInstructions.analyst}\n\nPareto Score: ${score.overallScore}/100 (${score.recommendation}). Budget=${score.budget.categoryScore}, Experiences=${score.experiences.categoryScore}, Feasibility=${score.feasibility.categoryScore}. Estimated cost: $${score.budget.totalCost}. Analyze whether this itinerary balances all objectives optimally.`,

      critic: `${structuredQuery.agentInstructions.critic}\n\nChallenge the Pareto optimization: Are there better tradeoffs between cost, experiences, and feasibility? Warnings: ${score.warnings.join('; ')}. What alternatives might better serve the user?`,

      synthesizer: `${structuredQuery.agentInstructions.synthesizer}\n\nIntegrate Pareto score (${score.overallScore}/100, ${score.recommendation}) with Analyst/Critic insights. Provide final itinerary recommendation with specific improvements.`
    }
  }
}

/**
 * Compare multiple trip options
 * Identifies Pareto frontier (non-dominated options)
 */
export async function compareTrips(
  userQuery: string,
  tripOptions: Answers[]
): Promise<{
  scores: TripScore[]
  paretoFrontier: number[] // Indices of Pareto optimal trips
  recommendation: number // Index of best overall trip
}> {
  const scores: TripScore[] = []

  // Score each trip option
  for (const answers of tripOptions) {
    const result = await planTrip(userQuery, answers)
    if (result.score) {
      scores.push(result.score)
    }
  }

  // Find Pareto frontier (trips where no other trip is better on all objectives)
  const paretoFrontier = identifyParetoFrontier(scores)

  // Recommend highest overall score from Pareto frontier
  const recommendation = paretoFrontier.reduce((best, idx) =>
    scores[idx].overallScore > scores[best].overallScore ? idx : best,
    paretoFrontier[0]
  )

  return {
    scores,
    paretoFrontier,
    recommendation
  }
}

/**
 * Identify Pareto frontier
 * Returns indices of non-dominated solutions
 */
function identifyParetoFrontier(scores: TripScore[]): number[] {
  const frontier: number[] = []

  for (let i = 0; i < scores.length; i++) {
    let isDominated = false

    for (let j = 0; j < scores.length; j++) {
      if (i === j) continue

      // Check if j dominates i (better on all three objectives)
      const dominates =
        scores[j].budget.categoryScore >= scores[i].budget.categoryScore &&
        scores[j].experiences.categoryScore >= scores[i].experiences.categoryScore &&
        scores[j].feasibility.categoryScore >= scores[i].feasibility.categoryScore &&
        (scores[j].budget.categoryScore > scores[i].budget.categoryScore ||
          scores[j].experiences.categoryScore > scores[i].experiences.categoryScore ||
          scores[j].feasibility.categoryScore > scores[i].feasibility.categoryScore)

      if (dominates) {
        isDominated = true
        break
      }
    }

    if (!isDominated) {
      frontier.push(i)
    }
  }

  return frontier
}
