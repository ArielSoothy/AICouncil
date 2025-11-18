# Hotel Finder - Complete Implementation Plan

**Status**: 🚧 IN PROGRESS
**Start Date**: November 18, 2025
**Goal**: Build the best possible AI-powered hotel recommendation system

---

## Executive Summary

Refocus the "Trip Planning" domain into a specialized **Hotel Finder** using:
- Multi-agent AI debate (4 specialized hotel experts)
- Research-backed weighted decision framework
- Hybrid data strategy (APIs + web search + fallbacks)
- Transparent reasoning (show why each agent prefers/rejects hotels)

**Key Differentiation**: Unlike Booking.com or Google Hotels, Verdict AI uses **4 specialized AI agents debating** hotel merits from different expert perspectives, providing transparent reasoning for recommendations.

---

## Research Foundation

### Academic Sources

1. **"Factors influencing hotel selection: Decision making process"** (ResearchGate, 2019)
   - Multi-stage decision process research
   - Consumer behavior and decision frameworks

2. **"A Novel Hotel Selection Decision Support Model Based on Best Worst Method"** (Springer, 2022)
   - Six criteria: Position, Service, Cleanliness, Comfort, Facility, Food
   - Online review analysis methodology

3. **"Ensemble Debates with Local Large Language Models"** (arXiv, 2024)
   - Multi-agent debate systems 70% better than single-agent
   - Debate pattern vs. voting pattern comparison

4. **Cornell School of Hotel Administration Research**
   - Customer choice prediction models
   - Strategic decision-making in hospitality

### Key Research Findings

**Consumer Priorities** (from academic studies):
- **84%** of guests rate cleanliness as "very important"
- **65%** of negative reviews mention noise disturbances
- **Location** is the #1 priority factor for most travelers
- **Recent reviews** (last 3-6 months) more important than overall rating

**Hidden Red Flags to Detect**:
- Noise complaints (thin walls, street noise, HVAC)
- Bed bugs/pest issues (immediate disqualification)
- Cleanliness violations
- Inaccurate descriptions (photos ≠ reality)
- Hidden fees (resort fees, parking charges)

**Multi-Stage Decision Process**:
1. **Consideration Set** (Heuristic Filtering): Location, price range, star rating → 100+ to 5-10 options
2. **Detailed Evaluation** (Deep Analysis): Reviews, amenities, value → 5-10 to 1-3 finalists

---

## Weighted Decision Framework

### Primary Criteria (Research-Backed Weights)

| Criterion | Weight | Description | Key Metrics |
|-----------|--------|-------------|-------------|
| **Location** | 35% | Geographic convenience | Distance to attractions, transportation access, safety, walkability |
| **Reviews & Ratings** | 30% | Guest satisfaction | Overall rating, recent trends, sentiment analysis, red flags |
| **Cleanliness** | 25% | Hygiene & maintenance | Cleanliness rating, pest reports, maintenance issues |
| **Value/Price** | 20% | Cost vs. features | Price relative to competitors, hidden fees, value-for-money |
| **Amenities** | 15% | Features & services | WiFi, breakfast, parking, gym, pool, user preference match |

**Total Possible Score**: 100 points

**Notes**:
- Weights adjustable based on user preferences (business travelers weight location higher)
- Red flags can disqualify hotels regardless of score (bed bugs, major cleanliness issues)
- Recent review trends (last 3 months) weighted higher than overall rating

---

## Multi-Agent Architecture

### 4 Specialized Hotel Agents

#### 1. Location Intelligence Agent
**Role**: Evaluate geographic factors
**Model**: Claude Sonnet 4.5
**Expertise**:
- Proximity to tourist attractions (most important locational determinant)
- Transportation accessibility (metro, bus, taxi availability)
- Neighborhood safety and quality
- Walkability scoring
- Distance to purpose of visit (conference, business district, etc.)

**Data Sources**:
- Maps APIs (Google Maps, OpenStreetMap)
- POI (Point of Interest) data
- Distance calculations
- Web search for neighborhood reviews

