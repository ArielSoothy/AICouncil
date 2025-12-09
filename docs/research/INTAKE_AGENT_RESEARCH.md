# Intake Agent Research - Domain-Specific Decision Frameworks

**Documented**: January 2025
**Status**: Comprehensive research complete, ready for implementation

---

## 🎯 Overview

This document contains complete research findings for implementing domain-specific decision frameworks with an intake agent that asks clarifying questions before running multi-model analysis.

---

## 🤖 Intake Agent Architecture

### Core Concept

**Traditional Flow** (Current):
```
User Query → Multi-Model Analysis → Generic Answer
```

**New Flow** (Intake Agent):
```
User Query → Domain Classification → Clarifying Questions →
Context-Enhanced Query → Domain-Specific Research Method →
Structured Analysis → Actionable Recommendation
```

### Ambiguity Detection System

**Purpose**: Identify missing context that would improve decision quality

**Detection Patterns:**
```typescript
interface AmbiguityDetector {
  // Financial decisions need budget
  budgetMissing: /cost|price|expensive|cheap/i.test(query) && !hasBudget

  // Time-based decisions need timeline
  timelineMissing: /plan|schedule|when/i.test(query) && !hasTimeframe

  // Location decisions need geography
  locationMissing: /where|city|area|neighborhood/i.test(query) && !hasLocation

  // Comparison decisions need priorities
  prioritiesMissing: /best|choose|compare|vs/i.test(query) && !hasCriteria
}
```

**Example - Apartment Query:**
```
User: "Should I rent this apartment?"

Ambiguity Detected:
- ❌ No budget context
- ❌ No location mentioned
- ❌ No commute requirements
- ❌ No amenity preferences
- ❌ No lease duration

Clarifying Questions Generated: 22 questions (see Apartment Framework below)
```

---

## 🏠 Domain Framework 1: Apartment Rent

### Research Methodology

**Academic Foundation**: Multi-Attribute Utility Theory (MAUT)

**Core Formula:**
```
Apartment_Score = Σ (weight_i × normalized_value_i)

Where:
- weight_i = User's importance rating (0-10)
- normalized_value_i = Feature score on 0-1 scale
- i = Each decision criterion
```

### 22 Clarifying Questions (Weighted by Importance)

#### Critical Questions (10 points each)

1. **"What is your monthly gross income?"**
   - **Why**: Validate affordability (30% rule: rent ≤ 30% of gross income)
   - **Data Type**: Number (dollars)
   - **Validation**: rent / monthly_income ≤ 0.30

2. **"What is the monthly rent for this apartment?"**
   - **Why**: Primary cost factor
   - **Data Type**: Number (dollars)
   - **Market Comparison**: Compare to Zillow median for area

3. **"What is the apartment's address or neighborhood?"**
   - **Why**: Location drives value, safety, amenities
   - **Data Type**: Text (geocode to lat/long)
   - **Data Sources**: Google Places API, Census data, crime statistics

4. **"What is your workplace address (for commute calculation)?"**
   - **Why**: Commute time = quality of life + hidden costs
   - **Data Type**: Text (geocode)
   - **Calculation**: Google Maps API distance/time + cost per mile

5. **"How long is the lease term?"**
   - **Why**: Flexibility vs stability trade-off
   - **Data Type**: Number (months)
   - **Analysis**: Longer = commitment risk, shorter = flexibility premium

#### Important Questions (7 points each)

6. **"How many bedrooms/bathrooms do you need?"**
   - **Why**: Space adequacy for household size
   - **Data Type**: Numbers
   - **Validation**: Beds ≥ household_size / 2

7. **"What utilities are included in rent?"**
   - **Why**: Hidden costs (gas, electric, water, internet)
   - **Data Type**: Checklist
   - **Cost Addition**: Estimate $100-200/month for excluded utilities

8. **"Is parking included? If not, what is the monthly cost?"**
   - **Why**: Car owners face $50-300/month extra
   - **Data Type**: Boolean + Number
   - **Impact**: Add to total housing cost

9. **"What is the security deposit amount?"**
   - **Why**: Upfront cash requirement
   - **Data Type**: Number (dollars)
   - **Typical**: 1-2 months rent

10. **"Are pets allowed? If yes, is there a pet deposit/rent?"**
    - **Why**: Pet owners have limited options + extra costs
    - **Data Type**: Boolean + Number
    - **Cost Impact**: $25-75/month pet rent typical

#### Moderate Questions (5 points each)

11. **"Does the building have in-unit laundry, shared laundry, or neither?"**
    - **Why**: Convenience + time savings
    - **Data Type**: Enum (in-unit, shared, none)
    - **Value**: In-unit adds $50-100/month equivalent value

12. **"Is there central air conditioning / heating?"**
    - **Why**: Comfort + utility costs
    - **Data Type**: Boolean
    - **Climate Factor**: Critical in hot/cold climates

13. **"What floor is the apartment on? Is there an elevator?"**
    - **Why**: Accessibility, noise, move-in effort
    - **Data Type**: Number + Boolean
    - **Preference**: Ground floor or elevator required for some

