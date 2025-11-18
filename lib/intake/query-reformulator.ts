// Query Reformulation Engine
// Phase 2: Intake Agent Foundation
// Transforms user query + answers into StructuredQuery for multi-model analysis

import { DomainType, Answers, StructuredQuery } from './types'

/**
 * Reformulate user query with intake answers into structured query
 * Ready for multi-model debate system
 */
export function reformulateQuery(
  userQuery: string,
  domain: DomainType,
  answers: Answers
): StructuredQuery {
  // Get domain-specific framework
  const framework = getFrameworkForDomain(domain)

  // Extract hard constraints (must-haves, deal-breakers)
  const hardConstraints = extractHardConstraints(domain, answers)

  // Extract priorities (ranked by importance)
  const priorities = extractPriorities(domain, answers)

  // Identify acceptable tradeoffs
  const tradeoffs = extractTradeoffs(domain, answers)

  // Determine required external APIs
  const requiredAPIs = determineRequiredAPIs(domain, answers)

  // Generate research queries for web search
  const researchQueries = generateResearchQueries(domain, answers)

  // Generate agent-specific instructions
  const agentInstructions = generateAgentInstructions(domain, answers, framework)

  // Build enhanced query text
  const enhancedQuery = buildEnhancedQuery(userQuery, domain, answers, framework)

  return {
    domain,
    framework,
    userQuery,
    clarifyingAnswers: answers,
    hardConstraints,
    priorities,
    tradeoffs,
    requiredAPIs,
    researchQueries,
    analysisMethod: framework,
    outputFormat: getOutputFormat(domain),
    agentInstructions
  }
}

/**
 * Get decision framework for each domain
 */
function getFrameworkForDomain(domain: DomainType): string {
  const frameworks: Record<DomainType, string> = {
    apartment: 'Multi-Attribute Utility Theory (MAUT)',
    hotel: 'Weighted Decision Matrix (5-Criteria)',
    budget: '50/30/20 Rule + Zero-Based Budgeting',
    product: 'Pugh Matrix (Weighted Decision Matrix)',
    generic: 'Multi-Agent Debate (MADR)'
  }
  return frameworks[domain]
}

/**
 * Extract hard constraints from answers
 */
function extractHardConstraints(domain: DomainType, answers: Answers): string[] {
  const constraints: string[] = []

  switch (domain) {
    case 'apartment':
      if (answers.apt_income && answers.apt_rent) {
        const affordability = (answers.apt_rent / answers.apt_income) * 100
        constraints.push(`Rent must be ≤ 30% of gross income (current: ${affordability.toFixed(1)}%)`)
      }
      if (answers.apt_bedrooms) {
        constraints.push(`Must have ${answers.apt_bedrooms} bedroom(s)`)
      }
      if (answers.apt_dealbreakers) {
        constraints.push(`Deal-breakers: ${answers.apt_dealbreakers}`)
      }
      break

    case 'hotel':
      if (answers.hotel_budget) {
        constraints.push(`Budget per night: $${answers.hotel_budget}`)
      }
      if (answers.hotel_nights) {
        constraints.push(`Number of nights: ${answers.hotel_nights}`)
      }
      if (answers.hotel_location) {
        constraints.push(`Location: ${answers.hotel_location}`)
      }
      break

    case 'budget':
      if (answers.budget_income) {
        constraints.push(`Monthly income: $${answers.budget_income}`)
      }
      if (answers.budget_debt) {
        constraints.push(`Existing debt: ${answers.budget_debt}`)
      }
      break

    case 'product':
      if (answers.product_budget) {
        constraints.push(`Maximum budget: $${answers.product_budget}`)
      }
      if (answers.product_must_haves) {
        constraints.push(`Must-have features: ${answers.product_must_haves}`)
      }
      break
  }

  return constraints
}

/**
 * Extract priorities (ranked by importance)
 */
