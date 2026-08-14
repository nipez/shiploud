import type { Draft, JournalEntry, Setup } from './types'
import { activeProject } from './types'
import { uid } from './storage'
import {
  CANONICAL_SHIPLOUD_URL,
  isShipLoudPagesDev,
  rewritePagesDevUrls,
  stripTrailingSlash,
} from './url'
import { isShortEnough, SOFT_LIMIT, TARGET_MAX, TCO_LEN, xLength, X_LIMIT } from './xLength'

/** Bundle marker (string survives minify). */
export const GENERATOR_MARKER = "SHORT_ONLY_GENERATOR_v2" as const
export { xLength, isShortEnough, X_LIMIT, SOFT_LIMIT, TARGET_MAX }

const URL_RE = /https?:\/\/\S+/gi

/** Strip URLs and dangling "to → URL" connectors from a fact line. */
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

/** Prefer concrete first clause; drop setup-ish label walls. Never paste essays. */
function firstFact(raw: string, maxLen = 64): string {
  let src = raw.replace(/\s+/g, ' ').trim()

  // If journal mashed setup + ship notes, prefer the real ship clause.
  const shippedIdx = src.search(/\b(?:what\s+)?shipped(?:\s+today)?\s*[:\-–]\s*/i)
  if (shippedIdx >= 0) {
    src = src.slice(shippedIdx).replace(/^(?:what\s+)?shipped(?:\s+today)?\s*[:\-–]\s*/i, '')
  }

  // Drop leading setup-field labels (Building:/Goal:/Who:/Voice:).
  src = src
    .replace(/^(?:building|goal|who|voice|audience|project)\s*[:\-–]\s*/i, '')
    .replace(/\b(?:building|goal|who|voice)\s*[:\-–]\s*/gi, '')
    .replace(/^(what shipped|shipped today|shipped)\s*[:\-–]?\s*/i, '')
    .trim()

  const cleaned = stripUrlsLine(src)
  if (!cleaned) return ''

  // Prefer left of em-dash when it reads like a ship title.
  const leftOfDash = cleaned.split(/\s*[—–]\s*/)[0]?.trim() || ''
  if (leftOfDash.length >= 8 && leftOfDash.length <= maxLen) {
    return leftOfDash
  }

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

/** Trim by X-weighted length, preferring line/word breaks. */
function trimX(text: string, limit: number): string {
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

/**
 * ALWAYS prefer project.url when set.
 * If journal/scraped still point at ShipLoud pages.dev, rewrite to project.url
 * (or the canonical custom domain). Never emit pages.dev when a custom domain exists.
 */
export function resolveProductLink(
  projectUrl: string,
  journalLink: string,
  scraped: string,
): string {
  const fromProject = projectUrl.trim()
  if (fromProject) {
    if (isShipLoudPagesDev(fromProject)) return CANONICAL_SHIPLOUD_URL
    return stripTrailingSlash(fromProject)
  }
  const fallback = (journalLink.trim() || scraped.trim()).trim()
  if (!fallback) return ''
  if (isShipLoudPagesDev(fallback)) return CANONICAL_SHIPLOUD_URL
  return stripTrailingSlash(fallback)
}

/**
 * Build a short punch draft. Body must be URL-free.
 * Link appended at most once; skipped if it would blow the soft/hard budget.
 * Setup fields are NEVER accepted here — callers pass only short facts.
 */
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
  // Absolute guarantee: no URLs left in body, no setup dumps.
  body = body.replace(URL_RE, '')
  const bodyBudget = includeLink && link ? TARGET_MAX - (TCO_LEN + 1) : TARGET_MAX
  body = trimX(body, bodyBudget)

  const href = link.trim()
  if (!includeLink || !href) {
    return trimX(body, X_LIMIT)
  }

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

function makeDraft(
  text: string,
  now: string,
  tag: { projectId?: string; projectName?: string },
  productLink: string,
  label?: string,
  source: Draft['source'] = 'journal-template',
): Draft {
  const rewritten = rewritePagesDevUrls(text.trim(), productLink || CANONICAL_SHIPLOUD_URL)
  // Hard cap: never emit over X limit (X-weighted).
  const safe = trimX(rewritten, X_LIMIT)
  // Belt: if somehow still long, hard slice by weighted length.
  const finalText = xLength(safe) <= X_LIMIT ? safe : trimX(safe, X_LIMIT)
  return {
    id: uid('draft'),
    text: finalText,
    status: 'idea',
    source,
    createdAt: now,
    updatedAt: now,
    label,
    ...tag,
  }
}

/** Turn remote/API draft texts into local Draft records (hard-trimmed). */
export function draftsFromTexts(
  texts: string[],
  journal: JournalEntry,
  setup?: Setup | null,
  source: Draft['source'] = 'ai',
): Draft[] {
  const now = new Date().toISOString()
  const project = setup ? activeProject(setup) : undefined
  const tag = {
    projectId: journal.projectId ?? project?.id,
    projectName: project?.name?.trim() || undefined,
  }
  const productLink = resolveProductLink(
    (project?.url ?? '').trim(),
    journal.link.trim(),
    journal.shipped.trim(),
  )
  return texts
    .map((text) => makeDraft(text, now, tag, productLink, undefined, source))
    .filter((d) => d.text && xLength(d.text) <= X_LIMIT)
}

/**
 * Short Marc Lou–style ship posts (2–5 short lines).
 * Setup is silent tone guidance only — never pasted into the body.
 * Product URL at most once per draft; never invent URLs.
 */
export function generateDraftsFromJournal(journal: JournalEntry, setup?: Setup | null): Draft[] {
  const now = new Date().toISOString()
  const project = setup ? activeProject(setup) : undefined
  const tag = {
    projectId: journal.projectId ?? project?.id,
    projectName: project?.name?.trim() || undefined,
  }

  const shippedRaw = rewritePagesDevUrls(
    journal.shipped.trim() || 'something small',
    (project?.url ?? '').trim() || CANONICAL_SHIPLOUD_URL,
  )
  const journalLink = journal.link.trim()
  const projectUrl = (project?.url ?? '').trim()
  const scraped =
    shippedRaw.match(/https?:\/\/\S+/i)?.[0] ??
    journalLink.match(/https?:\/\/\S+/i)?.[0] ??
    ''
  const productLink = resolveProductLink(projectUrl, journalLink, scraped)

  // Facts only — never dump setup.building / who / goal / voice.
  const shipLine =
    firstFact(shippedRaw, 64) ||
    stripUrlsLine(shippedRaw).slice(0, 64) ||
    'something small'
  const metric = pickNumber(journal.numbers.trim())
  const lesson = shortLesson(journal.blockerLesson.trim())

  const drafts = [
    makeDraft(
      punch(['Shipped today.', shipLine, '', 'Not waiting for perfect.'], productLink, true),
      now,
      tag,
      productLink,
    ),
    makeDraft(
      punch([metric || 'Day 1.', shipLine, '', 'Posting the receipt.'], productLink, false),
      now,
      tag,
      productLink,
    ),
    makeDraft(
      punch([lesson || 'Kept moving.', '', shipLine], productLink, true),
      now,
      tag,
      productLink,
    ),
    makeDraft(
      punch([shipLine, metric || 'Building in public.'], productLink, false),
      now,
      tag,
      productLink,
    ),
    makeDraft(
      punch(['Build log:', shipLine, metric || null, 'Ship → post → repeat.'], productLink, true),
      now,
      tag,
      productLink,
    ),
    makeDraft(
      punch(
        [
          'Thread starter 🧵',
          shipLine,
          metric || null,
          'Bio said build in public.',
          'Feed now matches.',
        ],
        productLink,
        Boolean(productLink),
      ),
      now,
      tag,
      productLink,
      'Thread starter',
    ),
  ]

  // Final safety: force every draft under hard cap (should already be).
  return drafts.map((d) =>
    xLength(d.text) <= X_LIMIT ? d : { ...d, text: trimX(d.text, X_LIMIT) },
  )
}
