export type RadarIntent = 'all' | 'launches' | 'numbers' | 'blockers' | 'asks'

export const RADAR_INTENTS: { id: RadarIntent; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'launches', label: 'Launches' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'blockers', label: 'Blockers' },
  { id: 'asks', label: 'Asks' },
]

/** Classify a public post so radar can filter by intent. One post can match several. */
export function tweetMatchesIntent(text: string, intent: RadarIntent): boolean {
  if (intent === 'all') return true
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (intent === 'asks') {
    return (
      /\?/.test(t) ||
      /\b(anyone|looking for|recommend|how do (you|i)|what would|help me|can you|should i)\b/i.test(t)
    )
  }
  if (intent === 'numbers') {
    return /(?:\$[\d.,]+|\b\d+\s*%|\b(?:mrr|arr|followers|users|waitlist|revenue|signups?)\b)/i.test(t)
  }
  if (intent === 'blockers') {
    return /\b(blocked|blocker|stuck|failed|broke|broken|bug|lesson|didn't work|did not work|regressed|outage)\b/i.test(
      t,
    )
  }
  return /\b(shipped|shipping|launched|launch|went live|released|live at|mvp|ship it|just shipped)\b/i.test(t)
}
