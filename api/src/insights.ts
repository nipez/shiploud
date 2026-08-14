export type InsightsRangeKey = '7d' | '30d' | 'all'

export type InsightsPayload = {
  range: { key: InsightsRangeKey; since: string | null; label: string }
  generated_at: string
  kpis: {
    waitlist: number
    users: number
    active_users: number
    invites_created: number
    invites_used: number
    events: number
    session_login: number
    journal_saved: number
    drafts_generated: number
    draft_copied: number
    x_posted: number
    x_replied: number
  }
  waitlist: { email: string; source: string; created_at: string }[]
  waitlist_by_source: { source: string; count: number }[]
  waitlist_by_day: { day: string; count: number }[]
  users: {
    id: string
    email: string
    display_name: string | null
    role: string
    created_at: string
  }[]
  invites: {
    code: string
    created_at: string
    used_at: string | null
    created_by_email: string | null
    created_by_name: string | null
    used_by_email: string | null
    used_by_name: string | null
  }[]
  events_by_name: { name: string; count: number }[]
  events_by_day: { day: string; count: number }[]
  funnel: { name: string; label: string; count: number }[]
  snapshots: {
    handle: string
    followers: number
    following: number | null
    posts_count: number | null
    checked_at: string
    source: string
  }[]
}

const FUNNEL: { name: string; label: string }[] = [
  { name: 'session_login', label: 'Sessions started' },
  { name: 'setup_saved', label: 'Setup saved' },
  { name: 'journal_saved', label: 'Journals saved' },
  { name: 'drafts_generated', label: 'Drafts generated' },
  { name: 'draft_copied', label: 'Drafts copied' },
  { name: 'draft_saved_for_later', label: 'Saved for later' },
  { name: 'draft_marked_posted', label: 'Marked posted' },
  { name: 'x_posted', label: 'Posted to X' },
  { name: 'reply_copied', label: 'Replies copied' },
  { name: 'reply_handle_clicked', label: 'Reply on X clicked' },
  { name: 'x_replied', label: 'Replies posted' },
]

type CountRow = { count: number }
type NameCountRow = { name: string; count: number }
type SourceCountRow = { source: string | null; count: number }
type DayCountRow = { day: string; count: number }
type WaitlistRow = { email: string; source: string | null; created_at: string }
type UserListRow = {
  id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
}
type InviteListRow = {
  code: string
  created_at: string
  used_at: string | null
  created_by_email: string | null
  created_by_name: string | null
  used_by_email: string | null
  used_by_name: string | null
}
type SnapshotRow = {
  handle: string
  followers: number
  following: number | null
  posts_count: number | null
  checked_at: string
  source: string
}

function parseRange(raw: string | null): InsightsPayload['range'] {
  const key: InsightsRangeKey = raw === '7d' || raw === '30d' || raw === 'all' ? raw : 'all'
  if (key === '7d') {
    return {
      key,
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      label: 'Last 7 days',
    }
  }
  if (key === '30d') {
    return {
      key,
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      label: 'Last 30 days',
    }
  }
  return { key: 'all', since: null, label: 'All time' }
}

function num(value: unknown): number {
  return Number(value) || 0
}

function countOf(result: D1Result<CountRow> | undefined): number {
  return num(result?.results?.[0]?.count)
}

function eventCount(rows: NameCountRow[], name: string): number {
  return num(rows.find((r) => r.name === name)?.count)
}

function fillDays(rows: DayCountRow[], since: string | null): DayCountRow[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    if (!row.day) continue
    map.set(row.day, num(row.count))
  }
  const keys = [...map.keys()].sort()
  const end = new Date()
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  let startUtc: number
  if (since) {
    const s = new Date(since)
    startUtc = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate())
  } else if (keys.length > 0) {
    const [y, m, d] = keys[0].split('-').map(Number)
    startUtc = Date.UTC(y, m - 1, d)
  } else {
    return []
  }
  const out: DayCountRow[] = []
  for (let t = startUtc; t <= endUtc; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10)
    out.push({ day, count: map.get(day) || 0 })
  }
  return out
}

function stmt(db: D1Database, sql: string, since: string | null): D1PreparedStatement {
  const prepared = db.prepare(sql)
  return since ? prepared.bind(since) : prepared
}