**Output Format**:
```
Location Score: 0-100
- Distance to main attraction: X km (Y min walk)
- Nearest metro: Z station (A min walk)
- Neighborhood safety: Safe/Moderate/Caution
- Walkability: Excellent/Good/Fair/Poor
Top 3 Location Advantages:
- [Advantage 1]
- [Advantage 2]
- [Advantage 3]
```

#### 2. Review Analysis Agent
**Role**: Sentiment analysis & red flag detection
**Model**: GPT-4o
**Expertise**:
- Natural Language Processing on guest reviews
- Sentiment analysis (positive/negative/neutral breakdown)
- Trend detection (improving/stable/declining quality)
- Red flag identification (bed bugs, cleanliness, noise, scams)
- Review authenticity assessment

**Data Sources**:
- TripAdvisor API (5,000 free calls/month)
- Google Reviews
- Booking.com ratings (via web search)
- Social media mentions

**Red Flags to Report**:
- Multiple bed bug/pest mentions
- Cleanliness violations
- Noise complaints >30% of reviews
- Recent negative trend (rating drop >0.5 stars in 3 months)
- Fake review patterns

**Output Format**:
```
Overall Review Score: 0-100
Sentiment Breakdown: X% positive, Y% negative, Z% neutral
Recent Trend: Improving/Stable/Declining
Top 3 Praised Features:
- [Feature 1]
- [Feature 2]
- [Feature 3]
Top 3 Complaints:
- [Complaint 1]
- [Complaint 2]
- [Complaint 3]
Red Flag Warnings: [List if any]
```

#### 3. Value Optimization Agent
**Role**: Analyze price vs. features
**Model**: Llama 3.3 70B
**Expertise**:
- Comparative pricing analysis
- Hidden fees detection (resort fees, parking, WiFi charges)
- Value-for-money calculation
- Price percentile in area
- Cost-benefit analysis

**Data Sources**:
- Price comparisons across booking platforms
- Amenity lists
- Competitor analysis
- Historical pricing data (if available)

**Output Format**:
```
Value Score: 0-100
Total Cost: $X/night (including fees)
Price Percentile: Xth percentile in area
Hidden Fees: [List]
Cost Breakdown:
- Base rate: $X
- Taxes: $Y
- Resort fee: $Z
- Parking: $A
Value Analysis: [Reasoning why good/bad value]
```

#### 4. Amenities & Experience Agent
**Role**: Match hotel features to user needs
**Model**: Gemini 2.5 Flash
**Expertise**:
- Amenity importance ranking based on user preferences
- Service quality evaluation
- Unique features identification
- Accessibility assessment
- Family/business/leisure suitability

**Data Sources**:
- Hotel descriptions
- Guest feedback on services
- Amenity lists
- Photos and facility details

**Output Format**:
```
Amenities Match Score: 0-100
Must-Have Amenities Present: [List]
Missing Amenities: [List]
Service Quality Rating: Excellent/Good/Fair/Poor
Unique Features: [List]
Best Suited For: Business/Leisure/Family/Romantic
```

### Debate Flow (3 Rounds)

**Round 1: Initial Positions**
- Each agent researches 3-5 hotel candidates
- Each presents their top choice with reasoning
- Initial scores calculated for each hotel

**Round 2: Critiques & Rebuttals**
- Agents challenge each other's recommendations
- Identify overlooked factors or biases
- Refine scores based on debate

**Round 3: Synthesis & Consensus**
- Debate Moderator synthesizes all perspectives
- Final weighted scoring
- Top 3 recommendations with confidence scores
- Alternative options if user priorities change

**Example Debate Exchange**:
```
Location Agent: "Hotel A is 2 blocks from convention center, 95/100 location score"

Review Agent challenges: "But 15% of recent reviews mention street noise.
Hotel B is 5 blocks away but in quieter area with better sleep ratings."

Location Agent responds: "True, but Hotel A installed double-pane windows in 2024.
User prioritized 'walking distance to conference' - Hotel B requires taxi."

Value Agent: "Both are overpriced. Hotel C has free shuttle, saving $40/night = $160 over 4 nights."
```

---

## Implementation Plan

### Phase 1: Domain Refactoring (1-2 hours)

**1.1 Rename Trip → Hotel**

