// Domain Classification Engine
// Phase 2: Intake Agent Foundation
// Automatically detects query domain using keyword matching + pattern analysis

import { DomainType, DomainClassification } from './types'

/**
 * Domain keyword patterns
 * Each domain has multiple keyword sets that indicate the query type
 */
const DOMAIN_KEYWORDS: Record<DomainType, string[][]> = {
  apartment: [
    // Housing terms
    ['apartment', 'rent', 'lease', 'rental', 'renting'],
    ['flat', 'studio', 'bedroom', 'condo', 'unit'],
    ['landlord', 'tenant', 'housing', 'live', 'living'],
    ['commute', 'neighborhood', 'utilities', 'deposit'],
    ['move', 'moving', 'relocation', 'relocate'],
    // Price indicators for housing
    ['month', 'monthly rent', 'per month', '/month']
  ],

  hotel: [
    // Hotel & accommodation terms
    ['hotel', 'accommodation', 'stay', 'lodging', 'room'],
    ['booking', 'reservation', 'check-in', 'check-out'],
    ['guest', 'night', 'nights', 'per night', '/night'],
    ['amenities', 'facilities', 'service', 'staff'],
    ['review', 'rating', 'star', 'cleanliness'],
    ['location', 'downtown', 'near', 'distance', 'walk'],
    // Hotel types
    ['resort', 'inn', 'motel', 'hostel', 'suite'],
    // Specific hotel features
    ['wifi', 'breakfast', 'parking', 'pool', 'gym']
  ],

  budget: [
    // Financial planning terms
    ['budget', 'budgeting', 'expenses', 'spending'],
    ['save', 'saving', 'savings', 'emergency fund'],
    ['income', 'salary', 'paycheck', 'take-home'],
    ['debt', 'loan', 'credit card', 'pay off'],
    ['retirement', '401k', 'ira', 'roth'],
    ['financial', 'finances', 'money management'],
    ['cost of living', 'afford', 'monthly bills'],
    // Specific categories
    ['groceries', 'dining out', 'subscriptions', 'utilities']
  ],

  product: [
    // Shopping terms
    ['buy', 'purchase', 'shop', 'shopping'],
    ['product', 'item', 'thing', 'device'],
    ['compare', 'comparison', 'vs', 'versus'],
    ['best', 'top', 'recommend', 'recommendation'],
    ['review', 'reviews', 'rating', 'ratings'],
    ['which', 'what', 'should i get', 'should i buy'],
    // Product categories
    ['laptop', 'phone', 'camera', 'tv', 'headphones'],
    ['appliance', 'furniture', 'car', 'vehicle'],
    // Price indicators for products
    ['price', 'cost', 'worth', 'value', 'deal']
  ],

  generic: [] // Fallback for unclassified queries
}

/**
 * Strong domain indicators (high confidence)
 * These phrases strongly suggest a specific domain
 */
const STRONG_INDICATORS: Record<DomainType, string[]> = {
  apartment: [
    'should i rent',
    'worth renting',
    'apartment for rent',
    'lease agreement',
    'security deposit',
    'move into',
    'sign the lease'
  ],
  hotel: [
    'find a hotel',
    'book a hotel',
    'hotel in',
    'accommodation in',
    'stay in',
    'check availability',
    'hotel recommendation'
  ],
  budget: [
    'create a budget',
    'budget plan',
    'save money',
    'pay off debt',
    'emergency fund',
    'retirement savings',
    'monthly expenses'
  ],
  product: [
    'should i buy',
    'which laptop',
    'which phone',
    'best product',
    'worth buying',
    'compare products',
    'product comparison'
  ],
  generic: []
}

/**
 * Calculate domain match score based on keyword matching
 */