function extractPriorities(domain: DomainType, answers: Answers): string[] {
  const priorities: string[] = []

  switch (domain) {
    case 'apartment':
      if (answers.apt_amenities && answers.apt_amenities.length > 0) {
        priorities.push(`Preferred amenities: ${answers.apt_amenities.join(', ')}`)
      }
      if (answers.apt_work_address) {
        priorities.push('Minimize commute time')
      }
      if (answers.apt_wfh) {
        priorities.push('Home office space required')
      }
      break

    case 'hotel':
      if (answers.hotel_amenities) {
        priorities.push(`Required amenities: ${answers.hotel_amenities.join(', ')}`)
      }
      if (answers.hotel_purpose) {
        priorities.push(`Stay purpose: ${answers.hotel_purpose}`)
      }
      if (answers.hotel_location_priority) {
        const priorityLabel = answers.hotel_location_priority > 7 ? 'Location critical' : 'Location flexible'
        priorities.push(`${priorityLabel} (${answers.hotel_location_priority}/10)`)
      }
      break

    case 'budget':
      if (answers.budget_goals) {
        priorities.push(`Financial goals: ${answers.budget_goals.join(', ')}`)
      }
      if (answers.budget_emergency_fund === 0) {
        priorities.push('Build emergency fund (high priority)')
      }
      break

    case 'product':
      if (answers.product_use_case) {
        priorities.push(`Primary use: ${answers.product_use_case}`)
      }
      if (answers.product_brand_priority) {
        const brandLabel = answers.product_brand_priority > 7 ? 'Brand reputation' : 'Best value'
        priorities.push(brandLabel)
      }
      break
  }

  return priorities
}

/**
 * Extract acceptable tradeoffs
 */
function extractTradeoffs(domain: DomainType, answers: Answers): string[] {
  const tradeoffs: string[] = []

  switch (domain) {
    case 'apartment':
      if (answers.apt_floor && !answers.apt_elevator) {
        tradeoffs.push('Can accept stairs if no elevator')
      }
      if (answers.apt_laundry !== 'In-unit laundry') {
        tradeoffs.push('Can use shared laundry or external laundromat')
      }
      break

    case 'hotel':
      if (answers.hotel_star_rating_min <= 3) {
        tradeoffs.push('Willing to consider 3-star hotels for cost savings')
      }
      if (answers.hotel_distance_flexibility === 'Flexible') {
        tradeoffs.push('Can stay further from attractions for better value')
      }
      break

    case 'budget':
      if (answers.budget_risk_tolerance) {
        tradeoffs.push(`Risk tolerance: ${answers.budget_risk_tolerance}`)
      }
      break

    case 'product':
      if (answers.product_condition?.includes('Refurbished')) {
        tradeoffs.push('Consider refurbished for 20-40% savings')
      }
      if (answers.product_condition?.includes('Used')) {
        tradeoffs.push('Consider used for 30-70% savings')
      }
      break
  }

  return tradeoffs
}

/**
 * Determine which external APIs are needed
 */
function determineRequiredAPIs(domain: DomainType, answers: Answers): string[] {
  const apis: string[] = []

  switch (domain) {
    case 'apartment':
      apis.push('Zillow API (market rent comparison)')
      if (answers.apt_work_address) {
        apis.push('Google Maps API (commute calculation)')
      }
      if (answers.apt_address) {
        apis.push('Walk Score API (walkability)')
        apis.push('Census API (neighborhood data)')
        apis.push('Crime Statistics API')
      }
      break

    case 'hotel':
      apis.push('TripAdvisor API (hotel reviews & ratings)')
      apis.push('Google Places API (location & photos)')
      if (answers.hotel_location) {
        apis.push('Booking.com API (hotel prices & availability)')
        apis.push('Walk Score API (walkability score)')
      }
      break

    case 'budget':
      // No external APIs needed (user-provided data only)
      break

    case 'product':
      if (answers.product_category === 'Electronics') {
        apis.push('Amazon Product API (prices, reviews, specs)')
        apis.push('CamelCamelCamel API (price history)')
      }
      apis.push('Reddit API (user reviews)')
      apis.push('YouTube API (video reviews)')
      break
  }

  return apis
}

/**
 * Generate research queries for web search
 */
function generateResearchQueries(domain: DomainType, answers: Answers): string[] {
  const queries: string[] = []

  switch (domain) {
    case 'apartment':
      if (answers.apt_address) {
        queries.push(`${answers.apt_address} neighborhood reviews`)
        queries.push(`${answers.apt_address} crime statistics`)
        queries.push(`${answers.apt_address} walkability`)
      }
      break

    case 'hotel':
      if (answers.hotel_location) {
        queries.push(`Best hotels in ${answers.hotel_location}`)
        queries.push(`${answers.hotel_location} hotel reviews recent`)
        queries.push(`${answers.hotel_location} hotel red flags warnings`)
      }
      break

    case 'budget':
      queries.push('50/30/20 budget rule')
      queries.push('Best high-yield savings accounts 2025')
      if (answers.budget_debt) {
        queries.push('Debt avalanche vs snowball method')
      }
      break

    case 'product':
      if (answers.product_category && answers.product_use_case) {
        queries.push(`Best ${answers.product_category} for ${answers.product_use_case}`)
        queries.push(`${answers.product_category} comparison 2025`)
      }
      break
  }

  return queries
}