Files to rename/modify:
```
lib/domains/trip/ → lib/domains/hotel/
├── types.ts (TripScore → HotelScore, TripInput → HotelInput)
├── scoring.ts (planTrip → analyzeHotel)
├── index.ts (update exports)

components/domains/trip/ → components/domains/hotel/
├── TripScorecard.tsx → HotelScorecard.tsx
├── Remove ItineraryView.tsx (not relevant for hotel)

lib/intake/domain-classifier.ts
- Update 'trip' → 'hotel' in DomainType
- Update classifier patterns
```

**1.2 Update Domain Classifier**

Change domain from:
```typescript
trip: {
  keywords: ['trip', 'travel', 'vacation', 'itinerary', 'destination'],
  icon: '✈️',
  description: 'Trip planning with Pareto optimization'
}
```

To:
```typescript
hotel: {
  keywords: ['hotel', 'accommodation', 'stay', 'lodging', 'booking', 'room'],
  icon: '🏨',
  description: 'Find the perfect hotel using AI-powered multi-agent analysis'
}
```

### Phase 2: Question Bank Update (30 min)

**New Hotel Questions** (9 total):

**Required Questions (5)**:
```typescript
{
  id: 'hotel_destination',
  domain: 'hotel',
  text: 'What city/area are you visiting?',
  type: 'text',
  weight: 10,
  required: true,
  defaultValue: 'Dubai, UAE',
  helpText: 'City or specific neighborhood'
},
{
  id: 'hotel_checkin',
  domain: 'hotel',
  text: 'Check-in date?',
  type: 'date',
  weight: 10,
  required: true,
  helpText: 'When do you arrive?'
},
{
  id: 'hotel_checkout',
  domain: 'hotel',
  text: 'Check-out date?',
  type: 'date',
  weight: 10,
  required: true,
  helpText: 'When do you depart?'
},
{
  id: 'hotel_guests',
  domain: 'hotel',
  text: 'Number of guests?',
  type: 'number',
  weight: 10,
  required: true,
  defaultValue: '2',
  helpText: 'Total number of people staying'
},
{
  id: 'hotel_budget',
  domain: 'hotel',
  text: 'Budget per night (USD)?',
  type: 'number',
  weight: 10,
  required: true,
  defaultValue: '150',
  helpText: 'Maximum you want to spend per night'
},
{
  id: 'hotel_purpose',
  domain: 'hotel',
  text: 'Purpose of stay?',
  type: 'select',
  weight: 10,
  required: true,
  options: ['Business', 'Leisure', 'Family', 'Romantic'],
  helpText: 'Helps match hotel type to your needs'
}
```

**Optional Questions (4)**:
```typescript
{
  id: 'hotel_location_priority',
  domain: 'hotel',
  text: 'How important is location?',
  type: 'select',
  weight: 7,
  required: false,
  options: ['Very important', 'Somewhat important', 'Not very important'],
  helpText: 'Willing to travel farther for better value?'
},
{
  id: 'hotel_location_proximity',
  domain: 'hotel',
  text: 'What should the hotel be near?',
  type: 'multi-select',
  weight: 7,
  required: false,
  options: ['Tourist attractions', 'Business district', 'Airport', 'Beach', 'Public transit', 'Shopping'],
  helpText: 'Select all that apply'
},
{
  id: 'hotel_amenities',
  domain: 'hotel',
  text: 'Must-have amenities?',
  type: 'multi-select',
  weight: 7,
  required: false,
  options: ['Free WiFi', 'Breakfast included', 'Free parking', 'Pool', 'Gym', 'Business center', 'Restaurant', 'Room service'],
  helpText: 'Select amenities you need'
},
{
  id: 'hotel_dealbreakers',
  domain: 'hotel',
  text: 'Any deal-breakers or special needs?',
  type: 'multi-select',
  weight: 7,
  required: false,
  options: ['Noise sensitivity (quiet room essential)', 'Accessibility needs', 'Pet-friendly', 'Non-smoking only', 'Ground floor preferred'],
  helpText: 'Select any that apply'
}
```

### Phase 3: Scoring Model Implementation (1-2 hours)