function calculateDomainScore(query: string, domain: DomainType): number {
  const lowerQuery = query.toLowerCase()
  let score = 0

  // Check strong indicators first (high weight)
  const strongMatches = STRONG_INDICATORS[domain].filter(indicator =>
    lowerQuery.includes(indicator)
  )
  score += strongMatches.length * 10 // 10 points per strong match

  // Check keyword groups (medium weight)
  const keywordGroups = DOMAIN_KEYWORDS[domain]
  for (const group of keywordGroups) {
    const hasMatch = group.some(keyword => lowerQuery.includes(keyword))
    if (hasMatch) {
      score += 3 // 3 points per keyword group match
    }
  }

  return score
}

/**
 * Classify user query into a domain
 * Returns domain with confidence score
 */
export function classifyQuery(query: string): DomainClassification {
  // Calculate scores for each domain
  const scores: Record<DomainType, number> = {
    apartment: calculateDomainScore(query, 'apartment'),
    hotel: calculateDomainScore(query, 'hotel'),
    budget: calculateDomainScore(query, 'budget'),
    product: calculateDomainScore(query, 'product'),
    generic: 0
  }

  // Find domain with highest score
  const sortedDomains = (Object.entries(scores) as [DomainType, number][])
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)

  const [topDomain, topScore] = sortedDomains[0]
  const [secondDomain, secondScore] = sortedDomains[1]

  // If no matches, return generic
  if (topScore === 0) {
    return {
      domain: 'generic',
      confidence: 1.0,
      reasoning: 'No domain-specific keywords detected. Using generic mode.',
      alternativeDomains: []
    }
  }

  // Calculate confidence (0-1 scale)
  // High confidence if top score >> second score
  const scoreDifference = topScore - secondScore
  const confidence = Math.min(
    1.0,
    topScore / 20 * 0.7 + // Base confidence from absolute score
    scoreDifference / 10 * 0.3 // Bonus from score difference
  )

  // Find alternative domains (score > 5)
  const alternativeDomains = sortedDomains
    .slice(1)
    .filter(([, score]) => score > 5)
    .map(([domain]) => domain)

  // Generate reasoning
  const reasoning = generateReasoning(query, topDomain, topScore, alternativeDomains)

  return {
    domain: topDomain,
    confidence,
    reasoning,
    alternativeDomains: alternativeDomains.length > 0 ? alternativeDomains : undefined
  }
}

/**
 * Generate human-readable reasoning for classification
 */
function generateReasoning(
  query: string,
  domain: DomainType,
  score: number,
  alternatives: DomainType[]
): string {
  const lowerQuery = query.toLowerCase()

  // Find which indicators matched
  const matchedStrong = STRONG_INDICATORS[domain].filter(ind =>
    lowerQuery.includes(ind)
  )

  const matchedKeywords = DOMAIN_KEYWORDS[domain]
    .filter(group => group.some(kw => lowerQuery.includes(kw)))
    .flat()
    .filter(kw => lowerQuery.includes(kw))
    .slice(0, 5) // Top 5 keywords

  let reasoning = `Classified as "${domain}" domain based on `

  if (matchedStrong.length > 0) {
    reasoning += `strong indicators: "${matchedStrong.join('", "')}"`
    if (matchedKeywords.length > 0) {
      reasoning += ` and keywords: "${matchedKeywords.join('", "')}"`
    }
  } else if (matchedKeywords.length > 0) {
    reasoning += `keywords: "${matchedKeywords.join('", "')}"`
  } else {
    reasoning += 'query pattern analysis'
  }

  if (alternatives.length > 0) {
    reasoning += `. Alternative domains detected: ${alternatives.join(', ')}`
  }

  return reasoning
}

/**
 * Check if query contains ambiguous keywords that span multiple domains
 */