14. **"How many months of rent history do you have? (for rental application)"**
    - **Why**: Application approval likelihood
    - **Data Type**: Number
    - **Typical Requirement**: 2-3 months rent history

15. **"What is your credit score range?"**
    - **Why**: Approval likelihood + deposit amount
    - **Data Type**: Range (300-850)
    - **Impact**: <650 = harder approval, higher deposits

#### Nice-to-Have Questions (3 points each)

16. **"What amenities are must-haves? (gym, pool, doorman, etc.)"**
    - **Why**: Lifestyle fit
    - **Data Type**: Multi-select
    - **Value**: Gym membership equivalent ~$50/month

17. **"Do you prefer quiet or lively neighborhood?"**
    - **Why**: Personality/lifestyle fit
    - **Data Type**: Scale (1-10: quiet to lively)
    - **Data Source**: Yelp nightlife density

18. **"How important is natural light / window views?"**
    - **Why**: Mental health, energy costs
    - **Data Type**: Scale (1-10)
    - **Analysis**: South-facing windows preferred

19. **"Do you plan to work from home? Need dedicated office space?"**
    - **Why**: Space requirements, internet quality
    - **Data Type**: Boolean
    - **Impact**: May need 1 extra bedroom

20. **"What is the neighborhood walkability score preference?"**
    - **Why**: Car-free lifestyle, daily convenience
    - **Data Type**: Scale (1-10)
    - **Data Source**: Walk Score API

21. **"How important is proximity to public transit?"**
    - **Why**: Transportation flexibility
    - **Data Type**: Scale (1-10)
    - **Data Source**: Transit app data

22. **"Any deal-breakers? (e.g., no ground floor, must have balcony)"**
    - **Why**: Hard constraints
    - **Data Type**: Text (free response)
    - **Analysis**: Binary filter (has deal-breaker = reject)

### Decision Matrix Calculation

```typescript
interface ApartmentScore {
  // Financial Score (40% weight)
  affordability: number        // rent / income ≤ 0.30 = 100, linear decay
  marketValue: number          // vs Zillow median for neighborhood
  hiddenCosts: number          // utilities, parking, deposits

  // Location Score (30% weight)
  commuteScore: number         // <20min = 100, linear decay
  neighborhoodSafety: number   // crime statistics percentile
  walkability: number          // Walk Score API
  transitAccess: number        // Distance to nearest transit

  // Physical Property Score (20% weight)
  spaceAdequacy: number        // bedrooms, bathrooms, sq ft
  amenitiesScore: number       // in-unit laundry, AC, etc.
  buildingQuality: number      // age, maintenance, reviews

  // Lifestyle Fit Score (10% weight)
  neighborhoodVibe: number     // quiet vs lively match
  petFriendliness: number      // if has pets
  wfhSuitability: number       // if works from home

  // Final Weighted Score
  totalScore: number           // 0-100 scale
  recommendation: "RENT" | "PASS" | "NEGOTIATE"
}
```

### Recommendation Logic

```typescript
function generateRecommendation(score: ApartmentScore): string {
  if (score.affordability < 50) {
    return "❌ PASS - Not affordable (rent exceeds 30% of income)"
  }

  if (score.totalScore >= 80) {
    return "✅ STRONGLY RECOMMEND - Excellent match across all criteria"
  }

  if (score.totalScore >= 65) {
    return "✅ RECOMMEND - Good fit with minor compromises"
  }

  if (score.totalScore >= 50) {
    return "🤔 NEUTRAL - Consider negotiating or keep searching"
  }

  return "❌ PASS - Better options likely available"
}
```

---

## ✈️ Domain Framework 2: Trip Planner

### Research Methodology

**Academic Foundation**: Multi-Objective Optimization (Pareto Efficiency)

**Core Objectives:**
1. Maximize experiences (attractions, activities)
2. Minimize total cost (flights, hotels, food, activities)
3. Optimize time efficiency (minimize transit, maximize activities)
4. Match personal preferences (adventure vs relaxation, culture vs nature)

### 20 Clarifying Questions

#### Critical Questions (10 points)

1. **"What is your total trip budget (all expenses)?"**
   - **Why**: Hard constraint, determines everything
   - **Data Type**: Number (dollars)
   - **Breakdown**: 40% flights, 30% hotels, 20% activities, 10% food

2. **"How many days do you have for this trip?"**
   - **Why**: Time constraint, determines feasibility
   - **Data Type**: Number (days)
   - **Calculation**: Activities per day = total_days × 2-3

3. **"What are your departure/return dates (or flexible date range)?"**
   - **Why**: Price volatility, seasonal considerations
   - **Data Type**: Date range
   - **Analysis**: Google Flights API for price trends

4. **"Where are you departing from?"**
   - **Why**: Flight costs, travel time
   - **Data Type**: Text (airport code)
   - **Data Source**: Skyscanner API

5. **"What destination(s) are you considering? (or open to suggestions)"**
   - **Why**: Primary decision or recommendation needed
   - **Data Type**: Text (city names)
   - **Analysis**: If open → recommend based on budget + season

#### Important Questions (7 points)

6. **"How many travelers? (adults, children, infants)"**
   - **Why**: Cost multiplier, accommodation needs
   - **Data Type**: Numbers
   - **Impact**: Family discounts, kid-friendly activities