**Replace Pareto Framework with Weighted Decision Matrix**

File: `lib/domains/hotel/scoring.ts`

```typescript
export interface HotelScore {
  location: LocationScore          // 35% weight
  reviews: ReviewScore             // 30% weight
  cleanliness: CleanlinessScore    // 25% weight
  value: ValueScore                // 20% weight
  amenities: AmenitiesScore        // 15% weight

  totalScore: number               // 0-100 (weighted average)
  recommendation: 'BOOK' | 'CONSIDER' | 'PASS'
  reasoning: string
  warnings: string[]               // Red flags
  confidence: number               // 0-1
}

export interface LocationScore {
  distanceToAttractions: number   // 0-100
  transportationAccess: number    // 0-100
  neighborhoodSafety: number      // 0-100
  walkability: number             // 0-100
  categoryScore: number           // Weighted average
  weight: 0.35
}

export interface ReviewScore {
  overallRating: number           // 0-100 (from guest ratings)
  sentimentScore: number          // 0-100 (NLP on reviews)
  trendAnalysis: number           // 0-100 (improving/declining)
  redFlagCount: number            // Count of serious issues
  categoryScore: number           // Weighted average
  weight: 0.30
}

export interface CleanlinessScore {
  cleanlinessRating: number       // 0-100 (from reviews)
  pestReports: boolean            // Any bed bug mentions?
  maintenanceIssues: number       // Count from reviews
  categoryScore: number           // Weighted average
  weight: 0.25
}

export interface ValueScore {
  pricePerNight: number           // Actual price
  marketComparison: number        // 0-100 (vs similar hotels)
  hiddenFees: number              // Total extra charges
  valueForMoney: number           // 0-100 (features vs price)
  categoryScore: number           // Weighted average
  weight: 0.20
}

export interface AmenitiesScore {
  mustHaveMatch: number           // 0-100 (% of must-haves present)
  serviceQuality: number          // 0-100 (from reviews)
  uniqueFeatures: string[]        // Special offerings
  categoryScore: number           // Weighted average
  weight: 0.15
}
```

**Scoring Algorithm**:
```typescript
function calculateHotelScore(data: HotelInput): HotelScore {
  // 1. Calculate individual category scores
  const location = calculateLocationScore(data)
  const reviews = calculateReviewScore(data)
  const cleanliness = calculateCleanlinessScore(data)
  const value = calculateValueScore(data)
  const amenities = calculateAmenitiesScore(data)

  // 2. Apply weights
  const totalScore =
    (location.categoryScore * 0.35) +
    (reviews.categoryScore * 0.30) +
    (cleanliness.categoryScore * 0.25) +
    (value.categoryScore * 0.20) +
    (amenities.categoryScore * 0.15)

  // 3. Check for red flags (can override score)
  const warnings = detectRedFlags(data)

  // 4. Determine recommendation
  let recommendation: 'BOOK' | 'CONSIDER' | 'PASS'
  if (warnings.includes('BED_BUGS') || warnings.includes('MAJOR_CLEANLINESS')) {
    recommendation = 'PASS' // Automatic disqualification
  } else if (totalScore >= 80) {
    recommendation = 'BOOK'
  } else if (totalScore >= 60) {
    recommendation = 'CONSIDER'
  } else {
    recommendation = 'PASS'
  }

  return {
    location,
    reviews,
    cleanliness,
    value,
    amenities,
    totalScore,
    recommendation,
    reasoning: generateReasoning(totalScore, warnings),
    warnings,
    confidence: calculateConfidence(data)
  }
}
```

### Phase 4: Agent Implementation (2-3 hours)

**Update `components/domains/DecisionDebate.tsx`**

Replace generic agents with specialized hotel agents:

```typescript
const HOTEL_AGENTS: Omit<Agent, 'response' | 'status'>[] = [
  {
    id: 'location-agent',
    name: 'Location Intelligence Agent',
    role: 'analyst',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    color: 'text-blue-600 dark:text-blue-400',
    systemPrompt: `You are a Location Intelligence Agent specializing in hotel geography analysis.