/**
 * Generate agent-specific instructions
 */
function generateAgentInstructions(
  domain: DomainType,
  answers: Answers,
  framework: string
): { analyst: string; critic: string; synthesizer: string } {
  const baseInstructions = {
    analyst: `Research and analyze this ${domain} decision using ${framework}. `,
    critic: `Critically evaluate the recommendation. Identify risks, flaws, and alternative perspectives. `,
    synthesizer: `Integrate insights from Analyst and Critic. Provide balanced, actionable recommendation. `
  }

  // Add domain-specific context
  switch (domain) {
    case 'apartment':
      baseInstructions.analyst += `Calculate affordability (30% rule), market comparison, commute cost, and lifestyle fit. `
      baseInstructions.critic += `Challenge: Is this affordable long-term? Any hidden costs? Better alternatives nearby? `
      baseInstructions.synthesizer += `Balance: Financial prudence vs quality of life. Consider user priorities: ${extractPriorities(domain, answers).join(', ')}`
      break

    case 'hotel':
      baseInstructions.analyst += `Score hotel using Weighted Decision Matrix: Location (35%), Reviews (30%), Cleanliness (25%), Value (20%), Amenities (15%). Detect red flags. `
      baseInstructions.critic += `Challenge: Are reviews authentic? Hidden fees? Cleanliness violations? Noise complaints? Better value nearby? `
      baseInstructions.synthesizer += `Balance: Location vs price vs quality. Purpose: ${answers.hotel_purpose || 'general stay'}`
      break

    case 'budget':
      baseInstructions.analyst += `Apply 50/30/20 rule. Categorize all expenses. Calculate emergency fund gap. `
      baseInstructions.critic += `Challenge: Is budget realistic? Any overspending categories? Debt strategy optimal? `
      baseInstructions.synthesizer += `Balance: Financial security vs quality of life. Goals: ${answers.budget_goals?.join(', ') || 'general savings'}`
      break

    case 'product':
      baseInstructions.analyst += `Score products using Pugh Matrix. Weight criteria: use case fit, price/value, reviews. `
      baseInstructions.critic += `Challenge: Are reviews authentic? Better value options? Future-proofing considerations? `
      baseInstructions.synthesizer += `Balance: Features vs cost. Primary use: ${answers.product_use_case || 'general'}`
      break
  }

  return baseInstructions
}

/**
 * Build enhanced query text with full context
 */
function buildEnhancedQuery(
  userQuery: string,
  domain: DomainType,
  answers: Answers,
  framework: string
): string {
  let enhanced = `Original Query: "${userQuery}"\n\n`
  enhanced += `Decision Domain: ${domain.toUpperCase()}\n`
  enhanced += `Framework: ${framework}\n\n`

  enhanced += `CONTEXT:\n`
  enhanced += `${JSON.stringify(answers, null, 2)}\n\n`

  enhanced += `HARD CONSTRAINTS:\n`
  extractHardConstraints(domain, answers).forEach((c) => {
    enhanced += `- ${c}\n`
  })

  enhanced += `\nPRIORITIES:\n`
  extractPriorities(domain, answers).forEach((p) => {
    enhanced += `- ${p}\n`
  })

  enhanced += `\nACCEPTABLE TRADEOFFS:\n`
  extractTradeoffs(domain, answers).forEach((t) => {
    enhanced += `- ${t}\n`
  })

  return enhanced
}

/**
 * Get output format preference for domain
 */
function getOutputFormat(domain: DomainType): string {
  const formats: Record<DomainType, string> = {
    apartment: 'Score matrix (0-100) + Recommendation (RENT/PASS/NEGOTIATE) + Reasoning',
    hotel: 'Weighted score breakdown (Location/Reviews/Cleanliness/Value/Amenities) + Recommendation (BOOK/CONSIDER/PASS) + Red flags',
    budget: '50/30/20 breakdown + Recommendations + Savings timeline',
    product: 'Comparison table + Winner + Best value + Reasoning',
    generic: 'Pros/cons + Recommendation + Confidence level'
  }
  return formats[domain]
}

/**
 * Validate that structured query has sufficient information
 */
export function validateStructuredQuery(query: StructuredQuery): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (query.hardConstraints.length === 0) {
    warnings.push('No hard constraints identified - recommendation may be too broad')
  }

  if (query.priorities.length === 0) {
    warnings.push('No priorities identified - recommendation may not match user preferences')
  }

  if (query.requiredAPIs.length > 0 && query.researchQueries.length === 0) {
    warnings.push('APIs required but no research queries generated')
  }

  return {
    valid: warnings.length === 0,
    warnings
  }
}
