/** X weighs each URL as a t.co link (~23 chars). */
const TCO_LEN = 23
export const X_LIMIT = 280
/** Soft target — leave headroom; X weighs links ~23. */
export const SOFT_LIMIT = 250
/** Ideal punch length for Marc Lou–style posts. */
export const TARGET_MAX = 220

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

export function isShortEnough(text: string, limit = X_LIMIT): boolean {
  return xLength(text) <= limit
}

export { TCO_LEN }
