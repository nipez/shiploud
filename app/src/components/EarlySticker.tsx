type Props = {
  className?: string
}

/** Hand-placed doodle sticker — not a SaaS "EARLY ACCESS" pill. */
export default function EarlySticker({ className = '' }: Props) {
  return (
    <span
      className={`sticker-hand shrink-0 bg-sticker-yellow -rotate-6 ${className}`.trim()}
      aria-label="you're early"
    >
      you're early
    </span>
  )
}
