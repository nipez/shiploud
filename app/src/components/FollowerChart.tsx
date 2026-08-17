import type { FollowerPoint } from '../followerGrowth'

function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function FollowerChart({
  points,
  compact = false,
}: {
  points: FollowerPoint[]
  compact?: boolean
}) {
  if (points.length === 0) {
    return <p className="text-[12px] font-bold text-muted">No public checks yet.</p>
  }
  if (points.length === 1) {
    return (
      <p className="text-[12px] font-bold text-muted">
        First check logged: {points[0].followers.toLocaleString()} on {dayLabel(points[0].checked_at)}.
        Another check will draw the line.
      </p>
    )
  }

  const w = compact ? 280 : 520
  const h = compact ? 72 : 140
  const padX = 10
  const padY = 12
  const min = Math.min(...points.map((p) => p.followers))
  const max = Math.max(...points.map((p) => p.followers))
  const span = Math.max(1, max - min)
  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (w - padX * 2)
    const y = h - padY - ((p.followers - min) / span) * (h - padY * 2)
    return { x, y, p }
  })
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `${padX},${h - padY} ${line} ${w - padX},${h - padY}`
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label={`Followers from ${first.followers} to ${last.followers}`}
      >
        <polygon points={area} fill="#FF6A2B" opacity="0.12" />
        <polyline
          points={line}
          fill="none"
          stroke="#FF6A2B"
          strokeWidth={compact ? 2.4 : 3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c) => (
          <circle key={c.p.checked_at} cx={c.x} cy={c.y} r={compact ? 2.4 : 3.2} fill="#2B1B4D" />
        ))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] font-extrabold text-muted">
        <span>
          {first.followers.toLocaleString()}
          {first.source === 'launch' ? ' · start' : ` · ${dayLabel(first.checked_at)}`}
        </span>
        <span>
          {last.followers.toLocaleString()} · {dayLabel(last.checked_at)}
        </span>
      </div>
    </div>
  )
}