Your expertise:
- Evaluate proximity to tourist attractions, business districts, and key destinations
- Assess transportation accessibility (metro, bus, taxi availability)
- Analyze neighborhood safety and quality
- Calculate walkability scores
- Consider noise factors (street noise, nightlife proximity)

Use web search to research:
- Distance to user's key destinations
- Neighborhood reviews and safety reports
- Public transportation options
- Local area characteristics

Output Format:
- Location Score: 0-100
- Distance to main attraction: X km (Y min walk)
- Transportation: [Details]
- Safety Assessment: [Safe/Moderate/Caution]
- Walkability: [Excellent/Good/Fair/Poor]
- Top 3 Location Advantages
- Top 3 Location Concerns`
  },
  {
    id: 'review-agent',
    name: 'Review Analysis Agent',
    role: 'critic',
    provider: 'openai',
    model: 'gpt-4o',
    color: 'text-orange-600 dark:text-orange-400',
    systemPrompt: `You are a Review Analysis Agent using NLP and sentiment analysis.

Your expertise:
- Analyze guest reviews for sentiment (positive/negative/neutral)
- Detect red flags (bed bugs, cleanliness issues, noise, scams)
- Identify review trends (improving/declining quality)
- Assess review authenticity
- Extract common themes and patterns

CRITICAL RED FLAGS to report:
- Bed bug/pest mentions (IMMEDIATE DISQUALIFICATION)
- Major cleanliness violations
- Noise complaints >30% of reviews
- Rating drop >0.5 stars in last 3 months
- Fake review patterns

Use web search to find:
- TripAdvisor reviews
- Google Reviews
- Booking.com ratings
- Recent guest feedback

Output Format:
- Review Score: 0-100
- Overall Rating: X.X/5 (from Y reviews)
- Sentiment: X% positive, Y% negative, Z% neutral
- Recent Trend: [Improving/Stable/Declining]
- Top 3 Praised Features
- Top 3 Complaints
- RED FLAG WARNINGS (if any)`
  },
  {
    id: 'value-agent',
    name: 'Value Optimization Agent',
    role: 'synthesizer',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    color: 'text-green-600 dark:text-green-400',
    systemPrompt: `You are a Value Optimization Agent analyzing price vs. features.

Your expertise:
- Compare hotel prices across booking platforms
- Detect hidden fees (resort fees, parking, WiFi charges)
- Calculate value-for-money score
- Assess price percentile in area
- Identify cost-saving opportunities

Use web search to research:
- Comparative pricing on Booking.com, Hotels.com, Expedia
- Hidden fee structures
- Similar hotels in area for comparison
- Seasonal pricing patterns

Output Format:
- Value Score: 0-100
- Base Price: $X/night
- Total Cost: $Y/night (including all fees)
- Hidden Fees: [List with amounts]
- Price Percentile: Xth percentile in area
- Value Analysis: [Why good/bad value]
- Cost-Saving Alternatives (if overpriced)`
  },
  {
    id: 'amenities-agent',
    name: 'Amenities & Experience Agent',
    role: 'analyst',
    provider: 'google',
    model: 'gemini-2.5-flash',
    color: 'text-purple-600 dark:text-purple-400',
    systemPrompt: `You are an Amenities & Experience Agent matching hotel features to user needs.

Your expertise:
- Evaluate amenity quality and availability
- Assess service quality from guest feedback
- Match hotel type to user purpose (business/leisure/family)
- Identify unique features and differentiators
- Check accessibility and special needs accommodation

User Preferences Received:
[WILL BE INJECTED FROM QUESTIONS]

Use web search to verify:
- Amenity lists and descriptions
- Service quality mentions in reviews
- Photos of facilities
- Hotel category and target audience

Output Format:
- Amenities Score: 0-100
- Must-Have Amenities: [X of Y present]
- Missing Amenities: [List]
- Service Quality: [Excellent/Good/Fair/Poor]
- Unique Features: [List]
- Best Suited For: [Business/Leisure/Family/Romantic]
- Accessibility Notes (if relevant)`
  }
]
```

### Phase 5: UI Updates (1 hour)

**5.1 Update Decision Page** (`app/decision/page.tsx`)