7. **"What is your travel style? (luxury, mid-range, budget, backpacker)"**
   - **Why**: Hotel tier, restaurant choices, activity selection
   - **Data Type**: Enum
   - **Budget Allocation**: Luxury = 50% hotels, Budget = 20% hotels

8. **"What interests you most? (culture, nature, adventure, relaxation, food)"**
   - **Why**: Activity curation
   - **Data Type**: Multi-select with ranking
   - **Impact**: Museum-heavy vs beach-heavy itinerary

9. **"Do you prefer fast-paced or relaxed itinerary?"**
   - **Why**: Activities per day (2-3 vs 5-7)
   - **Data Type**: Scale (1-10)
   - **Calculation**: Fast-paced = 5-7 activities/day

10. **"Any must-see attractions or experiences?"**
    - **Why**: Hard requirements
    - **Data Type**: Text (list)
    - **Impact**: Build itinerary around these

#### Moderate Questions (5 points)

11. **"What is your preferred hotel/accommodation type?"**
    - **Why**: Cost + experience trade-off
    - **Data Type**: Enum (hotel, hostel, Airbnb, resort)
    - **Cost Impact**: Hotel = $100-300/night, Hostel = $20-50/night

12. **"Do you need car rental or prefer public transit?"**
    - **Why**: Transportation costs + flexibility
    - **Data Type**: Boolean + Preference
    - **Cost**: Car rental $30-70/day + gas vs transit $5-15/day

13. **"Any dietary restrictions or food preferences?"**
    - **Why**: Restaurant recommendations, meal planning
    - **Data Type**: Multi-select
    - **Impact**: Vegetarian options in some countries limited

14. **"What language(s) do you speak?"**
    - **Why**: Communication ease, guide needs
    - **Data Type**: Text (languages)
    - **Impact**: English-speaking countries easier

15. **"Do you need travel insurance?"**
    - **Why**: Risk mitigation, trip cost protection
    - **Data Type**: Boolean
    - **Cost**: 4-8% of total trip cost

#### Nice-to-Have Questions (3 points)

16. **"Preferred flight class? (economy, premium economy, business)"**
    - **Why**: Comfort vs cost trade-off
    - **Data Type**: Enum
    - **Cost Impact**: Business = 3-5x economy

17. **"Window or aisle seat preference?"**
    - **Why**: Long-haul comfort
    - **Data Type**: Enum
    - **Impact**: Minor, but improves experience

18. **"Do you want direct flights only or okay with layovers?"**
    - **Why**: Time vs cost optimization
    - **Data Type**: Boolean
    - **Savings**: Layovers save 20-40% typically

19. **"Any health concerns or mobility issues?"**
    - **Why**: Accessibility requirements
    - **Data Type**: Text
    - **Impact**: Elevator access, walking distance limits

20. **"Do you want travel guide recommendations or book tours?"**
    - **Why**: Self-guided vs organized
    - **Data Type**: Boolean
    - **Cost Impact**: Tours = $50-150 per activity

### Trip Optimization Algorithm

```typescript
interface TripPlan {
  // Flight Optimization
  flights: {
    outbound: Flight         // Best price/time trade-off
    return: Flight
    totalCost: number
    layovers: number
  }

  // Accommodation Optimization
  hotels: Hotel[]            // Array of nightly bookings
  avgNightlyCost: number
  totalAccommodation: number

  // Itinerary Optimization
  dailySchedule: Day[]       // Day-by-day activities
  activitiesPerDay: number   // Based on pace preference
  totalActivitiesCost: number

  // Budget Breakdown
  budget: {
    flights: number          // 40% of budget
    hotels: number           // 30% of budget
    activities: number       // 20% of budget
    food: number             // 10% of budget
    buffer: number           // 10% contingency
    total: number
  }

  // Feasibility Score
  budgetFit: number          // How well trip fits budget (0-100)
  timeFit: number            // How well activities fit timeframe
  preferenceFit: number      // Match to user interests
  logisticsFeasibility: number  // Travel times, connections

  totalScore: number         // 0-100
  recommendation: string
}
```

### Itinerary Generation Logic

```typescript
function generateItinerary(answers: TripAnswers): TripPlan {
  // 1. Allocate budget
  const budgetBreakdown = {
    flights: answers.totalBudget × 0.40,
    hotels: answers.totalBudget × 0.30,
    activities: answers.totalBudget × 0.20,
    food: answers.totalBudget × 0.10
  }

  // 2. Find flights within budget
  const flights = await findFlights({
    from: answers.departure,
    to: answers.destination,
    dates: answers.dates,
    maxCost: budgetBreakdown.flights,
    directOnly: answers.directFlightsOnly
  })

  // 3. Find accommodations
  const hotels = await findHotels({
    location: answers.destination,
    dates: answers.dates,
    maxNightlyCost: budgetBreakdown.hotels / answers.days,
    type: answers.accommodationType
  })

  // 4. Generate daily schedule
  const activities = await getActivities({
    location: answers.destination,
    interests: answers.interests,
    pace: answers.pace,
    days: answers.days
  })

  // 5. Optimize day-by-day
  const itinerary = optimizeItinerary({
    activities: activities,
    hotel: hotels[0],  // Single hotel or multiple
    pace: answers.pace,
    days: answers.days
  })

  return {
    flights,
    hotels,
    dailySchedule: itinerary,
    budget: budgetBreakdown,
    totalScore: calculateTripScore(...)
  }
}
```

