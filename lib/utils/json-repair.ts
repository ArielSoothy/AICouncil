/**
 * Modular JSON Repair Utilities
 *
 * Philosophy:
 * - Each repair strategy is a separate, testable function
 * - Strategies are applied in order from least to most aggressive
 * - Detailed logging helps diagnose issues
 * - Easy to add new strategies without touching existing code
 */

export interface RepairResult {
  success: boolean
  data?: any
  strategy?: string
  error?: string
}

export interface RepairOptions {
  modelName?: string
  logVerbose?: boolean
}

/**
 * Strategy 1: Parse as-is (for already-valid JSON)
 */
export function parseDirectly(jsonString: string): RepairResult {
  try {
    const data = JSON.parse(jsonString)
    return { success: true, data, strategy: 'direct' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Strategy 2: Fix unclosed strings by auto-closing with quote
 */
export function repairUnclosedStrings(jsonString: string): RepairResult {
  try {
    let fixed = jsonString

    // Count quotes to detect unclosed strings
    const quoteCount = (fixed.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      // Odd number of quotes means unclosed string
      // Add closing quote before last brace
      const lastBrace = fixed.lastIndexOf('}')
      if (lastBrace !== -1) {
        fixed = fixed.substring(0, lastBrace) + '"' + fixed.substring(lastBrace)
      } else {
        // No closing brace - add quote and brace
        fixed += '"}'
      }
    }

    const data = JSON.parse(fixed)
    return { success: true, data, strategy: 'unclosed-strings' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Strategy 3: Fix missing commas between properties
 */
export function repairMissingCommas(jsonString: string): RepairResult {
  try {
    // Fix pattern: "value"\n"key" -> "value",\n"key"
    // Only matches when there's a newline between quoted strings
    const fixed = jsonString.replace(/("\s*)\n(\s*")/g, '$1,\n$2')

    const data = JSON.parse(fixed)
    return { success: true, data, strategy: 'missing-commas' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Strategy 4: Auto-close incomplete JSON objects
 */
export function repairIncompleteObject(jsonString: string): RepairResult {
  try {
    let fixed = jsonString

    // Count braces to detect incomplete objects
    const openBraces = (fixed.match(/\{/g) || []).length
    const closeBraces = (fixed.match(/\}/g) || []).length

    if (openBraces > closeBraces) {
      // Add missing closing braces
      fixed += '}'.repeat(openBraces - closeBraces)
    }

    const data = JSON.parse(fixed)
    return { success: true, data, strategy: 'incomplete-object' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Strategy 5: Combined repairs (unclosed strings + incomplete object)
 */
export function repairCombined(jsonString: string): RepairResult {
  try {
    let fixed = jsonString

    // Fix unclosed strings first
    const quoteCount = (fixed.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      const lastBrace = fixed.lastIndexOf('}')
      if (lastBrace !== -1) {
        fixed = fixed.substring(0, lastBrace) + '"' + fixed.substring(lastBrace)
      } else {
        fixed += '"'
      }
    }

    // Then fix incomplete objects
    const openBraces = (fixed.match(/\{/g) || []).length
    const closeBraces = (fixed.match(/\}/g) || []).length
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces)
    }

    const data = JSON.parse(fixed)
    return { success: true, data, strategy: 'combined' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Strategy 6: Aggressive - combine all fixes
 */
export function repairAggressive(jsonString: string): RepairResult {
  try {
    let fixed = jsonString

    // 1. Fix missing commas
    fixed = fixed.replace(/("\s*)\n(\s*")/g, '$1,\n$2')

    // 2. Fix unclosed strings
    const quoteCount = (fixed.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      const lastBrace = fixed.lastIndexOf('}')
      if (lastBrace !== -1) {
        fixed = fixed.substring(0, lastBrace) + '"' + fixed.substring(lastBrace)
      } else {
        fixed += '"'
      }
    }

    // 3. Fix incomplete objects
    const openBraces = (fixed.match(/\{/g) || []).length
    const closeBraces = (fixed.match(/\}/g) || []).length
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces)
    }

    const data = JSON.parse(fixed)
    return { success: true, data, strategy: 'aggressive' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Main repair function - tries all strategies in order
 */
export function repairJSON(
  jsonString: string,
  options: RepairOptions = {}
): RepairResult {
  const { modelName = 'unknown', logVerbose = false } = options

  if (logVerbose) {
    console.log(`\n🔧 [${modelName}] Attempting JSON repair...`)
    console.log(`📏 Input length: ${jsonString.length} chars`)
    console.log(`🔍 First 200 chars:`, jsonString.substring(0, 200))
  }

  // Define strategies in order of preference (least to most aggressive)
  const strategies = [
    { name: 'direct', fn: parseDirectly },
    { name: 'unclosed-strings', fn: repairUnclosedStrings },
    { name: 'missing-commas', fn: repairMissingCommas },
    { name: 'incomplete-object', fn: repairIncompleteObject },
    { name: 'combined', fn: repairCombined },
    { name: 'aggressive', fn: repairAggressive },
  ]

  // Try each strategy
  for (const strategy of strategies) {
    const result = strategy.fn(jsonString)

    if (result.success) {
      if (logVerbose) {
        console.log(`✅ [${modelName}] Success with strategy: ${strategy.name}`)
      }
      return { ...result, strategy: strategy.name }
    } else {
      if (logVerbose) {
        console.log(`❌ [${modelName}] ${strategy.name} failed: ${result.error}`)
      }
    }
  }

  // All strategies failed
  if (logVerbose) {
    console.log(`💥 [${modelName}] All repair strategies exhausted`)
    console.log(`📋 Final JSON:`, jsonString.substring(0, 500))
  }

  return {
    success: false,
    error: 'All repair strategies failed',
  }
}

/**
 * Extract JSON from text (removes markdown, XML, etc.)
 * SIMPLIFIED: Uses same working approach as Individual/Debate modes
 */
export function extractJSON(text: string, options: RepairOptions = {}): string {
  const { modelName = 'unknown', logVerbose = false } = options

  if (logVerbose) {
    console.log(`\n🔍 [${modelName}] Extracting JSON...`)
    console.log(`📄 Raw length: ${text.length} chars`)
    console.log(`📄 First 300 chars:`, text.substring(0, 300))
  }

  let cleaned = text.trim()

  // Handle empty responses
  if (cleaned.length === 0) {
    if (logVerbose) {
      console.log(`⚠️  [${modelName}] Empty response - model returned nothing`)
    }
    return ''
  }

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  // SIMPLE: Extract JSON object from surrounding text
  // Find first { and last } (works for nested objects!)
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1)
  }

  // Fix common JSON issues (conservative)
  cleaned = cleaned
    .replace(/[""]/g, '"')           // ⭐ Smart quotes → straight quotes
    .replace(/['']/g, "'")           // Smart apostrophes → straight
    .replace(/,(\s*[}\]])/g, '$1')   // Remove trailing commas
    .replace(/'/g, '"')               // Single to double quotes
    .trim()

  if (logVerbose) {
    console.log(`✂️  [${modelName}] After extraction: ${cleaned.length} chars`)
    console.log(`✂️  [${modelName}] Cleaned JSON (first 200):`, cleaned.substring(0, 200))
  }

  return cleaned
}
