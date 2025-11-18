// Hotel Domain - Main Entry Point
// Weighted Decision Matrix for Hotel Selection

// Export types
export type {
  HotelScore,
  LocationScore,
  ReviewScore,
  CleanlinessScore,
  ValueScore,
  AmenitiesScore,
  HotelInput,
  HotelComparison,
  RedFlagType
} from './types'

// Export constants
export {
  RECOMMENDATION_THRESHOLDS,
  DEFAULT_WEIGHTS,
  RED_FLAG_SEVERITY
} from './types'

// Export scoring function
export { analyzeHotel } from './scoring'

// Export hotel-specific agents
export { HOTEL_AGENTS, getHotelSystemPrompt } from './agents'
export type { HotelAgentConfig } from './agents'