export async function loadInsights(db: D1Database, rangeParam: string | null): Promise<InsightsPayload> {
  const range = parseRange(rangeParam)
  const since = range.since
  const where = since ? 'WHERE created_at >= ?' : ''
  const eventWhere = since ? 'WHERE created_at >= ?' : ''
  const eventUserWhere = since
    ? 'WHERE user_id IS NOT NULL AND created_at >= ?'
    : 'WHERE user_id IS NOT NULL'
  const inviteUsedWhere = since ? 'WHERE used_at IS NOT NULL AND used_at >= ?' : 'WHERE used_at IS NOT NULL'

  const batch = await db.batch([
    stmt(db, `SELECT COUNT(*) AS count FROM waitlist ${where}`, since),
    stmt(db, `SELECT email, source, created_at FROM waitlist ${where} ORDER BY created_at DESC`, since),
    stmt(
      db,
      `SELECT COALESCE(NULLIF(TRIM(source), ''), 'marketing') AS source, COUNT(*) AS count
       FROM waitlist ${where}
       GROUP BY 1
       ORDER BY count DESC`,
      since,
    ),
    stmt(
      db,
      `SELECT date(created_at) AS day, COUNT(*) AS count
       FROM waitlist ${where}
       GROUP BY 1
       ORDER BY 1 ASC`,
      since,
    ),
    stmt(db, `SELECT COUNT(*) AS count FROM users ${where}`, since),
    stmt(
      db,
      `SELECT id, email, display_name, role, created_at
       FROM users ${where}
       ORDER BY created_at DESC`,
      since,
    ),
    stmt(db, `SELECT COUNT(*) AS count FROM invites ${where}`, since),
    stmt(db, `SELECT COUNT(*) AS count FROM invites ${inviteUsedWhere}`, since),
    stmt(
      db,
      `SELECT i.code, i.created_at, i.used_at,
              cu.email AS created_by_email, cu.display_name AS created_by_name,
              uu.email AS used_by_email, uu.display_name AS used_by_name
       FROM invites i
       LEFT JOIN users cu ON cu.id = i.created_by
       LEFT JOIN users uu ON uu.id = i.used_by
       ${since ? 'WHERE i.created_at >= ?' : ''}
       ORDER BY i.created_at DESC`,
      since,
    ),
    stmt(db, `SELECT COUNT(*) AS count FROM events ${eventWhere}`, since),
    stmt(db, `SELECT COUNT(DISTINCT user_id) AS count FROM events ${eventUserWhere}`, since),
    stmt(
      db,
      `SELECT name, COUNT(*) AS count
       FROM events ${eventWhere}
       GROUP BY name
       ORDER BY count DESC`,
      since,
    ),
    stmt(
      db,
      `SELECT date(created_at) AS day, COUNT(*) AS count
       FROM events ${eventWhere}
       GROUP BY 1
       ORDER BY 1 ASC`,
      since,
    ),
    db.prepare(
      `SELECT handle, followers, following, posts_count, checked_at, source
       FROM (
         SELECT handle, followers, following, posts_count, checked_at, source,
                ROW_NUMBER() OVER (PARTITION BY handle ORDER BY checked_at DESC) AS rn
         FROM x_snapshots
       )
       WHERE rn = 1
       ORDER BY followers DESC`,
    ),
  ])

  const waitlistRows = (batch[1]?.results ?? []) as WaitlistRow[]
  const waitlistBySource = ((batch[2]?.results ?? []) as SourceCountRow[]).map((r) => ({
    source: r.source || 'marketing',
    count: num(r.count),
  }))
  const users = ((batch[5]?.results ?? []) as UserListRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    display_name: r.display_name,
    role: r.role,
    created_at: r.created_at,
  }))
  const invites = ((batch[8]?.results ?? []) as InviteListRow[]).map((r) => ({
    code: r.code,
    created_at: r.created_at,
    used_at: r.used_at,
    created_by_email: r.created_by_email,
    created_by_name: r.created_by_name,
    used_by_email: r.used_by_email,
    used_by_name: r.used_by_name,
  }))
  const eventsByName = ((batch[11]?.results ?? []) as NameCountRow[]).map((r) => ({
    name: r.name,
    count: num(r.count),
  }))
  const snapshots = ((batch[13]?.results ?? []) as SnapshotRow[]).map((r) => ({
    handle: r.handle,
    followers: num(r.followers),
    following: r.following == null ? null : num(r.following),
    posts_count: r.posts_count == null ? null : num(r.posts_count),
    checked_at: r.checked_at,
    source: r.source,
  }))

  return {
    range,
    generated_at: new Date().toISOString(),
    kpis: {
      waitlist: countOf(batch[0] as D1Result<CountRow>),
      users: countOf(batch[4] as D1Result<CountRow>),
      active_users: countOf(batch[10] as D1Result<CountRow>),
      invites_created: countOf(batch[6] as D1Result<CountRow>),
      invites_used: countOf(batch[7] as D1Result<CountRow>),
      events: countOf(batch[9] as D1Result<CountRow>),
      session_login: eventCount(eventsByName, 'session_login'),
      journal_saved: eventCount(eventsByName, 'journal_saved'),
      drafts_generated: eventCount(eventsByName, 'drafts_generated'),
      draft_copied: eventCount(eventsByName, 'draft_copied'),
      x_posted: eventCount(eventsByName, 'x_posted'),
      x_replied: eventCount(eventsByName, 'x_replied'),
    },
    waitlist: waitlistRows.map((r) => ({
      email: r.email,
      source: r.source || 'marketing',
      created_at: r.created_at,
    })),
    waitlist_by_source: waitlistBySource,
    waitlist_by_day: fillDays((batch[3]?.results ?? []) as DayCountRow[], since),
    users,
    invites,
    events_by_name: eventsByName,
    events_by_day: fillDays((batch[12]?.results ?? []) as DayCountRow[], since),
    funnel: FUNNEL.map((step) => ({
      ...step,
      count: eventCount(eventsByName, step.name),
    })),
    snapshots,
  }
}
