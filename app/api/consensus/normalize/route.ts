import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { groq } from '@ai-sdk/groq'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

type InputResponse = { model: string; response: string }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const responses: InputResponse[] = Array.isArray(body?.responses) ? body.responses : []

    if (responses.length === 0) {
      return NextResponse.json({ error: 'No responses provided' }, { status: 400 })
    }

    // Build compact input for the LLM
    const compactList = responses.map((r, i) => `- [${r.model}] ${truncate(r.response, 400)}`).join('\n')

    const prompt = `You are normalizing multiple short answers that may be semantically identical but written differently.
Focus on extracting individual list items/options (e.g., product names, tools) rather than whole sentences.
Return ONLY compact JSON (no extra text) with this exact shape:
{
  "options": [
    { "label": "string (<= 5 words; canonical item name like 'Piaggio MP3 500')", "mentions": number, "models": ["provider/model"], "confidence": number }
  ]
}

CRITICAL DEDUPLICATION RULES:
- Strip ALL markdown (**, *, -, etc.) before comparing items
- "Piaggio MP3 500", "**Piaggio MP3 500**", "Piaggio MP3 500 - description" are ALL THE SAME item
- Merge ANY variation with description/explanation into ONE canonical short name
- When responses include numbered/bulleted lists, extract each item separately
- Count each item ONCE per model even if mentioned multiple times with different formatting
- Prefer the shortest clean version as the canonical label (no markdown, no descriptions)
- Keep 3-6 top options. Mentions = number of DISTINCT models that mentioned that item
- Confidence 70-95 based on agreement strength and clarity

Answers to normalize (model-tagged):\n${compactList}`

    // Use heuristic grouping for maximum determinism (no LLM variance)
    // LLM can give slightly different results each time even with low temperature
    const heuristic = heuristicGroup(responses)
    return NextResponse.json({ options: heuristic })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function truncate(text: string, max: number) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

function safeParseJSON(text: string): any | null {
  try {
    let t = text.trim()
    if (t.startsWith('```')) {
      t = t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '')
    }
    const match = t.match(/\{[\s\S]*\}/)
    if (match) t = match[0]
    return JSON.parse(t)
  } catch {
    return null
  }
}

function heuristicGroup(responses: InputResponse[]) {
  const groups: Record<string, { label: string; mentions: number; models: Set<string> }> = {}
  for (const r of responses) {
    const text = stripHeaders(r.response)
    const items = extractListItems(text)
    const uncertain = isUncertain(text)
    // Clean and deduplicate items from this model's response
    const cleanedItems = items.map(item => cleanItem(item)).filter(Boolean)
    const uniqueItemsThisModel = Array.from(new Set(cleanedItems))
    if (uncertain) uniqueItemsThisModel.unshift('needs more info')
    if (uniqueItemsThisModel.length === 0) {
      // Fallback: try to use a short concise phrase from the first sentence
      const first = cleanItem((text.split(/[.!?\n]/)[0] || '').trim())
      if (first.length > 0) uniqueItemsThisModel.push(first)
    }
    for (const cleaned of uniqueItemsThisModel) {
      const key = normalizeItemKey(cleaned)
      const label = canonicalItemLabel(cleaned)
      if (!key || !label) continue
      if (!groups[key]) {
        groups[key] = { label, mentions: 1, models: new Set([r.model]) }
      } else {
        // Only count each model once per item (prevent double counting)
        if (!groups[key].models.has(r.model)) {
          groups[key].mentions += 1
          groups[key].models.add(r.model)
        }
      }
    }
  }
  return Object.values(groups)
    .sort((a, b) => b.mentions - a.mentions || a.label.localeCompare(b.label))
    .slice(0, 6)
    .map(g => ({ label: g.label, mentions: g.mentions, models: Array.from(g.models).slice(0, 20), confidence: Math.min(95, 70 + g.mentions * 5) }))
}

function stripHeaders(s: string): string {
  return (s || '')
    .replace(/\[\s*main\s*answer\s*\]/ig, ' ')
    .replace(/\[\s*confidence\s*:[^\]]*\]/ig, ' ')
    .replace(/\[\s*key\s*evidence\s*\][\s\S]*/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractListItems(s: string): string[] {
  const results: string[] = []
  if (!s) return results

  // 1) Multiline numbered or bulleted lists
  const lineMatches = Array.from(s.matchAll(/^\s*(?:\d+[.)-]|[•\-\*])\s+(.+)$/gim))
  for (const m of lineMatches) {
    const item = cleanItem(m[1])
    if (item) results.push(item)
  }

  // 2) Inline numbered lists like: "1. A 2. B 3. C"
  const inlineRegex = /(?:^|\s)\d+[.)]\s+([^\d\[\]\n][^\n]{1,80}?)(?=(?:\s+\d+[.)])|$)/g
  const inlineMatches = Array.from(s.matchAll(inlineRegex))
  for (const m of inlineMatches) {
    const item = cleanItem(m[1])
    if (item) results.push(item)
  }

  // 3) If still empty, split common separators as a last resort
  if (results.length === 0) {
    const parts = s.split(/[,;•\n]+/).map(p => cleanItem(p)).filter(Boolean)
    results.push(...(parts as string[]))
  }

  return results.slice(0, 12)
}

function cleanItem(s: string | undefined): string {
  if (!s) return ''
  let t = s
    // Strip markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove parentheses and brackets
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    // Remove trailing punctuation and separators
    .replace(/[:–—\-]+$/g, '')
    // Split on separator and take first part (before description)
    .split(/\s*[-–—:]\s*/)[0]
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
  // Keep item reasonably short
  if (t.length > 80) t = t.slice(0, 80)
  return t
}

function normalizeItemKey(s: string): string {
  const original = s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Try removing brand names to extract model identifier
  let normalized = original.replace(/\b(piaggio|yamaha|honda|suzuki|kymco|bmw|kawasaki|sym|vespa)\b/g, '')
    // Normalize number ranges: 400/500 → 400, 300/400 → 300
    .replace(/(\d{3})\s*\/\s*\d{3}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  // If brand removal left nothing (e.g., "Honda" → ""), use original
  if (!normalized || normalized.length === 0) {
    return original
  }

  // Extract core model identifier WITHOUT numbers for better grouping
  // This makes "Burgman", "Burgman 250", "Burgman 250/400" all group together
  const parts = normalized.split(/\s+/).filter(p => p.length > 0)

  if (parts.length === 0) return original

  // Filter out all numbers and keep only text parts
  const textParts = parts.filter(p => !/^\d+$/.test(p))

  if (textParts.length === 0) {
    // Only numbers left, use first number as key (e.g., "500")
    return parts[0]
  }

  // Return first 2 text parts (model name without numbers)
  // "mp3 500" → "mp3"
  // "mp3 lt 500" → "mp3 lt"
  return textParts.slice(0, 2).join(' ')
}

function canonicalItemLabel(s: string): string {
  const t = s.trim()
  if (!t) return ''
  // Prefer original casing for brand/tool names, but normalize extraneous punctuation
  const norm = t.replace(/\s+/g, ' ').replace(/[\.:;\-]+$/g, '')
  // Degree/common label normalization
  if (/^needs?\s+more\s+info$/i.test(norm)) return 'needs more info'
  if (/^(mba|master of business administration)$/i.test(norm)) return 'MBA'
  if (/^(msc|ms|master of science)$/i.test(norm)) return 'MSc'
  return norm
}

function isUncertain(s: string): boolean {
  const t = (s || '').toLowerCase()
  return /(uncertain|unsure|depends|need(s)? more info|insufficient|not enough (data|information)|cannot determine)/.test(t)
}


