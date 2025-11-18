// Question Bank - All 77 Questions Across 4 Domains
// Phase 2: Intake Agent Foundation
// Source: docs/research/INTAKE_AGENT_RESEARCH.md

import { Question, DomainType, QuestionWeight } from './types'

/**
 * APARTMENT RENT QUESTIONS (22 questions)
 * Framework: Multi-Attribute Utility Theory (MAUT)
 * Weights: Critical (10), Important (7), Moderate (5), Nice-to-have (3)
 */
export const APARTMENT_QUESTIONS: Question[] = [
  // Critical Questions (10 points)
  {
    id: 'apt_income',
    domain: 'apartment',
    text: 'What is your monthly gross income?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '$5,000',
    helpText: 'Used to validate affordability (30% rule: rent ≤ 30% of gross income)'
  },
  {
    id: 'apt_rent',
    domain: 'apartment',
    text: 'What is the monthly rent for this apartment?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '$2,000',
    helpText: 'Primary cost factor'
  },
  {
    id: 'apt_address',
    domain: 'apartment',
    text: "What is the apartment's address or neighborhood?",
    type: 'text',
    weight: 10,
    required: true,
    placeholder: '123 Main St, San Francisco, CA 94102',
    helpText: 'Location drives value, safety, amenities'
  },
  {
    id: 'apt_work_address',
    domain: 'apartment',
    text: 'What is your workplace address (for commute calculation)?',
    type: 'text',
    weight: 10,
    required: false,
    placeholder: '456 Market St, San Francisco, CA',
    helpText: 'Commute time = quality of life + hidden costs'
  },
  {
    id: 'apt_lease_term',
    domain: 'apartment',
    text: 'How long is the lease term (in months)?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '12',
    helpText: 'Flexibility vs stability trade-off'
  },

  // Important Questions (7 points)
  {
    id: 'apt_bedrooms',
    domain: 'apartment',
    text: 'How many bedrooms do you need?',
    type: 'number',
    weight: 7,
    required: true,
    placeholder: '2'
  },
  {
    id: 'apt_bathrooms',
    domain: 'apartment',
    text: 'How many bathrooms do you need?',
    type: 'number',
    weight: 7,
    required: true,
    placeholder: '1'
  },
  {
    id: 'apt_utilities',
    domain: 'apartment',
    text: 'What utilities are included in rent?',
    type: 'multi-select',
    weight: 7,
    required: true,
    options: ['Water', 'Gas', 'Electric', 'Internet', 'Trash', 'None'],
    helpText: 'Hidden costs (estimate $100-200/month for excluded utilities)'
  },
  {
    id: 'apt_parking',
    domain: 'apartment',
    text: 'Is parking included?',
    type: 'boolean',
    weight: 7,
    required: true
  },
  {
    id: 'apt_parking_cost',
    domain: 'apartment',
    text: 'If parking is not included, what is the monthly cost?',
    type: 'number',
    weight: 7,
    required: false,
    dependsOn: 'apt_parking',
    dependsOnValue: false,
    placeholder: '$150',
    helpText: 'Car owners face $50-300/month extra'
  },
  {
    id: 'apt_security_deposit',
    domain: 'apartment',
    text: 'What is the security deposit amount?',
    type: 'number',
    weight: 7,
    required: true,
    placeholder: '$2,000',
    helpText: 'Upfront cash requirement (typically 1-2 months rent)'
  },
  {
    id: 'apt_pets',
    domain: 'apartment',
    text: 'Do you have pets?',
    type: 'boolean',
    weight: 7,
    required: true
  },
  {
    id: 'apt_pet_cost',
    domain: 'apartment',
    text: 'If pets are allowed, is there a pet deposit or monthly pet rent?',
    type: 'number',
    weight: 7,
    required: false,
    dependsOn: 'apt_pets',
    dependsOnValue: true,
    placeholder: '$50/month',
    helpText: '$25-75/month pet rent typical'
  },

  // Moderate Questions (5 points)
  {
    id: 'apt_laundry',
    domain: 'apartment',
    text: 'What laundry options does the building have?',
    type: 'enum',
    weight: 5,
    required: true,
    options: ['In-unit laundry', 'Shared laundry', 'No laundry facilities']
  },
  {
    id: 'apt_ac_heating',
    domain: 'apartment',
    text: 'Is there central air conditioning and heating?',
    type: 'boolean',
    weight: 5,
    required: true
  },
  {
    id: 'apt_floor',
    domain: 'apartment',
    text: 'What floor is the apartment on?',
    type: 'number',
    weight: 5,
    required: true,
    placeholder: '3'
  },
  {
    id: 'apt_elevator',
    domain: 'apartment',
    text: 'Is there an elevator?',
    type: 'boolean',
    weight: 5,
    required: true
  },
  {
    id: 'apt_credit_score',
    domain: 'apartment',
    text: 'What is your credit score range?',
    type: 'enum',
    weight: 5,
    required: true,
    options: ['Below 600', '600-650', '650-700', '700-750', 'Above 750'],
    helpText: '<650 = harder approval, higher deposits'
  },

  // Nice-to-Have Questions (3 points)
  {
    id: 'apt_amenities',
    domain: 'apartment',
    text: 'What amenities are must-haves?',
    type: 'multi-select',
    weight: 3,
    required: false,
    options: ['Gym', 'Pool', 'Doorman', 'Package Room', 'Rooftop Access', 'Storage', 'Bike Storage']
  },
  {
    id: 'apt_neighborhood_vibe',
    domain: 'apartment',
    text: 'Do you prefer a quiet or lively neighborhood?',
    type: 'scale',
    weight: 3,
    required: false,
    helpText: '1 = Very quiet, 10 = Very lively'
  },
  {
    id: 'apt_natural_light',
    domain: 'apartment',
    text: 'How important is natural light and window views?',
    type: 'scale',
    weight: 3,
    required: false,
    helpText: '1 = Not important, 10 = Very important'
  },
  {
    id: 'apt_wfh',
    domain: 'apartment',
    text: 'Do you plan to work from home? Need dedicated office space?',
    type: 'boolean',
    weight: 3,
    required: false
  },
  {
    id: 'apt_dealbreakers',
    domain: 'apartment',
    text: 'Any deal-breakers? (e.g., no ground floor, must have balcony)',
    type: 'text',
    weight: 3,
    required: false,
    placeholder: 'No ground floor units'
  }
]