Change domain card:
```tsx
<DomainCard
  domain="hotel"
  title="Hotel Finder"
  description="Multi-agent AI analysis: Location, Reviews, Value, Amenities"
  features={[
    'AI agents debate best options',
    'Location & safety analysis',
    'Review sentiment analysis',
    'Value optimization',
    'Red flag detection'
  ]}
  onClick={() => handleDomainSelect('hotel')}
/>
```

**5.2 Create HotelScorecard Component**

File: `components/domains/hotel/HotelScorecard.tsx`

```tsx
export function HotelScorecard({ score, showBreakdown }: Props) {
  return (
    <Card className="p-6">
      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">Overall Hotel Score</h3>
          <div className={`text-4xl font-bold ${getScoreColor(score.totalScore)}`}>
            {score.totalScore}/100
          </div>
        </div>
        <RecommendationBadge recommendation={score.recommendation} />
      </div>

      {/* Red Flag Warnings */}
      {score.warnings.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong>
            <ul className="mt-2 space-y-1">
              {score.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Category Breakdown */}
      {showBreakdown && (
        <div className="space-y-4">
          <CategoryScore
            name="Location"
            score={score.location.categoryScore}
            weight={35}
            icon={MapPin}
            details={[
              `Distance to attractions: ${score.location.distanceToAttractions}/100`,
              `Transportation: ${score.location.transportationAccess}/100`,
              `Safety: ${score.location.neighborhoodSafety}/100`,
              `Walkability: ${score.location.walkability}/100`
            ]}
          />

          <CategoryScore
            name="Reviews & Ratings"
            score={score.reviews.categoryScore}
            weight={30}
            icon={Star}
            details={[
              `Overall rating: ${score.reviews.overallRating}/100`,
              `Sentiment: ${score.reviews.sentimentScore}/100`,
              `Trend: ${score.reviews.trendAnalysis}/100`,
              `Red flags: ${score.reviews.redFlagCount}`
            ]}
          />

          <CategoryScore
            name="Cleanliness"
            score={score.cleanliness.categoryScore}
            weight={25}
            icon={Sparkles}
            details={[
              `Cleanliness rating: ${score.cleanliness.cleanlinessRating}/100`,
              `Pest reports: ${score.cleanliness.pestReports ? 'YES' : 'None'}`,
              `Maintenance issues: ${score.cleanliness.maintenanceIssues}`
            ]}
          />

          <CategoryScore
            name="Value/Price"
            score={score.value.categoryScore}
            weight={20}
            icon={DollarSign}
            details={[
              `Price: $${score.value.pricePerNight}/night`,
              `Market comparison: ${score.value.marketComparison}/100`,
              `Hidden fees: $${score.value.hiddenFees}`,
              `Value score: ${score.value.valueForMoney}/100`
            ]}
          />

          <CategoryScore
            name="Amenities"
            score={score.amenities.categoryScore}
            weight={15}
            icon={Coffee}
            details={[
              `Must-have match: ${score.amenities.mustHaveMatch}/100`,
              `Service quality: ${score.amenities.serviceQuality}/100`,
              `Unique features: ${score.amenities.uniqueFeatures.length}`
            ]}
          />
        </div>
      )}
    </Card>
  )
}
```

**5.3 Update Results Page** (`app/decision/results/page.tsx`)

Replace trip-specific code:
```tsx
// BEFORE:
{domain === 'trip' && tripScore && (
  <>
    <TripScorecard score={tripScore} />
    <ItineraryView itinerary={itinerary} />
  </>
)}

// AFTER:
{domain === 'hotel' && hotelScore && (
  <>
    <HotelScorecard score={hotelScore} showBreakdown={true} />
    {/* Show top 3 hotel recommendations from AI debate */}
    <TopHotelsSection hotels={hotelScore.topRecommendations} />
  </>
)}
```

### Phase 6: Fix Placeholder Issue (30 min)

**Problem**: Placeholders appear grey but don't auto-fill

**Solution**: Change `placeholder` to `defaultValue` in IntakeAgent

File: `components/intake/IntakeAgent.tsx`

