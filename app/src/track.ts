import { API_URL, getToken } from './api'

export type TrackEventName =
  | 'session_login'
  | 'setup_saved'
  | 'journal_saved'
  | 'drafts_generated'
  | 'draft_copied'
  | 'draft_saved_for_later'
  | 'draft_marked_posted'
  | 'reply_copied'
  | 'reply_handle_clicked'
  | 'reply_radar_refreshed'
  | 'x_followers_refreshed'
  | 'x_connected'
  | 'x_posted'
  | 'x_replied'
  | 'x_reply_intent'

export type TrackProps = Record<string, string | number | boolean | null | undefined>

const LOCAL_KEY = 'shiploud-events-local-v1'

type LocalBucket = { t: number; name: string; n?: number }

function bumpLocal(name: TrackEventName, props?: TrackProps): void {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const list: LocalBucket[] = raw ? (JSON.parse(raw) as LocalBucket[]) : []
    const now = Date.now()
    const cutoff = now - 7 * 24 * 60 * 60 * 1000
    const kept = list.filter((e) => e.t >= cutoff)
    const n =
      name === 'drafts_generated' && typeof props?.count === 'number'
        ? props.count
        : 1
    kept.push({ t: now, name, n })
    localStorage.setItem(LOCAL_KEY, JSON.stringify(kept.slice(-500)))
  } catch {
    /* ignore */
  }
}

/** Count one event name since local midnight. */
export function localEventToday(name: TrackEventName): number {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const list: LocalBucket[] = raw ? (JSON.parse(raw) as LocalBucket[]) : []
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const cutoff = start.getTime()
    let n = 0
    for (const e of list) {
      if (e.t < cutoff || e.name !== name) continue
      n += typeof e.n === 'number' ? e.n : 1
    }
    return n
  } catch {
    return 0
  }
}

/** Local last-7-days counts (fire-and-forget mirror of track). */
export function localEventCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const list: LocalBucket[] = raw ? (JSON.parse(raw) as LocalBucket[]) : []
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const counts: Record<string, number> = {}
    for (const e of list) {
      if (e.t < cutoff) continue
      counts[e.name] = (counts[e.name] ?? 0) + (typeof e.n === 'number' ? e.n : 1)
    }
    return counts
  } catch {
    return {}
  }
}

/** Fire-and-forget product analytics. Never throws; never blocks UX. */
export function track(name: TrackEventName, props?: TrackProps): void {
  try {
    bumpLocal(name, props)
    if (!API_URL) return
    const token = getToken()
    if (!token) return
    const body: { name: string; props?: Record<string, string | number | boolean | null> } = {
      name,
    }
    if (props) {
      const clean: Record<string, string | number | boolean | null> = {}
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined) continue
        clean[k] = v
      }
      if (Object.keys(clean).length > 0) body.props = clean
    }
    void fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      /* fail silent */
    })
  } catch {
    /* fail silent */
  }
}
