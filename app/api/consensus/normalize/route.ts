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
Focus on extracting individual list items/options (e.g., tool names) rather than whole sentences.
Return ONLY compact JSON (no extra text) with this exact shape:
{
  "options": [
    { "label": "string (<= 5 words; canonical item name like 'GitHub Copilot')", "mentions": number, "models": ["provider/model"], "confidence": number }
  ]
}

Rules:
- When responses include numbered/bulleted lists (e.g., "1. GitHub Copilot 2. Cursor 3. Replit"), extract each item separately.
- Merge paraphrases and near-duplicates into ONE canonical label.
- Prefer the item's short name (e.g., "GitHub Copilot", "Cursor", "Replit").
- Keep 3-6 top options. Mentions = number of distinct model responses that included that item.
- Confidence 70-95 based on agreement strength and clarity.

Answers to normalize (model-tagged):\n${compactList}`

    // Choose a free/cheap model: prefer Gemini if configured, else Groq
    let modelResult: { text: string }
    try {
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        modelResult = await generateText({ model: google('gemini-2.0-flash'), prompt, maxTokens: 500, temperature: 0.2 })
      } else if (process.env.GROQ_API_KEY) {
        modelResult = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt, maxTokens: 600, temperature: 0.2 })
      } else {
        // Fallback: return heuristic grouping
        const heuristic = heuristicGroup(responses)
        return NextResponse.json({ options: heuristic })
      }
    } catch (llmError) {
      // On LLM failure, fallback to heuristic grouping
      const heuristic = heuristicGroup(responses)
      return NextResponse.json({ options: heuristic })
    }

    // Parse LLM JSON safely
    const parsed = safeParseJSON(modelResult.text)
    if (!parsed?.options) {
      const heuristic = heuristicGroup(responses)
      return NextResponse.json({ options: heuristic })
    }

    // Sanitize result
    const options = Array.isArray(parsed.options) ? parsed.options.slice(0, 6).map((o: any) => ({
      label: String(o.label || '').slice(0, 120),
      mentions: Number.isFinite(o.mentions) ? o.mentions : 1,
      models: Array.isArray(o.models) ? o.models.map((m: any) => String(m)).slice(0, 20) : [],
      confidence: Math.max(50, Math.min(95, Number(o.confidence) || 75)),
    })) : []

    return NextResponse.json({ options })
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
  const groups: Record<string, { label: string; mentions: number; models: string[] }> = {}
  for (const r of responses) {
    const text = stripHeaders(r.response)
    const items = extractListItems(text)
    const uncertain = isUncertain(text)
    // Count each item at most once per model response
    const uniqueItems = Array.from(new Set(items))
    if (uncertain) uniqueItems.unshift('needs more info')
    if (uniqueItems.length === 0) {
      // Fallback: try to use a short concise phrase from the first sentence
      const first = (text.split(/[.!?\n]/)[0] || '').trim()
      if (first.length > 0) uniqueItems.push(first)
    }
    for (const raw of uniqueItems) {
      const key = normalizeItemKey(raw)
      const label = canonicalItemLabel(raw)
      if (!key || !label) continue
      if (!groups[key]) {
        groups[key] = { label, mentions: 1, models: [r.model] }
      } else {
        groups[key].mentions += 1
        groups[key].models.push(r.model)
      }
    }
  }
  return Object.values(groups)
    .sort((a, b) => b.mentions - a.mentions || a.label.localeCompare(b.label))
    .slice(0, 6)
    .map(g => ({ label: g.label, mentions: g.mentions, models: g.models.slice(0, 20), confidence: Math.min(95, 70 + g.mentions * 5) }))
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
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/[:–—\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Keep item reasonably short
  if (t.length > 80) t = t.slice(0, 80)
  return t
}

function normalizeItemKey(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9+.#\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
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