/**
 * TRIP PLANNER QUESTIONS (20 questions)
 * Framework: Pareto Optimization (Multi-Objective)
 * Objectives: Maximize experiences, minimize cost, optimize time, match preferences
 */
export const TRIP_QUESTIONS: Question[] = [
  // Critical Questions (10 points)
  {
    id: 'trip_budget',
    domain: 'trip',
    text: 'What is your total trip budget (all expenses)?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '5000',
    helpText: 'Breakdown: 40% flights, 30% hotels, 20% activities, 10% food'
  },
  {
    id: 'trip_days',
    domain: 'trip',
    text: 'How many days do you have for this trip?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '5',
    helpText: 'Activities per day = total_days × 2-3'
  },
  {
    id: 'trip_dates',
    domain: 'trip',
    text: 'What are your departure/return dates (or flexible date range)?',
    type: 'date-range',
    weight: 10,
    required: true,
    helpText: 'Price volatility, seasonal considerations'
  },
  {
    id: 'trip_departure',
    domain: 'trip',
    text: 'Where are you departing from?',
    type: 'text',
    weight: 10,
    required: true,
    placeholder: 'Ben Gurion Airport, Tel Aviv',
    helpText: 'Flight costs, travel time'
  },
  {
    id: 'trip_destination',
    domain: 'trip',
    text: 'What destination(s) are you considering? (or open to suggestions)',
    type: 'text',
    weight: 10,
    required: true,
    placeholder: 'Dubai, UAE',
    helpText: 'Primary decision or recommendation needed'
  },

  // Important Questions (7 points)
  {
    id: 'trip_travelers',
    domain: 'trip',
    text: 'How many travelers? (adults, children, infants)',
    type: 'text',
    weight: 7,
    required: true,
    placeholder: '2 adults, 1 child (age 8)',
    helpText: 'Cost multiplier, accommodation needs'
  },
  {
    id: 'trip_style',
    domain: 'trip',
    text: 'What is your travel style?',
    type: 'enum',
    weight: 7,
    required: true,
    options: ['Luxury', 'Mid-range', 'Budget', 'Backpacker'],
    helpText: 'Hotel tier, restaurant choices, activity selection'
  },
  {
    id: 'trip_interests',
    domain: 'trip',
    text: 'What interests you most? (Select all that apply)',
    type: 'multi-select',
    weight: 7,
    required: true,
    options: ['Culture/Museums', 'Nature/Outdoors', 'Adventure/Sports', 'Relaxation/Beach', 'Food/Dining', 'Nightlife', 'Shopping']
  },
  {
    id: 'trip_pace',
    domain: 'trip',
    text: 'Do you prefer a fast-paced or relaxed itinerary?',
    type: 'scale',
    weight: 7,
    required: true,
    helpText: '1 = Very relaxed (2-3 activities/day), 10 = Very fast-paced (5-7 activities/day)'
  },
  {
    id: 'trip_must_see',
    domain: 'trip',
    text: 'Any must-see attractions or experiences?',
    type: 'text',
    weight: 7,
    required: false,
    placeholder: 'Eiffel Tower, Louvre Museum',
    helpText: 'Build itinerary around these'
  },

  // Moderate Questions (5 points)
  {
    id: 'trip_accommodation',
    domain: 'trip',
    text: 'What is your preferred accommodation type?',
    type: 'enum',
    weight: 5,
    required: true,
    options: ['Hotel', 'Airbnb/Vacation Rental', 'Hostel', 'Resort']
  },
  {
    id: 'trip_transportation',
    domain: 'trip',
    text: 'Do you need car rental or prefer public transit?',
    type: 'enum',
    weight: 5,
    required: true,
    options: ['Car rental', 'Public transit', 'Mix of both', 'Undecided']
  },
  {
    id: 'trip_dietary',
    domain: 'trip',
    text: 'Any dietary restrictions or food preferences?',
    type: 'multi-select',
    weight: 5,
    required: false,
    options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Kosher', 'Halal', 'No restrictions']
  },
  {
    id: 'trip_languages',
    domain: 'trip',
    text: 'What language(s) do you speak?',
    type: 'text',
    weight: 5,
    required: false,
    placeholder: 'English, Spanish',
    helpText: 'Communication ease, guide needs'
  },
  {
    id: 'trip_insurance',
    domain: 'trip',
    text: 'Do you need travel insurance?',
    type: 'boolean',
    weight: 5,
    required: true,
    helpText: 'Risk mitigation, trip cost protection (4-8% of total trip cost)'
  },

  // Nice-to-Have Questions (3 points)
  {
    id: 'trip_flight_class',
    domain: 'trip',
    text: 'Preferred flight class?',
    type: 'enum',
    weight: 3,
    required: false,
    options: ['Economy', 'Premium Economy', 'Business', 'First Class']
  },
  {
    id: 'trip_seat_preference',
    domain: 'trip',
    text: 'Window or aisle seat preference?',
    type: 'enum',
    weight: 3,
    required: false,
    options: ['Window', 'Aisle', 'No preference']
  },
  {
    id: 'trip_layovers',
    domain: 'trip',
    text: 'Do you want direct flights only or okay with layovers?',
    type: 'enum',
    weight: 3,
    required: false,
    options: ['Direct flights only', 'Okay with 1 layover', 'Okay with multiple layovers'],
    helpText: 'Layovers save 20-40% typically'
  },
  {
    id: 'trip_mobility',
    domain: 'trip',
    text: 'Any health concerns or mobility issues?',
    type: 'text',
    weight: 3,
    required: false,
    placeholder: 'Need elevator access',
    helpText: 'Accessibility requirements'
  },
  {
    id: 'trip_tours',
    domain: 'trip',
    text: 'Do you want travel guide recommendations or book tours?',
    type: 'boolean',
    weight: 3,
    required: false,
    helpText: 'Self-guided vs organized (tours = $50-150 per activity)'
  }
]