---

## 💰 Domain Framework 3: Budget Planner

### Research Methodology

**Academic Foundation**: 50/30/20 Rule + Zero-Based Budgeting

**Core Principles:**
- **50% Needs**: Housing, utilities, groceries, insurance, minimum debt payments
- **30% Wants**: Dining out, entertainment, hobbies, subscriptions
- **20% Savings**: Emergency fund, retirement, debt payoff above minimums

### 18 Clarifying Questions

#### Critical Questions (10 points)

1. **"What is your monthly take-home income (after taxes)?"**
   - **Why**: Foundation for all calculations
   - **Data Type**: Number (dollars)
   - **Validation**: All expenses should ≤ income

2. **"What is your current monthly rent/mortgage payment?"**
   - **Why**: Largest fixed expense (typically 30-40% of income)
   - **Data Type**: Number (dollars)
   - **Benchmark**: Should ≤ 30% of gross income

3. **"Do you have any debt? (credit cards, student loans, car loans)"**
   - **Why**: Mandatory payments reduce available income
   - **Data Type**: List of debts with balances + minimum payments
   - **Impact**: High-interest debt = priority payoff

4. **"What are your monthly utility costs? (electric, gas, water, internet)"**
   - **Why**: Essential fixed expenses
   - **Data Type**: Number (dollars)
   - **Typical**: $100-300/month

5. **"What is your monthly grocery budget?"**
   - **Why**: Essential variable expense
   - **Data Type**: Number (dollars)
   - **Benchmark**: $200-400 per person

#### Important Questions (7 points)

6. **"Do you have car expenses? (payment, insurance, gas, maintenance)"**
   - **Why**: Major expense category
   - **Data Type**: Number (dollars)
   - **Typical**: $300-700/month all-in

7. **"What are your monthly subscription costs? (streaming, gym, software)"**
   - **Why**: Hidden "wants" that accumulate
   - **Data Type**: List of subscriptions + costs
   - **Typical**: $50-150/month (Netflix, Spotify, gym, etc.)

8. **"How much do you spend dining out per month?"**
   - **Why**: Major "wants" category, easy to cut
   - **Data Type**: Number (dollars)
   - **Benchmark**: Should ≤ 5-10% of income

9. **"Do you have an emergency fund? If yes, how many months of expenses?"**
   - **Why**: Financial safety net
   - **Data Type**: Number (months)
   - **Goal**: 3-6 months of expenses

10. **"Are you contributing to retirement? (401k, IRA, etc.)"**
    - **Why**: Long-term financial health
    - **Data Type**: Number (dollars) or Percentage
    - **Benchmark**: 15% of gross income

#### Moderate Questions (5 points)

11. **"What are your financial goals? (save for house, pay off debt, build wealth)"**
    - **Why**: Prioritization for "savings" bucket
    - **Data Type**: Multi-select with ranking
    - **Impact**: Determines savings allocation

12. **"How much do you spend on entertainment per month? (movies, concerts, hobbies)"**
    - **Why**: "Wants" category tracking
    - **Data Type**: Number (dollars)
    - **Flexibility**: Easy to reduce in tight budgets

13. **"Do you have dependents? (children, elderly parents)"**
    - **Why**: Additional expenses (childcare, medical)
    - **Data Type**: Number + ages
    - **Impact**: Childcare = $500-2000/month

14. **"What is your health insurance situation? (employer, marketplace, none)"**
    - **Why**: Major healthcare costs
    - **Data Type**: Enum + monthly premium
    - **Typical**: $100-500/month

15. **"Do you have irregular expenses? (annual insurance, property tax)"**
    - **Why**: Budget for lump sums
    - **Data Type**: List with amounts + frequency
    - **Solution**: Divide by 12, save monthly

#### Nice-to-Have Questions (3 points)

16. **"What is your risk tolerance? (aggressive saver, balanced, enjoy present)"**
    - **Why**: Adjust 50/30/20 ratios
    - **Data Type**: Enum
    - **Impact**: Aggressive = 60/20/20, Enjoy = 50/40/10

17. **"Do you have variable income? (freelance, commission, seasonal)"**
    - **Why**: Budgeting complexity
    - **Data Type**: Boolean
    - **Solution**: Budget on minimum monthly income

18. **"Any major upcoming expenses? (wedding, moving, medical)"**
    - **Why**: Short-term savings goals
    - **Data Type**: Text (description) + amount + timeline
    - **Impact**: Temporary savings boost needed

### Budget Allocation Algorithm