```tsx
// BEFORE:
<input
  placeholder={question.placeholder}
  // ...
/>

// AFTER:
<input
  defaultValue={question.defaultValue || question.placeholder}
  placeholder={question.helpText}
  // ...
/>
```

Also update question types:
```typescript
// In lib/intake/types.ts
export interface Question {
  // ...
  placeholder?: string      // Shown as grey hint text
  defaultValue?: string     // Actual pre-filled value (editable)
  helpText?: string         // Explanatory text below input
}
```

### Phase 7: Data Integration (1-2 hours)

**Hybrid Data Strategy**:

```typescript
// lib/domains/hotel/data-providers.ts

export async function fetchHotelData(destination: string, checkin: Date, checkout: Date) {
  const results: HotelData[] = []

  // Try API first
  try {
    const tripAdvisorData = await fetchTripAdvisorAPI(destination)
    results.push(...tripAdvisorData)
  } catch (error) {
    console.warn('TripAdvisor API failed, using web search fallback')
  }

  // Fallback: Web search
  if (results.length === 0) {
    const searchResults = await webSearchHotels(destination, checkin, checkout)
    results.push(...searchResults)
  }

  // Rule-of-thumb defaults if no data
  if (results.length === 0) {
    results.push(...generateDefaultHotels(destination))
  }

  return results
}

// Use AI agents to perform targeted searches
async function webSearchHotels(destination: string, checkin: Date, checkout: Date) {
  const queries = [
    `best hotels in ${destination} ${checkin.getFullYear()}`,
    `${destination} hotel reviews TripAdvisor`,
    `${destination} accommodation prices booking.com`,
    `${destination} hotel safety neighborhood guide`
  ]

  // Let AI agents search and extract structured data
  // This leverages Verdict AI's existing web search capabilities
}
```

### Phase 8: Documentation (30 min)

**Update FEATURES.md**:
- Change Feature #33 title to "Hotel Finder System"
- Update description to focus on hotel-specific functionality
- Document 4 specialized agents
- Add research sources and decision framework details

**Create HOTEL_FINDER_RESEARCH.md**:
- Complete research summary
- Academic sources
- API documentation
- Agent role specifications
- Future enhancements roadmap

---

## Success Metrics

After implementation, the system should:

✅ **Ask 5 required + 4 optional hotel questions** (not trip questions)
✅ **Default values pre-filled** for faster testing
✅ **4 AI agents debate** from specialized perspectives (Location, Reviews, Value, Amenities)
✅ **Weighted scoring** (Location 35%, Reviews 30%, Cleanliness 25%, Value 20%, Amenities 15%)
✅ **Red flag detection** (bed bugs, cleanliness, noise → automatic warnings)
✅ **Top 3 hotel recommendations** with transparent reasoning from each agent
✅ **Synthesis showing agreements & disagreements** between agents
✅ **Confidence scores** for transparency

---

## Future Enhancements (After Hotel Works Perfectly)

**Phase 2: Add More Domains** (Build Each Independently):
- Flight Finder (price optimization, route analysis, airline comparison)
- Activity Finder (tour selection, experience matching, scheduling)
- Restaurant Finder (cuisine matching, location convenience, reviews)

**Phase 3: Combine Domains** (Full Trip Planner):
- Integrate hotel + flights + activities into complete itinerary
- Cross-domain optimization (hotel near airport, activities near hotel)
- Budget allocation across all domains

**Phase 4: Advanced Features**:
- Real-time price tracking
- Booking integration (affiliate links)
- User profiles with preference learning
- Historical decision tracking and learning

---

## Key Philosophy

> **"Nail ONE thing perfectly before adding complexity"**

Build the **best possible hotel recommendation system** first. Once it's working flawlessly, expand to other domains. Quality over breadth.

**What makes Verdict AI better than Booking.com/Google Hotels**:
- 4 specialized AI agents debating from different expert perspectives
- Transparent reasoning (see WHY each agent prefers/rejects hotels)
- Red flag detection that humans might miss
- Personalized weighting based on user priorities
- Free from booking bias (no incentive to push specific properties)
- Research-backed decision framework

---

**Status**: Ready to implement
**Next Step**: Start Phase 1 - Domain refactoring
**Estimated Total Time**: 6-9 hours
