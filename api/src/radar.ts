/** Live reply radar — public posts via fxtwitter, cached in D1. */

import { AI_MODEL } from './drafts'

export const RADAR_CACHE_TTL_MS = 20 * 60 * 1000
export const RADAR_MAX_HANDLES = 10
export const RADAR_MAX_PER_HANDLE = 3
export const RADAR_MAX_ITEMS = 15
export const REPLY_MAX_CHARS = 180
/** Safety cap only — X note tweets can be long; do not aggressively truncate. */
export const RADAR_TEXT_MAX = 25_000
/** Bump when cached tweet shape changes so skinny payloads are dropped. */
export const RADAR_PAYLOAD_VERSION = 3
/** Bump when reply tone/prompt changes so clients drop stale suggested replies. */
export const REPLY_TONE_VERSION = 4
export const TEMPLATE_REPLY = 'Curious which part of that you keep coming back to?'

/** Workers AI system prompt — warm peer, never dunk. */
export const RADAR_REPLY_SYSTEM = [
  'You write short X replies for an indie founder talking to favorite builders they want to follow and build rapport with.',
  'GOAL: Warm, curious, specific to THAT tweet. Build the relationship. Never dunk, contradict, or one-up.',
  'Return ONLY a JSON array of strings. One reply per tweet, same order.',
  'Each reply: ≤180 characters, first person, peer builder (not a critic, not a fanboy).',
  'Engage the tweet’s actual claim (the point after a colon, or the last sentence). Name a concrete noun from it (a company, product, number, or the punchline). Not a list opener or the first 4 words.',
  'No guru speak. No Setup field dumps (never paste Building/Who/Goal/Voice labels).',
  'Voice is tone only. Do not quote it.',
  '',
  'PUNCTUATION: Never use an em dash, en dash, or space-hyphen-space as a clause break. Use a period or a new sentence. Hyphens inside a word (set-up) are fine.',
  'Never write the phrase “this landed” (any casing).',
  'Never ask “how are you testing that” about a fragment.',
  'Never use generic filler (“what did you try first”, “next small experiment”, “how is this going”) unless the tweet is actually about an experiment or a ship.',
  '',
  'DO:',
  '- Reference a concrete detail from the claim itself (Google, design, a number, a product)',
  '- Add a useful question, a same-muscle bridge, or a humble “I shipped X” (never one-upping)',
  '- Sound like a peer who actually builds',
  '',
  "DON'T:",
  '- Quote a list/thread opener (“#2 advice to grow”, “Day 3”, “Unpopular opinion”) and ask “how are you testing that”',
  '- Sarcasm, smugness, contradiction, “actually that’s basic”',
  '- “don’t worry”, “that’s not cool”, “I have better things to do”',
  '- Dunking on AI takes, dunking in general, one-upping',
  '- Fanboy: “fire 🔥”, “this is gold”, “great post!”',
  '- Generic praise with no specifics',
  '- “This landed.” or any clause dash',
  '',
  'Examples:',
  'Tweet: “#2 advice to grow an audience in 2026: Do the opposite of what AI recommends.”',
  "DON'T: “The ‘#2 advice to grow’ bit stuck. How are you testing that this week?”",
  'DO: “Curious what the last AI suggestion you ignored was. Did skipping it actually work?”',
  'Tweet: “Do the opposite of what AI recommends.”',
  "DON'T: “That’s not how you ship. AI takes are cope.”",
  'DO: “Same instinct here. I skip the generic stack advice and ship the ugly version first. What did you cut last?”',
  'Tweet: “Just hit $1k MRR.”',
  "DON'T: “Cool, I did it faster.” / “fire 🔥”",
  'DO: “Congrats. That’s a real number. What was the boring channel that actually moved it?”',
  'Tweet: “Even AI slops are better at design than Google \'Design\'”',
  "DON'T: “This landed. What’s the next small experiment you’re running?”",
  "DON'T: “Same muscle over here. What did you try first?”",
  'DO: “Which Google screen were you looking at when that hit?”',
].join('\n')

const FETCH_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'ShipLoudBot/0.1 (+https://www.getshiploud.com)',
}

type AiBinding = {
  run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>
}

export type RadarMediaType = 'photo' | 'video' | 'gif'

export type RadarMedia = {
  type: RadarMediaType
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

export type RadarTweet = {
  handle: string
  tweetId: string
  text: string
  url: string
  createdAt: string
  displayName: string
  avatarUrl: string
  media: RadarMedia[]
  likes: number | null
  reposts: number | null
  replies: number | null
}

export const SUGGESTED_REPLY_COUNT = 3

export type RadarItem = RadarTweet & {
  suggestedReply: string
  suggestedReplies: string[]
}

export type RadarResult = {
  items: RadarItem[]
  stale: boolean
  error: string | null
  toneVersion: number
  pendingHandles: string[]
  cached: boolean
}

/** Skip Workers AI if it would delay the feed — templates are instant. */
export const AI_REPLY_BUDGET_MS = 800

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase()
}

export function validHandle(raw: string): string | null {
  const h = normalizeHandle(raw)
  if (!h || !/^[a-z0-9_]{1,15}$/i.test(h)) return null
  return h
}

export function capHandles(raw: unknown): string[] {
  const list: string[] = []
  const seen = new Set<string>()
  const src = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,\s]+/) : []
  for (const item of src) {
    if (typeof item !== 'string') continue
    const h = validHandle(item)
    if (!h || seen.has(h)) continue
    seen.add(h)
    list.push(h)
    if (list.length >= RADAR_MAX_HANDLES) break
  }
  return list
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return null
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : ''
}

function asCount(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v)
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) {
    const n = Number(v)
    if (n >= 0) return Math.floor(n)
  }
  return null
}

function httpsUrl(v: unknown): string {
  const s = asString(v).trim()
  if (!/^https:\/\//i.test(s)) return ''
  if (/\s/.test(s)) return ''
  return s
}

function asPositiveInt(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v)
  return undefined
}