```typescript
interface BudgetPlan {
  // Income
  monthlyIncome: number
  annualIncome: number

  // 50% Needs (Fixed + Essential Variable)
  needs: {
    housing: number              // Rent/mortgage
    utilities: number            // Electric, gas, water, internet
    groceries: number            // Essential food
    transportation: number       // Car payment, gas, transit
    insurance: number            // Health, car, renters/home
    minimumDebtPayments: number  // Credit cards, loans
    childcare: number            // If applicable
    total: number                // Sum of above
    percentOfIncome: number      // Should ≤ 50%
  }

  // 30% Wants (Discretionary)
  wants: {
    diningOut: number
    entertainment: number
    subscriptions: number
    hobbies: number
    vacations: number            // Monthly average
    shopping: number
    total: number
    percentOfIncome: number      // Should ≤ 30%
  }

  // 20% Savings & Debt Payoff
  savings: {
    emergencyFund: number        // Until 3-6 months saved
    retirement: number           // 401k, IRA
    debtPayoff: number           // Above minimums
    savingsGoals: number         // House, car, etc.
    investments: number          // Brokerage, crypto, etc.
    total: number
    percentOfIncome: number      // Should ≥ 20%
  }

  // Analysis
  currentVsIdeal: {
    needsDiff: number            // Current - 50%
    wantsDiff: number            // Current - 30%
    savingsDiff: number          // Current - 20%
  }

  recommendations: string[]      // Specific actions
  healthScore: number            // 0-100
}
```

### Budget Recommendation Logic

```typescript
function generateBudgetRecommendations(current: BudgetPlan): string[] {
  const recommendations = []

  // Housing too high
  if (current.needs.housing / current.monthlyIncome > 0.35) {
    recommendations.push(
      `🏠 HOUSING: $${current.needs.housing}/month is ${percent}% of income. ` +
      `Consider finding roommate, moving to cheaper area, or increasing income.`
    )
  }

  // No emergency fund
  if (current.savings.emergencyFund === 0) {
    recommendations.push(
      `🚨 EMERGENCY FUND: You have $0 saved. Start with $1000, then build to 3 months expenses ($${current.needs.total * 3}).`
    )
  }

  // High-interest debt
  if (current.needs.minimumDebtPayments > current.monthlyIncome × 0.15) {
    recommendations.push(
      `💳 DEBT: $${current.needs.minimumDebtPayments}/month in debt payments. ` +
      `Focus on paying off high-interest debt (>8% APR) before other savings goals.`
    )
  }

  // Dining out too high
  if (current.wants.diningOut > current.monthlyIncome × 0.10) {
    recommendations.push(
      `🍔 DINING OUT: $${current.wants.diningOut}/month is ${percent}% of income. ` +
      `Cut to $${current.monthlyIncome * 0.05}/month to save $${savings}/month.`
    )
  }

  // Subscription accumulation
  if (current.wants.subscriptions > 100) {
    recommendations.push(
      `📺 SUBSCRIPTIONS: $${current.wants.subscriptions}/month. ` +
      `Review each subscription - cancel unused services. Average household needs 3-5 max.`
    )
  }

  // No retirement savings
  if (current.savings.retirement === 0) {
    recommendations.push(
      `🏦 RETIREMENT: $0 saved. Start with employer 401k match (free money!), ` +
      `then Roth IRA up to $7000/year. Goal: 15% of gross income.`
    )
  }

  return recommendations
}
```

---

## 📦 Domain Framework 4: Product Decision

### Research Methodology

**Academic Foundation**: Pugh Matrix (Weighted Decision Matrix)

**Core Concept**: Score each product option across weighted criteria, select highest-scoring option.

### 17 Clarifying Questions

#### Critical Questions (10 points)

1. **"What product category are you researching?"**
   - **Why**: Determines sub-domain framework
   - **Data Type**: Enum (electronics, appliances, vehicles, software, furniture, etc.)
   - **Impact**: Load category-specific criteria

2. **"What is your maximum budget for this purchase?"**
   - **Why**: Hard constraint, filters options
   - **Data Type**: Number (dollars)
   - **Analysis**: Show options 10% below budget (negotiation room)

3. **"What is your primary use case for this product?"**
   - **Why**: Determines feature prioritization
   - **Data Type**: Text (free response)
   - **Example**: "Photo editing" vs "Gaming" for laptop = different priorities

4. **"Are there any must-have features or deal-breakers?"**
   - **Why**: Binary filters before scoring
   - **Data Type**: Text (list)
   - **Impact**: Exclude products missing must-haves

5. **"How soon do you need this product?"**
   - **Why**: New model releases, sales timing
   - **Data Type**: Enum (immediately, 1-3 months, flexible)
   - **Impact**: Wait for Black Friday vs buy now

#### Important Questions (7 points)

6. **"Are you considering new, refurbished, or used?"**
   - **Why**: Price vs risk trade-off
   - **Data Type**: Multi-select
   - **Savings**: Refurbished = 20-40% off, used = 30-70% off

7. **"What is your technical expertise level for this product category?"**
   - **Why**: Complexity vs ease of use trade-off
   - **Data Type**: Scale (1-10: beginner to expert)
   - **Impact**: Recommend user-friendly vs advanced options

8. **"Do you prioritize brand reputation or best value?"**
   - **Why**: Premium brand premium vs generic value
   - **Data Type**: Scale (1-10: value to brand)
   - **Example**: Apple vs Xiaomi for smartphones