export function isAmbiguousQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase()

  // Ambiguous terms that could apply to multiple domains
  const ambiguousTerms = [
    'how much', 'cost', 'afford', 'budget', 'worth it',
    'should i', 'help me decide', 'what do you think'
  ]

  const hasAmbiguousTerm = ambiguousTerms.some(term => lowerQuery.includes(term))

  // Check if multiple domains have significant scores
  const scores = {
    apartment: calculateDomainScore(query, 'apartment'),
    hotel: calculateDomainScore(query, 'hotel'),
    budget: calculateDomainScore(query, 'budget'),
    product: calculateDomainScore(query, 'product')
  }

  const nonZeroScores = Object.values(scores).filter(s => s > 5)
  const hasMultipleDomains = nonZeroScores.length > 1

  return hasAmbiguousTerm && hasMultipleDomains
}

/**
 * Get example queries for each domain (for testing/documentation)
 */
export const EXAMPLE_QUERIES: Record<DomainType, string[]> = {
  apartment: [
    'Should I rent this apartment for $2800/month?',
    'Is this apartment worth it? Rent is $1500 with utilities included',
    'Help me decide if I should sign the lease for this 2-bedroom apartment',
    'Thinking about moving to this apartment near downtown',
    'Should I rent in San Francisco or Oakland?'
  ],
  hotel: [
    'Help me find a hotel in Dubai for 5 nights',
    'Should I book this hotel for $150/night?',
    'Find me a hotel near downtown with free parking',
    'What\'s the best hotel in Tokyo for business travel?',
    'Compare hotels in Miami Beach under $200/night'
  ],
  budget: [
    'Help me create a monthly budget with $6000 take-home income',
    'How should I allocate my income between savings and expenses?',
    'Should I pay off credit card debt or save for emergency fund?',
    'Need a budget plan to save $20,000 for a house down payment',
    'How much should I spend on groceries and dining out?'
  ],
  product: [
    'Should I buy the MacBook Pro or Dell XPS 15?',
    'Which laptop is best for video editing under $2000?',
    'Compare iPhone 15 Pro vs Samsung Galaxy S24',
    'What\'s the best vacuum cleaner for pet hair?',
    'Is the Sony A7 IV worth buying or should I get the Canon R6?'
  ],
  generic: [
    'What is artificial intelligence?',
    'How does photosynthesis work?',
    'Write me a poem about the ocean',
    'Explain quantum computing in simple terms',
    'What are the benefits of meditation?'
  ]
}

/**
 * Test classifier with example queries
 * Returns accuracy report
 */
export function testClassifier(): Record<DomainType, number> {
  const results: Record<DomainType, number> = {
    apartment: 0,
    hotel: 0,
    budget: 0,
    product: 0,
    generic: 0
  }

  // Test each domain's example queries
  for (const [expectedDomain, queries] of Object.entries(EXAMPLE_QUERIES)) {
    let correct = 0
    for (const query of queries) {
      const classification = classifyQuery(query)
      if (classification.domain === expectedDomain) {
        correct++
      }
    }
    results[expectedDomain as DomainType] = correct / queries.length
  }

  return results
}

/**
 * Get domain display name
 */
export function getDomainDisplayName(domain: DomainType): string {
  const names: Record<DomainType, string> = {
    apartment: 'Apartment Rent',
    hotel: 'Hotel Finder',
    budget: 'Budget Planning',
    product: 'Product Comparison',
    generic: 'General Query'
  }
  return names[domain]
}

/**
 * Get domain icon/emoji
 */
export function getDomainIcon(domain: DomainType): string {
  const icons: Record<DomainType, string> = {
    apartment: '🏠',
    hotel: '🏨',
    budget: '💰',
    product: '🛒',
    generic: '💬'
  }
  return icons[domain]
}

/**
 * Get domain description
 */
export function getDomainDescription(domain: DomainType): string {
  const descriptions: Record<DomainType, string> = {
    apartment: 'Housing rental decisions with location, budget, and lifestyle analysis',
    hotel: 'Hotel selection with multi-agent analysis and weighted decision criteria',
    budget: 'Personal finance planning with 50/30/20 rule and debt management',
    product: 'Product comparison with weighted decision matrix and review analysis',
    generic: 'General purpose multi-model analysis without domain-specific framework'
  }
  return descriptions[domain]
}