/**
 * BUDGET PLANNER QUESTIONS (18 questions)
 * Framework: 50/30/20 Rule + Zero-Based Budgeting
 * Categories: 50% Needs, 30% Wants, 20% Savings
 */
export const BUDGET_QUESTIONS: Question[] = [
  // Critical Questions (10 points)
  {
    id: 'budget_income',
    domain: 'budget',
    text: 'What is your monthly take-home income (after taxes)?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '$5,000',
    helpText: 'Foundation for all calculations'
  },
  {
    id: 'budget_housing',
    domain: 'budget',
    text: 'What is your current monthly rent/mortgage payment?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '$1,500',
    helpText: 'Largest fixed expense (should ≤ 30% of gross income)'
  },
  {
    id: 'budget_debt',
    domain: 'budget',
    text: 'Do you have any debt? (List balances and minimum payments)',
    type: 'text',
    weight: 10,
    required: true,
    placeholder: 'Credit card: $5,000 balance, $150/month minimum',
    helpText: 'Mandatory payments reduce available income'
  },
  {
    id: 'budget_utilities',
    domain: 'budget',
    text: 'What are your monthly utility costs? (electric, gas, water, internet)',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '$200',
    helpText: 'Essential fixed expenses'
  },
  {
    id: 'budget_groceries',
    domain: 'budget',
    text: 'What is your monthly grocery budget?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '$400',
    helpText: 'Essential variable expense ($200-400 per person)'
  },

  // Important Questions (7 points)
  {
    id: 'budget_car',
    domain: 'budget',
    text: 'Do you have car expenses? (payment, insurance, gas, maintenance)',
    type: 'number',
    weight: 7,
    required: false,
    placeholder: '$500',
    helpText: 'Major expense category ($300-700/month all-in)'
  },
  {
    id: 'budget_subscriptions',
    domain: 'budget',
    text: 'What are your monthly subscription costs? (streaming, gym, software)',
    type: 'text',
    weight: 7,
    required: false,
    placeholder: 'Netflix $15, Spotify $10, Gym $50',
    helpText: 'Hidden "wants" that accumulate'
  },
  {
    id: 'budget_dining_out',
    domain: 'budget',
    text: 'How much do you spend dining out per month?',
    type: 'number',
    weight: 7,
    required: true,
    placeholder: '$300',
    helpText: 'Major "wants" category, easy to cut (should ≤ 5-10% of income)'
  },
  {
    id: 'budget_emergency_fund',
    domain: 'budget',
    text: 'Do you have an emergency fund? If yes, how many months of expenses?',
    type: 'number',
    weight: 7,
    required: true,
    placeholder: '3',
    helpText: 'Financial safety net (goal: 3-6 months)'
  },
  {
    id: 'budget_retirement',
    domain: 'budget',
    text: 'Are you contributing to retirement? (401k, IRA, etc.)',
    type: 'text',
    weight: 7,
    required: true,
    placeholder: '$500/month or 10% of gross income',
    helpText: 'Long-term financial health (benchmark: 15% of gross income)'
  },

  // Moderate Questions (5 points)
  {
    id: 'budget_goals',
    domain: 'budget',
    text: 'What are your financial goals?',
    type: 'multi-select',
    weight: 5,
    required: true,
    options: ['Save for house down payment', 'Pay off debt', 'Build emergency fund', 'Increase retirement savings', 'Save for vacation', 'Build wealth']
  },
  {
    id: 'budget_entertainment',
    domain: 'budget',
    text: 'How much do you spend on entertainment per month? (movies, concerts, hobbies)',
    type: 'number',
    weight: 5,
    required: false,
    placeholder: '$200'
  },
  {
    id: 'budget_dependents',
    domain: 'budget',
    text: 'Do you have dependents? (children, elderly parents)',
    type: 'text',
    weight: 5,
    required: false,
    placeholder: '2 children (ages 5 and 8)',
    helpText: 'Additional expenses (childcare = $500-2000/month)'
  },
  {
    id: 'budget_health_insurance',
    domain: 'budget',
    text: 'What is your health insurance situation?',
    type: 'enum',
    weight: 5,
    required: true,
    options: ['Employer-provided', 'Marketplace plan', 'Medicaid', 'No insurance'],
    helpText: 'Major healthcare costs'
  },
  {
    id: 'budget_health_insurance_cost',
    domain: 'budget',
    text: 'What is your monthly health insurance premium?',
    type: 'number',
    weight: 5,
    required: false,
    dependsOn: 'budget_health_insurance',
    placeholder: '$300',
    helpText: 'Typical: $100-500/month'
  },
  {
    id: 'budget_irregular',
    domain: 'budget',
    text: 'Do you have irregular expenses? (annual insurance, property tax)',
    type: 'text',
    weight: 5,
    required: false,
    placeholder: 'Car insurance $1200/year, Property tax $3000/year',
    helpText: 'Divide by 12, save monthly'
  },

  // Nice-to-Have Questions (3 points)
  {
    id: 'budget_risk_tolerance',
    domain: 'budget',
    text: 'What is your risk tolerance?',
    type: 'enum',
    weight: 3,
    required: false,
    options: ['Aggressive saver (60/20/20)', 'Balanced (50/30/20)', 'Enjoy present (50/40/10)'],
    helpText: 'Adjust 50/30/20 ratios based on preference'
  },
  {
    id: 'budget_variable_income',
    domain: 'budget',
    text: 'Do you have variable income? (freelance, commission, seasonal)',
    type: 'boolean',
    weight: 3,
    required: false,
    helpText: 'Budget on minimum monthly income'
  }
]