9. **"How long do you plan to use this product?"**
   - **Why**: Build quality vs cost amortization
   - **Data Type**: Number (years)
   - **Analysis**: Longer = justify higher upfront cost

10. **"Are you loyal to any brands or ecosystems?"**
    - **Why**: Compatibility, sunk cost
    - **Data Type**: Text (brands)
    - **Example**: Apple ecosystem = favor MacBook over Dell

#### Moderate Questions (5 points)

11. **"Do you need warranty/insurance?"**
    - **Why**: Risk mitigation cost
    - **Data Type**: Boolean
    - **Cost**: 10-20% of product price

12. **"Are there accessories you need to budget for?"**
    - **Why**: Hidden costs
    - **Data Type**: Text (list)
    - **Example**: Laptop = $1200, but also need $100 mouse, $50 case, $30 cables

13. **"Do you care about environmental impact or sustainability?"**
    - **Why**: Ethical considerations
    - **Data Type**: Scale (1-10)
    - **Impact**: Favor energy-efficient, repairable products

14. **"How important is resale value?"**
    - **Why**: Total cost of ownership
    - **Data Type**: Scale (1-10)
    - **Analysis**: Apple products hold 60-70% value, others 30-40%

15. **"Do you need financing options?"**
    - **Why**: Payment flexibility
    - **Data Type**: Boolean
    - **Impact**: Factor interest into true cost

#### Nice-to-Have Questions (3 points)

16. **"What aesthetic preferences do you have? (color, style, size)"**
    - **Why**: Emotional satisfaction
    - **Data Type**: Text (free response)
    - **Impact**: Tie-breaker for similar-scoring options

17. **"Have you owned this product category before? What did you like/dislike?"**
    - **Why**: Learn from past experience
    - **Data Type**: Text (free response)
    - **Impact**: Weight criteria based on past pain points

### Product Comparison Matrix

```typescript
interface ProductComparison {
  // Options
  products: Product[]          // 3-5 options to compare

  // Weighted Criteria (sum to 100)
  criteria: {
    price: number              // Weight: 0-100
    performance: number
    features: number
    durability: number
    brandReputation: number
    userReviews: number
    warranty: number
    aesthetics: number
    resaleValue: number
    // Total: 100
  }

  // Scoring Matrix
  scores: {
    [productId: string]: {
      [criterion: string]: number  // 0-10 scale
    }
  }

  // Weighted Scores
  weightedScores: {
    [productId: string]: number    // Total weighted score
  }

  // Recommendation
  winner: Product
  runner­Up: Product
  bestValue: Product             // Best score per dollar

  // Analysis
  priceRange: [number, number]
  featureComparison: string      // Narrative comparison
  recommendation: string
}
```

### Product Scoring Logic

```typescript
function scoreProduct(
  product: Product,
  criteria: Criteria,
  answers: ProductAnswers
): number {
  let score = 0

  // Price score (inverse: cheaper = better, unless too cheap)
  const priceFit = calculatePriceFit(product.price, answers.budget)
  score += priceFit × criteria.price

  // Performance score (benchmarks, specs)
  const perfScore = getPerformanceBenchmark(product, answers.useCase)
  score += perfScore × criteria.performance

  // Feature match (must-haves + nice-to-haves)
  const featureScore = calculateFeatureMatch(product.features, answers.mustHaves)
  score += featureScore × criteria.features

  // Review aggregation (Amazon, Reddit, YouTube)
  const reviewScore = aggregateReviews(product)
  score += reviewScore × criteria.userReviews

  // Brand reputation
  const brandScore = getBrandScore(product.brand, answers.brandPreference)
  score += brandScore × criteria.brandReputation

  // Durability (warranty length, build quality, failure rates)
  const durabilityScore = calculateDurability(product)
  score += durabilityScore × criteria.durability

  // Resale value (depreciation curve)
  const resaleScore = estimateResaleValue(product, answers.usageDuration)
  score += resaleScore × criteria.resaleValue

  return score / 100  // Normalize to 0-10 scale
}
```

---

## 🔄 Query Optimization & Reformulation

### Purpose

Transform vague user queries into context-rich, structured queries for multi-model analysis.

### Example Transformations

**Original Query:** "Should I rent this apartment?"

**Enhanced Query After Intake:**
```
Apartment Rental Decision:
- Location: 123 Main St, San Francisco, CA 94102
- Monthly Rent: $2,800
- Monthly Income: $7,500 (37% of gross)
- Commute: 4.2 miles to 456 Market St (25min by BART)
- Lease Term: 12 months
- Bedrooms: 1 bed, 1 bath (adequate for single person)
- Utilities: Gas, electric, internet NOT included (~$150/month extra)
- Parking: $200/month (required, has car)
- Pets: No pets
- Amenities: In-unit laundry, gym, doorman
- Must-haves: Natural light, quiet neighborhood
- Deal-breakers: None
- Credit Score: 720-760 (good approval likelihood)

CONTEXT: User works from home 3 days/week, values quiet environment, budget allows
for 37% rent-to-income ratio (slightly above 30% rule but acceptable with stable income).

DECISION FRAMEWORK: Multi-Attribute Utility Theory (MAUT) with weighted scoring:
- Financial (40%): Affordability, market value, hidden costs
- Location (30%): Commute, safety, walkability
- Property (20%): Space, amenities, building quality
- Lifestyle (10%): Vibe match, WFH suitability

RESEARCH REQUIRED:
1. Zillow median rent for 94102 zip code (1-bed apartments)
2. Crime statistics for neighborhood (San Francisco Police Dept)
3. Walk Score for 123 Main St
4. BART schedule reliability + cost
5. Building reviews (Google, Yelp, Apartments.com)
```

