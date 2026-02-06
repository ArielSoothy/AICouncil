/**
 * Shared JSON extraction utility for AI model responses
 *
 * Handles multiple formats:
 * - Markdown code blocks (```json ... ```)
 * - Plain text with embedded JSON
 * - Truncated responses
 * - Common JSON formatting issues (trailing commas)
 *
 * Used by: consensus, individual, debate, and test-model routes
 */

/**
 * Robust JSON extraction from model responses.
 * Strips markdown fences, finds the outermost { ... } block,
 * removes trailing commas, and returns the cleaned string.
 */
export function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Pattern 1: Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Pattern 2: Extract JSON object from surrounding text
  // Find first { and last } (works for nested objects)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Pattern 3: Fix common JSON issues
  cleaned = cleaned
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    // NOTE: Do NOT replace all single quotes with double quotes!
    // This breaks apostrophes in text like "AAPL's" -> "AAPL"s"
    .trim();

  // Pattern 4: Validate or fallback to aggressive extraction
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Try to extract just the JSON object more aggressively
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return match[0];
    }
    // If all else fails, return what we have
    return cleaned;
  }
}
