import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { userMessage } = await req.json()

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'Invalid userMessage' }, { status: 400 })
    }

    const prompt = `You are a context extraction assistant for a decision support system. Analyze the user's message and extract structured decision-making context.

User message:
"""
${userMessage}
"""

Extract the following information (if mentioned):

1. **Domain Classification** (hotel/apartment/budget/product/generic):
   - hotel: keywords like hotel, accommodation, stay, resort, lodging, room, booking
   - apartment: keywords like apartment, flat, rental, lease, rent, housing, property
   - budget: keywords like budget, financial, money, expense, saving, spending, cost
   - product: keywords like product, buy, purchase, compare, review, gadget, device

2. **Common Fields**:
   - location: city, neighborhood, region (e.g., "Dubai, UAE")
   - budget: numerical amount per night/month (e.g., 300)
   - timeframe: dates, duration (e.g., "December 2025", "5 nights")

3. **Domain-Specific Fields**:

   **For Hotels**:
   - checkInDate: check-in date if mentioned
   - nights: number of nights staying
   - purpose: reason for stay (family vacation, business, etc.)
   - partyComposition: who's traveling (e.g., "2 adults, 1 baby, 2 elderly")
   - amenities: desired features (pool, wifi, breakfast, etc.)
   - locationPriority: 1-10 scale if mentioned
   - specificHotels: names of hotels mentioned (e.g., ["Atlantis The Palm", "Jumeirah Beach Hotel"])
   - specialRequirements: dietary, accessibility, medical needs
   - additionalContext: any other relevant details

   **For Apartments**:
   - moveInDate: when they want to move in
   - leaseTerm: lease duration (e.g., "12 months")
   - bedrooms: number of bedrooms needed
   - income: monthly/annual income if mentioned
   - commute: work location or commute preferences
   - petFriendly: whether they have pets
   - parking: parking requirements
   - amenities: desired features
   - priorityFactors: what's most important to them

   **For Budget**:
   - income: monthly/annual income
   - expenses: breakdown of expenses
   - savingsGoal: savings target
   - debtAmount: debt to pay off
   - financialGoals: what they want to achieve

   **For Product**:
   - category: type of product (e.g., "smartphone", "laptop")
   - specificProducts: product names mentioned
   - features: desired features
   - priceRange: budget range
   - useCase: how they'll use it

**IMPORTANT RULES**:
1. Only extract information that is EXPLICITLY mentioned or clearly implied
2. Do NOT make assumptions or invent information
3. If something isn't mentioned, leave it null/undefined
4. For confidence: 0.9+ if multiple clear indicators, 0.7-0.9 if single clear indicator, <0.7 if ambiguous
5. Return VALID JSON only - no markdown, no explanations, just the JSON object

Return a JSON object matching this structure:
{
  "domain": "hotel" | "apartment" | "budget" | "product" | "generic",
  "confidence": 0.95,
  "location": "Dubai, UAE",
  "budget": 300,
  "timeframe": "5 nights",
  "hotelContext": {
    "checkInDate": "2025-12-20",
    "nights": 5,
    "purpose": "Family Vacation",
    "partyComposition": "2 adults, 1 baby (14 months), 2 elderly grandparents (70s)",
    "amenities": ["pool", "breakfast", "wheelchair accessible"],
    "locationPriority": 8,
    "specificHotels": ["Atlantis The Palm", "Jumeirah Beach Hotel"],
    "specialRequirements": "Kosher food nearby, baby crib needed",
    "additionalContext": "First time in Dubai"
  },
  "originalMessage": "${userMessage}"
}`

    // Use Haiku for cost efficiency
    const { text } = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'),
      prompt,
      temperature: 0.3,
      maxTokens: 1024,
    })

    console.log('📝 LLM Response collected:', { length: text.length, preview: text.substring(0, 100) })

    // Remove markdown code blocks if present
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    }

    console.log('🔍 JSON text after cleanup:', { length: jsonText.length, preview: jsonText.substring(0, 100) })

    const extractedContext = JSON.parse(jsonText)

    // Ensure originalMessage is set
    extractedContext.originalMessage = userMessage

    return NextResponse.json(extractedContext)
  } catch (error) {
    console.error('Context extraction API error:', error)
    return NextResponse.json(
      {
        domain: 'generic',
        confidence: 0.3,
        originalMessage: '',
      },
      { status: 200 } // Return 200 with fallback instead of error
    )
  }
}