### Structured Query Template

```typescript
interface StructuredQuery {
  // Domain & Framework
  domain: "apartment" | "trip" | "budget" | "product"
  framework: string          // "MAUT", "Pareto", "50/30/20", "Pugh Matrix"

  // Core Context
  userQuery: string          // Original query
  clarifyingAnswers: Record<string, any>  // All intake answers

  // Decision Parameters
  hardConstraints: string[]  // Must-haves, deal-breakers
  priorities: string[]       // Ranked priorities
  tradeoffs: string[]        // Acceptable compromises

  // External Data Needs
  requiredAPIs: string[]     // Zillow, Google Maps, etc.
  researchQueries: string[]  // What to search for

  // Analysis Instructions
  analysisMethod: string     // Specific framework to apply
  outputFormat: string       // Matrix, narrative, pros/cons

  // Multi-Model Directive
  agentInstructions: {
    analyst: string          // What data to gather
    critic: string           // What risks to evaluate
    synthesizer: string      // How to balance factors
  }
}
```

---

## 🎨 Domain-Specific UI Components

### Apartment Rent UI

**Components:**
1. **Map View** (Google Maps API)
   - Pin: Apartment location
   - Pin: Work location
   - Route: Commute path with time/cost
   - Heatmap: Crime density
   - Markers: Nearby amenities (grocery, gym, restaurants)

2. **Budget Gauge**
   - Circular gauge showing rent as % of income
   - Green: <30%, Yellow: 30-35%, Red: >35%
   - Tooltip: "30% rule: rent should not exceed 30% of gross income"

3. **Comparison Table**
   - Rows: Criteria (Affordability, Location, Property, Lifestyle)
   - Columns: This apartment vs Market average vs User's ideal
   - Color coding: Green = better, Red = worse

4. **Pro/Con Matrix**
   - Left side: Pros (✅)
   - Right side: Cons (❌)
   - Size of text = importance weight

5. **Decision Scorecard**
   - Overall score: 78/100
   - Recommendation: "✅ RECOMMEND - Good fit with minor compromises"
   - Breakdown by category with progress bars

### Trip Planner UI

**Components:**
1. **Timeline View**
   - Horizontal timeline with days
   - Activities stacked per day
   - Travel time between activities shown
   - Meal breaks indicated

2. **Budget Donut Chart**
   - Slices: Flights, Hotels, Activities, Food
   - Actual vs Budgeted comparison
   - Click to expand category details

3. **Map Integration**
   - Flight path with layovers
   - Hotel locations
   - Activity pins
   - Transit routes

4. **Itinerary Cards**
   - Day 1: [Morning] Activity 1 → [Afternoon] Activity 2 → [Evening] Activity 3
   - Collapsible details: Cost, duration, booking link

5. **Alternative Routes**
   - Side-by-side comparison of 2-3 itineraries
   - Different budget levels or priorities
   - User selects preferred plan

### Budget Planner UI

**Components:**
1. **50/30/20 Pie Chart**
   - Ideal: 50% Needs, 30% Wants, 20% Savings
   - Actual: Your current split
   - Drag sliders to adjust

2. **Category Breakdown**
   - Accordion: Needs → Housing, Utilities, Groceries, etc.
   - Bar chart per subcategory
   - Red/Green indicators: Over/Under budget

3. **Savings Goal Tracker**
   - Progress bars: Emergency fund, Retirement, Debt payoff
   - Milestones: $1000 → $5000 → $10000
   - Timeline projection: "At current rate, 6-month emergency fund in 14 months"

4. **Recommendation Cards**
   - Card 1: "🏠 HOUSING: Reduce by $200/month"
   - Card 2: "💳 DEBT: Pay off credit card first (18% APR)"
   - Card 3: "🍔 DINING OUT: Cut to $300/month to save $150"

5. **Scenario Comparison**
   - Current budget vs Optimized budget
   - Side-by-side monthly snapshots
   - Projected savings after 1 year

### Product Decision UI

**Components:**
1. **Comparison Table**
   - Rows: Products (3-5 options)
   - Columns: Price, Performance, Features, Reviews, Score
   - Sort by any column
   - Highlight winner

2. **Feature Checklist Matrix**
   - Rows: Features (must-haves, nice-to-haves)
   - Columns: Products
   - ✅ Has feature, ❌ Lacks feature

3. **Price History Graph**
   - Line chart: Price over time (CamelCamelCamel API)
   - Current price vs Average vs Lowest
   - Recommendation: "Wait for Black Friday - typically 25% off"

