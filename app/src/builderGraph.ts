import { normalizeHandle } from './types'

export type BuilderSuggestion = {
  handle: string
  why: string
}

/**
 * Curated indie-hacker / vibe-coder cluster around Marc Lou.
 * Static on purpose — not an algorithm. Edit this list anytime.
 * Handles are real public X accounts (no @ prefix in this file).
 */
export const BUILDER_GRAPH: BuilderSuggestion[] = [
  { handle: 'marclou', why: 'daily ship receipts and solo MRR' },
  { handle: 'levelsio', why: 'ships in public, posts the numbers' },
  { handle: 'tibo_maker', why: 'indie SaaS portfolio, growth receipts' },
  { handle: 'tdinh_me', why: 'indie MRR from tools he actually uses' },
  { handle: 'damengchen', why: 'bootstrapped SaaS, build in public' },
  { handle: 'marckohlbrugge', why: 'ships maker tools most days' },
  { handle: 'arvidkahl', why: 'bootstrapped exit, still building in public' },
  { handle: 'dvassallo', why: 'small bets, no guru speak' },
  { handle: 'yongfook', why: 'bootstrapped SaaS, posts the MRR' },
  { handle: 'dannypostmaa', why: 'indie AI SaaS, ships in public' },
  { handle: 'nico_jeannen', why: 'ships indie products, posts the receipts' },
  { handle: 'bentossell', why: 'Makerpad exit, still building in public' },
  { handle: 'thekitze', why: 'indie dev tools, vibe-codes in public' },
  { handle: 'thepatwalls', why: 'Starter Story, interviews that ship' },
  { handle: 'mijustin', why: 'bootstrapped Transistor, posts the numbers' },
  { handle: 'pketh', why: 'ships Kinopio, maker tools' },
  { handle: 'robhope', why: 'One Page Love, ships maker tools' },
  { handle: 'tylertringas', why: 'bootstrapped SaaS, calm company receipts' },
  { handle: 'flaviocopes', why: 'indie courses and tools, ships in public' },
  { handle: 'csallen', why: 'Indie Hackers founder, still in the room' },
  { handle: 'dinkydani21', why: 'bootstrapped Leave Me Alone, ships in public' },
]

export const MARCLOU_HANDLE = '@marclou'
export const SUGGEST_LIMIT = 8

export function handleKey(raw: string): string {
  return normalizeHandle(raw).toLowerCase()
}

/** Suggestions not already in this project's favorites. Omit limit for the full list. */
export function suggestionsLikeFavorites(
  favoriteBuilders: string[],
  limit?: number,
): BuilderSuggestion[] {
  const have = new Set(favoriteBuilders.map(handleKey).filter(Boolean))
  const list = BUILDER_GRAPH.filter((b) => !have.has(handleKey(b.handle)))
  return typeof limit === 'number' ? list.slice(0, limit) : list
}

export function suggestionsTitle(favoriteBuilders: string[]): string {
  const have = favoriteBuilders.map(handleKey).filter(Boolean)
  const hasMarclou = have.includes(handleKey(MARCLOU_HANDLE))
  if (hasMarclou || have.length === 0) return 'Builders like @marclou'
  return 'Builders like your favorites'
}

export function xProfileUrl(handle: string): string {
  const h = handle.replace(/^@+/, '')
  return `https://x.com/${h}`
}

export function displayHandle(handle: string): string {
  return normalizeHandle(handle)
}