/**
 * PRODUCT DECISION QUESTIONS (17 questions)
 * Framework: Pugh Matrix (Weighted Decision Matrix)
 * Compare 3-5 products across weighted criteria
 */
export const PRODUCT_QUESTIONS: Question[] = [
  // Critical Questions (10 points)
  {
    id: 'product_category',
    domain: 'product',
    text: 'What product category are you researching?',
    type: 'enum',
    weight: 10,
    required: true,
    options: ['Electronics', 'Appliances', 'Vehicles', 'Software', 'Furniture', 'Other'],
    helpText: 'Determines sub-domain framework'
  },
  {
    id: 'product_budget',
    domain: 'product',
    text: 'What is your maximum budget for this purchase?',
    type: 'number',
    weight: 10,
    required: true,
    placeholder: '$1,000',
    helpText: 'Hard constraint, filters options'
  },
  {
    id: 'product_use_case',
    domain: 'product',
    text: 'What is your primary use case for this product?',
    type: 'text',
    weight: 10,
    required: true,
    placeholder: 'Video editing and gaming',
    helpText: 'Determines feature prioritization'
  },
  {
    id: 'product_must_haves',
    domain: 'product',
    text: 'Are there any must-have features or deal-breakers?',
    type: 'text',
    weight: 10,
    required: false,
    placeholder: 'Must have at least 16GB RAM',
    helpText: 'Binary filters before scoring'
  },
  {
    id: 'product_timeline',
    domain: 'product',
    text: 'How soon do you need this product?',
    type: 'enum',
    weight: 10,
    required: true,
    options: ['Immediately', 'Within 1-3 months', 'Flexible (can wait for sales)'],
    helpText: 'New model releases, sales timing'
  },

  // Important Questions (7 points)
  {
    id: 'product_condition',
    domain: 'product',
    text: 'Are you considering new, refurbished, or used?',
    type: 'multi-select',
    weight: 7,
    required: true,
    options: ['New', 'Refurbished', 'Used'],
    helpText: 'Refurbished = 20-40% off, used = 30-70% off'
  },
  {
    id: 'product_expertise',
    domain: 'product',
    text: 'What is your technical expertise level for this product category?',
    type: 'scale',
    weight: 7,
    required: true,
    helpText: '1 = Beginner, 10 = Expert (affects complexity vs ease of use trade-off)'
  },
  {
    id: 'product_brand_priority',
    domain: 'product',
    text: 'Do you prioritize brand reputation or best value?',
    type: 'scale',
    weight: 7,
    required: true,
    helpText: '1 = Best value (generic), 10 = Brand reputation (premium)'
  },
  {
    id: 'product_usage_duration',
    domain: 'product',
    text: 'How long do you plan to use this product?',
    type: 'number',
    weight: 7,
    required: true,
    placeholder: '5',
    helpText: 'Years (longer = justify higher upfront cost)'
  },
  {
    id: 'product_brand_loyalty',
    domain: 'product',
    text: 'Are you loyal to any brands or ecosystems?',
    type: 'text',
    weight: 7,
    required: false,
    placeholder: 'Apple ecosystem',
    helpText: 'Compatibility, sunk cost'
  },

  // Moderate Questions (5 points)
  {
    id: 'product_warranty',
    domain: 'product',
    text: 'Do you need warranty/insurance?',
    type: 'boolean',
    weight: 5,
    required: false,
    helpText: 'Risk mitigation cost (10-20% of product price)'
  },
  {
    id: 'product_accessories',
    domain: 'product',
    text: 'Are there accessories you need to budget for?',
    type: 'text',
    weight: 5,
    required: false,
    placeholder: 'Mouse, keyboard, monitor',
    helpText: 'Hidden costs'
  },
  {
    id: 'product_sustainability',
    domain: 'product',
    text: 'Do you care about environmental impact or sustainability?',
    type: 'scale',
    weight: 5,
    required: false,
    helpText: '1 = Not important, 10 = Very important'
  },
  {
    id: 'product_resale_value',
    domain: 'product',
    text: 'How important is resale value?',
    type: 'scale',
    weight: 5,
    required: false,
    helpText: '1 = Not important, 10 = Very important (Apple products hold 60-70% value)'
  },
  {
    id: 'product_financing',
    domain: 'product',
    text: 'Do you need financing options?',
    type: 'boolean',
    weight: 5,
    required: false,
    helpText: 'Payment flexibility (factor interest into true cost)'
  },

  // Nice-to-Have Questions (3 points)
  {
    id: 'product_aesthetics',
    domain: 'product',
    text: 'What aesthetic preferences do you have? (color, style, size)',
    type: 'text',
    weight: 3,
    required: false,
    placeholder: 'Space gray, minimalist design',
    helpText: 'Emotional satisfaction, tie-breaker'
  },
  {
    id: 'product_past_experience',
    domain: 'product',
    text: 'Have you owned this product category before? What did you like/dislike?',
    type: 'text',
    weight: 3,
    required: false,
    placeholder: 'Previous laptop was too heavy',
    helpText: 'Learn from past experience'
  }
]