function parseMediaItem(raw: unknown): RadarMedia | null {
  const row = asRecord(raw)
  if (!row) return null
  const typeRaw = asString(row.type).toLowerCase()
  const url = httpsUrl(row.url)
  const thumbnailUrl =
    httpsUrl(row.thumbnail_url) || httpsUrl(row.thumbnailUrl) || httpsUrl(row.preview_image_url)
  if (!url && !thumbnailUrl) return null
  const type: RadarMediaType =
    typeRaw === 'video' || typeRaw === 'gif' ? typeRaw : url && /\.(?:mp4|m3u8)(?:\?|$)/i.test(url) ? 'video' : 'photo'
  const width = asPositiveInt(row.width)
  const height = asPositiveInt(row.height)
  return {
    type,
    url: url || thumbnailUrl,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }
}

export function parseMedia(row: Record<string, unknown>): RadarMedia[] {
  const media = asRecord(row.media)
  if (!media) return []
  const pool: unknown[] = []
  if (Array.isArray(media.all) && media.all.length > 0) {
    pool.push(...media.all)
  } else {
    if (Array.isArray(media.photos)) pool.push(...media.photos)
    if (Array.isArray(media.videos)) pool.push(...media.videos)
  }
  const out: RadarMedia[] = []
  const seen = new Set<string>()
  for (const item of pool) {
    const parsed = parseMediaItem(item)
    if (!parsed) continue
    if (seen.has(parsed.url)) continue
    seen.add(parsed.url)
    out.push(parsed)
    if (out.length >= 4) break
  }
  return out
}

function parseAuthor(row: Record<string, unknown>, expectedHandle: string): { handle: string; displayName: string; avatarUrl: string } {
  const author = asRecord(row.author) || asRecord(row.user)
  const handle =
    normalizeHandle(asString(author?.screen_name || author?.username || author?.handle) || expectedHandle) ||
    expectedHandle
  const displayName = asString(author?.name || author?.display_name || author?.displayName).trim() || handle
  const avatarUrl =
    httpsUrl(author?.avatar_url) ||
    httpsUrl(author?.avatarUrl) ||
    httpsUrl(author?.profile_image_url) ||
    httpsUrl(author?.profileImageUrl)
  return { handle, displayName, avatarUrl }
}

function createdAtIso(row: Record<string, unknown>): string {
  const ts = row.created_timestamp ?? row.createdTimestamp ?? row.timestamp
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    const ms = ts >= 1e12 ? ts : ts * 1000
    const d = new Date(ms)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  if (typeof ts === 'string' && ts.trim() && Number.isFinite(Number(ts))) {
    const n = Number(ts)
    const ms = n >= 1e12 ? n : n * 1000
    const d = new Date(ms)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  const raw = asString(row.created_at || row.createdAt || row.date)
  if (raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
    return raw
  }
  return new Date().toISOString()
}

function isTruthyMark(v: unknown): boolean {
  if (!v) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true
}

/** Skip replies / retweets when the public API marks them. */
export function isReplyOrRepost(row: Record<string, unknown>): boolean {
  if (isTruthyMark(row.replying_to) || isTruthyMark(row.replyingTo) || isTruthyMark(row.in_reply_to_status_id)) {
    return true
  }
  if (isTruthyMark(row.reposted_by) || isTruthyMark(row.repostedBy) || isTruthyMark(row.retweeted_status)) {
    return true
  }
  const t = asString(row.type).toLowerCase()
  if (t === 'retweet' || t === 'repost') return true
  return false
}

export function parseStatus(raw: unknown, expectedHandle: string): RadarTweet | null {
  const row = asRecord(raw)
  if (!row) return null
  if (asString(row.type).toLowerCase() === 'thread') return null
  if (isReplyOrRepost(row)) return null

  const id = asString(row.id || row.tweet_id || row.tweetId).trim()
  const text = asString(row.text || row.full_text || row.fullText).trim()
  if (!id || !text) return null

  const { handle, displayName, avatarUrl } = parseAuthor(row, expectedHandle)
  const url =
    asString(row.url).trim() ||
    `https://x.com/${handle}/status/${id}`

  return {
    handle,
    tweetId: id,
    text: text.slice(0, RADAR_TEXT_MAX),
    url: url.replace(/^https?:\/\/twitter\.com/i, 'https://x.com'),
    createdAt: createdAtIso(row),
    displayName,
    avatarUrl,
    media: parseMedia(row),
    likes: asCount(row.likes),
    reposts: asCount(row.reposts ?? row.retweets),
    replies: asCount(row.replies),
  }
}

function collectStatuses(data: unknown): unknown[] {
  const root = asRecord(data)
  if (!root) return []
  if (Array.isArray(root.results)) return root.results
  if (Array.isArray(root.tweets)) return root.tweets
  if (Array.isArray(root.statuses)) return root.statuses
  if (Array.isArray(root.data)) return root.data
  const user = asRecord(root.user)
  if (user) {
    if (Array.isArray(user.latest_tweets)) return user.latest_tweets
    if (Array.isArray(user.tweets)) return user.tweets
    if (Array.isArray(user.statuses)) return user.statuses
  }
  const inner = asRecord(root.tweet) || asRecord(root.status)
  if (inner) return [inner]
  return []
}

export function parseTimeline(data: unknown, expectedHandle: string): RadarTweet[] {
  const out: RadarTweet[] = []
  const seen = new Set<string>()
  for (const raw of collectStatuses(data)) {
    const rec = asRecord(raw)
    if (rec && asString(rec.type).toLowerCase() === 'thread' && Array.isArray(rec.statuses)) {
      for (const nested of rec.statuses) {
        const parsed = parseStatus(nested, expectedHandle)
        if (!parsed || seen.has(parsed.tweetId)) continue
        seen.add(parsed.tweetId)
        out.push(parsed)
        if (out.length >= RADAR_MAX_PER_HANDLE) return out
      }
      continue
    }
    const parsed = parseStatus(raw, expectedHandle)
    if (!parsed || seen.has(parsed.tweetId)) continue
    seen.add(parsed.tweetId)
    out.push(parsed)
    if (out.length >= RADAR_MAX_PER_HANDLE) break
  }
  return out
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: FETCH_HEADERS,
      redirect: 'follow',
    })
    if (!res.ok) return null
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

