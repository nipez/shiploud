/** Short X draft generation — Workers AI with template fallback. */

export const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8' as const

const TCO_LEN = 23
export const X_LIMIT = 280
const SOFT_LIMIT = 250
const TARGET_MAX = 220
const URL_RE = /https?:\/\/\S+/gi

export type DraftSource = 'ai' | 'template'

export type GenerateJournal = {
  shipped?: string
  numbers?: string
  blockerLesson?: string
  link?: string
  date?: string
  projectId?: string
}

export type GenerateProject = {
  id?: string
  name?: string
  building?: string
  who?: string
  goal?: string
  voice?: string
  url?: string
}

export type GenerateResult = {
  drafts: Array<{ text: string }>
  source: DraftSource
  model?: string
}

type AiBinding = {
  run: (
    model: string,
    inputs: Record<string, unknown>,
  ) => Promise<unknown>
}

/** X-weighted length (each URL ≈ t.co). */
export function xLength(text: string): number {
  let len = 0
  let last = 0
  const re = /https?:\/\/\S+/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    len += m.index - last
    len += TCO_LEN
    last = m.index + m[0].length
  }
  len += text.length - last
  return len
}

/** Trim by X-weighted length, preferring line/word breaks. */
export function trimX(text: string, limit: number = X_LIMIT): string {
  if (xLength(text) <= limit) return text
  let t = text.trimEnd()
  while (xLength(t) > limit) {
    const nl = t.lastIndexOf('\n')
    if (nl > t.length * 0.3) {
      t = t.slice(0, nl).trimEnd()
      continue
    }
    const sp = t.lastIndexOf(' ')
    if (sp > t.length * 0.3) {
      t = t.slice(0, sp).trimEnd()
      continue
    }
    while (t.length > 0 && xLength(t) > limit) t = t.slice(0, -1)
    t = t.trimEnd()
    break
  }
  return t
}

function stripUrlsLine(raw: string): string {
  return raw
    .replace(/(?:→|->|to)\s*https?:\/\/\S+/gi, '')
    .replace(URL_RE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*[—–-]{2,}\s*/g, ' — ')
    .replace(/^\s*[—–-]\s*|\s*[—–-]\s*$/g, '')
    .replace(/\s*(→|->|to)\s*$/i, '')
    .replace(/\s+([,.!?])/g, '$1')
    .trim()
}

function firstFact(raw: string, maxLen = 64): string {
  let src = raw.replace(/\s+/g, ' ').trim()
  const shippedIdx = src.search(/\b(?:what\s+)?shipped(?:\s+today)?\s*[:\-–]\s*/i)
  if (shippedIdx >= 0) {
    src = src.slice(shippedIdx).replace(/^(?:what\s+)?shipped(?:\s+today)?\s*[:\-–]\s*/i, '')
  }
  src = src
    .replace(/^(?:building|goal|who|voice|audience|project)\s*[:\-–]\s*/i, '')
    .replace(/\b(?:building|goal|who|voice)\s*[:\-–]\s*/gi, '')
    .replace(/^(what shipped|shipped today|shipped)\s*[:\-–]?\s*/i, '')
    .trim()
  const cleaned = stripUrlsLine(src)
  if (!cleaned) return ''
  const leftOfDash = cleaned.split(/\s*[—–]\s*/)[0]?.trim() || ''
  if (leftOfDash.length >= 8 && leftOfDash.length <= maxLen) return leftOfDash
  const chunk = cleaned.split(/(?<=[.!?])\s+|;\s+|\n+/)[0]?.trim() || cleaned
  if (chunk.length <= maxLen) return chunk
  const cut = chunk.slice(0, maxLen - 1)
  const at = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','))
  return `${(at > 24 ? cut.slice(0, at) : cut).trim()}…`
}

function pickNumber(raw: string): string {
  const t = raw.replace(/\s+/g, ' ').trim()
  if (!t || /^no numbers/i.test(t)) return ''
  const parts = t
    .split(/\s*[·|•]\s*/)
    .map((p) => p.trim())
    .filter((p) => p && /[\d$]/.test(p))
  if (parts.length === 0) {
    const fallback = t.split(/,/)[0]?.trim() || t
    return fallback.length > 36 ? `${fallback.slice(0, 35).trim()}…` : fallback
  }
  const joined = parts.slice(0, 2).join(' · ')
  return joined.length > 40 ? `${joined.slice(0, 39).trim()}…` : joined
}

function shortLesson(raw: string): string {
  const t = stripUrlsLine(raw.replace(/\s+/g, ' ').trim())
  if (!t) return ''
  const beat = t.split(/(?<=[.!?])\s+/)[0]?.trim() || t
  if (beat.length <= 56) return beat
  const cut = beat.slice(0, 55)
  const at = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','))
  return `${(at > 20 ? cut.slice(0, at) : cut).trim()}…`
}