/**
 * Get all questions for a specific domain
 */
export function getQuestionsByDomain(domain: DomainType): Question[] {
  switch (domain) {
    case 'apartment':
      return APARTMENT_QUESTIONS
    case 'trip':
      return TRIP_QUESTIONS
    case 'budget':
      return BUDGET_QUESTIONS
    case 'product':
      return PRODUCT_QUESTIONS
    case 'generic':
      return []
    default:
      return []
  }
}

/**
 * Get questions filtered by weight (for research depth)
 */
export function getQuestionsByWeight(
  domain: DomainType,
  weights: QuestionWeight[]
): Question[] {
  const allQuestions = getQuestionsByDomain(domain)
  return allQuestions.filter(q => weights.includes(q.weight))
}

/**
 * Get total question count for a domain
 */
export function getQuestionCount(domain: DomainType): number {
  return getQuestionsByDomain(domain).length
}

/**
 * Get question by ID
 */
export function getQuestionById(questionId: string): Question | undefined {
  const allQuestions = [
    ...APARTMENT_QUESTIONS,
    ...TRIP_QUESTIONS,
    ...BUDGET_QUESTIONS,
    ...PRODUCT_QUESTIONS
  ]
  return allQuestions.find(q => q.id === questionId)
}

/**
 * Get all questions across all domains (77 total)
 */
export function getAllQuestions(): Question[] {
  return [
    ...APARTMENT_QUESTIONS,
    ...TRIP_QUESTIONS,
    ...BUDGET_QUESTIONS,
    ...PRODUCT_QUESTIONS
  ]
}

/**
 * Summary statistics
 */
export const QUESTION_STATS = {
  apartment: APARTMENT_QUESTIONS.length, // 22
  trip: TRIP_QUESTIONS.length,           // 20
  budget: BUDGET_QUESTIONS.length,       // 18
  product: PRODUCT_QUESTIONS.length,     // 17
  total: 77
}