async function firstTweetsFrom(urls: string[], handle: string): Promise<RadarTweet[]> {
  const results = await Promise.all(
    urls.map(async (url) => {
      const data = await fetchJson(url)
      if (!data) return [] as RadarTweet[]
      return parseTimeline(data, handle)
    }),
  )
  return results.find((tweets) => tweets.length > 0) ?? []
}

/** Public tweets only — never uses X login or paid API. */
export async function fetchPublicTweets(handleRaw: string): Promise<RadarTweet[]> {
  const handle = validHandle(handleRaw)
  if (!handle) return []

  const encoded = encodeURIComponent(handle)
  const primary = [
    `https://api.fxtwitter.com/2/profile/${encoded}/statuses?count=12`,
    `https://api.vxtwitter.com/2/profile/${encoded}/statuses?count=12`,
  ]
  const fallback = [
    `https://api.fxtwitter.com/${encoded}`,
    `https://api.vxtwitter.com/${encoded}`,
  ]

  const first = await firstTweetsFrom(primary, handle)
  if (first.length > 0) return first
  return firstTweetsFrom(fallback, handle)
}

/** Drop sentences that say "this landed" (any casing). */
function dropThisLanded(text: string): string {
  if (!/\bthis landed\b/i.test(text)) return text
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((p) => p.trim() && !/\bthis landed\b/i.test(p))
    .join(' ')
    .trim()
}

/** Em dash, en dash, or ` - ` clause break → period. Word hyphens (set-up) stay. */
export function stripClauseDashes(text: string): string {
  let t = text.replace(/\s*[—–]\s*/g, '. ').replace(/\s+-\s+/g, '. ')
  t = t.replace(/([.!?])\s+([a-z])/g, (_m, p: string, c: string) => `${p} ${c.toUpperCase()}`)
  t = t.replace(/\s+\./g, '.').replace(/\.{2,}/g, '.').replace(/\s{2,}/g, ' ').trim()
  return t
}

export function hasClauseDash(text: string): boolean {
  return /[—–]/.test(text) || /\s-\s/.test(text)
}

