import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { groq } from '@ai-sdk/groq'

export const dynamic = 'force-dynamic'

type InputResponse = { model: string; response: string }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const responses: InputResponse[] = Array.isArray(body?.responses) ? body.responses : []
    const query: string = typeof body?.query === 'string' ? body.query : ''

    if (responses.length === 0) {
      return NextResponse.json({ error: 'No responses provided' }, { status: 400 })
    }

    // Prepare compact items per model
    const itemsPerModel = responses.map(r => ({
      model: normalizeModelKey(r.model),
      topItems: extractTopItems(stripHeaders(r.response)).slice(0, 3)
    }))

    const compact = itemsPerModel.map(it => `- [${it.model}] top: ${it.topItems.join(', ') || 'n/a'}`).join('\n')

    const prompt = `You will provide a ONE-LINE reason per model for why its FIRST top item is preferred over the others.
Return ONLY compact JSON with this exact shape:
{
  "reasons": [{ "model": "string", "reason": "<= 12 words, no punctuation at end" }]
}

Rules:
- Use at most 12 words per reason.
- Be specific and helpful (e.g., "leadership and fundraising advantage" or "deep technical specialization").
- No meta text, no quotes, no trailing periods.

USER QUERY (for context): ${truncate(query, 200)}

MODELS AND TOP ITEMS:\n${compact}`

    let result: { text: string }
    try {
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        result = await generateText({ model: google('gemini-2.0-flash'), prompt, maxTokens: 400, temperature: 0.2 })
      } else if (process.env.GROQ_API_KEY) {
        result = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt, maxTokens: 400, temperature: 0.2 })
      } else {
        // Heuristic fallback: map common tokens to canned reasons
        const reasons = itemsPerModel.map(it => ({ model: it.model, reason: heuristicReason(it.topItems[0] || '') }))
        return NextResponse.json({ reasons })
      }
    } catch (e) {
      const reasons = itemsPerModel.map(it => ({ model: it.model, reason: heuristicReason(it.topItems[0] || '') }))
      return NextResponse.json({ reasons })
    }

    const parsed = safeParseJSON(result.text)
    if (!parsed?.reasons) {
      const reasons = itemsPerModel.map(it => ({ model: it.model, reason: heuristicReason(it.topItems[0] || '') }))
      return NextResponse.json({ reasons })
    }

    const reasons = Array.isArray(parsed.reasons) ? parsed.reasons.map((r: any) => ({
      model: String(r.model || ''),
      reason: String(r.reason || '').slice(0, 140)
    })) : []

    return NextResponse.json({ reasons })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function truncate(s: string, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
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

function stripHeaders(s: string): string {
  return (s || '')
    .replace(/\[\s*main\s*answer\s*\]/ig, ' ')
    .replace(/\[\s*confidence\s*:[^\]]*\]/ig, ' ')
    .trim()
}

function extractTopItems(s: string): string[] {
  const results: string[] = []
  if (!s) return results
  const lineMatches = Array.from(s.matchAll(/^\s*(?:\d+[.)-]|[•\-\*])\s+(.+)$/gim))
  for (const m of lineMatches) {
    const item = cleanItem(m[1])
    if (item) results.push(item)
  }
  const inlineRegex = /(?:^|\s)\d+[.)]\s+([^\d\[\]\n][^\n]{1,80}?)(?=(?:\s+\d+[.)])|$)/g
  const inlineMatches = Array.from(s.matchAll(inlineRegex))
  for (const m of inlineMatches) {
    const item = cleanItem(m[1])
    if (item) results.push(item)
  }
  return Array.from(new Set(results))
}

function cleanItem(s: string | undefined): string {
  if (!s) return ''
  return s
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/[:–—\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function heuristicReason(top: string): string {
  const t = (top || '').toLowerCase()
  if (/mba/.test(t)) return 'leadership and fundraising advantage'
  if (/msc|ms/.test(t)) return 'deep technical specialization'
  if (/bsc/.test(t)) return 'foundational technical path'
  if (/copilot/.test(t)) return 'broad adoption and coding throughput'
  if (/cursor/.test(t)) return 'fast editing and IDE integration'
  if (/replit/.test(t)) return 'rapid prototyping in browser'
  return 'top-ranked by consensus'
}

function normalizeModelKey(m: string): string {
  return (m || '').split('/').pop() || m
}