function lines(...parts: Array<string | null | undefined | false>): string {
  return parts
    .filter((l): l is string => typeof l === 'string')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}

function punch(
  bodyLines: Array<string | null | undefined | false>,
  link: string,
  includeLink: boolean,
): string {
  const cleaned = bodyLines.map((l) => {
    if (typeof l !== 'string') return l
    if (l === '') return ''
    return stripUrlsLine(l)
  })
  let body = lines(...cleaned)
  body = body.replace(URL_RE, '')
  const bodyBudget = includeLink && link ? TARGET_MAX - (TCO_LEN + 1) : TARGET_MAX
  body = trimX(body, bodyBudget)
  const href = link.trim()
  if (!includeLink || !href) return trimX(body, X_LIMIT)
  const bare = href.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  if (bare && body.toLowerCase().includes(bare.toLowerCase())) {
    return trimX(body, X_LIMIT)
  }
  const withLink = `${body}\n${href}`
  if (xLength(withLink) <= X_LIMIT) {
    if (xLength(withLink) > SOFT_LIMIT) {
      const budget = Math.min(SOFT_LIMIT, X_LIMIT) - TCO_LEN - 1
      if (budget >= 40) {
        const short = trimX(body, budget)
        const candidate = `${short}\n${href}`
        if (xLength(candidate) <= X_LIMIT) return candidate
      }
    }
    return withLink
  }
  const budget = X_LIMIT - TCO_LEN - 1
  if (budget < 40) return trimX(body, X_LIMIT)
  const short = trimX(body, budget)
  const candidate = `${short}\n${href}`
  return xLength(candidate) <= X_LIMIT ? candidate : trimX(body, X_LIMIT)
}

function str(v: unknown, max = 800): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export function resolveProductLink(projectUrl: string, journalLink: string, shipped: string): string {
  const fromProject = projectUrl.trim()
  if (fromProject) return fromProject.replace(/\/$/, '')
  const scraped = shipped.match(/https?:\/\/\S+/i)?.[0] ?? ''
  const fallback = (journalLink.trim() || scraped).trim()
  return fallback.replace(/\/$/, '')
}

/** Silent project context block for the model — never meant to be pasted verbatim. */
export function buildPrompt(journal: GenerateJournal, project: GenerateProject): {
  system: string
  user: string
} {
  const shipped = str(journal.shipped, 600) || 'something small'
  const numbers = str(journal.numbers, 240)
  const lesson = str(journal.blockerLesson, 400)
  const link = str(journal.link, 200)
  const productUrl = resolveProductLink(str(project.url, 200), link, shipped)

  const system = [
    'You write short Marc Lou–style X/Twitter posts for indie builders who ship in public.',
    'Return ONLY a JSON array of 5 or 6 strings. No markdown fences, no commentary.',
    'Each string is one complete post:',
    '- X-weighted length ≤ 280 (every URL counts as ~23 chars)',
    '- Plain text with short line breaks (2–5 short lines)',
    '- Punchy, specific, first person; numbers when useful',
    '- At most ONE URL per post; prefer the product URL if provided; never invent URLs',
    '- Setup fields (building/who/goal/voice/name) are silent context — NEVER paste labels like "Building:", "Goal:", "Who:", "Voice:", or dump those paragraphs',
    '- Forbidden essay templates: "Shipped today." walls, "Numbers:" / "Lesson:" label dumps, long LinkedIn soup, guru speak',
    '- Vary angles across the 5–6 options (receipt, metric, lesson, tease, build-log vibe) but keep every option short',
  ].join('\n')

  const user = [
    'Journal (facts to turn into posts):',
    `shipped: ${shipped}`,
    numbers ? `numbers: ${numbers}` : 'numbers: (none)',
    lesson ? `lesson: ${lesson}` : 'lesson: (none)',
    link ? `journal_link: ${link}` : 'journal_link: (none)',
    productUrl ? `product_url: ${productUrl}` : 'product_url: (none)',
    '',
    'Silent project context (tone only — do NOT paste these labels into posts):',
    `name=${str(project.name, 80) || '(unnamed)'}`,
    `building=${str(project.building, 240) || '(unset)'}`,
    `who=${str(project.who, 200) || '(unset)'}`,
    `goal=${str(project.goal, 200) || '(unset)'}`,
    `voice=${str(project.voice, 200) || '(unset)'}`,
    '',
    'Output: JSON array of 5 or 6 short post strings.',
  ].join('\n')

  return { system, user }
}