/** Strip JSON leftovers, "this landed", and clause dashes. Keep ? . ! */
function tidyReply(text: string): string {
  let t = text.trim()
  const wrapped = t.match(/^["']([\s\S]*)["']\s*,?\s*$/)
  if (wrapped) t = wrapped[1].trim()
  t = t.replace(/["']\s*,?\s*$/, '').replace(/,\s*$/, '').trim()
  t = dropThisLanded(t)
  t = stripClauseDashes(t)
  return t
}

function clipReply(text: string): string {
  let t = text.replace(/\r\n/g, '\n').trim()
  t = t.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  t = tidyReply(t)
  if (/\bthis landed\b/i.test(t)) return ''
  if (/\b(?:Building|Goal|Who|Voice)\s*:/i.test(t)) return ''
  if (t.length > REPLY_MAX_CHARS) {
    const cut = t.slice(0, REPLY_MAX_CHARS)
    const at = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('\n'))
    t = (at > 80 ? cut.slice(0, at) : cut).trim()
  }
  return t
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
    const choices = r.choices
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
      const c0 = choices[0] as { message?: { content?: string }; text?: string }
      if (typeof c0.message?.content === 'string') return c0.message.content
      if (typeof c0.text === 'string') return c0.text
    }
  }
  return ''
}

function extractJsonArray(raw: string): unknown[] | null {
  const text = raw.trim()
  if (!text) return null
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(unfenced)
    if (Array.isArray(parsed)) return parsed
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

const LIST_OPENER_RE =
  /^(?:#\d+|\d+[.)]|day\s+\d+|unpopular opinion|hot take|thread|psa|advice to)\b/i

function isListOpener(s: string): boolean {
  return LIST_OPENER_RE.test(s.trim())
}

/** Punchline / noun phrase from the claim — never a list opener or first-4-words stub. */
export function tweetHook(text: string): string {
  const t = text.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const afterDelim = t.split(/[:—–]| - /)
  const punch = afterDelim.length > 1 ? (afterDelim[afterDelim.length - 1] || '').trim() : ''
  const sentences = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  const lastSentence = sentences.length > 1 ? sentences[sentences.length - 1] : ''
  for (const raw of [punch, lastSentence, t]) {
    const hook = nounHook(raw)
    if (hook) return hook
  }
  return ''
}

function nounHook(raw: string): string {
  if (!raw) return ''
  let chunk = raw.replace(/^["'\u201c\u201d\u2018\u2019]+|["'\u201c\u201d\u2018\u2019]+$/g, '').trim()
  chunk = chunk.replace(/[:\-–—.,;]+$/g, '').trim()
  chunk = chunk
    .replace(/^(?:#\d+|\d+[.)]|day\s+\d+|unpopular opinion|hot take|thread|psa)\b[:.\-–—\s]*/i, '')
    .trim()
  if (!chunk || isListOpener(chunk)) return ''
  chunk = chunk.replace(/^(?:do|don'?t|dont|stop|never|just|please)\s+/i, '').trim()
  if (!chunk || isListOpener(chunk)) return ''
  if (chunk.length > 56) {
    const words = chunk.split(/\s+/).filter(Boolean)
    chunk = words.slice(-6).join(' ')
  }
  if (chunk.length < 8 || chunk.length > 56) return ''
  if (isListOpener(chunk)) return ''
  return chunk
}

function looksLikeQuestion(text: string): boolean {
  const t = text.trim()
  return /\?/.test(t) || /^(why|how|what|should|anyone|is it|does)\b/i.test(t)
}

function looksLikeShip(text: string): boolean {
  return /\b(shipped|shipping|launched|launch|went live|mvp|built|building)\b/i.test(text)
}

function looksLikeExperiment(text: string): boolean {
  return /\b(experiment|a\/b|hypothesis|trying this|ran a test)\b/i.test(text)
}

function looksLikeOpinion(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (/^(?:#\d+|unpopular opinion|hot take|pro tip|advice|lesson|reminder|rule\s+\d+|thread)\b/i.test(t)) {
    return true
  }
  if (
    /\b(advice|recommends?|recommendation|unpopular|hot take|opposite|instead of|generic advice|the trick|the secret)\b/i.test(
      t,
    )
  ) {
    return true
  }
  if (/[:—–]\s+\S/.test(t) && !looksLikeQuestion(t) && !looksLikeShip(t)) return true
  return false
}

/** Roast / comparison / company dunk. "better than", "even X", named-company jab. */
export function looksLikeRoast(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (/\b(?:better|worse)\s+than\b/i.test(t)) return true
  if (/\beven\s+\S.{0,48}\b(?:better|worse|beats?|beating)\b/i.test(t)) return true
  if (/\beven\s+(?:ai|chatgpt|claude|gpt|midjourney|slops?)\b/i.test(t)) return true
  if (/\bbeats?\b.+\b(?:at|on|in)\b/i.test(t)) return true
  if (
    /\b(google|apple|meta|facebook|microsoft|amazon|openai|netflix|uber)\b/i.test(t) &&
    /\b(slop|ugly|awful|terrible|joke|clown|embarrassing|asleep|dumpster)\b/i.test(t)
  ) {
    return true
  }
  return false
}

function looksLikeShipOrExperiment(text: string): boolean {
  return looksLikeShip(text) || looksLikeExperiment(text)
}

/** Generic experiment/ship filler. Banned unless the tweet is actually a ship or experiment. */
function isBannedFiller(text: string, tweet?: string): boolean {
  if (/\bthis landed\b/i.test(text)) return true
  if (hasClauseDash(text)) return true
  const allow = tweet ? looksLikeShipOrExperiment(tweet) : false
  if (allow) return false
  return /what did you try first|next small experiment|how is this going for you/i.test(text)
}

/** Noun-ish fragment from the claim — skip list openers and bare imperatives. */
export function safeHook(text: string): string {
  const hook = tweetHook(text)
  if (!hook) return ''
  if (isListOpener(hook)) return ''
  if (/^(do|don'?t|dont|stop|never|just|i|we|you|this|that)\b/i.test(hook)) return ''
  return hook
}

const KNOWN_NAMES =
  /\b(google|apple|meta|microsoft|amazon|openai|chatgpt|claude|figma|notion|linear|stripe|vercel|material|design system|ai slops?|micro saas)\b/gi

function cleanAnchor(raw: string): string {
  return raw.replace(/^["'\u201c\u201d\u2018\u2019]+|["'\u201c\u201d\u2018\u2019]+$/g, '').replace(/\s+/g, ' ').trim()
}

function lastMeaningfulChunk(text: string): string {
  const cleaned = text.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim()
  const words = cleaned
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?]+$/g, ''))
    .filter((w) => w.length > 3 && !/^(even|just|this|that|with|from|have|been|than|better|worse|about|note|they|them|were|your)$/i.test(w))
  if (words.length > 0) return words[words.length - 1]
  const hook = tweetHook(text) || safeHook(text)
  if (hook && hook.split(/\s+/).length <= 4) return hook
  return hook
}

/** Concrete nouns the reply must name: companies, products, quotes, numbers, punchline. */
export function extractAnchors(text: string): string[] {
  const t = text.replace(/https?:\/\/\S+/gi, '').trim()
  const out: string[] = []
  const seen = new Set<string>()
  const add = (raw: string) => {
    const c = cleanAnchor(raw)
    if (c.length < 2 || c.length > 40) return
    const key = c.toLowerCase()
    if (seen.has(key)) return
    if (/^(the|this|that|just|even|your|their|what|when|how|than|better|worse)$/i.test(c)) return
    seen.add(key)
    out.push(c)
  }
  for (const m of t.matchAll(/['"\u201c\u201d\u2018\u2019]([^'"\u201c\u201d\u2018\u2019]{2,40})['"\u201c\u201d\u2018\u2019]/g)) {
    add(m[1])
  }
  for (const m of t.matchAll(/\$[\d,.]+[kmb]?|\b\d+(?:\.\d+)?%|\b\d+k\s*mrr\b/gi)) add(m[0])
  const known = t.match(KNOWN_NAMES)
  if (known) for (const k of known) add(k)
  const words = t.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/[^a-zA-Z0-9']/g, '')
    if (i > 0 && /^[A-Z][a-zA-Z]{2,}$/.test(w) && !/^(The|This|That|Just|Even|When|What|How|Why)$/.test(w)) {
      add(w)
    }
  }
  const hook = safeHook(t)
  if (hook) add(hook)
  return out.slice(0, 5)
}

function shortProper(raw: string): string {
  const noQuotes = cleanAnchor(raw).replace(/['"\u201c\u201d\u2018\u2019]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!noQuotes) return ''
  const words = noQuotes.split(' ')
  if (/^(google|apple|meta|microsoft|amazon|openai)$/i.test(words[0])) {
    return words[0][0].toUpperCase() + words[0].slice(1).toLowerCase()
  }
  return words.slice(0, 2).join(' ')
}

export function parseComparison(text: string): { winner: string; loser: string; domain: string } {
  const t = text.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')
  const empty = { winner: '', loser: '', domain: '' }
  let m = t.match(/even\s+(.+?)\s+(?:are|is|can be|can)\s+better\s+at\s+(.+?)\s+than\s+(.+)/i)
  if (m) return { winner: cleanAnchor(m[1]), domain: cleanAnchor(m[2]), loser: cleanAnchor(m[3]) }
  m = t.match(/^(.+?)\s+(?:are|is)\s+better\s+at\s+(.+?)\s+than\s+(.+)/i)
  if (m) return { winner: cleanAnchor(m[1]), domain: cleanAnchor(m[2]), loser: cleanAnchor(m[3]) }
  m = t.match(/^(.+?)\s+(?:are|is)\s+(?:better|worse)\s+than\s+(.+)/i)
  if (m) return { winner: cleanAnchor(m[1]), domain: '', loser: cleanAnchor(m[2]) }
  m = t.match(/^(.+?)\s+beats?\s+(.+?)\s+at\s+(.+)/i)
  if (m) return { winner: cleanAnchor(m[1]), loser: cleanAnchor(m[2]), domain: cleanAnchor(m[3]) }
  return empty
}

/** Three claim-specific roast lines. Names the compared things. Never generic filler. */
export function roastRepliesFor(text: string): string[] {
  const { winner, loser, domain } = parseComparison(text)
  const loserName = shortProper(loser)
  const domainName = cleanAnchor(domain).replace(/['"\u201c\u201d\u2018\u2019]/g, '').trim()
  const lines: string[] = []
  if (loserName) {
    lines.push(`Which ${loserName} screen were you looking at when that hit?`)
  }
  const googleDesign = /google/i.test(loserName || text) && /design/i.test(domainName || text)
  if (googleDesign) {
    lines.push('Same. I keep opening Material and wondering who approved the empty states.')
  } else if (domainName && loserName) {
    lines.push(`Same. I keep opening ${loserName} ${domainName} and wondering who approved the empty states.`)
  } else if (loserName) {
    lines.push(`Same. I keep opening ${loserName} and wondering who approved the empty states.`)
  }
  if (domainName) {
    lines.push(`Curious which AI tool you think is actually beating their ${domainName} system right now.`)
  } else if (loserName) {
    lines.push(`Curious which AI tool you think is actually beating ${loserName} right now.`)
  } else if (winner) {
    lines.push(`Curious where you still see ${winner} winning day to day.`)
  }
  return lines
}

/** 3 lines that name a concrete thing from the tweet. Empty if nothing to name. */
export function claimSpecificReplies(text: string): string[] {
  const anchors = extractAnchors(text)
  const a = anchors[0] || lastMeaningfulChunk(text)
  if (!a) return []
  const b = anchors[1] && anchors[1].toLowerCase() !== a.toLowerCase() ? anchors[1] : ''
  const lines = [
    `Curious how ${a} showed up for you?`,
    b
      ? `Same. ${a} plus ${b} has been on my mind too. What tipped it?`
      : `Same. I keep bumping into ${a}. What would you change first?`,
    `Which part of ${a} do you want people to sit with?`,
  ]
  return lines
}

function moreClaimAngles(text: string): string[] {
  const a = extractAnchors(text)[0] || lastMeaningfulChunk(text)
  if (!a) {
    return [
      'What happened right before you wrote that?',
      'Curious what you want someone to do after reading it.',
      'Which bit of that is the part you keep turning over?',
    ]
  }
  return [
    `What happened the last time ${a} went well for you?`,
    `Curious what you'd tell someone just hitting ${a} for the first time.`,
    `Same. If you had another hour on ${a}, what would you try?`,
  ]
}

const TEMPLATES_QUESTION = [
  'Been chewing on that too. What did you land on after you tried it?',
  'Same question on my list. What would you try first if you had to pick today?',
  'Curious what pulled you toward that. Any signal that changed your mind?',
]

const TEMPLATES_SHIP = [
  'Nice get-it-out. What was the last thing you cut so it could ship?',
  'Love seeing it live. What felt ugliest but still had to go out?',
  'Congrats on the ship. What are you watching first to see if it sticks?',
]

const TEMPLATES_OPINION = [
  'Curious what the last generic suggestion you ignored was. Did skipping it work?',
  'Same instinct. What did you do instead the last time the usual advice felt off?',
  'That’s a real filter. When did going against the default last pay off for you?',
]

function uniqueReplies(lines: string[], tweet = ''): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const consider = (line: string) => {
    if (out.length >= SUGGESTED_REPLY_COUNT) return
    const clipped = clipReply(line)
    if (!clipped || looksDunky(clipped) || seen.has(clipped)) return
    if (isBannedFiller(clipped, tweet)) return
    if (hasClauseDash(clipped)) return
    seen.add(clipped)
    out.push(clipped)
  }
  for (const line of lines) consider(line)
  if (tweet) {
    for (const extra of claimSpecificReplies(tweet)) consider(extra)
    for (const extra of moreClaimAngles(tweet)) consider(extra)
    if (looksLikeShipOrExperiment(tweet)) {
      for (const extra of TEMPLATES_SHIP) consider(extra)
    }
  }
  for (const extra of [
    'Curious which line you want people to sit with?',
    'Same place. What made you post this today?',
    'Which bit of that is the part you keep turning over?',
  ]) {
    consider(extra)
  }
  return out.slice(0, SUGGESTED_REPLY_COUNT)
}

/** Three warm/curious template replies. First matches templateReplyFor. */
export function templateRepliesFor(text: string): string[] {
  const claim = claimSpecificReplies(text)
  const extra = moreClaimAngles(text)
  let primary: string[]
  if (looksLikeRoast(text)) primary = [...roastRepliesFor(text), ...claim]
  else if (looksLikeQuestion(text)) primary = [...claim, ...TEMPLATES_QUESTION]
  else if (looksLikeShipOrExperiment(text)) primary = [...TEMPLATES_SHIP, ...claim]
  else if (looksLikeOpinion(text)) primary = [...TEMPLATES_OPINION, ...claim]
  else primary = [...claim]

  const out = uniqueReplies([...primary, ...extra], text)
  if (out.length >= SUGGESTED_REPLY_COUNT) return out
  // Last resort: still 3 distinct curious lines, never "this landed" / experiment filler.
  const pad = [
    'Curious which line you want people to sit with?',
    'Same place. What made you post this today?',
    'Which bit of that is the part you keep turning over?',
  ]
  return uniqueReplies([...out, ...pad], text)
}

export function templateReplyFor(text: string): string {
  return templateRepliesFor(text)[0] || TEMPLATE_REPLY
}

/** Prefer a fast AI line as #1 when we already have it; fill the rest from templates. */
export function repliesForTweet(text: string, aiReply?: string): string[] {
  const templates = templateRepliesFor(text)
  const clipped = aiReply ? clipReply(aiReply) : ''
  const first =
    clipped && looksLikeReply(clipped) && !looksDunky(clipped) && !isBannedFiller(clipped, text)
      ? clipped
      : ''
  if (!first) return templates
  const rest = templates.filter((t) => t !== first)
  return [first, ...rest].slice(0, SUGGESTED_REPLY_COUNT)
}

const DUNKY_RE =
  /\b(don'?t worry|that'?s not cool|i have better things|actually that'?s basic|that'?s basic|skill issue|um actually|nobody asked|hot take|great post|this is gold|this is fire|overrated|you'?re wrong|that'?s not how|not a real|rookie move|too easy|too trivial|ai takes are|cope\b)\b/i

export function looksDunky(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (DUNKY_RE.test(t)) return true
  if (/🔥/.test(t) && t.length < 48) return true
  if (/^(nah|nope|wrong|lol|lmao)\b/i.test(t)) return true
  return false
}

export function templateReplies(tweets: Array<{ text: string }> | number): string[] {
  if (typeof tweets === 'number') return Array.from({ length: tweets }, () => TEMPLATE_REPLY)
  return tweets.map((t) => templateReplyFor(t.text))
}

async function suggestWithAi(
  ai: AiBinding,
  tweets: RadarTweet[],
  voice: string,
): Promise<string[] | null> {
  if (tweets.length === 0) return []
  const voiceLine = voice.trim().slice(0, 200) || 'short, direct, ship-in-public'
  const user = [
    'These people are favorite builders. Replies should build the relationship, not dunk.',
    'Engage each tweet’s actual claim. Name a concrete noun from it. Not a list opener or the first 4 words.',
    'Never write “this landed”. Never use em dashes, en dashes, or space-hyphen-space. Never ask “how are you testing that” about a fragment.',
    `Voice (tone only): ${voiceLine}`,
    'Tweets:',
    ...tweets.map((t, i) => `${i + 1}. @${t.handle}: ${t.text.slice(0, 280)}`),
  ].join('\n')

  const result = await ai.run(AI_MODEL, {
    messages: [
      { role: 'system', content: RADAR_REPLY_SYSTEM },
      { role: 'user', content: user },
    ],
    max_tokens: 700,
    temperature: 0.45,
  })
  const raw = aiResponseText(result)
  const arr = extractJsonArray(raw) || extractNumberedReplies(raw, tweets.length)
  if (!arr || arr.length === 0) return null
  const out: string[] = []
  for (let i = 0; i < tweets.length; i++) {
    const item = arr[i]
    const text = typeof item === 'string' ? item : asString(asRecord(item)?.text)
    const clipped = clipReply(text)
    const bad = !clipped || looksDunky(clipped) || !looksLikeReply(clipped) || isBannedFiller(clipped, tweets[i].text)
    out.push(bad ? templateReplyFor(tweets[i].text) : clipped)
  }
  if (out.some((t) => !looksLikeReply(t) || looksDunky(t))) return null
  return out
}

function looksLikeReply(text: string): boolean {
  const t = text.trim()
  if (t.length < 12 || t.length > REPLY_MAX_CHARS) return false
  if (/^(here are|replies?:|json|output|tweets?:|sure[,.]?|okay[,.]?)/i.test(t)) return false
  if (/\b(?:Building|Goal|Who|Voice)\s*:/i.test(t)) return false
  if (/\bthis landed\b/i.test(t)) return false
  if (hasClauseDash(t)) return false
  if (looksDunky(t)) return false
  return true
}

function extractNumberedReplies(raw: string, count: number): string[] | null {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:[-*]\s+|\d+[.)]\s+)/, '').trim())
    .map((l) => tidyReply(l))
    .filter((l) => l && !/^```/.test(l) && looksLikeReply(l))
  if (lines.length !== count) return null
  return lines
}

export async function suggestReplies(
  ai: AiBinding | undefined | null,
  tweets: RadarTweet[],
  voice: string,
): Promise<string[]> {
  const fallback = templateReplies(tweets)
  if (!ai || typeof ai.run !== 'function' || tweets.length === 0) return fallback
  try {
    const got = await suggestWithAi(ai, tweets, voice)
    if (got && got.length === tweets.length) return got
    if (got && got.length > 0) {
      return tweets.map((t, i) => got[i] || templateReplyFor(t.text))
    }
  } catch {
    /* fail silent */
  }
  return fallback
}

export async function suggestRepliesWithBudget(
  ai: AiBinding | undefined | null,
  tweets: RadarTweet[],
  voice: string,
  budgetMs = AI_REPLY_BUDGET_MS,
): Promise<string[]> {
  const fallback = templateReplies(tweets)
  if (!ai || typeof ai.run !== 'function' || tweets.length === 0) return fallback
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timed = new Promise<string[]>((resolve) => {
      timer = setTimeout(() => resolve(fallback), budgetMs)
    })
    return await Promise.race([suggestReplies(ai, tweets, voice), timed])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const MORE_REPLIES_SYSTEM = [
  'You write 3 short X replies for an indie founder talking to a favorite builder they want rapport with.',
  'GOAL: Warm, curious, specific to THAT tweet. Build the relationship. Never dunk, contradict, or one-up.',
  'Return ONLY a JSON array of exactly 3 strings.',
  'Each reply: ≤180 characters, first person, peer builder (not a critic, not a fanboy).',
  'Engage the actual claim. Name a concrete noun from the tweet. Never quote a list opener like “#2 advice to grow” or ask “how are you testing that” about a fragment.',
  'The 3 replies must be distinct angles (a question, a same-muscle bridge, a humble ship note).',
  'No guru speak. No Setup field dumps. Voice is tone only. Do not quote it.',
  'Never write “this landed”. Never use em dashes, en dashes, or space-hyphen-space as a clause break.',
  "DON'T: sarcasm, dunks, fanboy praise, generic “great post”.",
].join('\n')

export async function generateMoreReplies(
  ai: AiBinding | undefined | null,
  input: { text: string; handle?: string; voice?: string; avoid?: string[] },
): Promise<{ replies: string[]; source: 'ai' | 'template' }> {
  const text = (input.text || '').trim()
  const avoid = new Set(
    (input.avoid ?? []).map((s) => clipReply(String(s))).filter((s) => s && s !== TEMPLATE_REPLY),
  )
  const templates = templateRepliesFor(text).filter((t) => !avoid.has(t))
  const fallback = uniqueReplies([...templates, ...claimSpecificReplies(text), ...moreClaimAngles(text)], text)

  if (!text || !ai || typeof ai.run !== 'function') {
    return { replies: fallback, source: 'template' }
  }

  try {
    const voiceLine = (input.voice || '').trim().slice(0, 200) || 'short, direct, ship-in-public'
    const handle = (input.handle || '').replace(/^@+/, '').trim()
    const user = [
      'Write 3 distinct short X replies to this one tweet. Return a JSON array of 3 strings.',
      'Engage the actual claim. Name a concrete noun. Never write “this landed”. No em/en dashes or space-hyphen-space.',
      `Voice (tone only): ${voiceLine}`,
      handle ? `Author: @${handle}` : '',
      `Tweet: ${text.slice(0, 500)}`,
      avoid.size
        ? `Do not repeat these:\n${[...avoid].slice(0, 8).map((a) => `- ${a}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const result = await ai.run(AI_MODEL, {
      messages: [
        { role: 'system', content: MORE_REPLIES_SYSTEM },
        { role: 'user', content: user },
      ],
      max_tokens: 400,
      temperature: 0.7,
    })
    const raw = aiResponseText(result)
    const arr = extractJsonArray(raw) || extractNumberedReplies(raw, 3)
    const cleaned: string[] = []
    const seen = new Set<string>()
    if (arr) {
      for (const item of arr) {
        const s = typeof item === 'string' ? item : asString(asRecord(item)?.text)
        const clipped = clipReply(s)
        if (
          !clipped ||
          !looksLikeReply(clipped) ||
          looksDunky(clipped) ||
          isBannedFiller(clipped, text) ||
          avoid.has(clipped) ||
          seen.has(clipped)
        ) {
          continue
        }
        seen.add(clipped)
        cleaned.push(clipped)
        if (cleaned.length >= SUGGESTED_REPLY_COUNT) break
      }
    }
    if (cleaned.length >= SUGGESTED_REPLY_COUNT) {
      return { replies: cleaned.slice(0, SUGGESTED_REPLY_COUNT), source: 'ai' }
    }
    const padded = uniqueReplies([...cleaned, ...templates, ...claimSpecificReplies(text), ...moreClaimAngles(text)], text)
    return { replies: padded, source: cleaned.length > 0 ? 'ai' : 'template' }
  } catch {
    return { replies: fallback, source: 'template' }
  }
}


function cacheKey(handle: string): string {
  return `t${REPLY_TONE_VERSION}:p${RADAR_PAYLOAD_VERSION}:${handle}`
}

function tweetFromCache(rec: Record<string, unknown>, fallbackHandle: string): RadarTweet | null {
  const tweetId = asString(rec.tweetId)
  const text = asString(rec.text)
  const h = validHandle(asString(rec.handle)) || fallbackHandle
  if (!tweetId || !text) return null
  const mediaRaw = Array.isArray(rec.media) ? rec.media : []
  const media: RadarMedia[] = []
  const seen = new Set<string>()
  for (const item of mediaRaw) {
    const parsed = parseMediaItem(item)
    if (!parsed || seen.has(parsed.url)) continue
    seen.add(parsed.url)
    media.push(parsed)
  }
  return {
    handle: h,
    tweetId,
    text,
    url: asString(rec.url) || `https://x.com/${h}/status/${tweetId}`,
    createdAt: asString(rec.createdAt) || new Date().toISOString(),
    displayName: asString(rec.displayName) || h,
    avatarUrl: httpsUrl(rec.avatarUrl),
    media,
    likes: asCount(rec.likes),
    reposts: asCount(rec.reposts),
    replies: asCount(rec.replies),
  }
}

async function readCache(
  db: D1Database,
  handle: string,
): Promise<{ tweets: RadarTweet[]; fetchedAt: string } | null> {
  try {
    const row = await db
      .prepare('SELECT payload, fetched_at FROM radar_cache WHERE handle = ?')
      .bind(cacheKey(handle))
      .first<{ payload: string; fetched_at: string }>()
    if (!row?.payload) return null
    const parsed = JSON.parse(row.payload) as unknown
    if (!Array.isArray(parsed)) return null
    const tweets: RadarTweet[] = []
    for (const item of parsed) {
      const rec = asRecord(item)
      if (!rec) continue
      const tweet = tweetFromCache(rec, handle)
      if (tweet) tweets.push(tweet)
    }
    return { tweets, fetchedAt: row.fetched_at }
  } catch {
    return null
  }
}

async function writeCache(db: D1Database, handle: string, tweets: RadarTweet[]): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO radar_cache (handle, payload, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(handle) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
      )
      .bind(cacheKey(handle), JSON.stringify(tweets), new Date().toISOString())
      .run()
  } catch {
    /* table may not exist yet */
  }
}

function cacheFresh(fetchedAt: string, now: number): boolean {
  const t = Date.parse(fetchedAt)
  if (!Number.isFinite(t)) return false
  return now - t < RADAR_CACHE_TTL_MS
}

function emptyRadar(): RadarResult {
  return {
    items: [],
    stale: false,
    error: null,
    toneVersion: REPLY_TONE_VERSION,
    pendingHandles: [],
    cached: false,
  }
}

function assembleTweets(perHandle: RadarTweet[][]): RadarTweet[] {
  const itemsTweets: RadarTweet[] = []
  const seen = new Set<string>()
  // Round-robin so one loud account doesn't fill the list.
  let added = true
  let slot = 0
  while (added && itemsTweets.length < RADAR_MAX_ITEMS) {
    added = false
    for (const list of perHandle) {
      const t = list[slot]
      if (!t) continue
      const key = `${t.handle}:${t.tweetId}`
      if (seen.has(key)) continue
      seen.add(key)
      itemsTweets.push(t)
      added = true
      if (itemsTweets.length >= RADAR_MAX_ITEMS) break
    }
    slot += 1
  }
  itemsTweets.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return itemsTweets
}

export async function buildRadar(
  env: { DB: D1Database; AI?: AiBinding },
  handles: string[],
  voice: string,
  force: boolean,
  opts?: { fast?: boolean },
): Promise<RadarResult> {
  const unique = capHandles(handles)
  if (unique.length === 0) return emptyRadar()

  const now = Date.now()
  const fast = Boolean(opts?.fast)

  const caches = await Promise.all(
    unique.map(async (handle) => {
      const cached = await readCache(env.DB, handle)
      const fresh = Boolean(cached && cacheFresh(cached.fetchedAt, now))
      return { handle, cached, fresh }
    }),
  )

  const pendingHandles = caches
    .filter(({ cached, fresh }) => force || !fresh || !cached || cached.tweets.length === 0)
    .map((c) => c.handle)

  const fetched = await Promise.all(
    caches.map(async ({ handle, cached, fresh }) => {
      if (fast) {
        if (cached && cached.tweets.length > 0) {
          return { tweets: cached.tweets, stale: !fresh, error: false, fromCache: true }
        }
        return { tweets: [] as RadarTweet[], stale: false, error: false, fromCache: false }
      }
      if (cached && fresh && !force) {
        return { tweets: cached.tweets, stale: false, error: false, fromCache: true }
      }
      try {
        const live = await fetchPublicTweets(handle)
        if (live.length > 0) {
          await writeCache(env.DB, handle, live)
          return { tweets: live, stale: false, error: false, fromCache: false }
        }
      } catch {
        /* fail silent per-handle */
      }
      if (cached && cached.tweets.length > 0) {
        return { tweets: cached.tweets, stale: true, error: false, fromCache: true }
      }
      return { tweets: [] as RadarTweet[], stale: false, error: true, fromCache: false }
    }),
  )

  const stale = fetched.some((f) => f.stale)
  const anyError = fetched.some((f) => f.error)
  const itemsTweets = assembleTweets(fetched.map((f) => f.tweets))
  const allFromCache = fetched.every((f) => f.fromCache || f.tweets.length === 0)
  const skipAi = fast || allFromCache
  const aiReplies = skipAi ? [] : await suggestRepliesWithBudget(env.AI, itemsTweets, voice)
  const items: RadarItem[] = itemsTweets.map((t, i) => {
    const suggestedReplies = repliesForTweet(t.text, aiReplies[i])
    return {
      ...t,
      suggestedReply: suggestedReplies[0] || TEMPLATE_REPLY,
      suggestedReplies,
    }
  })

  const error =
    items.length === 0 && anyError ? 'fetch_failed' : items.length === 0 && unique.length > 0 ? 'empty' : null

  return {
    items,
    stale,
    error,
    toneVersion: REPLY_TONE_VERSION,
    pendingHandles: fast ? pendingHandles : [],
    cached: allFromCache && items.length > 0,
  }
}

/** favoriteBuilders from the active project in app_state JSON. */
export function favoriteHandlesFromState(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const state = JSON.parse(value) as {
      setup?: {
        activeProjectId?: string
        projects?: Array<{ id?: string; favoriteBuilders?: unknown }>
      }
    }
    const projects = state.setup?.projects ?? []
    const active =
      projects.find((p) => p.id && p.id === state.setup?.activeProjectId) ?? projects[0]
    return capHandles(active?.favoriteBuilders)
  } catch {
    return []
  }
}

export type PreviewPost = {
  text: string
  createdAt: string
  mediaUrl?: string
}

export function tweetsToPreview(tweets: RadarTweet[], max = 3): PreviewPost[] {
  const out: PreviewPost[] = []
  for (const t of tweets) {
    if (out.length >= max) break
    const first = t.media[0]
    const mediaUrl = first ? first.thumbnailUrl || first.url : ''
    out.push({
      text: t.text,
      createdAt: t.createdAt,
      ...(mediaUrl ? { mediaUrl } : {}),
    })
  }
  return out
}

/** Public tweets for one handle — shares radar_cache (~20 min). */
export async function getHandleTweets(db: D1Database, handleRaw: string): Promise<RadarTweet[]> {
  const handle = validHandle(handleRaw)
  if (!handle) return []
  const now = Date.now()
  const cached = await readCache(db, handle)
  if (cached && cacheFresh(cached.fetchedAt, now)) return cached.tweets
  try {
    const live = await fetchPublicTweets(handle)
    if (live.length > 0) {
      await writeCache(db, handle, live)
      return live
    }
  } catch {
    /* fail soft */
  }
  if (cached && cached.tweets.length > 0) return cached.tweets
  return []
}