4. **Review Sentiment Analysis**
   - Aggregate score: 4.3/5 stars from 1,234 reviews
   - Bar chart: % of 5-star, 4-star, etc.
   - Word cloud: Common praise ("battery life", "fast") vs complaints ("overheats")

5. **Total Cost of Ownership**
   - Stacked bar: Purchase price + Accessories + Warranty + Maintenance
   - Amortized cost per year
   - Resale value projection

---

## 📊 Success Metrics

### Intake Agent Performance

**Metrics to Track:**
1. **Question Completion Rate**: % of users who answer all questions
2. **Time to Complete**: Median time to answer questions
3. **Question Relevance**: User feedback "Was this question helpful?"
4. **Skip Rate**: % of questions skipped (indicates irrelevance)

**Targets:**
- Completion rate ≥80%
- Time to complete ≤5 minutes
- Relevance score ≥4.0/5.0
- Skip rate ≤15%

### Decision Quality Metrics

**Metrics to Track:**
1. **User Confidence**: "How confident are you in this decision?" (1-10 scale)
2. **Decision Follow-Through**: "Did you act on this recommendation?" (yes/no)
3. **Satisfaction (30 days later)**: "Are you satisfied with your decision?" (1-10 scale)
4. **Net Promoter Score**: "Would you recommend Verdict AI?" (-100 to +100)

**Targets:**
- Confidence ≥8.0/10
- Follow-through ≥65%
- Satisfaction ≥8.5/10
- NPS ≥50

### Domain-Specific Accuracy

**Apartment Rent:**
- Rent within 10% of recommended max: 85% accuracy
- User signs lease on recommended apartment: 70% conversion

**Trip Planner:**
- Total cost within 15% of budget: 80% accuracy
- User completes trip as planned: 75% conversion

**Budget Planner:**
- User follows budget for 3+ months: 65% retention
- Achieves savings goals: 60% success rate

**Product Decision:**
- User purchases recommended product: 70% conversion
- User satisfied with purchase after 30 days: 85% satisfaction

---

## 🚀 Implementation Roadmap

### Phase 1: Intake Agent Foundation (Week 2)
- [ ] Build question sequencing engine
- [ ] Implement ambiguity detection
- [ ] Create question bank infrastructure
- [ ] Design intake UI components

### Phase 2: Domain Classification (Week 2)
- [ ] Build query classifier (ML model or rules-based)
- [ ] Create domain routing logic
- [ ] Implement fallback for unrecognized queries

### Phase 3-6: Domain Frameworks (Weeks 3-6)
- [ ] Week 3: Apartment Rent framework
- [ ] Week 4: Trip Planner framework
- [ ] Week 5: Budget Planner framework
- [ ] Week 6: Product Decision framework

### Phase 7: Query Optimization (Week 7)
- [ ] Build query reformulation engine
- [ ] Implement context preservation
- [ ] Create agent instruction generator

### Phase 8: Integration & Testing (Week 8)
- [ ] End-to-end testing per domain
- [ ] User acceptance testing (10 beta users)
- [ ] Performance optimization

---

## 📚 Data Sources & APIs

### Apartment Rent
- **Zillow API**: Rent prices, market trends
- **Google Maps API**: Commute time, distance
- **Walk Score API**: Walkability scores
- **Census Data**: Demographics, income
- **SpotCrime API**: Crime statistics
- **Yelp/Google Reviews**: Building/neighborhood reviews

### Trip Planner
- **Google Flights API**: Flight prices, routes
- **Skyscanner API**: Flight comparison
- **Booking.com API**: Hotel prices, availability
- **Airbnb API**: Alternative accommodation
- **TripAdvisor API**: Activities, tours, reviews
- **Google Places API**: Attractions, restaurants
- **OpenWeather API**: Weather forecasts

### Budget Planner
- **No external APIs needed** (user-provided data)
- **Potential**: Mint API (if user connects account)
- **Potential**: YNAB API (if user connects account)

### Product Decision
- **Amazon Product API**: Prices, reviews, specs
- **CamelCamelCamel API**: Price history
- **Best Buy API**: Electronics prices
- **Reddit API**: r/BuyItForLife recommendations
- **YouTube API**: Product review videos
- **RTINGS**: TV, monitor, headphone reviews

---

## 🔮 Future Enhancements

### Advanced Question Sequencing
- **Dynamic branching**: Skip irrelevant questions based on answers
- **Smart defaults**: Pre-fill answers based on user profile
- **Question priority**: Ask high-impact questions first, allow early exit

### Multi-Agent Intake
- **Parallel questioning**: Each agent (Analyst, Critic, Synthesizer) asks specialized questions
- **Debate over answers**: Agents challenge each other's interpretation of user answers
- **Consensus on priorities**: Agents vote on which criteria to weight highest

### Learning from Past Decisions
- **User preference profiling**: Learn from past answers to pre-fill future queries
- **Satisfaction feedback loop**: Adjust weights based on which decisions users were happiest with
- **Community patterns**: "Users similar to you prioritize X over Y"

---

**Last Updated**: January 2025
**Maintainer**: Ariel Soothy
**Status**: Comprehensive research complete, ready for Phase 2 implementation