function extractJsonArray(raw: string): unknown[] | null {
  const text = raw.trim()
  if (!text) return null
  // Strip ```json fences if present
  const unfenced = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(unfenced)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { drafts?: unknown }).drafts)) {
      return (parsed as { drafts: unknown[] }).drafts
    }
  } catch {
    /* fall through */
  }
  const start = unfenced.indexOf('[')
  const end = unfenced.lastIndexOf(']')
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(unfenced.slice(start, end + 1))
      if (Array.isArray(parsed)) return parsed
    } catch {
      /* ignore */
    }
  }
  return null
}

function normalizeAiTexts(items: unknown[], productUrl: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    let text = ''
    if (typeof item === 'string') text = item
    else if (item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string') {
      text = (item as { text: string }).text
    }
    text = text.replace(/\r\n/g, '\n').trim()
    if (!text) continue
    // Cap URLs to one (prefer product url if model dumped many)
    const urls = text.match(URL_RE) || []
    if (urls.length > 1) {
      let kept = false
      text = text.replace(URL_RE, (u) => {
        if (!kept && productUrl && u.replace(/\/$/, '') === productUrl.replace(/\/$/, '')) {
          kept = true
          return u
        }
        if (!kept) {
          kept = true
          return u
        }
        return ''
      })
      text = text
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }
    text = trimX(text, X_LIMIT)
    if (!text || xLength(text) > X_LIMIT) continue
    // Reject setup dumps
    if (/\b(?:Building|Goal|Who|Voice)\s*:/i.test(text)) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= 6) break
  }
  return out
}

export function templateDrafts(journal: GenerateJournal, project: GenerateProject): string[] {
  const shippedRaw = str(journal.shipped, 600) || 'something small'
  const productLink = resolveProductLink(str(project.url, 200), str(journal.link, 200), shippedRaw)
  const shipLine =
    firstFact(shippedRaw, 64) || stripUrlsLine(shippedRaw).slice(0, 64) || 'something small'
  const metric = pickNumber(str(journal.numbers, 240))
  const lesson = shortLesson(str(journal.blockerLesson, 400))

  const texts = [
    punch(['Shipped.', shipLine, '', 'Not waiting for perfect.'], productLink, true),
    punch([metric || 'Day 1.', shipLine, '', 'Posting the receipt.'], productLink, false),
    punch([lesson || 'Kept moving.', '', shipLine], productLink, true),
    punch([shipLine, metric || 'Building in public.'], productLink, false),
    punch(['Build log:', shipLine, metric || null, 'Ship → post → repeat.'], productLink, true),
    punch(
      [shipLine, metric || null, 'Bio said build in public.', 'Feed now matches.'],
      productLink,
      Boolean(productLink),
    ),
  ]
  return texts.map((t) => trimX(t, X_LIMIT)).filter((t) => t && xLength(t) <= X_LIMIT)
}

function aiResponseText(result: unknown): string {
  if (!result) return ''
  if (typeof result === 'string') return result
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (typeof r.response === 'string') return r.response
    if (typeof r.result === 'string') return r.result
    if (r.result && typeof r.result === 'object') {
      const inner = r.result as Record<string, unknown>
      if (typeof inner.response === 'string') return inner.response
    }
    // OpenAI-style
    const choices = r.choices
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
      const c0 = choices[0] as { message?: { content?: string }; text?: string }
      if (typeof c0.message?.content === 'string') return c0.message.content
      if (typeof c0.text === 'string') return c0.text
    }
  }
  return ''
}

export async function generateWithAi(
  ai: AiBinding,
  journal: GenerateJournal,
  project: GenerateProject,
): Promise<string[] | null> {
  const { system, user } = buildPrompt(journal, project)
  const productUrl = resolveProductLink(str(project.url, 200), str(journal.link, 200), str(journal.shipped, 600))
  const result = await ai.run(AI_MODEL, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 900,
    temperature: 0.7,
  })
  const raw = aiResponseText(result)
  const arr = extractJsonArray(raw)
  if (!arr || arr.length === 0) return null
  const texts = normalizeAiTexts(arr, productUrl)
  return texts.length >= 3 ? texts : null
}

/**
 * Prefer Workers AI; fall back to templates if binding missing or model fails.
 */
export async function generateDrafts(
  ai: AiBinding | undefined | null,
  journal: GenerateJournal,
  project: GenerateProject,
): Promise<GenerateResult> {
  if (ai && typeof ai.run === 'function') {
    try {
      const texts = await generateWithAi(ai, journal, project)
      if (texts && texts.length > 0) {
        return {
          drafts: texts.slice(0, 6).map((text) => ({ text })),
          source: 'ai',
          model: AI_MODEL,
        }
      }
    } catch {
      /* fall through to template */
    }
  }
  const texts = templateDrafts(journal, project)
  return {
    drafts: texts.slice(0, 6).map((text) => ({ text })),
    source: 'template',
  }
}
