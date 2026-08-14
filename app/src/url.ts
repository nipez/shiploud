/** Canonical marketing / product URL for ShipLoud (no trailing slash). */
export const CANONICAL_SHIPLOUD_URL = 'https://www.getshiploud.com'

/** Known Cloudflare Pages preview hosts for this product (not other *.pages.dev). */
const SHIPLOUD_PAGES_HOST_RE = /(?:shiploud|shiploud-app)\.pages\.dev/i

/** Full http(s) ShipLoud pages.dev URLs including optional path/query/hash. */
const SHIPLOUD_PAGES_URL_RE =
  /https?:\/\/(?:www\.)?(?:shiploud|shiploud-app)\.pages\.dev[^\s]*/gi

/** Bare host mentions (no scheme), e.g. "waitlist at shiploud.pages.dev". */
const SHIPLOUD_PAGES_BARE_RE =
  /(?<![\w.-/])(?:shiploud|shiploud-app)\.pages\.dev[^\s]*/gi

/** True when the string mentions ShipLoud's pages.dev hosts. */
export function isShipLoudPagesDev(text: string): boolean {
  return Boolean(text && SHIPLOUD_PAGES_HOST_RE.test(text))
}

/** Strip trailing slashes (canonical form has none). */
export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Rewrite ShipLoud pages.dev links/hosts to a custom domain (default: www.getshiploud.com).
 * Leaves unrelated URLs alone.
 */
export function rewritePagesDevUrls(
  text: string,
  replacement: string = CANONICAL_SHIPLOUD_URL,
): string {
  if (!text || !SHIPLOUD_PAGES_HOST_RE.test(text)) return text
  const canon = stripTrailingSlash(replacement.trim() || CANONICAL_SHIPLOUD_URL)
  return text
    .replace(SHIPLOUD_PAGES_URL_RE, canon)
    .replace(SHIPLOUD_PAGES_BARE_RE, canon)
}

/** Normalize a user/seed URL to a real https href, or '' if empty/invalid. */
export function ensureHttps(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^https:\/\//i.test(t)) return t
  if (/^http:\/\//i.test(t)) return t.replace(/^http:\/\//i, 'https://')
  if (/^x\.com\//i.test(t) || /^twitter\.com\//i.test(t)) return `https://${t}`
  if (t.startsWith('//')) return `https:${t}`
  // bare path or host without scheme
  if (/^[\w.-]+\.\w{2,}/.test(t)) return `https://${t}`
  return ''
}

/** Extract a tweet/status id from an x.com or twitter.com status URL. */
export function tweetIdFromUrl(raw: string): string {
  const href = ensureHttps(raw)
  if (!href) return ''
  try {
    const u = new URL(href)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    if (host !== 'x.com' && host !== 'twitter.com') return ''
    const m = u.pathname.match(/\/status\/(\d{5,32})(?:\/|$)/i)
    return m?.[1] ?? ''
  } catch {
    return ''
  }
}

/** Web intent to compose a reply on x.com (human click — not the API). */
export function xReplyIntentUrl(tweetId: string, draft: string): string {
  const id = (tweetId || '').trim()
  return `https://x.com/intent/post?in_reply_to=${id}&text=${encodeURIComponent(draft)}`
}

/** Older compose intent, if /intent/post is unavailable. */
export function xReplyIntentUrlFallback(tweetId: string, draft: string): string {
  const id = (tweetId || '').trim()
  return `https://x.com/intent/tweet?in_reply_to=${id}&text=${encodeURIComponent(draft)}`
}
